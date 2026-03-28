import os
import sys
# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, PatientPortalUser, StaffUser, BioData, ScreeningYearBioData

with app.app_context():
    print("Initializing all databases...")
    db.create_all()
    
    # Explicitly ensure each bind has its tables
    binds = app.config.get('SQLALCHEMY_BINDS', {})
    for bind in binds:
        try:
            engine = db.engines[bind]
            db.metadata.create_all(bind=engine)
            print(f"db.metadata.create_all() executed for bind: {bind}")
        except Exception as e:
            print(f"Error for bind {bind}: {e}")

    print("\nVerified Tables in each bind:")
    from sqlalchemy import inspect
    for bind in binds:
        engine = db.engines[bind]
        inspector = inspect(engine)
        print(f"Bind '{bind}': {inspector.get_table_names()}")
    
    # Default DB
    inspector_default = inspect(db.engine)
    print(f"Default Bind: {inspector_default.get_table_names()}")
    
    db.session.commit()
    print("\nInitialization Finished.")
