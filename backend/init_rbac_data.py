from app import app
from models import db, User, Role, Permission
import json

def init_rbac():
    with app.app_context():
        # 1. Define all permissions
        perms_metadata = [
            ('registration', 'Access to patient registration'),
            ('consultation', 'Access to clinical consultation'),
            ('lab_tests', 'Access to lab test recording (Legacy - use specific)'),
            ('lab_fbc', 'Access to FBC Test Results'),
            ('lab_kft', 'Access to KFT Test Results'),
            ('lab_lipid', 'Access to Lipid Profile Results'),
            ('lab_lft', 'Access to LFT Test Results'),
            ('lab_ecg', 'Access to ECG Diagnostic Recording'),
            ('lab_spirometry', 'Access to Spirometry Lung Function Test'),
            ('lab_audiometry', 'Access to Audiometry Hearing Test'),
            ('director_review', 'Access to director level review'),
            ('patient_reports', 'Access to generating patient reports'),
            ('view_patients', 'Access to comprehensive patient directory'),
            ('view_records', 'Access to master screening matrix'),
            ('view_users', 'View system user directory'),
            ('view_dashboard', 'View main system stats dashboard'),
            ('manage_roles', 'Manage system roles and permissions'),
            ('view_audit_logs', 'View system activity logs'),
            ('download_data', 'Export system data to Excel'),
            ('manage_ai', 'Configure AI integration settings'),
            ('manage_branding', 'Update system branding/logo'),
            ('manage_departments', 'Manage clinic departments'),
            ('messaging', 'Access to internal messaging system'),
            ('manage_appointments', 'Manage clinic appointment schedules'),
            ('view_appointments', 'View internal appointment directory'),
            ('manage_queues', 'Manage patient departmental queues'),
            ('change_roles', 'Assign or revoke roles from users'),
            ('system_maintenance', 'Access to core system settings'),
            ('edit_patient', 'Permission to modify patient bio-data'),
            ('delete_patient', 'Permission to permanently remove a patient account'),
            ('delete_record', 'Permission to delete screening results from matrix'),
            ('manage_access_keys', 'Generate and manage temporary access codes'),
            ('upload_bulk_fbc', 'Bulk Upload FBC Results'),
            ('upload_bulk_kft', 'Bulk Upload KFT Results'),
            ('upload_bulk_lft', 'Bulk Upload LFT Results'),
            ('upload_bulk_lipid', 'Bulk Upload Lipid Profile Results')
        ]
        
        perm_objs = {}
        for name, desc in perms_metadata:
            perm = Permission.query.filter_by(name=name).first()
            if not perm:
                perm = Permission(name=name, description=desc)
                db.session.add(perm)
                print(f"Created Permission: {name}")
            perm_objs[name] = perm
        
        db.session.commit()

        # 2. Define Roles
        perm_objs = {p.name: p for p in Permission.query.all()}
        
        # Ensure Admin role exists and has all permissions
        admin_role = Role.query.filter_by(name='Admin').first()
        if not admin_role:
            admin_role = Role(name='Admin', description='Admin role with full system access.')
            db.session.add(admin_role)
            print("Created Role: Admin")
        
        admin_role.permissions = list(perm_objs.values())
        print("Synced all permissions to Admin")
        db.session.commit()

        # 3. Assign Admin role to 'admin' user
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user:
            admin_role = Role.query.filter_by(name='Admin').first()
            if admin_role not in admin_user.roles:
                admin_user.roles.append(admin_role)
                print(f"Assigned Admin role to user: admin")
            else:
                print("Admin user already has Admin role.")
        else:
            print("User 'admin' not found. Please create it first.")

        db.session.commit()
        print("\nRBAC Initialization Complete.")

if __name__ == "__main__":
    init_rbac()
