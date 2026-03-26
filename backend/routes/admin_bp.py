from flask import Blueprint, request, jsonify, current_app
from models import db, User, Role, Permission, AuditLog, SystemConfig, AccessRequest, TempAccessCode, Notification
from decorators import require_permission
import json
from datetime import datetime

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/api/admin/users', methods=['GET'])
@require_permission('view_users')
def get_users():
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['GET'])
@require_permission('view_users')
def get_user(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@admin_bp.route('/api/admin/users/<int:user_id>/roles', methods=['POST'])
@require_permission('change_roles')
def update_user_roles(user_id):
    user = User.query.get_or_404(user_id)
    data = request.json
    role_names = data.get('roles', [])
    
    # Clear existing roles
    user.roles = []
    
    # Add new roles
    for role_name in role_names:
        role = Role.query.filter_by(name=role_name).first()
        if role:
            user.roles.append(role)
            
    db.session.commit()
    
    # Log the action
    admin_id = request.headers.get('X-User-ID')
    log = AuditLog(
        user_id=admin_id,
        action="UPDATE_USER_ROLES",
        resource=f"User:{user_id}",
        details=json.dumps({"new_roles": role_names}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    # Real-time update: notify the specific user
    try:
        from app import socketio
        socketio.emit('user_update', user.to_dict(), room=f"user_{user.id}")
    except Exception as e:
        print(f"Socket emit for user role update failed: {e}")
    
    return jsonify({"message": "User roles updated successfully"})

@admin_bp.route('/api/admin/roles', methods=['GET', 'POST'])
@require_permission('manage_roles')
def manage_roles():
    if request.method == 'GET':
        roles = Role.query.all()
        return jsonify([role.to_dict() for role in roles])
    
    data = request.json
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({"error": "Role name is required"}), 400
        
    if Role.query.filter_by(name=name).first():
        return jsonify({"error": "Role already exists"}), 400
        
    role = Role(name=name, description=description)
    db.session.add(role)
    db.session.commit()
    
    # Log the action
    admin_id = request.headers.get('X-User-ID')
    log = AuditLog(
        user_id=admin_id,
        action="CREATE_ROLE",
        resource=f"Role:{name}",
        details=json.dumps({"name": name, "description": description}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(role.to_dict()), 201

@admin_bp.route('/api/admin/roles/<int:role_id>', methods=['DELETE'])
@require_permission('manage_roles')
def delete_role(role_id):
    role = Role.query.get_or_404(role_id)
    
    # Check if role is assigned to any users
    if role.assigned_users.count() > 0:
        return jsonify({"error": f"Role '{role.name}' is currently assigned to {role.assigned_users.count()} users and cannot be deleted."}), 400
        
    # Prevent deletion of core 'Admin' role
    if role.name.lower() == 'admin':
        return jsonify({"error": "The core 'Admin' role cannot be deleted."}), 403
        
    db.session.delete(role)
    db.session.commit()
    
    # Log action
    admin_id = request.headers.get('X-User-ID')
    log = AuditLog(
        user_id=admin_id,
        action="DELETE_ROLE",
        resource=f"Role:{role.name}",
        details=json.dumps({"role_id": role_id, "name": role.name}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": f"Role '{role.name}' deleted successfully"})

@admin_bp.route('/api/admin/permissions', methods=['GET'])
@require_permission('manage_roles')
def get_permissions():
    permissions = Permission.query.all()
    return jsonify([p.to_dict() for p in permissions])

@admin_bp.route('/api/admin/audit-logs', methods=['GET'])
@require_permission('view_audit_logs')
def get_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    # Fetch logs with user joined for performance if needed, but to_dict handles it
    logs_pagination = AuditLog.query.order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=per_page)
    
    return jsonify({
        "logs": [log.to_dict() for log in logs_pagination.items],
        "total": logs_pagination.total,
        "pages": logs_pagination.pages,
        "current_page": logs_pagination.page
    })

@admin_bp.route('/api/admin/config', methods=['GET', 'POST'])
@require_permission('system_maintenance')
def manage_config():
    if request.method == 'GET':
        configs = SystemConfig.query.all()
        return jsonify({c.key: c.value for c in configs})
    
    data = request.json
    for key, value in data.items():
        config = SystemConfig.query.get(key)
        if config:
            config.value = str(value)
        else:
            config = SystemConfig(key=key, value=str(value))
            db.session.add(config)
            
    db.session.commit()
@admin_bp.route('/api/admin/request-access', methods=['POST'])
def request_access():
    data = request.json
    user_id = data.get('user_id')
    path = data.get('path', 'Unknown')
    
    # Map paths to permissions
    path_map = {
        '/user-management': 'view_users',
        '/roles-permissions': 'manage_roles',
        '/audit-logs': 'view_audit_logs',
        '/data-management': 'download_data',
        '/system-branding': 'manage_branding',
        '/ai-integration': 'manage_ai',
        '/departments': 'manage_departments',
        '/registration': 'registration',
        '/consultation': 'consultation',
        '/tests': 'lab_tests',
        '/director': 'director_review',
        '/view-patients': 'view_patients',
        '/view-records': 'view_records',
        '/patient-report': 'view_records',
        '/messages': 'messaging'
    }
    perm_name = path_map.get(path, 'system_maintenance')

    req = AccessRequest(
        user_id=user_id,
        permission_name=perm_name
    )
    db.session.add(req)
    db.session.commit()
    
    # Identify Admins to notify
    admins = User.query.join(User.roles).filter(Role.name.ilike('Admin')).all()
    
    requesting_user = User.query.get(user_id)
    user_name = f"{requesting_user.first_name} {requesting_user.last_name}" if requesting_user else "A user"
    
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            type='alert',
            title='New Access Request',
            message=f"{user_name} is requesting access to {perm_name.replace('_', ' ').title()}.",
            link='/admin/access-keys'
        )
        db.session.add(notif)
        
        # Real-time notification if socketio is available
        try:
            if 'socketio' in current_app.extensions:
                current_app.extensions['socketio'].emit(
                    'notification', 
                    notif.to_dict(), 
                    to=f"user_{admin.id}"
                )
        except Exception as e:
            print(f"Failed to emit socket notification: {e}")

    db.session.commit()
    
    # Log the action (Audit Log)
    log = AuditLog(
        user_id=user_id,
        action="REQUEST_ACCESS",
        resource=path,
        details=json.dumps({"permission": perm_name}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": "Access request sent to hospital administration"}), 201

@admin_bp.route('/api/admin/verify-access-code', methods=['POST'])
def verify_access_code():
    data = request.json
    code_str = data.get('code')
    user_id = request.headers.get('X-User-ID')
    
    code_obj = TempAccessCode.query.filter_by(code=code_str, is_revoked=False).first()
    
    if not code_obj:
        return jsonify({"error": "Invalid or revoked code"}), 404
        
    if code_obj.expires_at and code_obj.expires_at < datetime.utcnow():
        return jsonify({"error": "Access code has expired"}), 403
        
    if code_obj.user_id and str(code_obj.user_id) != str(user_id):
        return jsonify({"error": "This code is assigned to another user"}), 403

    # If it's single-use and already used, don't allow re-activation
    if not code_obj.is_multi_use and code_obj.times_used > 0:
        return jsonify({"error": "This single-use code has already been activated"}), 403

    # Success - Grant Permission (By upgrading user to Admin for this prototype)
    # NEW: Instead of granting Admin role, we just mark it as activated.
    # The User.has_permission method now checks for active TempAccessCode.
    user = User.query.get(user_id) # Ensure user object is loaded for to_dict()
    
    code_obj.times_used += 1
    if not code_obj.user_id:
        code_obj.user_id = user_id
        
    # We do NOT set is_revoked = True here, because the user needs the access until expires_at.
    # The 'times_used' check above prevents re-activation of single-use codes.

        
    db.session.commit() # Commit changes to code_obj before logging/emitting
    
    # Log the activity
    audit = AuditLog(
        user_id=user_id,
        action='Activate Access Code',
        resource=f"TempAccessCode:{code_obj.code}",
        details=f"Activated temporary access to {code_obj.permission.name} for {code_obj.duration_minutes} minutes.",
        ip_address=request.remote_addr
    )
    db.session.add(audit)
    db.session.commit()
    
    # Real-time notification to frontend
    try:
        from app import socketio
        socketio.emit('user_update', user.to_dict(), room=f"user_{user_id}")
    except Exception as e:
        print(f"Socket emit failed: {e}")
        
    return jsonify({
        "message": "Access granted successfully!",
        "redirect": code_obj.page_route if hasattr(code_obj, 'page_route') else None, # Assuming page_route might be on code_obj
        "user": user.to_dict()
    }), 200

@admin_bp.route('/api/admin/roles/<int:role_id>/permissions', methods=['POST'])
@require_permission('manage_roles')
def update_role_permissions(role_id):
    role = Role.query.get_or_404(role_id)
    data = request.json
    permission_names = data.get('permissions', [])
    
    # Clear existing permissions
    role.permissions = []
    
    # Add new permissions
    for p_name in permission_names:
        perm = Permission.query.filter_by(name=p_name).first()
        if perm:
            role.permissions.append(perm)
            
    db.session.commit()
    
    # Log the action
    admin_id = request.headers.get('X-User-ID')
    log = AuditLog(
        user_id=admin_id,
        action="UPDATE_ROLE_PERMISSIONS",
        resource=f"Role:{role.name}",
        details=json.dumps({"new_permissions": permission_names}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    # Real-time update: notify all users with this role
    try:
        from app import socketio
        from models import User
        users = User.query.filter(User.roles.any(id=role.id)).all()
        for u in users:
            socketio.emit('user_update', u.to_dict(), room=f"user_{u.id}")
    except Exception as e:
        print(f"Socket emit for role update failed: {e}")
    
    return jsonify({"message": f"Permissions for role '{role.name}' updated successfully"})

@admin_bp.route('/api/admin/export', methods=['GET'])
@require_permission('download_data')
def export_data():
    try:
        import pandas as pd
        import io
        from flask import send_file
        from models import BioData
        
        patients = BioData.query.all()
        data = []
        for p in patients:
            data.append({
                "Staff ID": p.staff_id,
                "First Name": p.first_name,
                "Last Name": p.last_name,
                "Gender": p.gender,
                "Age": p.age,
                "Department": p.department,
                "Phone": p.phone,
                "Email": p.email,
                "Registered At": p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else ''
            })
            
        df = pd.DataFrame(data)
        
        # Create in-memory buffer
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Patients')
        
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"Clinic_Data_Export_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        )
    except ImportError:
        return jsonify({"error": "Server error: missing data processing libraries (pandas/xlsxwriter)."}), 500
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@admin_bp.route('/api/admin/import', methods=['POST'])
@require_permission('system_maintenance')
def import_data():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    try:
        import pandas as pd
        # Read excel
        df = pd.read_excel(file)
        
        # Expect columns: staff_id, first_name, last_name, gender, age, department, phone, email
        required_cols = ['staff_id', 'first_name', 'last_name']
        for col in required_cols:
            if col not in df.columns:
                return jsonify({"error": f"Missing required column: {col}"}), 400
        
        count = 0
        added_new = 0
        for _, row in df.iterrows():
            staff_id = str(row['staff_id'])
            
            # Check if exists
            from models import BioData
            patient = BioData.query.filter_by(staff_id=staff_id).first()
            
            if not patient:
                patient = BioData(
                    staff_id=staff_id,
                    first_name=str(row['first_name']),
                    last_name=str(row['last_name']),
                    middle_name=str(row.get('middle_name', '')),
                    gender=str(row.get('gender', '')),
                    age=int(row.get('age', 0)) if pd.notnull(row.get('age')) else None,
                    department=str(row.get('department', '')),
                    phone=str(row.get('phone', '')),
                    email=str(row.get('email', ''))
                )
                db.session.add(patient)
                added_new += 1
            
            count += 1
            
        db.session.commit()
        
        # Log action
        admin_id = request.headers.get('X-User-ID')
        log = AuditLog(
            user_id=admin_id,
            action="IMPORT_BIO_DATA",
            resource="Excel",
            details=json.dumps({"total_rows": count, "new_patients": added_new}),
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            "message": f"Successfully processed {count} records. {added_new} new patients added.",
            "total": count,
            "new": added_new
        })
    except ImportError:
        return jsonify({"error": "Server error: missing data processing libraries (pandas/openpyxl)."}), 500
    except Exception as e:
        return jsonify({"error": f"Import failed: {str(e)}"}), 500

@admin_bp.route('/api/admin/access-codes', methods=['GET'])
@require_permission('manage_roles')
def get_access_codes():
    codes = TempAccessCode.query.order_by(TempAccessCode.created_at.desc()).all()
    return jsonify([code.to_dict() for code in codes])

@admin_bp.route('/api/admin/access-codes/generate', methods=['POST'])
@require_permission('manage_roles')
def generate_access_code():
    data = request.json
    perm_name = data.get('permission_name')
    target_user_id = data.get('user_id') # Optional user restriction
    duration = data.get('duration_minutes', 60)
    is_multi = data.get('is_multi_use', False)
    
    perm = Permission.query.filter_by(name=perm_name).first()
    if not perm:
        return jsonify({"error": f"Permission '{perm_name}' not found"}), 404
        
    import random
    import string
    # Change format to LHCSL-XXXXXX (total 12 chars including hyphen)
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    code_str = f"LHCSL-{suffix}"
    
    from datetime import timedelta
    expires = datetime.utcnow() + timedelta(minutes=duration)
    
    admin_id = request.headers.get('X-User-ID')
    
    new_code = TempAccessCode(
        code=code_str,
        user_id=target_user_id,
        permission_id=perm.id,
        duration_minutes=duration,
        is_multi_use=is_multi,
        expires_at=expires,
        generated_by=admin_id
    )
    db.session.add(new_code)
    db.session.commit()
    
    # Log the action
    log = AuditLog(
        user_id=admin_id,
        action="GENERATE_ACCESS_CODE",
        resource=f"Code:{code_str}",
        details=json.dumps({
            "permission": perm_name,
            "target_user": target_user_id,
            "duration": duration,
            "multi_use": is_multi
        }),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(new_code.to_dict()), 201

@admin_bp.route('/api/admin/access-codes/<int:code_id>/revoke', methods=['PUT'])
@require_permission('manage_roles')
def revoke_access_code(code_id):
    code_obj = TempAccessCode.query.get_or_404(code_id)
    code_obj.is_revoked = True
    db.session.commit()
    
    # Log action
    admin_id = request.headers.get('X-User-ID')
    log = AuditLog(
        user_id=admin_id,
        action="REVOKE_ACCESS_CODE",
        resource=f"Code:{code_obj.code}",
        details=json.dumps({"code_id": code_id}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    # Real-time update: notify the target user if any
    if code_obj.user_id:
        try:
            from app import socketio
            from models import User
            user_obj = User.query.get(code_obj.user_id)
            if user_obj:
               socketio.emit('user_update', user_obj.to_dict(), room=f"user_{user_obj.id}")
        except Exception as e:
            print(f"Socket emit for revocation failed: {e}")

    return jsonify({"message": f"Code {code_obj.code} revoked successfully"})

@admin_bp.route('/api/admin/access-codes/<int:code_id>', methods=['DELETE'])
@require_permission('manage_roles')
def delete_access_code(code_id):
    code_obj = TempAccessCode.query.get_or_404(code_id)
    if not code_obj.is_revoked and (not code_obj.expires_at or code_obj.expires_at > datetime.utcnow()):
        return jsonify({"error": "Only revoked or expired codes can be deleted."}), 400
        
    db.session.delete(code_obj)
    db.session.commit()
    return jsonify({"message": "Code record deleted successfully"})

@admin_bp.route('/api/admin/users/<int:target_user_id>', methods=['DELETE'])
@require_permission('manage_roles')
def delete_user(target_user_id):
    admin_id = request.headers.get('X-User-ID')
    target_user = User.query.get_or_404(target_user_id)
    
    if target_user.username == 'admin':
        return jsonify({"error": "Protection Error: The default system administrator account cannot be deactivated or deleted."}), 403

    if str(target_user.id) == str(admin_id):
        return jsonify({"error": "Operational Error: You cannot deactivate your own administrative session."}), 400

    try:
        # Perform deletion
        db.session.delete(target_user)
        db.session.commit()
        
        # Log to audit trail
        admin = User.query.get(admin_id)
        log = AuditLog(
            user_id=admin_id,
            action="DEACTIVATE_USER",
            resource=f"User:{target_user.username}",
            details=json.dumps({"user_id": target_user_id, "username": target_user.username}),
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({"message": f"Account @{target_user.username} has been successfully deactivated."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/api/admin/users/<int:target_user_id>/reset-password', methods=['POST'])
@require_permission('manage_roles')
def admin_reset_password(target_user_id):
    admin_id = request.headers.get('X-User-ID')
    target_user = User.query.get_or_404(target_user_id)
    data = request.json
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({"error": "New password is required"}), 400
        
    # Set the password
    target_user.set_password(new_password)
    db.session.commit()
    
    # Log action
    log = AuditLog(
        user_id=admin_id,
        action="ADMIN_RESET_PASSWORD",
        resource=f"User:{target_user.username}",
        details=json.dumps({"user_id": target_user_id, "username": target_user.username}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": f"Password for user @{target_user.username} has been successfully reset."})

@admin_bp.route('/api/notifications/delete-all', methods=['DELETE'])
def delete_notifications():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Auth ID required"}), 401
        
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    return jsonify({"message": "All notifications permanently deleted"})
@admin_bp.route('/api/admin/audit-logs/clear', methods=['DELETE'])
def clear_audit_logs():
    try:
        AuditLog.query.delete()
        db.session.commit()
        return jsonify({"message": "All audit logs cleared successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
