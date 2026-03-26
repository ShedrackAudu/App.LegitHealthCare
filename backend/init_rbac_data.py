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

        # 2. Define Roles and their permissions
        roles_metadata = {
            'Admin': list(perm_objs.keys()),
            'Doctor': [
                'consultation', 'view_users', 'view_dashboard', 'messaging', 
                'patient_reports', 'view_patients', 'view_records'
            ],
            'Registration Staff': ['registration', 'view_users', 'messaging', 'view_patients'],
            'Lab Technician': [
                'lab_fbc', 'lab_kft', 'lab_lipid', 'lab_lft', 
                'lab_ecg', 'lab_spirometry', 'lab_audiometry', 'messaging'
            ],
            'FBC Technician': ['lab_fbc', 'messaging', 'view_patients'],
            'KFT Technician': ['lab_kft', 'messaging', 'view_patients'],
            'Lipid Technician': ['lab_lipid', 'messaging', 'view_patients'],
            'LFT Technician': ['lab_lft', 'messaging', 'view_patients'],
            'ECG Technician': ['lab_ecg', 'messaging', 'view_patients'],
            'Spirometry Technician': ['lab_spirometry', 'messaging', 'view_patients'],
            'Audiometry Technician': ['lab_audiometry', 'messaging', 'view_patients'],
            'Data Entry Clerk': ['registration', 'messaging', 'view_patients'],
            'New User': ['messaging']
        }

        for role_name, perms in roles_metadata.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=f"{role_name} role with specific access.")
                db.session.add(role)
                print(f"Created Role: {role_name}")
            
            # Sync permissions
            if role_name == 'Admin':
                # Dynamically assign ALL permissions to Admin
                role.permissions = Permission.query.all()
            else:
                role.permissions = [perm_objs[p] for p in perms]
            print(f"Synced permissions to {role_name}")

        
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
