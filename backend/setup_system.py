import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, StaffUser, PatientPortalUser, Role, Permission, Race, Nationality, Department
from init_rbac_data import init_rbac

def setup_system(app, purge=False):
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
            # Config DB
            Department.query.delete()
            Race.query.delete()
            Nationality.query.delete()
            db.session.commit()

        # 1. Initialize RBAC (Roles & Permissions)
        init_rbac(app)

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

        # 4. Seed default Departments, Races, and Nationalities if they do not exist
        default_departments = [
            'Cardiology', 'Diagnostics', 'General Medicine', 'Hematology', 
            'Information Technology', 'Laboratory', 'Outpatient', 'Pediatrics', 
            'Pharmacy', 'Radiology', 'Surgery', 'Urology', 'Administration', 'Human Resources'
        ]
        default_races = [
            'African', 'Asian', 'Caucasian', 'Hispanic', 'Mixed', 'Other'
        ]
        default_nationalities = [
            'Nigerian', 'American', 'British', 'Canadian', 'Ghanaian', 'Indian', 'South African', 'Other'
        ]

        for dept_name in default_departments:
            if not Department.query.filter_by(name=dept_name).first():
                db.session.add(Department(name=dept_name))
        
        for race_name in default_races:
            if not Race.query.filter_by(name=race_name).first():
                db.session.add(Race(name=race_name))
                
        for nat_name in default_nationalities:
            if not Nationality.query.filter_by(name=nat_name).first():
                db.session.add(Nationality(name=nat_name))

        db.session.commit()
        print(f"System setup complete for '{admin_user.username}'.")

if __name__ == "__main__":
    from app import app
    purge_requested = "--purge" in sys.argv
    setup_system(app, purge=purge_requested)
