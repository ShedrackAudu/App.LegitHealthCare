from functools import wraps
from flask import request, jsonify
from models import User

def require_permission(permission_name):
    def decorator(f):
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
                
            # Master logic: The user named 'admin' always has all permissions
            if user.username == 'admin' or user.has_permission(permission_name):
                return f(*args, **kwargs)
                
            return jsonify({"error": f"Permission '{permission_name}' required"}), 403
        return decorated_function
    return decorator
