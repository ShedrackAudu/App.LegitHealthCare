import sqlite3
import os

def clean_duplicates(db_path):
    if not os.path.exists(db_path):
        return

    print(f"\nCleaning duplicates in {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Find duplicates (same staff_id, screening_year, department)
        cursor.execute("""
            SELECT staff_id, screening_year, department, COUNT(*) as count 
            FROM queue_entries 
            GROUP BY staff_id, screening_year, department 
            HAVING count > 1
        """)
        duplicates = cursor.fetchall()
        
        for staff_id, year, dept, count in duplicates:
            print(f"  Found {count} entries for {staff_id} in {dept} ({year}). Keeping the latest one.")
            # Keep the one with the highest ID (latest)
            cursor.execute("""
                DELETE FROM queue_entries 
                WHERE staff_id = ? AND screening_year = ? AND department = ? 
                AND id NOT IN (
                    SELECT MAX(id) FROM queue_entries 
                    WHERE staff_id = ? AND screening_year = ? AND department = ?
                )
            """, (staff_id, year, dept, staff_id, year, dept))
            
        conn.commit()
    except sqlite3.OperationalError as e:
        print(f"  Error: {e}")

    conn.close()

if __name__ == "__main__":
    backend_path = r"C:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare App\backend"
    
    clean_duplicates(os.path.join(backend_path, "healthcare.db"))
    clean_duplicates(os.path.join(backend_path, "dcp.db"))
    clean_duplicates(os.path.join(backend_path, "dct.db"))
