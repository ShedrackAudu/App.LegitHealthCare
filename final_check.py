import sqlite3
conn = sqlite3.connect('backend/instance/hc_system.db')
c = conn.cursor()
c.execute("SELECT username, email, phone FROM users")
for row in c.fetchall():
    print(row)
conn.close()
