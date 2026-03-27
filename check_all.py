import sqlite3
import os

db_path = os.path.join('backend', 'instance', 'hc_system.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(users)")
info = cursor.fetchall()
for col in info:
    print(col)
print("---")
cursor.execute("SELECT id, username, staff_id, email, roles FROM users")
rows = cursor.fetchall()
for r in rows:
    print(r)
conn.close()
