import json

def test_update_profile(client, setup_user, auth_headers):
    response = client.put('/api/account/profile', 
        json={
            'first_name': 'Updated',
            'last_name': 'Name',
            'email': 'updated@example.com',
            'phone': '0987654321'
        },
        headers=auth_headers
    )
    data = json.loads(response.data)
    assert response.status_code == 200
    assert data['message'] == 'Profile updated successfully'
    assert data['user']['first_name'] == 'Updated'
    
def test_change_password(client, setup_user, auth_headers):
    response = client.put('/api/account/password',
        json={
            'current_password': 'TestPass1!',
            'new_password': 'NewStrongPass2@',
            'confirm_password': 'NewStrongPass2@'
        },
        headers=auth_headers
    )
    data = json.loads(response.data)
    assert response.status_code == 200
    assert data['message'] == 'Password updated successfully'
    
    # Verify we can login with the new password
    login_res = client.post('/login', json={
        'identity': 'testuser',
        'password': 'NewStrongPass2@'
    })
    assert login_res.status_code == 200
