import os
import sqlite3
from datetime import datetime

# Script to manually create missing the report_verifications table in the system database.
def create_table():
    db_path = 'instance/hc_system.db'
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    # Create report_verifications table
    print("Creating report_verifications table...")
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
    
    # Ensure branding columns exist (just in case)
    print("Ensuring branding columns...")
    for col in ['header_image', 'footer_image', 'signature_image']:
        try:
            c.execute(f"ALTER TABLE app_branding ADD COLUMN {col} VARCHAR(255)")
            print(f"Added {col} to app_branding.")
        except sqlite3.OperationalError:
            print(f"Column {col} already exists in app_branding.")

    conn.commit()
    conn.close()
    print("Database sync complete.")

if __name__ == "__main__":
    create_table()
