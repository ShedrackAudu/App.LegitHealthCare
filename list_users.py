import sqlite3
import os

db_path = os.path.join('backend', 'instance', 'hc_system.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, username, roles FROM users")
users = cursor.fetchall()
for u in users:
    print(u)
conn.close()
