import sqlite3
import os

dbs = ['instance/dcp.db', 'instance/dct.db']
new_cols = [
    'luts',
    'chronic_cough',
    'chronic_chest_pain',
    'chest_infection',
    'heart_dx',
    'palor',
    'jaundice',
    'murmur',
    'chest_status'
]

for db_path in dbs:
    if os.path.exists(db_path):
        print(f"--- Processing {db_path} ---")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        for col_name in new_cols:
            try:
                cursor.execute(f"ALTER TABLE director_reviews ADD COLUMN {col_name} TEXT")
                print(f"Added {col_name}")
            except sqlite3.OperationalError:
                print(f"Column {col_name} already exists")
        conn.commit()
        conn.close()
    else:
        print(f"Database {db_path} not found")
