import pytest
from app import app, db
from models import User
from flask_jwt_extended import create_access_token

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.session.remove()
            db.drop_all()

@pytest.fixture
def setup_user(client):
    user = User(
        username='testuser', 
        email='test@example.com',
        phone='1234567890',
        first_name='Test',
        last_name='User',
        is_verified=True
    )
    user.set_password('TestPass1!')
    db.session.add(user)
    db.session.commit()
    return user

@pytest.fixture
def auth_headers(setup_user):
    with app.app_context():
        token = create_access_token(identity=str(setup_user.id))
        return {'Authorization': f'Bearer {token}'}
