import random
import string
import re
import pyotp
from flask import request, jsonify
from functools import wraps
from flask_mail import Mail, Message
from datetime import datetime, timedelta
from models import db, User

mail = Mail()

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

from utils.email_utils import EmailService

def send_otp_email(user, otp, subject="Your Legit HealthCare OTP Code"):
    html_content = EmailService.get_otp_template(user.first_name, otp)
    return EmailService.send_email(user.email, subject, html_content)

def is_password_strong(password: str) -> bool:
    """
    Validates that a password is at least 8 characters long, 
    and includes at least one uppercase letter, one lowercase letter, 
    one digit, and one special symbol.
    """
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[@$!%*?&^#()_+\-=\[\]{};':\",./<>\\|`~]", password):
        return False
    return True

def generate_totp_secret():
    return pyotp.random_base32()

def get_totp_uri(secret, username):
    return pyotp.totp.TOTP(secret).provisioning_uri(name=username, issuer_name="Legit HealthCare")

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        if not user.is_verified:
            return jsonify({"error": "Account not verified"}), 403
            
        return f(*args, **kwargs)
    return decorated_function

def role_required(role_name):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = request.headers.get('X-User-ID')
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401
            
            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Simple role check: check if any assigned role name matches
            if any(role.name == role_name for role in user.roles) or any(role.name == 'Admin' for role in user.roles):
                return f(*args, **kwargs)
                
            return jsonify({"error": f"Role '{role_name}' required"}), 403
        return decorated_function
    return decorator
