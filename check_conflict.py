import sqlite3
import os

db_path = 'backend/instance/hc_system.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

# Target data from the screenshot/request
staff_id = "310520"
email = "audushedrack360@gmail.com"
phone = "+2347051071296" # From screenshot

print(f"Checking for conflict with Staff ID: {staff_id}, Email: {email}, Phone: {phone}")

c.execute("SELECT id, username, email, phone FROM users WHERE username=? OR email=? OR phone=?", (staff_id, email, phone))
conflicts = c.fetchall()

if conflicts:
    print("\nCONFLICTS FOUND:")
    for row in conflicts:
        print(f"ID: {row[0]}, Username: {row[1]}, Email: {row[2]}, Phone: {row[3]}")
else:
    print("\nNo conflicts found in 'users' table.")

# Also check for any partial matches (e.g. phone without +234)
plain_phone = phone.replace("+234", "0")
c.execute("SELECT id, username, email, phone FROM users WHERE phone LIKE ?", (f"%{plain_phone}",))
partial_phone = c.fetchall()
if partial_phone:
    print("\nPARTIAL PHONE CONFLICTS FOUND:")
    for row in partial_phone:
        print(f"ID: {row[0]}, Username: {row[1]}, Email: {row[2]}, Phone: {row[3]}")

conn.close()
