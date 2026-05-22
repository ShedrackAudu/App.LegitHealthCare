import json
import pytest
from flask_jwt_extended import create_access_token
from app import app
from models import db, Role, Permission, QueueEntry, BioData, ScreeningYearBioData

@pytest.fixture
def setup_rbac_and_queues(client):
    # Setup permissions
    perm_manage_queues = Permission(name='manage_queues', description='Manage queues')
    perm_spirometry = Permission(name='lab_spirometry', description='Spirometry')
    perm_ecg = Permission(name='lab_ecg', description='ECG')
    
    db.session.add_all([perm_manage_queues, perm_spirometry, perm_ecg])
    db.session.commit()
    
    # Setup roles
    role_manage_queues = Role(name='QueueManager', description='Queue Manager')
    role_manage_queues.permissions.append(perm_manage_queues)
    
    role_spiro = Role(name='SpiroTech', description='Spirometry Tech')
    role_spiro.permissions.append(perm_spirometry)

    role_ecg = Role(name='ECGTech', description='ECG Tech')
    role_ecg.permissions.append(perm_ecg)
    
    db.session.add_all([role_manage_queues, role_spiro, role_ecg])
    db.session.commit()
    
    # Create BioData, screening bio-data, and queue entries under a request context
    # so they route to the 'dcp' bind database
    with app.test_request_context(headers={'X-Company-Context': 'dcp'}):
        parent_bio = BioData(
            staff_id='ST-001',
            first_name='John',
            last_name='Doe',
            department='Engineering',
            gender='Male',
            age=30
        )
        db.session.add(parent_bio)
        db.session.commit()
        
        # Create screening bio-data
        bio = ScreeningYearBioData(
            staff_id='ST-001',
            patient_id='P-2026-001',
            first_name='John',
            last_name='Doe',
            screening_year=2026,
            gender='Male',
            age=30,
            department='Engineering'
        )
        db.session.add(bio)
        
        # Create queue entries
        q1 = QueueEntry(
            staff_id='ST-001',
            department='Spirometry',
            screening_year=2026,
            status='Waiting',
            queue_number=1
        )
        q2 = QueueEntry(
            staff_id='ST-001',
            department='ECG',
            screening_year=2026,
            status='Waiting',
            queue_number=2
        )
        db.session.add_all([q1, q2])
        db.session.commit()

    return {
        'role_manage_queues': role_manage_queues,
        'role_spiro': role_spiro,
        'role_ecg': role_ecg
    }

def test_queue_counts_access(client, setup_user, setup_rbac_and_queues):
    # Test user starts with no roles/permissions
    # Requesting counts should return 403
    token = create_access_token(identity=str(setup_user.id))
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Company-Context': 'dcp'
    }
    res = client.get('/api/queue/?year=2026', headers=headers)
    assert res.status_code == 403
    
    # Assign 'SpiroTech' role to user
    role_spiro = setup_rbac_and_queues['role_spiro']
    setup_user.roles.append(role_spiro)
    db.session.commit()
    
    # Requesting counts should now return 200
    res = client.get('/api/queue/?year=2026', headers=headers)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data['spirometry'] == 1
    assert data['ecg'] == 1

def test_department_queue_access(client, setup_user, setup_rbac_and_queues):
    token = create_access_token(identity=str(setup_user.id))
    headers = {
        'Authorization': f'Bearer {token}',
        'X-Company-Context': 'dcp'
    }
    
    # Assign 'SpiroTech' role to user
    role_spiro = setup_rbac_and_queues['role_spiro']
    setup_user.roles.append(role_spiro)
    db.session.commit()
    
    # Can access Spirometry queue
    res = client.get('/api/queue/spirometry?year=2026', headers=headers)
    assert res.status_code == 200
    data = json.loads(res.data)
    assert len(data) == 1
    assert data[0]['staff_id'] == 'ST-001'
    
    # Cannot access ECG queue
    res = client.get('/api/queue/ecg?year=2026', headers=headers)
    assert res.status_code == 403
