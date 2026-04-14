import sqlite3
import os

databases = [
    'backend/instance/hc_system.db',
    'backend/instance/hc_patients.db',
    'backend/instance/dcp.db',
    'backend/instance/dct.db'
]

for db_path in databases:
    if not os.path.exists(db_path):
        print(f"[{db_path}] Not found")
        continue
        
    print(f"[{db_path}] Checking...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [t[0] for t in cursor.fetchall()]
    print(f"  Tables: {', '.join(tables)}")
    
    if 'chat_groups' in tables:
        cursor.execute("SELECT id, name FROM chat_groups")
        groups = cursor.fetchall()
        print(f"  Groups found: {len(groups)}")
        for g in groups:
            print(f"    ID: {g[0]}, Name: {g[1]}")
            cursor.execute("SELECT COUNT(*) FROM chat_messages WHERE group_id = ?", (g[0],))
            count = cursor.fetchone()[0]
            print(f"      Messages: {count}")
    
    conn.close()
