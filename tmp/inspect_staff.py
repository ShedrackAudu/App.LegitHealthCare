import sqlite3
import os

def check_spaces(db_path, staff_id):
    if not os.path.exists(db_path):
        return

    print(f"\nChecking spaces in {db_path} for Staff ID: {staff_id}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT staff_id FROM queue_entries WHERE staff_id LIKE ?", (f"%{staff_id}%",))
        rows = cursor.fetchall()
        print(f"QueueEntry staff_ids ({len(rows)}):")
        for r in rows:
            print(f"  '{repr(r[0])}'")
            
        cursor.execute("SELECT staff_id FROM screening_year_bio_data WHERE staff_id LIKE ?", (f"%{staff_id}%",))
        bio_rows = cursor.fetchall()
        print(f"ScreeningYearBioData staff_ids ({len(bio_rows)}):")
        for r in bio_rows:
            print(f"  '{repr(r[0])}'")
            
    except sqlite3.OperationalError as e:
        print(f"  Error: {e}")

    conn.close()

if __name__ == "__main__":
    db_path = r"C:\Users\DELL\Documents\Legit HealthCare\Legit HealthCare App\backend\dcp.db"
    check_spaces(db_path, "310520")
