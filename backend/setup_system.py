import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, StaffUser, PatientPortalUser, Role, Permission
from init_rbac_data import init_rbac

def setup_system(purge=False):
    with app.app_context():
        # Create all tables in all binds
        print("Creating tables in all databases...")
        db.create_all()
        
        if purge:
            print("Purging all existing data from both databases...")
            # Staff DB
            db.session.execute(db.text("DELETE FROM user_roles"))
            StaffUser.query.delete()
            # Patient DB
            PatientPortalUser.query.delete()
            db.session.commit()

        # 1. Initialize RBAC (Roles & Permissions)
        init_rbac()

        # 2. Ensure Admin Role has all permissions
        admin_role = Role.query.filter_by(name='Admin').first()
        if admin_role:
            admin_role.permissions = Permission.query.all()
            db.session.commit()

        # 3. Create or Update Default Admin (Staff side)
        admin_user = StaffUser.query.filter_by(username='admin').first()
        
        details = {
            'first_name': 'Shedrack',
            'last_name': 'Audu',
            'phone': '07051071296',
            'email': 'audushedrack360@gmail.com',
            'is_verified': True
        }
        password = os.getenv('ADMIN_DEFAULT_PASSWORD', '@Shedy822')

        if not admin_user:
            admin_user = StaffUser(username='admin', **details)
            admin_user.set_password(password)
            db.session.add(admin_user)
            print("Created new default admin.")
        else:
            for key, value in details.items():
                setattr(admin_user, key, value)
            admin_user.set_password(password)
            print("Updated existing admin.")

        if admin_role and admin_role not in admin_user.roles:
            admin_user.roles.append(admin_role)

        db.session.commit()
        print(f"System setup complete for '{admin_user.username}'.")

if __name__ == "__main__":
    purge_requested = "--purge" in sys.argv
    setup_system(purge=purge_requested)
