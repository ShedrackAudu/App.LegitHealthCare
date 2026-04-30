from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db
from auth_utils import generate_totp_secret, get_totp_uri
from extensions import limiter
import pyotp
import json
import secrets
import string

security_bp = Blueprint('security', __name__)

@security_bp.route('/generate', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def generate_2fa():
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    secret = generate_totp_secret()
    uri = get_totp_uri(secret, user.username)
    
    # Store secret temporarily, unverified
    user.totp_secret = secret
    db.session.commit()
    
    return jsonify({"secret": secret, "uri": uri})

@security_bp.route('/enable', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def enable_2fa():
    user_id = get_jwt_identity()
    claims = get_jwt()
    data = request.json or {}
    code = data.get('code')
    portal = claims.get('portal', 'staff')
    
    if not user_id or not code:
        return jsonify({"error": "Bad request"}), 400
        
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user or not user.totp_secret:
        return jsonify({"error": "Setup not initialized"}), 400
        
    totp = pyotp.totp.TOTP(user.totp_secret)
    if totp.verify(code) or (user.backup_codes and code in json.loads(user.backup_codes)):
        user.is_2fa_enabled = True
        # Generate cryptographically secure backup codes
        backup_codes = [''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8)) for _ in range(6)]
        user.backup_codes = json.dumps(backup_codes)
        db.session.commit()
        return jsonify({"message": "2FA established", "backup_codes": backup_codes})
    
    return jsonify({"error": "Invalid code"}), 400

@security_bp.route('/disable', methods=['POST'])
@jwt_required()
@limiter.limit("5 per minute")
def disable_2fa():
    user_id = get_jwt_identity()
    claims = get_jwt()
    data = request.json or {}
    code = data.get('code')
    portal = claims.get('portal', 'staff')
    
    if not user_id or not code:
        return jsonify({"error": "Bad request"}), 400
        
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
        
    if not user.totp_secret:
        return jsonify({"error": "2FA is not enabled"}), 400
        
    totp = pyotp.totp.TOTP(user.totp_secret)
    if totp.verify(code) or (user.backup_codes and code in json.loads(user.backup_codes)):
        user.is_2fa_enabled = False
        user.totp_secret = None
        user.backup_codes = None
        db.session.commit()
        return jsonify({"message": "2FA disabled"})
        
    return jsonify({"error": "Invalid code to disable"}), 400
