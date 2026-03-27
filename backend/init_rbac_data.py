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
            ('system_maintenance', 'Access to core system settings')
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

        # 2. Define Roles - ONLY ADMIN as requested
        # Delete all existing roles that are not Admin
        existing_roles = Role.query.all()
        for r in existing_roles:
            if r.name != 'Admin':
                print(f"Deleting role: {r.name}")
                # Remove association first if needed (relationships usually handle this but sqlalchemy can be picky)
                r.assigned_users = []
                r.permissions = []
                db.session.delete(r)
        db.session.commit()

        roles_metadata = {
            'Admin': list(perm_objs.keys())
        }

        for role_name, perms in roles_metadata.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name} role with full system access.")
                db.session.add(role)
                print(f"Created Role: {role_name}")
            
            # Dynamically assign ALL permissions to Admin
            role.permissions = Permission.query.all()
            print(f"Synced all permissions to {role_name}")

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
