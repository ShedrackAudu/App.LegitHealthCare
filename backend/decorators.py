from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import User

def require_permission(permission_name):
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            claims = get_jwt()
            portal = claims.get('portal', 'staff')
            
            if not user_id:
                return jsonify({"error": "Authentication required"}), 401
            
            from models import StaffUser, PatientPortalUser
            Model = PatientPortalUser if portal == 'patient' else StaffUser
            
            user = Model.query.get(user_id)
            if not user:
                return jsonify({"error": "User not found"}), 404
            
            # Verify session revocation (Phase 1)
            jwt_revision = claims.get('session_revision')
            user_revision = getattr(user, 'session_revision', 1) or 1
            if jwt_revision is not None and jwt_revision != user_revision:
                return jsonify({"error": "Session has been revoked or expired. Please log in again."}), 401
                
            if not user.is_verified:
                return jsonify({"error": "Account not verified"}), 403
                
            # Patients have implicit access to their own data, but no granular RBAC permissions
            if portal == 'patient':
                # If a specific permission is required, patients usually don't have it 
                # unless we explicitly allow the 'Patient' role here.
                if permission_name == 'patient_access' or (isinstance(permission_name, list) and 'patient_access' in permission_name):
                    return f(*args, **kwargs)
                
                # Check for a specific 'Patient' role if needed, or just return based on portal
                # For now, let's assume 'manage_appointments' is what we want to bypass for patients in specific routes
                return jsonify({"error": f"Permission '{permission_name}' required (Portal: Patient)"}), 403

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
