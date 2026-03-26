import sqlite3
import os

def check_db(db_path, staff_id):
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id, department, status FROM queue_entries WHERE staff_id = ?", (staff_id,))
        rows = cursor.fetchall()
        if rows:
            print(f"\nFOUND in {db_path}:")
            for r in rows:
                print(f"  ID: {r[0]}, Dept: {r[1]}, Status: {r[2]}")
            
            # Clean them if found more than 1 per dept
            # (Adding cleaning logic here to be sure)
            cursor.execute("""
                DELETE FROM queue_entries 
                WHERE staff_id = ? AND id NOT IN (
                    SELECT MAX(id) FROM queue_entries 
                    WHERE staff_id = ? GROUP BY department
                )
            """, (staff_id, staff_id))
            if cursor.rowcount > 0:
                print(f"  CLEANED {cursor.rowcount} duplicates.")
                conn.commit()
    except sqlite3.OperationalError:
        pass # Table doesn't exist

    conn.close()

if __name__ == "__main__":
    root_path = r"C:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare App"
    staff_id = "310520"
    
    dbs = [
        "backend/dcp.db", "backend/dct.db", "backend/healthcare.db",
        "backend/instance/dcp.db", "backend/instance/dct.db", "backend/instance/hc_system.db",
        "instance/dcp.db", "instance/dct.db", "instance/hc_system.db"
    ]
    
    for db in dbs:
        check_db(os.path.join(root_path, db), staff_id)
