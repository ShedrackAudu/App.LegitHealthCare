from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User

def require_permission(permission_name):
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
            
            if not user.is_verified:
                return jsonify({"error": "Account not verified"}), 403
                
            # Master logic: The user named 'admin' always has all permissions
            if user.username == 'admin':
                return f(*args, **kwargs)
                
            # Check for multiple permissions if a list is provided
            if isinstance(permission_name, list):
                if any(user.has_permission(p) for p in permission_name):
                    return f(*args, **kwargs)
                return jsonify({"error": f"One of permissions {permission_name} required"}), 403
            
            # Standard single permission check
            if user.has_permission(permission_name):
                return f(*args, **kwargs)
                
            return jsonify({"error": f"Permission '{permission_name}' required"}), 403
        return decorated_function
    return decorator
