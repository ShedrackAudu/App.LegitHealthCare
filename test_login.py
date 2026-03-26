import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, User

with app.app_context():
    user = User.query.filter_by(username='testadmin').first()
    if user:
        print(f"User found: {user.username}")
        # check_password is a method on User class in models.py
        if user.check_password("password123"):
            print("Password check PASSED")
        else:
            print("Password check FAILED")
    else:
        print("User NOT found")
