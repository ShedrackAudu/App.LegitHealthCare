import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Race, Nationality, Department

def seed_data():
    with app.app_context():
        # 1. Seed Races
        races = ['Black', 'White', 'Asian', 'Mixed', 'Other']
        for r_name in races:
            if not Race.query.filter_by(name=r_name).first():
                db.session.add(Race(name=r_name))
                print(f"Added race: {r_name}")
        
        # 2. Seed Nationalities
        nationalities = ['Nigerian', 'Ghanaian', 'American', 'British', 'Canadian', 'South African', 'Indian', 'Other']
        for n_name in nationalities:
            if not Nationality.query.filter_by(name=n_name).first():
                db.session.add(Nationality(name=n_name))
                print(f"Added nationality: {n_name}")

        # 3. Seed Departments
        departments = ['Consultation', 'Audiometry', 'Spirometry', 'ECG', 'Triage', 'Pharmacy', 'Diagnostics']
        for d_name in departments:
            if not Department.query.filter_by(name=d_name).first():
                db.session.add(Department(name=d_name))
                print(f"Added department: {d_name}")
                
        db.session.commit()
        print("Seeding complete.")

if __name__ == "__main__":
    seed_data()
