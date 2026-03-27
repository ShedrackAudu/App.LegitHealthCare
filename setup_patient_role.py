import sys
import os
sys.path.append(os.path.abspath('backend'))
from app import app
from models import db, Role, Permission

def setup_patient_role():
    with app.app_context():
        # 1. Create Permission
        view_perm = Permission.query.filter_by(name='view_own_records').first()
        if not view_perm:
            view_perm = Permission(name='view_own_records', description='Allow patients to view their own medical records', category='Patient')
            db.session.add(view_perm)
            print("Created 'view_own_records' permission.")
        
        # 2. Create Role
        patient_role = Role.query.filter_by(name='Patient').first()
        if not patient_role:
            patient_role = Role(name='Patient', description='Default role for patient portal users')
            db.session.add(patient_role)
            print("Created 'Patient' role.")
        
        db.session.commit()
        
        # 3. Assign Permission to Role
        if view_perm not in patient_role.permissions:
            patient_role.permissions.append(view_perm)
            db.session.commit()
            print("Assigned 'view_own_records' to 'Patient' role.")

if __name__ == '__main__':
    setup_patient_role()
