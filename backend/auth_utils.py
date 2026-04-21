import random
import string
import re
import pyotp
from flask import request, jsonify
from functools import wraps
from flask_mail import Mail, Message
from datetime import datetime, timedelta
from models import db, StaffUser as User

mail = Mail()

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def verify_otp(otp_code):
    # For now, we'll just accept any 6-digit code for testing
    # In production, this should check against a stored value in Redis or DB
    return len(otp_code) == 6

from utils.email_utils import EmailService

def send_otp_email(user, otp, subject="Your Legit HealthCare OTP Code"):
    from models import AppBranding
    branding = AppBranding.query.first()
    logo_url = branding.logo_light if branding and branding.logo_light else None
    
    # Ensure logo_url is absolute for email clients
    if logo_url and logo_url.startswith('/'):
        # On Render, we want to ensure HTTPS even if internal request is HTTP
        base_url = request.url_root.rstrip('/')
        if 'onrender.com' in base_url and base_url.startswith('http:'):
            base_url = base_url.replace('http:', 'https:')
        logo_url = f"{base_url}{logo_url}"
    
    html_content = EmailService.get_otp_template(user.first_name, otp, logo_url=logo_url)
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

from flask_jwt_extended import jwt_required, get_jwt_identity

def login_required(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
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
        @jwt_required()
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
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
