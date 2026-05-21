from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, StaffUser, PatientPortalUser, AuditLog
from auth_utils import is_password_strong

account_bp = Blueprint('account', __name__)

@account_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    user = Model.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.phone = data.get('phone', user.phone)
    user.email = data.get('email', user.email)
    
    db.session.commit()
    AuditLog.log_action("Update Profile", resource=f"User:{user_id}", details={"portal": portal})
    return jsonify({"message": "Profile updated successfully", "user": user.to_dict()})

@account_bp.route('/password', methods=['PUT'])
@jwt_required()
def update_password():
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    Model = PatientPortalUser if portal == 'patient' else StaffUser
    user = Model.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not user.check_password(current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    if not is_password_strong(new_password):
        return jsonify({"error": "Password does not meet the strong password policy requirements."}), 400
        
    user.set_password(new_password)
    db.session.commit()
    AuditLog.log_action("Update Password", resource=f"User:{user_id}", details={"portal": portal})
    
    return jsonify({"message": "Password updated successfully"})

@account_bp.route('/force-reset-password', methods=['POST'])
@jwt_required()
def force_reset_password():
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    new_password = data.get('new_password')

    Model = PatientPortalUser if portal == 'patient' else StaffUser
    user = Model.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not user.must_reset_password:
        return jsonify({"error": "Forced password reset is not required for this account."}), 400
        
    if not is_password_strong(new_password):
        return jsonify({"error": "Password does not meet the strong password policy requirements."}), 400
        
    user.set_password(new_password)
    user.must_reset_password = False
    db.session.commit()
    AuditLog.log_action("Forced Reset Password", resource=f"User:{user_id}", details={"portal": portal})
    
    return jsonify({"message": "Password updated successfully", "user": user.to_dict()})
