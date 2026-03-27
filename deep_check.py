import sqlite3
import os

def check_db(name, path):
    print(f"\n--- Checking {name} ({path}) ---")
    if not os.path.exists(path):
        print("Not found.")
        return
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    print(f"Tables: {tables}")
    
    for table in tables:
        tname = table[0]
        print(f"\nTable: {tname}")
        cursor.execute(f"PRAGMA table_info({tname})")
        cols = cursor.fetchall()
        for col in cols:
            print(f"  Col: {col[1]} ({col[2]})")
            
        # If it's bio_data or users, show some rows
        if tname in ['bio_data', 'users']:
            try:
                cursor.execute(f"SELECT * FROM {tname} LIMIT 5")
                rows = cursor.fetchall()
                for r in rows:
                    print(f"  Row: {r}")
            except Exception as e:
                print(f"  Error reading rows: {e}")
    conn.close()

check_db("HC System", "backend/instance/hc_system.db")
check_db("DCP", "backend/instance/dcp.db")
check_db("DCT", "backend/instance/dct.db")
