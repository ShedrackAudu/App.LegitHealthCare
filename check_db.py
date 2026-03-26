import sqlite3
import os

db_path = 'backend/instance/hc_system.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        cursor.execute("SELECT * FROM users;")
        users = cursor.fetchall()
        print(f"Users found: {len(users)}")
        for user in users:
            print(user)
    except Exception as e:
        print(f"SQL Error: {e}")
    finally:
        conn.close()
