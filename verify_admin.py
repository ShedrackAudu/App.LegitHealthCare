import sqlite3
import os

db_path = 'instance/hc_system.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT username, is_verified FROM users WHERE username='admin'")
    row = cursor.fetchone()
    if row:
        print(f"User: {row[0]}, Verified: {row[1]}")
        if not row[1]:
            cursor.execute("UPDATE users SET is_verified=1 WHERE username='admin'")
            conn.commit()
            print("Set admin to verified")
    else:
        print("User admin not found")
    conn.close()
