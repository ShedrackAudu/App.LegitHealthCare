from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity
from models import (
    db, User, Role, Permission, AuditLog, SystemConfig, AccessRequest, TempAccessCode, 
    Notification, PatientPortalUser, BioData, ScreeningYearBioData, ConsultationData,
    FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, DirectorReview
)
from decorators import require_permission
from sqlalchemy import func
import json
import random
import string
from datetime import datetime
from utils.email_utils import EmailService
from utils.ip import get_client_ip
from auth_utils import is_password_strong
from extensions import limiter

admin_bp = Blueprint('admin_bp', __name__)

@admin_bp.route('/api/admin/audit-analytics', methods=['GET'])
@require_permission('manage_roles') # High-level admin permission
def get_audit_analytics():
    from sqlalchemy import func, desc
    from datetime import datetime, timedelta

    # 1. Timeline: Events per day for the last 30 days
    thirty_days_ago = datetime.now() - timedelta(days=30)
    timeline_query = db.session.query(
        func.date(AuditLog.timestamp).label('date'),
        func.count(AuditLog.id).label('count')
    ).filter(AuditLog.timestamp >= thirty_days_ago)\
     .group_by(func.date(AuditLog.timestamp))\
     .order_by(func.date(AuditLog.timestamp)).all()

    timeline = [{"date": str(row.date), "count": row.count} for row in timeline_query]

    # 2. Action Breakdown: Top 10 actions
    actions_query = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).group_by(AuditLog.action)\
     .order_by(desc('count')).limit(10).all()

    action_breakdown = [{"action": row.action, "count": row.count} for row in actions_query]

    # 3. Security Events: Focus on sensitive actions (Login, Delete, Permission Change, Failed Attempts)
    critical_actions = ['LOGIN', 'SIGNUP_FAILED', '2FA_VERIFY_FAILED', 'DELETE_PATIENT', 'UPDATE_USER_ROLES']
    security_query = db.session.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(AuditLog.action.in_(critical_actions))\
     .group_by(AuditLog.action).all()
    
    security_stats = {row.action: row.count for row in security_query}

    # 4. Failed Login Rate (Last 24h)
    one_day_ago = datetime.now() - timedelta(hours=24)
    failed_logins = AuditLog.query.filter(
        AuditLog.timestamp >= one_day_ago,
        AuditLog.action.ilike('%FAILED%')
    ).count()

    return jsonify({
        "timeline": timeline,
        "action_breakdown": action_breakdown,
        "security_stats": security_stats,
        "failed_logins_24h": failed_logins,
        "total_logs": AuditLog.query.count()
    })

@admin_bp.route('/api/admin/users', methods=['GET'])
@require_permission(['view_users', 'manage_access_keys'])
def get_users():
    staff = User.query.all()
    patients = PatientPortalUser.query.all()
    
    all_users = [u.to_dict() for u in staff]
    for p in patients:
        p_dict = p.to_dict()
        p_dict['section'] = None
        p_dict['department'] = None
        
        # Explicitly check each clinical database using its engine
        for bind_key in ['dcp', 'dct']:
            try:
                engine = db.engines.get(bind_key)
                if not engine: continue
                
                from sqlalchemy import text
                # Query the bio_data table directly to avoid RoutingSession conflicts
                sql = text("SELECT department, phone FROM bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
                with engine.connect() as conn:
                    result = conn.execute(sql, {"sid": p.username}).fetchone()
                    if result:
                        p_dict['section'] = bind_key.upper()
                        # result is a Row object, access by index or name
                        p_dict['department'] = result[0] 
                        if not p_dict.get('phone') or p_dict.get('phone') == 'N/A':
                            p_dict['phone'] = result[1]
                        break
            except Exception as e:
                current_app.logger.error(f"Manual bind check failed for {bind_key}: {e}")
                continue
                
        p_dict['id'] = f"p{p.id}" 
        all_users.append(p_dict)
        
    return jsonify(all_users)

@admin_bp.route('/api/admin/users/<string:user_id>', methods=['GET'])
@require_permission('view_users')
def get_user(user_id):
    if user_id.startswith('p'):
        real_id = int(user_id[1:])
        user = PatientPortalUser.query.get_or_404(real_id)
        return jsonify(user.to_dict())
    
    user = User.query.get_or_404(int(user_id))
    return jsonify(user.to_dict())

@admin_bp.route('/api/admin/users/<string:user_id>/timeline', methods=['GET'])
@require_permission('view_users')
def get_user_timeline(user_id):
    is_patient = user_id.startswith('p')
    real_id = int(user_id[1:]) if is_patient else int(user_id)
    
    # Get the username to search for actions ON this user
    if is_patient:
        target_user = PatientPortalUser.query.get_or_404(real_id)
        username = target_user.username
    else:
        target_user = User.query.get_or_404(real_id)
        username = target_user.username

    from sqlalchemy import or_
    
    # 1. Logs created BY the user
    # 2. Logs where the user is the RESOURCE (Actions ON them)
    # We check for resource starting with User: or Patient: followed by username
    
    resource_patterns = [
        f"User:{username}", 
        f"Patient:{username}",
        f"User:{user_id}" # Fallback for some old logs
    ]
    
    query = AuditLog.query.filter(
        or_(
            AuditLog.user_id == real_id,
            AuditLog.resource.in_(resource_patterns)
        )
    ).order_by(AuditLog.timestamp.desc())

    logs = query.limit(50).all()
    
    # Final filter: if action was BY the user, ensure portal context matches to avoid ID collisions
    final_logs = []
    for log in logs:
        log_dict = log.to_dict()
        
        # If the log was BY someone with the same ID, check the portal
        if log.user_id == real_id:
            portal = log_dict.get('details', {}).get('portal', 'staff')
            log_is_patient = portal == 'patient'
            
            # If IDs match but user types don't, this is a collision from another portal
            if is_patient != log_is_patient:
                # UNLESS it's an action ON them by someone else
                if log.resource not in resource_patterns:
                    continue
        
        final_logs.append(log_dict)
            
    return jsonify(final_logs)

@admin_bp.route('/api/admin/users/<string:user_id>/roles', methods=['POST'])
@require_permission('change_roles')
def update_user_roles(user_id):
    if user_id.startswith('p'):
        return jsonify({"message": "Patient roles are managed automatically and cannot be changed manually."}), 200
        
    user = User.query.get_or_404(int(user_id))
    data = request.json
    role_names = data.get('roles', [])
        
    # Safeguard: Default 'admin' user must always have 'Admin' role
    if user.username == 'admin' and 'Admin' not in role_names:
        return jsonify({"error": "Protection Error: The default 'admin' account must always be assigned the 'Admin' role to prevent system lockout."}), 403

    # Clear existing roles
    user.roles = []
    
    # Add new roles
    for role_name in role_names:
        role = Role.query.filter_by(name=role_name).first()
        if role:
            user.roles.append(role)
            
    db.session.commit()
    
    # Log the action
    admin_id = get_jwt_identity()
    log = AuditLog(
        user_id=admin_id,
        action="UPDATE_USER_ROLES",
        resource=f"User:{user_id}",
        details=json.dumps({"new_roles": role_names}),
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    # Real-time update: notify the specific user
    try:
        from extensions import socketio
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
    admin_id = get_jwt_identity()
    log = AuditLog(
        user_id=admin_id,
        action="CREATE_ROLE",
        resource=f"Role:{name}",
        details=json.dumps({"name": name, "description": description}),
        ip_address=get_client_ip()
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
    admin_id = get_jwt_identity()
    log = AuditLog(
        user_id=admin_id,
        action="DELETE_ROLE",
        resource=f"Role:{role.name}",
        details=json.dumps({"role_id": role_id, "name": role.name}),
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": f"Role '{role.name}' deleted successfully"})

@admin_bp.route('/api/admin/permissions', methods=['GET'])
@require_permission(['manage_roles', 'manage_access_keys'])
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
    return jsonify({"message": "Configuration updated successfully"}), 200

@admin_bp.route('/api/admin/request-access', methods=['POST'])
def request_access():
    data = request.json
    user_id = data.get('user_id')
    if user_id is not None:
        user_id = int(user_id)
    path = data.get('path', 'Unknown')
    
    # Strip trailing slash for consistent matching
    clean_path = path.rstrip('/')
    
    # Map paths to permissions
    if clean_path.startswith('/tests/'):
        test_sub = clean_path.split('/')[-1]
        test_mapping = {
            'fbc': 'lab_fbc',
            'kft': 'lab_kft',
            'lipid': 'lab_lipid',
            'lft': 'lab_lft',
            'ecg': 'lab_ecg',
            'spirometry': 'lab_spirometry',
            'audiometry': 'lab_audiometry',
            'routine': 'lab_essential_diagnostics'
        }
        perm_name = test_mapping.get(test_sub, 'lab_tests')
    else:
        path_map = {
            '/user-management': 'view_users',
            '/roles-permissions': 'manage_roles',
            '/security-analytics': 'manage_roles',
            '/audit-logs': 'view_audit_logs',
            '/data-management': 'download_data',
            '/system-branding': 'manage_branding',
            '/ai-integration': 'manage_ai',
            '/system-config': 'manage_departments',
            '/departments': 'manage_departments',
            '/registration': 'registration',
            '/consultation': 'consultation',
            '/appointments': 'manage_appointments',
            '/tests': 'lab_tests',
            '/director': 'director_review',
            '/view-patients': 'view_patients',
            '/view-records': 'view_records',
            '/patient-report': 'patient_reports',
            '/messages': 'messaging',
            '/inventory': 'view_inventory',
            '/admin/access-keys': 'manage_access_keys'
        }
        perm_name = path_map.get(clean_path, 'system_maintenance')

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
            link=f'/admin/access-keys?user_id={user_id}&permission={perm_name}'
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
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": "Access request sent to hospital administration"}), 201

@admin_bp.route('/api/admin/verify-access-code', methods=['POST'])
@limiter.limit("5 per minute")
def verify_access_code():
    data = request.json
    code_str = data.get('code')
    user_id = get_jwt_identity()
    
    # Coerce user_id to integer for consistency
    user_id_int = int(user_id) if user_id is not None else None
    
    code_obj = TempAccessCode.query.filter_by(code=code_str, is_revoked=False).first()
    
    if not code_obj:
        return jsonify({"error": "Invalid or revoked code"}), 404
        
    if code_obj.expires_at and code_obj.expires_at < datetime.now():
        return jsonify({"error": "Access code has expired"}), 403
        
    if code_obj.user_id and code_obj.user_id != user_id_int:
        return jsonify({"error": "This code is assigned to another user"}), 403

    # If it's single-use and already used, don't allow re-activation
    if not code_obj.is_multi_use and code_obj.times_used > 0:
        return jsonify({"error": "This single-use code has already been activated"}), 403

    user = User.query.get(user_id_int)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    code_obj.times_used += 1
    if not code_obj.user_id:
        code_obj.user_id = user_id_int
        
    # We do NOT set is_revoked = True here, because the user needs the access until expires_at.
    # The 'times_used' check above prevents re-activation of single-use codes.
        
    db.session.commit() # Commit changes to code_obj before logging/emitting
    
    # Log the activity
    audit = AuditLog(
        user_id=user_id_int,
        action='Activate Access Code',
        resource=f"TempAccessCode:{code_obj.code}",
        details=f"Activated temporary access to {code_obj.permission.name if code_obj.permission else 'Unknown'} for {code_obj.duration_minutes} minutes.",
        ip_address=get_client_ip()
    )
    db.session.add(audit)
    db.session.commit()
    
    # Real-time notification to frontend
    try:
        from extensions import socketio
        socketio.emit('user_update', user.to_dict(), room=f"user_{user_id_int}")
    except Exception as e:
        print(f"Socket emit failed: {e}")
        
    return jsonify({
        "message": "Access granted successfully!",
        "redirect": code_obj.page_route if hasattr(code_obj, 'page_route') else None,
        "user": user.to_dict()
    }), 200

@admin_bp.route('/api/admin/roles/<int:role_id>/permissions', methods=['POST'])
@require_permission('manage_roles')
def update_role_permissions(role_id):
    role = Role.query.get_or_404(role_id)
    
    # Safeguard: 'Admin' role permissions must not be modified via API
    if role.name.lower() == 'admin':
        return jsonify({"error": "Protection Error: The 'Admin' role permissions are managed by the system core and cannot be modified to ensure administrative stability."}), 403

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
    admin_id = get_jwt_identity()
    log = AuditLog(
        user_id=admin_id,
        action="UPDATE_ROLE_PERMISSIONS",
        resource=f"Role:{role.name}",
        details=json.dumps({"new_permissions": permission_names}),
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    # Real-time update: notify all users with this role
    try:
        from extensions import socketio
        from models import User
        users = User.query.filter(User.roles.any(id=role.id)).all()
        for u in users:
            socketio.emit('user_update', u.to_dict(), room=f"user_{u.id}")
    except Exception as e:
        print(f"Socket emit for role update failed: {e}")
    
    return jsonify({"message": f"Permissions for role '{role.name}' updated successfully"})

@admin_bp.route('/api/admin/export/patients', methods=['GET'])
@require_permission('download_data')
def export_patients():
    try:
        import pandas as pd
        import io
        from flask import send_file
        
        # Sectional export based on context
        patients = BioData.query.all() # BioData is already filtered by bind in models if using sectional db
        data = []
        for p in patients:
            data.append({
                "Staff ID": p.staff_id,
                "First Name": p.first_name,
                "Middle_Name": p.middle_name,
                "Last Name": p.last_name,
                "Gender": p.gender,
                "DOB": p.dob.strftime('%Y-%m-%d') if p.dob else '',
                "Age": p.age,
                "Department": p.department,
                "Phone": p.phone,
                "Email": p.email,
                "Race": p.race,
                "Nationality": p.nationality,
                "Registered At": p.created_at.strftime('%Y-%m-%d %H:%M') if p.created_at else ''
            })
            
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Patient Directory')
        
        output.seek(0)
        context = request.headers.get('X-Company-Context', 'General').upper()
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"{context}_Patient_Directory_{datetime.now().strftime('%Y%m%d')}.xlsx"
        )
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@admin_bp.route('/api/admin/export/screening', methods=['GET'])
@require_permission('download_data')
def export_screening_matrix():
    try:
        import pandas as pd
        import io
        from flask import send_file
        
        year = request.args.get('year', datetime.now().year, type=int)
        context = request.headers.get('X-Company-Context', 'General').upper()
        
        # 1. Fetch all screening base records for the year
        screening_base = ScreeningYearBioData.query.filter_by(screening_year=year).all()
        
        data = []
        for yp in screening_base:
            # Complete Unified Schema Initialization (Clean Parameter Names)
            row = {
                "Staff ID": yp.staff_id, "Patient ID": yp.patient_id, "First Name": yp.first_name, "Middle Name": "", "Last Name": yp.last_name, 
                "Gender": "", "Age": "", "DOB": "", "Phone": "", "Email": "", 
                "Department": "", "Race": "", "Nationality": "",
                "Year": yp.screening_year, "Section": context, "Registered Date": yp.created_at.strftime('%Y-%m-%d %H:%M') if yp.created_at else "",
                "BP": "", "Pulse": "", "SPO2": "", "HS": "", "Palor": "", "Jaundice": "", 
                "Murmur": "", "Chest Status": "", "LUTS": "", "Chronic Cough": "", "Chest Pain": "", 
                "Chest Infection": "", "Heart Dx": "", "DM Status": "", "HTN Status": "", "PSA": "", 
                "PSA Remark": "", "FBS": "", "RBS": "", "Sugar Remark": "", "UA Result": "", 
                "UA Remark": "", "UA Remark Others": "", "Breast Exam": "", "Breast Remark": "", "Abdomen": "", 
                "Assessment HX PE": "", "Overall Lab Remark": "", "Other Assessments": "", "Other Remarks": "", 
                "Overall Assessment": "", "Consulted By": "", "Consultation Date": "",
                "PCV": "", "WBC": "", "HGB": "", "PLT": "", "RBC": "", 
                "LYMP PCT": "", "LYMP ABS": "", "GRA PCT": "", "GRA ABS": "", 
                "MID PCT": "", "MID ABS": "", "MCV": "", "MCH": "", "MCHC": "", 
                "RDW": "", "PDW": "", "FBC Remark": "",
                "Potassium": "", "Sodium": "", "Chloride": "", 
                "Calcium": "", "HCO3": "", "KFT Remark": "",
                "Total Cholesterol": "", "Triglycerides": "", "HDL": "", "LDL": "", "Lipid Remark": "",
                "AST": "", "ALT": "", "ALP": "", "TB": "", "CB": "", "Urea": "", "Creatinine": "", "LFT Remark": "",
                "ECG": "", "ECG Remark": "", "Spirometry": "", "Spirometry Remark": "", 
                "Audiometry": "", "Audiometry Remark": "", "Weight": "", "Height": "",
                "Director Comm1": "", "Director Comm2": "", "Director Comm3": "", "Director Comm4": "", 
                "Director Hx/PE": "", "Director Lab Remark": "", "Director Other Assessments": "", "Director Other Remarks": "",
                "Overall Assessment": "", "Director Review Date": ""
            }
            
            bio = BioData.query.filter_by(staff_id=yp.staff_id).first()
            if bio:
                row.update({ "Middle Name": getattr(bio, 'middle_name', ''), "Gender": getattr(bio, 'gender', ''), "Age": getattr(bio, 'age', ''), "DOB": getattr(bio, 'dob').strftime('%Y-%m-%d') if getattr(bio, 'dob', None) else '', "Phone": getattr(bio, 'phone', ''), "Email": getattr(bio, 'email', ''), "Department": getattr(bio, 'department', ''), "Race": getattr(bio, 'race', ''), "Nationality": getattr(bio, 'nationality', '') })
                
            c = ConsultationData.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if c:
                row.update({ "BP": c.bp, "Pulse": c.pulse, "SPO2": c.spo2, "HS": c.hs_status, "Palor": c.palor, "Jaundice": c.jaundice, "Murmur": c.murmur, "Chest Status": c.chest_status, "LUTS": c.luts, "Chronic Cough": c.chronic_cough, "Chest Pain": c.chronic_chest_pain, "Chest Infection": c.chest_infection, "Heart Dx": c.heart_dx, "DM Status": c.dm_status, "HTN Status": c.htn_status, "PSA": c.psa, "PSA Remark": c.psa_remark, "FBS": c.fbs, "RBS": c.rbs, "Sugar Remark": c.sugar_remark, "UA Result": c.ua_result, "UA Remark": c.ua_remark, "UA Remark Others": c.ua_remark_others, "Breast Exam": c.breast_exam, "Breast Remark": c.breast_remark, "Breast Others": c.breast_others, "Abdomen": c.abdomen, "Abdomen Others": c.abdomen_others, "Assessment HX PE": c.assessment_hx_pe, "Overall Lab Remark": c.overall_lab_remark, "Other Assessments": c.other_assessments, "Other Remarks": c.other_remarks, "Overall Assessment": c.overall_assessment, "Consulted By": c.consulted_by_name, "Consultation Date": c.created_at.strftime('%Y-%m-%d %H:%M') if c.created_at else '' })


                
            f = FBCResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if f:
                row.update({ "PCV": f.pcv, "WBC": f.wbc, "HGB": f.hgb, "PLT": f.plt, "RBC": f.rbc, "LYMP PCT": f.lymp_percent, "LYMP ABS": f.lymp_abs, "GRA PCT": f.gra_percent, "GRA ABS": f.gra_abs, "MID PCT": f.mid_percent, "MID ABS": f.mid_abs, "MCV": f.mcv, "MCH": f.mch, "MCHC": f.mchc, "RDW": f.rdw, "PDW": f.pdw, "FBC Remark": f.fbc_remark })
                
            k = KFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if k:
                row.update({ "Potassium": k.potassium, "Sodium": k.sodium, "Chloride": k.chloride, "Calcium": k.bicarbonate_ca, "HCO3": k.hco3, "KFT Remark": k.kft_remark })
                
            li = LipidResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if li:
                row.update({ "Total Cholesterol": li.total_cholesterol, "Triglycerides": li.triglycerides, "HDL": li.hdl, "LDL": li.ldl, "Lipid Remark": li.lp_remark })
                
            lf = LFTResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if lf:
                row.update({ "AST": lf.ast, "ALT": lf.alt, "ALP": lf.alp, "TB": lf.tb, "CB": lf.cb, "Urea": lf.urea, "Creatinine": lf.creatinine, "LFT Remark": lf.lft_remark })
                
            s = SpecialTestsResult.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if s:
                row.update({ "ECG": s.ecg_result, "ECG Remark": s.ecg_remark, "Spirometry": s.spirometry_result, "Spirometry Remark": s.spirometry_remark, "Audiometry": s.audiometry_result, "Audiometry Remark": s.audiometry_remark, "Weight": s.weight, "Height": s.height })
                
            dr = DirectorReview.query.filter_by(staff_id=yp.staff_id, screening_year=year).first()
            if dr:
                # Director overrides for vitals/assessments if populated
                overrides = {
                    "DM Status": dr.dm_status, "HTN Status": dr.htn_status, "BP": dr.bp, "Pulse": dr.pulse, 
                    "SPO2": dr.spo2, "HS": dr.hs_status, "LUTS": dr.luts, "Chronic Cough": dr.chronic_cough, 
                    "Chest Pain": dr.chronic_chest_pain, "Chest Infection": dr.chest_infection, 
                    "Heart Dx": dr.heart_dx, "Palor": dr.palor, "Jaundice": dr.jaundice, 
                    "Murmur": dr.murmur, "Chest Status": dr.chest_status, "Breast Exam": dr.breast_exam, 
                    "Breast Remark": dr.breast_remark, "Abdomen": dr.abdomen, "PSA": dr.psa, 
                    "PSA Remark": dr.psa_remark, "FBS": dr.fbs, "RBS": dr.rbs, 
                    "Sugar Remark": dr.fbs_rbs_remark, "UA Result": dr.ua_result, 
                    "UA Remark": dr.ua_remark, "UA Remark Others": dr.ua_remark_others,
                    "Breast Others": dr.breast_others, "Abdomen Others": dr.abdomen_others
                }
                for k_key, v_val in overrides.items():
                    if v_val:
                        row[k_key] = v_val
                        
                row.update({ 
                    "Director Comm1": dr.comment_one, "Director Comm2": dr.comment_two, "Director Comm3": dr.comment_three, "Director Comm4": dr.comment_four, 
                    "Director Hx/PE": dr.assessment_hx_pe, "Director Lab Remark": dr.overall_lab_remark, 
                    "Director Other Assessments": dr.other_assessments, "Director Other Remarks": dr.other_remarks,
                    "Overall Assessment": dr.overall_assessment, "Director Review Date": dr.created_at.strftime('%Y-%m-%d %H:%M') if dr.created_at else '' 
                })
            
            data.append(row)
            
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=f'Screening {year}')
            
        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"{context}_Screening_Matrix_{year}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        )
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}"}), 500

@admin_bp.route('/api/admin/export', methods=['GET'])
@require_permission('download_data')
def export_data():
    # Keep legacy route for compatibility, but redirect to patient directory export
    return export_patients()

@admin_bp.route('/api/admin/import/patient-template', methods=['GET'])
@require_permission('download_data')
def download_patient_template():
    try:
        import pandas as pd
        import io
        from flask import send_file
        
        # Headers as per import_data expectation and UI display
        cols = [
            'staff_id', 'first_name', 'middle_name', 'last_name', 
            'gender', 'dob', 'age', 'department', 'phone', 
            'email', 'race', 'nationality'
        ]
        
        df = pd.DataFrame(columns=cols)
        
        output = io.BytesIO()
        # Using openpyxl for consistency with other template downloads in the system
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Patient Template')
        
        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name="Bulk_Patient_Import_Template.xlsx"
        )
    except Exception as e:
        return jsonify({"error": f"Template generation failed: {str(e)}"}), 500

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
        from models import BioData
        from datetime import datetime

        def clean_val(val):
            if pd.isna(val) or str(val).strip().lower() == 'nan':
                return None
            return str(val).strip()

        for _, row in df.iterrows():
            staff_id = str(row.get('staff_id', '')).strip()
            if not staff_id or staff_id == 'nan' or staff_id == 'None' or staff_id == '': continue
            if staff_id.endswith('.0'): staff_id = staff_id[:-2]
            
            # Check if exists
            patient = BioData.query.filter_by(staff_id=staff_id).first()
            
            if not patient:
                # Age calculation logic from DOB
                dob_val = row.get('dob')
                age_val = row.get('age')
                
                parsed_dob = None
                calculated_age = None
                
                if pd.notnull(dob_val):
                    try:
                        if isinstance(dob_val, datetime):
                            parsed_dob = dob_val.date()
                        else:
                            # Use pandas to handle various date formats
                            parsed_dob = pd.to_datetime(dob_val).date()
                        
                        # Calculate age
                        today = datetime.now().date()
                        calculated_age = today.year - parsed_dob.year - ((today.month, today.day) < (parsed_dob.month, parsed_dob.day))
                    except:
                        parsed_dob = None
                
                # Final age: prefer calculated, fallback to provided, fallback to 0
                final_age = calculated_age if calculated_age is not None else (int(age_val) if pd.notnull(age_val) else 0)

                patient = BioData(
                    staff_id=staff_id,
                    first_name=clean_val(row.get('first_name')) or '',
                    last_name=clean_val(row.get('last_name')) or '',
                    middle_name=clean_val(row.get('middle_name')),
                    gender=clean_val(row.get('gender')),
                    dob=parsed_dob,
                    age=final_age,
                    department=clean_val(row.get('department')),
                    phone=clean_val(row.get('phone')),
                    email=clean_val(row.get('email')),
                    race=clean_val(row.get('race')),
                    nationality=clean_val(row.get('nationality'))
                )
                db.session.add(patient)
                added_new += 1
            
            count += 1
            
        db.session.commit()
        
        # Log action
        admin_id = get_jwt_identity()
        log = AuditLog(
            user_id=admin_id,
            action="IMPORT_BIO_DATA",
            resource="Excel",
            details=json.dumps({"total_rows": count, "new_patients": added_new}),
            ip_address=get_client_ip()
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
@require_permission('manage_access_keys')
def get_access_codes():
    codes = TempAccessCode.query.order_by(TempAccessCode.created_at.desc()).all()
    return jsonify([code.to_dict() for code in codes])

@admin_bp.route('/api/admin/access-codes/generate', methods=['POST'])
@require_permission('manage_access_keys')
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
    expires = datetime.now() + timedelta(minutes=duration)
    
    admin_id = get_jwt_identity()
    
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
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify(new_code.to_dict()), 201

@admin_bp.route('/api/admin/access-codes/<int:code_id>/revoke', methods=['PUT'])
@require_permission('manage_access_keys')
def revoke_access_code(code_id):
    code_obj = TempAccessCode.query.get_or_404(code_id)
    code_obj.is_revoked = True
    db.session.commit()
    
    # Log action
    admin_id = get_jwt_identity()
    log = AuditLog(
        user_id=admin_id,
        action="REVOKE_ACCESS_CODE",
        resource=f"Code:{code_obj.code}",
        details=json.dumps({"code_id": code_id}),
        ip_address=get_client_ip()
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
@require_permission('manage_access_keys')
def delete_access_code(code_id):
    code_obj = TempAccessCode.query.get_or_404(code_id)
    if not code_obj.is_revoked and (not code_obj.expires_at or code_obj.expires_at > datetime.now()):
        return jsonify({"error": "Only revoked or expired codes can be deleted."}), 400
        
    db.session.delete(code_obj)
    db.session.commit()
    return jsonify({"message": "Code record deleted successfully"})

@admin_bp.route('/api/admin/users/<string:target_user_id>', methods=['DELETE'])
@require_permission('manage_roles')
def delete_user(target_user_id):
    admin_id = get_jwt_identity()
    
    if target_user_id.startswith('p'):
        real_id = int(target_user_id[1:])
        target_user = PatientPortalUser.query.get_or_404(real_id)
        db.session.delete(target_user)
        db.session.commit()
        return jsonify({"message": f"Patient account @{target_user.username} deleted successfully."})

    target_user = User.query.get_or_404(int(target_user_id))
    
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
            ip_address=get_client_ip()
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({"message": f"Account @{target_user.username} has been successfully deactivated."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/api/admin/users/<string:target_user_id>/reset-password', methods=['POST'])
@require_permission('manage_roles')
def admin_reset_password(target_user_id):
    admin_id = get_jwt_identity()
    
    if target_user_id.startswith('p'):
        real_id = int(target_user_id[1:])
        target_user = PatientPortalUser.query.get_or_404(real_id)
    else:
        target_user = User.query.get_or_404(int(target_user_id))
    data = request.json
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({"error": "New password is required"}), 400
        
    if not is_password_strong(new_password):
        return jsonify({"error": "Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol."}), 400

    # Set the password
    target_user.set_password(new_password)
    db.session.commit()
    
    # Log action
    log = AuditLog(
        user_id=admin_id,
        action="ADMIN_RESET_PASSWORD",
        resource=f"User:{target_user.username}",
        details=json.dumps({"user_id": target_user_id, "username": target_user.username}),
        ip_address=get_client_ip()
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({"message": f"Password for user @{target_user.username} has been successfully reset."})

@admin_bp.route('/api/admin/audit-logs/clear', methods=['DELETE'])
@require_permission('system_maintenance')
def clear_audit_logs():
    admin_id = get_jwt_identity()
    try:
        # Clear all existing logs
        AuditLog.query.delete()
        db.session.commit()
        
        # Record this destructive action in a fresh log entry
        log = AuditLog(
            user_id=admin_id,
            action="CLEAR_AUDIT_LOGS",
            resource="System Registry",
            details=json.dumps({
                "action": "FULL_CLEAR",
                "timestamp": datetime.now().isoformat(),
                "performed_by": admin_id
            }),
            ip_address=get_client_ip()
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({"message": "All audit logs cleared successfully. A clear event has been recorded."}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Audit clear failed: {str(e)}")
        return jsonify({"error": f"Internal system error during maintenance: {str(e)}"}), 500

@admin_bp.route('/api/admin/biodata/clear', methods=['DELETE'])
@require_permission('system_maintenance')
def clear_patient_biodata():
    admin_id = get_jwt_identity()
    context = request.headers.get('X-Company-Context', 'General').upper()
    try:
        from models import (
            BioData, ScreeningYearBioData, ConsultationData, FBCResult, 
            KFTResult, LipidResult, LFTResult, SpecialTestsResult, 
            DirectorReview, QueueEntry, TestResultArchive, PatientFile, Appointment, ReportVerification
        )
        
        # Clear all child tables first to prevent ForeignKey violations
        ScreeningYearBioData.query.delete()
        ConsultationData.query.delete()
        FBCResult.query.delete()
        KFTResult.query.delete()
        LipidResult.query.delete()
        LFTResult.query.delete()
        SpecialTestsResult.query.delete()
        DirectorReview.query.delete()
        QueueEntry.query.delete()
        TestResultArchive.query.delete()
        PatientFile.query.delete()
        Appointment.query.delete()
        ReportVerification.query.delete()
        
        # Finally delete the parent table
        BioData.query.delete()
        
        db.session.commit()
        
        # Record this destructive action
        log = AuditLog(
            user_id=admin_id,
            action="CLEAR_PATIENT_DIRECTORY",
            resource=f"Database:{context}",
            details=json.dumps({
                "action": "FULL_CLEAR",
                "timestamp": datetime.now().isoformat(),
                "performed_by": admin_id,
                "context": context
            }),
            ip_address=get_client_ip()
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({"message": f"Patient directory for {context} cleared successfully."}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Patient directory clear failed: {str(e)}")
        return jsonify({"error": f"Internal system error during maintenance: {str(e)}"}), 500
@admin_bp.route('/api/admin/users', methods=['POST'])
@require_permission('manage_roles')
def create_user():
    admin_id = get_jwt_identity()
    data = request.json
    
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    role_names = data.get('roles', [])
    
    # Validation
    if not all([first_name, last_name, username, email, phone]):
        return jsonify({"error": "All fields (first_name, last_name, username, email, phone) are required"}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({"error": f"Username '@{username}' is already in use."}), 400
        
    if User.query.filter_by(email=email).first():
        return jsonify({"error": f"Email '{email}' is already in use."}), 400

    if User.query.filter_by(phone=phone).first():
        return jsonify({"error": f"Phone number '{phone}' is already in use."}), 400

    # Generate strong temporary password
    import secrets
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        if (any(c.islower() for c in temp_password)
                and any(c.isupper() for c in temp_password)
                and any(c.isdigit() for c in temp_password)
                and any(c in "!@#$%^&*" for c in temp_password)):
            break
    
    # Create User
    new_user = User(
        first_name=first_name,
        last_name=last_name,
        username=username,
        email=email,
        phone=phone,
        is_verified=True,
        must_reset_password=True
    )
    new_user.set_password(temp_password)
    
    # Assign Roles
    for r_name in role_names:
        role = Role.query.filter_by(name=r_name).first()
        if role:
            new_user.roles.append(role)
            
    db.session.add(new_user)
    db.session.commit()
    
    # Send Welcome Email
    try:
        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        backend_url = request.url_root.rstrip('/')
        if 'onrender.com' in backend_url and backend_url.startswith('http:'):
            backend_url = backend_url.replace('http:', 'https:')
            
        import os
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')

        # Ensure logo_url is absolute (served from backend)
        if logo_url and logo_url.startswith('/'):
            logo_url = f"{backend_url}{logo_url}"
            
        html_content = EmailService.get_welcome_template(
            first_name=first_name,
            username=username,
            password=temp_password,
            portal_type='staff',
            app_url=frontend_url,
            logo_url=logo_url
        )
        
        email_sent = EmailService.send_email(
            to_email=email,
            subject="Welcome Onboard - Your Legit HealthCare Account",
            html_content=html_content
        )
        
        if not email_sent:
            current_app.logger.error(f"Failed to send welcome email to {email}")
    except Exception as e:
        current_app.logger.error(f"Error sending welcome email: {e}")

    # Audit Log
    log = AuditLog(
        user_id=admin_id,
        action="CREATE_USER",
        resource=f"User:{username}",
        details=json.dumps({"username": username, "email": email, "roles": role_names}),
        ip_address=request.remote_addr
    )
    db.session.add(log)
    db.session.commit()
    
    return jsonify({
        "message": f"User @{username} created successfully. A welcome email has been sent to {email}.",
        "user": new_user.to_dict(),
        "password": temp_password
    }), 201

@admin_bp.route('/api/admin/patients/onboard', methods=['POST'])
@require_permission('manage_roles')
def onboard_patient():
    admin_id = get_jwt_identity()
    data = request.json
    
    staff_id = data.get('staff_id', '').strip()
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip()
    phone = data.get('phone', '').strip()
    
    if not all([staff_id, first_name, last_name, email, phone]):
        return jsonify({"error": "All fields (staff_id, first_name, last_name, email, phone) are required"}), 400
        
    # Check if patient already exists in portal (verified)
    existing = PatientPortalUser.query.filter_by(username=staff_id).first()
    if existing and existing.is_verified:
        return jsonify({"error": f"A verified patient account for Staff ID '{staff_id}' already exists."}), 400
        
    # Check for email/phone conflicts with OTHER users
    email_conflict = PatientPortalUser.query.filter(PatientPortalUser.email == email, PatientPortalUser.username != staff_id).first()
    if email_conflict:
        return jsonify({"error": f"The email '{email}' is already associated with another account (Staff ID: {email_conflict.username})."}), 409
        
    phone_conflict = PatientPortalUser.query.filter(PatientPortalUser.phone == phone, PatientPortalUser.username != staff_id).first()
    if phone_conflict:
        return jsonify({"error": f"The phone number '{phone}' is already associated with another account (Staff ID: {phone_conflict.username})."}), 409

    # Generate strong temporary password
    import secrets
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        temp_password = ''.join(secrets.choice(alphabet) for i in range(12))
        if (any(c.islower() for c in temp_password)
                and any(c.isupper() for c in temp_password)
                and any(c.isdigit() for c in temp_password)
                and any(c in "!@#$%^&*" for c in temp_password)):
            break
    
    try:
        if existing:
            user = existing
            user.first_name = first_name
            user.last_name = last_name
            user.email = email
            user.phone = phone
            user.is_verified = True
            user.must_reset_password = True
        else:
            user = PatientPortalUser(
                username=staff_id,
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                is_verified=True,
                must_reset_password=True
            )
            db.session.add(user)
            
        user.set_password(temp_password)
        db.session.commit()
        current_app.logger.info(f"Successfully created/updated PatientPortalUser for {staff_id}")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to save patient user {staff_id}: {str(e)}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    
    # Sync with Clinical BioData (dcp, dct binds)
    from sqlalchemy import text
    contexts = ['dcp', 'dct']
    for ctx in contexts:
        try:
            engine = db.engines.get(ctx)
            if not engine: continue
            with engine.connect() as conn:
                sync_query = text("""
                    UPDATE bio_data 
                    SET email = :e, phone = :p 
                    WHERE LOWER(staff_id) = LOWER(:sid)
                """)
                conn.execute(sync_query, {"e": email, "p": phone, "sid": staff_id})
                conn.commit()
        except Exception as e:
            current_app.logger.error(f"Onboard Sync failed for {staff_id} in {ctx}: {str(e)}")
            
    # Send Welcome Email
    try:
        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        backend_url = request.url_root.rstrip('/')
        if 'onrender.com' in backend_url and backend_url.startswith('http:'):
            backend_url = backend_url.replace('http:', 'https:')

        import os
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')

        if logo_url and logo_url.startswith('/'):
            logo_url = f"{backend_url}{logo_url}"
            
        html_content = EmailService.get_welcome_template(
            first_name=first_name,
            username=staff_id,
            password=temp_password,
            portal_type='patient',
            app_url=frontend_url,
            logo_url=logo_url
        )
        
        EmailService.send_email(
            to_email=email,
            subject="Welcome to Legit HealthCare Patient Portal",
            html_content=html_content
        )
    except Exception as e:
        current_app.logger.error(f"Error sending patient welcome email: {e}")

    # Audit Log
    try:
        log = AuditLog(
            user_id=admin_id,
            action="ONBOARD_PATIENT",
            resource=f"Patient:{staff_id}",
            details=json.dumps({"staff_id": staff_id, "email": email}),
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        current_app.logger.error(f"Audit Log failed for {staff_id}: {e}")
        db.session.rollback() # Don't fail the whole request if audit fails
    
    return jsonify({
        "message": f"Patient account for '{staff_id}' created successfully.",
        "password": temp_password
    }), 201
