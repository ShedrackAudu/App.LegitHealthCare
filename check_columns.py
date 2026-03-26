import sqlite3
import os

dbs = ['instance/hc_system.db', 'instance/dcp.db', 'instance/dct.db']

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- {db_path} ---")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(director_review)")
        columns = cursor.fetchall()
        for col in columns:
            print(col[1])
        conn.close()
        print("\n")
