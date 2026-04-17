import json
import re
from auth_utils import is_password_strong, generate_totp_secret

def test_login_success(client, setup_user):
    response = client.post('/login', json={
        'identity': 'testuser',
        'password': 'TestPass1!'
    })
    data = json.loads(response.data)
    assert response.status_code == 200
    assert data['message'] == 'Login successful'
    assert 'user' in data
    assert data['user']['username'] == 'testuser'

def test_login_failure(client, setup_user):
    response = client.post('/login', json={
        'identity': 'testuser',
        'password': 'WrongPassword1!'
    })
    data = json.loads(response.data)
    assert response.status_code == 401
    assert data['error'] == 'Invalid credentials'

def test_password_policy_enforcement():
    # Should fail matching policy
    assert not is_password_strong("weakpass")
    assert not is_password_strong("NoSpecial1")
    assert not is_password_strong("nospecial!1")
    assert not is_password_strong("Short1!")
    
    # Should pass matching policy
    assert is_password_strong("StrongPass1!")

def test_generate_totp_secret():
    secret = generate_totp_secret()
    # verify length
    assert len(secret) == 32
    # verify it contains valid base32 characters (A-Z, 2-7)
    assert re.match(r'^[A-Z2-7]+$', secret)
