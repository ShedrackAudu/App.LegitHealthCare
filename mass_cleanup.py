import sqlite3
import os

dbs = ['instance/hc_system.db', 'backend/instance/hc_system.db']

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- Cleaning {db_path} ---")
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Look for the email that was pre-filled for 310520
        email = "audushedrack360@gmail.com"
        username = "310520"
        
        c.execute("DELETE FROM users WHERE email=? OR username=?", (email, username))
        deleted_count = conn.total_changes
        conn.commit()
        print(f"Deleted {deleted_count} records.")
        
        # Also cleanup 'shedy822' from previous check
        c.execute("DELETE FROM users WHERE username='shedy822' OR username='Shedy822'")
        deleted_count = conn.total_changes
        conn.commit()
        print(f"Deleted {deleted_count} shedy822 records.")
        
        conn.close()
    else:
        print(f"{db_path} NOT FOUND.")
