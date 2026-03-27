import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, User

with app.app_context():
    print("--- Backend View of Users ---")
    users = User.query.all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Phone: {u.phone}")
    
    # Test the filter specifically
    staff_id = "310520"
    email = "audushedrack360@gmail.com"
    existing = User.query.filter((User.username == staff_id) | (User.email == email)).first()
    if existing:
        print(f"\nCONFLICT FOUND for {staff_id} or {email}:")
        print(f"ID: {existing.id}, Username: {existing.username}, Email: {existing.email}")
    else:
        print(f"\nNo conflict found for {staff_id} or {email} in backend query.")
