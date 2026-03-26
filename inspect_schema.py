import sqlite3
import os

dbs = ['instance/hc_system.db', 'instance/dcp.db', 'instance/dct.db']

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- {db_path} ---")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {[t[0] for t in tables]}")
        
        for table in [t[0] for t in tables]:
            print(f"\nColumns for {table}:")
            cursor.execute(f"PRAGMA table_info({table})")
            columns = cursor.fetchall()
            for col in columns:
                print(f"  {col[1]} ({col[2]})")
        
        conn.close()
        print("\n" + "="*50 + "\n")
