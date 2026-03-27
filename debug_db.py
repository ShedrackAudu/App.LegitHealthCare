import sqlite3
import os

db_path = 'backend/instance/hc_system.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check for the specific patient the user mentioned or others
    print("Checking for username '310520' or email 'audushedrack@gmail.com'...")
    cursor.execute("SELECT id, username, email, phone, roles FROM users")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
    conn.close()
else:
    print(f"Database not found at {db_path}")
