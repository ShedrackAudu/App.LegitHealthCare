import json
import pytest
from flask_jwt_extended import create_access_token
from app import app
from models import db, Role, Permission, ReportParameter

@pytest.fixture
def setup_rbac_and_parameters(client):
    # Setup permissions
    perm = Permission(name='manage_report_customization', description='Configure report parameters')
    db.session.add(perm)
    db.session.commit()
    
    # Setup roles
    role = Role(name='ReportCustomizer', description='Report Customizer')
    role.permissions.append(perm)
    db.session.add(role)
    db.session.commit()

    # Seed one test parameter
    param = ReportParameter(
        id='pcv',
        category='fbc',
        parameter_name='PCV',
        reference_value='36-53.9',
        unit='%',
        display_order=1
    )
    db.session.add(param)
    db.session.commit()

    return {
        'role': role,
        'param': param
    }

def test_report_customization_get_unauthorized(client):
    res = client.get('/api/report-customization/')
    assert res.status_code == 401

def test_report_customization_get_forbidden(client, setup_user, setup_rbac_and_parameters):
    token = create_access_token(identity=str(setup_user.id))
    headers = {'Authorization': f'Bearer {token}'}
    res = client.get('/api/report-customization/', headers=headers)
    assert res.status_code == 403

def test_report_customization_get_success(client, setup_user, setup_rbac_and_parameters):
    # Assign role to user
    role = setup_rbac_and_parameters['role']
    setup_user.roles.append(role)
    db.session.commit()

    token = create_access_token(identity=str(setup_user.id))
    headers = {'Authorization': f'Bearer {token}'}
    res = client.get('/api/report-customization/', headers=headers)
    assert res.status_code == 200
    
    data = json.loads(res.data)
    assert len(data) >= 1
    assert data[0]['id'] == 'pcv'
    assert data[0]['parameter_name'] == 'PCV'
    assert data[0]['reference_value'] == '36-53.9'
    assert data[0]['unit'] == '%'

def test_report_customization_put_success(client, setup_user, setup_rbac_and_parameters):
    role = setup_rbac_and_parameters['role']
    setup_user.roles.append(role)
    db.session.commit()

    token = create_access_token(identity=str(setup_user.id))
    headers = {'Authorization': f'Bearer {token}'}
    
    update_data = [
        {
            'id': 'pcv',
            'parameter_name': 'PCV Updated',
            'reference_value': '35-55',
            'unit': '% vol'
        }
    ]
    res = client.put('/api/report-customization/', json=update_data, headers=headers)
    assert res.status_code == 200
    
    # Verify via database
    updated_param = ReportParameter.query.get('pcv')
    assert updated_param.parameter_name == 'PCV Updated'
    assert updated_param.reference_value == '35-55'
    assert updated_param.unit == '% vol'

def test_report_customization_put_invalid_payload(client, setup_user, setup_rbac_and_parameters):
    role = setup_rbac_and_parameters['role']
    setup_user.roles.append(role)
    db.session.commit()

    token = create_access_token(identity=str(setup_user.id))
    headers = {'Authorization': f'Bearer {token}'}
    
    res = client.put('/api/report-customization/', json={'invalid': 'object'}, headers=headers)
    assert res.status_code == 400

def test_report_customization_put_not_found(client, setup_user, setup_rbac_and_parameters):
    role = setup_rbac_and_parameters['role']
    setup_user.roles.append(role)
    db.session.commit()

    token = create_access_token(identity=str(setup_user.id))
    headers = {'Authorization': f'Bearer {token}'}
    
    update_data = [
        {
            'id': 'non_existent_id',
            'parameter_name': 'Non Existent'
        }
    ]
    res = client.put('/api/report-customization/', json=update_data, headers=headers)
    assert res.status_code == 404
