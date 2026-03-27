import sys
import os
sys.path.append(os.path.abspath('backend'))
from app import app
from models import db, BioData

def create_mock_patient():
    with app.app_context():
        # Using dcp engine
        engine = db.engines['dcp']
        with engine.connect() as conn:
            # Check if exists
            check = conn.execute(db.text("SELECT * FROM bio_data WHERE staff_id = 'STF-TEST-001'")).fetchone()
            if not check:
                conn.execute(db.text("""
                    INSERT INTO bio_data (staff_id, first_name, last_name, department, gender, dob, phone, email)
                    VALUES ('STF-TEST-001', 'Test', 'Patient', 'ICT', 'Male', '1990-01-01', '08012345678', 'testpatient@example.com')
                """))
                conn.commit()
                print("Created mock patient STF-TEST-001 in DCP.")
            else:
                print("Mock patient STF-TEST-001 already exists.")

if __name__ == '__main__':
    create_mock_patient()
