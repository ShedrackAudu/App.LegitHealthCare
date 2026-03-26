from flask import Blueprint, request, jsonify
from models import db, User
from auth_utils import is_password_strong

account_bp = Blueprint('account', __name__)

@account_bp.route('/profile', methods=['PUT'])
def update_profile():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.phone = data.get('phone', user.phone)
    user.email = data.get('email', user.email)
    
    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": user.to_dict()})

@account_bp.route('/password', methods=['PUT'])
def update_password():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if not user.check_password(current_password):
        return jsonify({"error": "Incorrect current password"}), 400
        
    if not is_password_strong(new_password):
        return jsonify({"error": "Password does not meet the strong password policy requirements."}), 400
        
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({"message": "Password updated successfully"})
