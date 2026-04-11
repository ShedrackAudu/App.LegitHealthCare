import sqlite3
import os

db_dir = os.path.join('backend', 'instance')
db_files = ['hc_system.db', 'dcp.db', 'dct.db', 'hc_patients.db']

columns_to_add = [
    ('clinic_slogan', 'TEXT DEFAULT "Excellence."'),
    ('auth_branding_image', 'TEXT'),
    ('header_image', 'TEXT'),
    ('footer_image', 'TEXT'),
    ('signature_image', 'TEXT'),
    ('doctor_name', 'TEXT DEFAULT "Dr. Anyanwu Ugochukwu D. FMCPath"'),
    ('doctor_post', 'TEXT DEFAULT "Consultant in Charge"')
]

for db_file in db_files:
    db_path = os.path.join(db_dir, db_file)
    if not os.path.exists(db_path):
        print(f"Skipping {db_file}: File not found")
        continue

    print(f"Checking {db_file}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check current columns
    cursor.execute('PRAGMA table_info(app_branding)')
    existing_columns = [col[1] for col in cursor.fetchall()]
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_columns:
            print(f"  Adding column '{col_name}' to {db_file}")
            try:
                cursor.execute(f'ALTER TABLE app_branding ADD COLUMN {col_name} {col_type}')
            except Exception as e:
                print(f"  Error adding {col_name}: {e}")
        else:
            print(f"  Column '{col_name}' already exists in {db_file}")
            
    conn.commit()
    conn.close()

print("Migration complete!")
