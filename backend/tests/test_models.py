import pytest
from models import db, StaffUser, PatientPortalUser, BioData

def test_staff_user_creation(setup_user):
    assert setup_user.id is not None
    assert setup_user.username == 'testuser'
    assert setup_user.check_password('TestPass1!')
    assert not setup_user.check_password('WrongPass')

def test_staff_user_to_dict(setup_user):
    data = setup_user.to_dict()
    assert data['username'] == 'testuser'
    assert data['email'] == 'test@example.com'
    assert 'password_hash' not in data
    assert isinstance(data['roles'], list)

def test_patient_user_creation(client):
    with client.application.app_context():
        # Clear any existing patient to avoid unique constraint if retrying
        db.session.query(PatientPortalUser).filter_by(username='patient1').delete()
        patient = PatientPortalUser(
            username='patient1',
            email='patient@example.com',
            phone='0987654321',
            first_name='Patient',
            last_name='One'
        )
        patient.set_password('PatPass1!')
        db.session.add(patient)
        db.session.commit()
        
        assert patient.id is not None
        assert patient.check_password('PatPass1!')
        assert patient.to_dict()['username'] == 'patient1'

def test_bio_data_creation(client):
    with client.application.app_context():
        # staff_id is required and must be unique
        db.session.query(BioData).filter_by(staff_id='STF001').delete()
        bio = BioData(
            staff_id='STF001',
            first_name='John',
            last_name='Doe',
            gender='Male',
            age=30
        )
        db.session.add(bio)
        db.session.commit()
        
        assert bio.id is not None
        assert bio.first_name == 'John'
