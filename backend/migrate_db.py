import os
import sqlite3
from flask import Flask
from models import db, StaffUser, PatientPortalUser, BioData, ScreeningYearBioData, \
    Notification, TempAccessCode, AISettings, AppBranding, Department, QueueTracker, \
    Race, Nationality, SystemConfig, Appointment, ReportVerification, AuditLog, \
    AccessRequest, ChatMessage, ChatGroup, ChatGroupMember, UserContact, QueueEntry, \
    ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, \
    DirectorReview

def migrate():
    # Setup a dummy app to get SQLAlchemy context
    app = Flask(__name__)
    instance_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance'))
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(instance_path, 'hc_system.db')}"
    app.config['SQLALCHEMY_BINDS'] = {
        'patients': f"sqlite:///{os.path.join(instance_path, 'hc_patients.db')}",
        'dcp': f"sqlite:///{os.path.join(instance_path, 'dcp.db')}",
        'dct': f"sqlite:///{os.path.join(instance_path, 'dct.db')}"
    }
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    models = [
        StaffUser, PatientPortalUser, BioData, ScreeningYearBioData,
        Notification, TempAccessCode, AISettings, AppBranding, Department, QueueTracker,
        Race, Nationality, SystemConfig, Appointment, ReportVerification, AuditLog,
        AccessRequest, ChatMessage, ChatGroup, ChatGroupMember, UserContact, QueueEntry,
        ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult,
        DirectorReview
    ]

    with app.app_context():
        # First, ensure all tables exist (db.create_all handles multiple binds)
        db.create_all()

        for model in models:
            table_name = model.__tablename__
            bind_key = getattr(model, '__bind_key__', None)
            
            # Get the correct DB path
            if bind_key:
                db_url = app.config['SQLALCHEMY_BINDS'][bind_key]
            else:
                db_url = app.config['SQLALCHEMY_DATABASE_URI']
            
            db_path = db_url.replace('sqlite:///', '')
            
            if not os.path.exists(db_path):
                print(f"Skipping {table_name} - DB {db_path} not found")
                continue

            print(f"Checking table '{table_name}' in {db_path}...")
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get existing columns
            cursor.execute(f"PRAGMA table_info({table_name})")
            existing_cols = {row[1]: row[2] for row in cursor.fetchall()}
            
            # Get model columns
            for column in model.__table__.columns:
                col_name = column.name
                if col_name not in existing_cols:
                    print(f"  Adding missing column: {col_name} to {table_name}")
                    
                    # Determine type for SQLite
                    col_type = str(column.type).upper()
                    if 'VARCHAR' in col_type or 'STRING' in col_type:
                        sqlite_type = 'TEXT'
                    elif 'INTEGER' in col_type:
                        sqlite_type = 'INTEGER'
                    elif 'BOOLEAN' in col_type:
                        sqlite_type = 'BOOLEAN'
                    elif 'DATETIME' in col_type or 'DATE' in col_type:
                        sqlite_type = 'DATETIME'
                    elif 'TEXT' in col_type or 'JSON' in col_type:
                        sqlite_type = 'TEXT'
                    else:
                        sqlite_type = 'TEXT' # Fallback
                        
                    default_val = "NULL"
                    if column.default is not None:
                        if hasattr(column.default, 'arg') and not callable(column.default.arg):
                            default_val = repr(column.default.arg)
                            if sqlite_type == 'BOOLEAN':
                                default_val = '1' if column.default.arg else '0'

                    alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sqlite_type}"
                    if default_val != "NULL":
                         # SQLite ALTER TABLE ... ADD COLUMN supports simple defaults
                         # but for simplicity and safety (especially with booleans), we apply it carefully
                         pass
                    
                    try:
                        cursor.execute(alter_query)
                        # Set default if needed
                        if default_val != "NULL":
                            cursor.execute(f"UPDATE {table_name} SET {col_name} = {default_val}")
                    except Exception as e:
                        print(f"    Error adding {col_name}: {e}")
            
            conn.commit()
            conn.close()

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
