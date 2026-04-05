import os
import sqlite3

instance_path = 'instance'
db_paths = [
    os.path.join(instance_path, 'hc_system.db'),
    os.path.join(instance_path, 'dcp.db'),
    os.path.join(instance_path, 'dct.db')
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"--- {db_path} MISSING ---")
        continue
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [t[0] for t in c.fetchall()]
    print(f"\n--- Tables in {db_path} ---")
    print(tables)
    
    if 'report_verifications' in tables:
        print("report_verifications table exists.")
    
    if 'app_branding' in tables:
        c.execute("PRAGMA table_info(app_branding)")
        cols = [col[1] for col in c.fetchall()]
        print(f"Columns in app_branding: {cols}")
        
    conn.close()
