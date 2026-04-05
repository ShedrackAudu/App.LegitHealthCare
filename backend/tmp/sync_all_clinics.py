import os
import sqlite3

def sync_databases():
    instance_path = 'instance'
    db_files = ['hc_system.db', 'dcp.db', 'dct.db']
    
    for db_file in db_files:
        db_path = os.path.join(instance_path, db_file)
        if not os.path.exists(db_path):
            print(f"Skipping {db_path} - not found.")
            continue
            
        print(f"Syncing {db_path}...")
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # 1. Ensure app_branding has new columns
        for col in ['header_image', 'footer_image', 'signature_image']:
            try:
                c.execute(f"ALTER TABLE app_branding ADD COLUMN {col} VARCHAR(255)")
                print(f"  Added {col} to app_branding in {db_file}")
            except sqlite3.OperationalError:
                # Column already exists
                pass

        # 2. Ensure report_verifications table exists in hc_system.db (the main system db)
        if db_file == 'hc_system.db':
            c.execute('''
                CREATE TABLE IF NOT EXISTS report_verifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    staff_id VARCHAR(50) NOT NULL,
                    screening_year INTEGER NOT NULL,
                    section VARCHAR(50) NOT NULL,
                    verification_code VARCHAR(100) UNIQUE NOT NULL,
                    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print(f"  Ensured report_verifications exists in {db_file}")

        conn.commit()
        conn.close()

if __name__ == "__main__":
    sync_databases()
    print("Database sync complete for all clinics.")
