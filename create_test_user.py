import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, User, Role

with app.app_context():
    # Delete any conflicting users
    User.query.filter(
        (User.username == 'testadmin') | 
        (User.email == 'testadmin@example.com') | 
        (User.phone == '0987654321')
    ).delete()
    db.session.commit()
    print("Cleared conflicting users")
    
    new_user = User(
        first_name="Test",
        last_name="Admin",
        username="testadmin",
        phone="0987654321",
        email="testadmin@example.com",
        is_verified=True
    )
    new_user.set_password("password123")
    
    # Assign Admin role
    admin_role = Role.query.filter_by(name='Admin').first()
    if admin_role:
        new_user.roles.append(admin_role)
    
    db.session.add(new_user)
    db.session.commit()
    print("Created verified admin user and assigned Admin role")
