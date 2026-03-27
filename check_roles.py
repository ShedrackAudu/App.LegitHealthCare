import sys
import os
sys.path.append(os.path.abspath('backend'))
from app import app
from models import db, Role
with app.app_context():
    roles = Role.query.all()
    if not roles:
        print("No roles found.")
    for role in roles:
        print(f"Role ID: {role.id}, Name: {role.name}")
