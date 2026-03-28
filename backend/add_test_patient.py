from app import app
from models import db, PatientPortalUser, bcrypt

def add_test_user():
    with app.app_context():
        # Delete existing test user if any
        PatientPortalUser.query.filter_by(username='testpatient').delete()
        
        p = PatientPortalUser(
            first_name='Test',
            last_name='Patient',
            username='testpatient',
            email='test@example.com',
            phone='1234567890',
            password_hash=bcrypt.generate_password_hash('testpass').decode('utf-8'),
            is_verified=True
        )
        db.session.add(p)
        db.session.commit()
        print("Test user 'testpatient' created with password 'testpass'")

if __name__ == "__main__":
    add_test_user()
