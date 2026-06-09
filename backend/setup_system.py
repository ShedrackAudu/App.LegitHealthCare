import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import db, StaffUser, PatientPortalUser, Role, Permission, ReportParameter
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
            db.session.commit()

        # 1. Initialize RBAC (Roles & Permissions)
        init_rbac(app)

        # 2. Ensure Admin Role has all permissions
        admin_role = Role.query.filter_by(name='Admin').first()
        if admin_role:
            admin_role.permissions = Permission.query.all()
            db.session.commit()

        # 2b. Seed default report parameters
        if not ReportParameter.query.first():
            print("Seeding default report parameters...")
            default_params = [
                # Blood Sugar
                {"id": "fbs", "category": "blood_sugar", "parameter_name": "FBS", "reference_value": "70-99", "unit": "ml/dL", "display_order": 1},
                {"id": "rbs", "category": "blood_sugar", "parameter_name": "RBS", "reference_value": "<200", "unit": "ml/dL", "display_order": 2},
                
                # FBC
                {"id": "pcv", "category": "fbc", "parameter_name": "PCV", "reference_value": "36-53.9", "unit": "%", "display_order": 1},
                {"id": "wbc", "category": "fbc", "parameter_name": "WBC", "reference_value": "3-11", "unit": "x109/L", "display_order": 2},
                {"id": "lymphocyte", "category": "fbc", "parameter_name": "Lymphocryte", "reference_value": "19.1-48", "unit": "%", "display_order": 3},
                {"id": "neutrophil", "category": "fbc", "parameter_name": "Neutrophil", "reference_value": "43.6-73.3", "unit": "%", "display_order": 4},
                {"id": "mixed", "category": "fbc", "parameter_name": "Mixed", "reference_value": "4.5-12.1", "unit": "%", "display_order": 5},
                {"id": "platelets", "category": "fbc", "parameter_name": "Platelets", "reference_value": "100-450", "unit": "x109/L", "display_order": 6},
                
                # KFT
                {"id": "potassium", "category": "kft", "parameter_name": "Potassium", "reference_value": "3.5-5.0", "unit": "mmol/L", "display_order": 1},
                {"id": "sodium", "category": "kft", "parameter_name": "Sodium", "reference_value": "135-145", "unit": "mmol/L", "display_order": 2},
                {"id": "chloride", "category": "kft", "parameter_name": "Chloride", "reference_value": "97-107", "unit": "mmol/L", "display_order": 3},
                {"id": "bicarbonate", "category": "kft", "parameter_name": "Bicarbonate", "reference_value": "20-31", "unit": "mmol/L", "display_order": 4},
                {"id": "urea", "category": "kft", "parameter_name": "Urea", "reference_value": "2.5-8.33", "unit": "mmol/L", "display_order": 5},
                {"id": "creatinine", "category": "kft", "parameter_name": "Cretinine", "reference_value": "Male: 80-133\nFemale: 62-115", "unit": "umol/L\numol/L", "display_order": 6},
                
                # Lipid Profile
                {"id": "total_cholesterol", "category": "lipid", "parameter_name": "Total Cholesterol", "reference_value": "<200", "unit": "mg/dL", "display_order": 1},
                {"id": "triglycerides", "category": "lipid", "parameter_name": "Trigracerides", "reference_value": "Male: <150\nFemale: <150", "unit": "mg/dL\nmg/dL", "display_order": 2},
                {"id": "hdl", "category": "lipid", "parameter_name": "HDL-c", "reference_value": "Male: =>40\nFemale: =>40", "unit": "mg/dL\nmg/dL", "display_order": 3},
                {"id": "ldl", "category": "lipid", "parameter_name": "LDL-c", "reference_value": "<130", "unit": "mg/dL", "display_order": 4},
                
                # Liver Function
                {"id": "ast", "category": "lft", "parameter_name": "AST", "reference_value": "0-46", "unit": "U/L", "display_order": 1},
                {"id": "alt", "category": "lft", "parameter_name": "ALT", "reference_value": "0-49", "unit": "U/L", "display_order": 2},
                {"id": "alp", "category": "lft", "parameter_name": "ALP", "reference_value": "Male: 80-306\nFemale: 64-306", "unit": "U/L\nU/L", "display_order": 3},
                {"id": "tb", "category": "lft", "parameter_name": "TB", "reference_value": "0-1.2", "unit": "mg/dL", "display_order": 4},
                {"id": "cb", "category": "lft", "parameter_name": "CB", "reference_value": "0-0.4", "unit": "mg/dL", "display_order": 5},
                
                # Urine Analysis
                {"id": "ua", "category": "ua", "parameter_name": "Sugar & Protein", "reference_value": "NA", "unit": "", "display_order": 1},
                
                # PSA
                {"id": "psa", "category": "psa", "parameter_name": "PSA", "reference_value": "NA", "unit": "", "display_order": 1}
            ]
            for p_dict in default_params:
                p = ReportParameter(**p_dict)
                db.session.add(p)
            db.session.commit()
            print("Successfully seeded default report parameters.")

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
    from app import app
    purge_requested = "--purge" in sys.argv
    setup_system(app, purge=purge_requested)
