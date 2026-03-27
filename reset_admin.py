import sys
import os
import sqlite3

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app import app
from models import db, User

dbs = ['instance/hc_system.db', 'backend/instance/hc_system.db']

def reset_password(db_path):
    print(f"--- Resetting Admin Password in {db_path} ---")
    if not os.path.exists(db_path):
        print(f"File {db_path} not found.")
        return

    # Use Flask app context to set password correctly with bcrypt
    with app.app_context():
        # Temporarily point app to this DB
        original_uri = app.config['SQLALCHEMY_DATABASE_URI']
        app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.abspath(db_path)}"
        
        user = User.query.filter_by(username='admin').first()
        if user:
            user.set_password('Password123!')
            db.session.commit()
            print("Password reset successful.")
        else:
            print("Admin user not found.")
        
        # Restore original URI
        app.config['SQLALCHEMY_DATABASE_URI'] = original_uri

for db_path in dbs:
    reset_password(db_path)
