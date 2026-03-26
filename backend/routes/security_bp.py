from flask import Blueprint, request, jsonify
from models import db, User
from auth_utils import generate_totp_secret, get_totp_uri
import pyotp
import json
import random
import string

security_bp = Blueprint('security', __name__)

@security_bp.route('/generate', methods=['POST'])
def generate_2fa():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, user.username)
    
    # Store secret temporarily, unverified
    user.totp_secret = secret
    db.session.commit()
    
    return jsonify({"secret": secret, "uri": uri})

@security_bp.route('/enable', methods=['POST'])
def enable_2fa():
    user_id = request.headers.get('X-User-ID')
    code = request.json.get('code')
    
    if not user_id or not code:
        return jsonify({"error": "Bad request"}), 400
        
    user = User.query.get(user_id)
    if not user or not user.totp_secret:
        return jsonify({"error": "Setup not initialized"}), 400
        
    totp = pyotp.totp.TOTP(user.totp_secret)
    if totp.verify(code) or (user.backup_codes and code in json.loads(user.backup_codes)):
        user.is_2fa_enabled = True
        # Generate some simple backup codes for initial output
        backup_codes = [''.join(random.choices(string.ascii_uppercase + string.digits, k=8)) for _ in range(6)]
        user.backup_codes = json.dumps(backup_codes)
        db.session.commit()
        return jsonify({"message": "2FA established", "backup_codes": backup_codes})
    
    return jsonify({"error": "Invalid code"}), 400

@security_bp.route('/disable', methods=['POST'])
def disable_2fa():
    user_id = request.headers.get('X-User-ID')
    if not request.json: return jsonify({"error": "Bad request"}), 400
    code = request.json.get('code') # require code to disable
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    totp = pyotp.totp.TOTP(user.totp_secret)
    if totp.verify(code) or (user.backup_codes and code in json.loads(user.backup_codes)):
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.backup_codes = None
        db.session.commit()
        return jsonify({"message": "2FA disabled"})
        
    return jsonify({"error": "Invalid code to disable"}), 400
