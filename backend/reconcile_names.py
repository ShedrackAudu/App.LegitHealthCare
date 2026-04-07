import sqlite3
import os

instance_path = 'c:\\Users\\DELL\\Documents\\Legit HealthCare\\Legit HealthCare App\\backend\\instance'

def run_reconciliation():
    print("Starting master name reconciliation...")
    
    patients_db = os.path.join(instance_path, 'hc_patients.db')
    if not os.path.exists(patients_db):
        print("Portal DB not found.")
        return

    # Connect to Portal DB
    portal_conn = sqlite3.connect(patients_db)
    portal_cursor = portal_conn.cursor()
    
    # Get all portal users
    portal_cursor.execute("SELECT id, username, email FROM patient_users")
    portal_users = portal_cursor.fetchall()
    
    updated_count = 0
    
    # Connect to Clinical DBs
    clinical_dbs = ['dcp.db', 'dct.db']
    
    for user_id, username, email in portal_users:
        found_name = None
        
        # Search in clinical dbs
        for db_file in clinical_dbs:
            db_path = os.path.join(instance_path, db_file)
            if not os.path.exists(db_path): continue
            
            clin_conn = sqlite3.connect(db_path)
            clin_cursor = clin_conn.cursor()
            
            # Match by staff_id (username) OR email
            clin_cursor.execute("""
                SELECT first_name, last_name FROM bio_data 
                WHERE LOWER(staff_id) = LOWER(?) OR (email IS NOT NULL AND LOWER(email) = LOWER(?))
                LIMIT 1
            """, (username, email))
            
            res = clin_cursor.fetchone()
            clin_conn.close()
            
            if res:
                found_name = res
                break
        
        if found_name:
            # Update Portal DB
            portal_cursor.execute(
                "UPDATE patient_users SET first_name = ?, last_name = ? WHERE id = ?",
                (found_name[0], found_name[1], user_id)
            )
            print(f"Updated portal user @{username}: {found_name[0]} {found_name[1]}")
            updated_count += 1
            
    portal_conn.commit()
    portal_conn.close()
    print(f"\nReconciliation complete. Total updated: {updated_count}")

if __name__ == "__main__":
    run_reconciliation()
