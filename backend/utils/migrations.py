import os
from sqlalchemy import text, inspect
from models import db

def ensure_schema(app):
    """
    Checks all database binds and adds missing columns if necessary.
    This ensures that updates like 'is_notified_ready' are automatically 
    applied when deploying to Render or running locally.
    """
    with app.app_context():
        # List of all engines including the default one
        engines = {
            'default': db.engine,
            **db.engines
        }
        
        for name, engine in engines.items():
            try:
                inspector = inspect(engine)
                # We only care about screening_year_bio_data for this specific update
                if 'screening_year_bio_data' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('screening_year_bio_data')]
                    
                    if 'is_notified_ready' not in columns:
                        app.logger.info(f"Adding 'is_notified_ready' column to {name} database...")
                        with engine.connect() as conn:
                            # Note: Table names and column names cannot be bound as parameters in SQL.
                            # However, we ensure they come from a safe, hardcoded set of allowed values.
                            conn.execute(text("ALTER TABLE screening_year_bio_data ADD COLUMN is_notified_ready BOOLEAN DEFAULT FALSE"))
                            conn.commit()
                        app.logger.info(f"Successfully updated {name} schema.")
                    else:
                        app.logger.debug(f"Column already exists in {name} database.")
                
                # Check for passport_image in bio_data
                if 'bio_data' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('bio_data')]
                    if 'passport_image' not in columns:
                        app.logger.info(f"Adding 'passport_image' column to {name} database bio_data table...")
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE bio_data ADD COLUMN passport_image VARCHAR(255)"))
                            conn.commit()
                        app.logger.info(f"Successfully updated {name} schema for bio_data.")
                    else:
                        app.logger.debug(f"passport_image column already exists in {name} bio_data table.")

                # 2. Fix AuditLog Foreign Key (Conflict with Patient Portal in Postgres)
                if 'audit_logs' in inspector.get_table_names():
                    fks = inspector.get_foreign_keys('audit_logs')
                    for fk in fks:
                        if 'user_id' in fk['constrained_columns'] and fk.get('referred_table') == 'users':
                            con_name = fk['name']
                            app.logger.info(f"Detected restrictive FK '{con_name}' on audit_logs in {name}. Removal in progress...")
                            try:
                                with engine.connect() as conn:
                                    # We use a literal text block for the drop constraint
                                    # Since con_name is retrieved from the DB metadata, it is trusted.
                                    conn.execute(text(f"ALTER TABLE audit_logs DROP CONSTRAINT {con_name}"))
                                    conn.commit()
                                app.logger.info(f"Successfully removed FK '{con_name}' from {name} database.")
                            except Exception as e:
                                app.logger.debug(f"Could not drop constraint {con_name} (might be SQLite): {e}")

                # 3. Add must_reset_password to users and patient_users
                if 'users' in inspector.get_table_names():
                    cols = [c['name'] for c in inspector.get_columns('users')]
                    if 'must_reset_password' not in cols:
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE users ADD COLUMN must_reset_password BOOLEAN DEFAULT FALSE"))
                            conn.commit()

                if 'patient_users' in inspector.get_table_names():
                    cols = [c['name'] for c in inspector.get_columns('patient_users')]
                    if 'must_reset_password' not in cols:
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE patient_users ADD COLUMN must_reset_password BOOLEAN DEFAULT FALSE"))
                            conn.commit()

                # 4. Add contact fields to app_branding
                if 'app_branding' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('app_branding')]
                    if 'whatsapp' not in columns:
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE app_branding ADD COLUMN whatsapp VARCHAR(50)"))
                            conn.commit()
                    if 'email' not in columns:
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE app_branding ADD COLUMN email VARCHAR(120)"))
                            conn.commit()
                    if 'phone' not in columns:
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE app_branding ADD COLUMN phone VARCHAR(50)"))
                            conn.commit()
                
                # 5. Comprehensive Appointment Table Update
                if 'appointments' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('appointments')]
                    # Use explicit statements for each column to avoid dynamic string execution (SEC-010)
                    appointment_updates = [
                        ('status', "ALTER TABLE appointments ADD COLUMN status VARCHAR(20) DEFAULT 'Pending'"),
                        ('booked_by_type', "ALTER TABLE appointments ADD COLUMN booked_by_type VARCHAR(20)"),
                        ('booked_by_username', "ALTER TABLE appointments ADD COLUMN booked_by_username VARCHAR(50)"),
                        ('phone', "ALTER TABLE appointments ADD COLUMN phone VARCHAR(20)"),
                        ('email', "ALTER TABLE appointments ADD COLUMN email VARCHAR(100)"),
                        ('nationality', "ALTER TABLE appointments ADD COLUMN nationality VARCHAR(100)"),
                        ('gender', "ALTER TABLE appointments ADD COLUMN gender VARCHAR(20)"),
                        ('dob', "ALTER TABLE appointments ADD COLUMN dob VARCHAR(50)"),
                        ('age', "ALTER TABLE appointments ADD COLUMN age INTEGER")
                    ]
                    
                    with engine.connect() as conn:
                        for col_name, sql in appointment_updates:
                            if col_name not in columns:
                                try:
                                    conn.execute(text(sql))
                                    conn.commit()
                                except Exception as e:
                                    app.logger.error(f"Failed to add '{col_name}' to appointments: {e}")

                # 6. Add ua_remark_others, breast_others, abdomen_others to consultation_data and director_reviews
                if 'consultation_data' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('consultation_data')]
                    with engine.connect() as conn:
                        if 'ua_remark_others' not in columns:
                            conn.execute(text("ALTER TABLE consultation_data ADD COLUMN ua_remark_others VARCHAR(255)"))
                        if 'breast_others' not in columns:
                            conn.execute(text("ALTER TABLE consultation_data ADD COLUMN breast_others VARCHAR(255)"))
                        if 'abdomen_others' not in columns:
                            conn.execute(text("ALTER TABLE consultation_data ADD COLUMN abdomen_others VARCHAR(255)"))
                        conn.commit()

                if 'director_reviews' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('director_reviews')]
                    with engine.connect() as conn:
                        if 'ua_remark_others' not in columns:
                            conn.execute(text("ALTER TABLE director_reviews ADD COLUMN ua_remark_others VARCHAR(255)"))
                        if 'breast_others' not in columns:
                            conn.execute(text("ALTER TABLE director_reviews ADD COLUMN breast_others VARCHAR(255)"))
                        if 'abdomen_others' not in columns:
                            conn.execute(text("ALTER TABLE director_reviews ADD COLUMN abdomen_others VARCHAR(255)"))
                        conn.commit()

                # 7. Widen Special Tests Result columns
                if 'special_tests_results' in inspector.get_table_names():
                    with engine.connect() as conn:
                        try:
                            conn.execute(text("ALTER TABLE special_tests_results ALTER COLUMN ecg_result TYPE VARCHAR(255)"))
                            conn.execute(text("ALTER TABLE special_tests_results ALTER COLUMN spirometry_result TYPE VARCHAR(255)"))
                            conn.execute(text("ALTER TABLE special_tests_results ALTER COLUMN audiometry_result TYPE VARCHAR(255)"))
                            conn.commit()
                        except Exception as e:
                            app.logger.debug(f"Could not alter special_tests_results columns (might be SQLite or already altered): {e}")

                # 8. Add urea and creatinine to lft_results if they do not exist
                if 'lft_results' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('lft_results')]
                    with engine.connect() as conn:
                        if 'urea' not in columns:
                            app.logger.info(f"Adding 'urea' column to lft_results table in {name} database...")
                            conn.execute(text("ALTER TABLE lft_results ADD COLUMN urea VARCHAR(20)"))
                        if 'creatinine' not in columns:
                            app.logger.info(f"Adding 'creatinine' column to lft_results table in {name} database...")
                            conn.execute(text("ALTER TABLE lft_results ADD COLUMN creatinine VARCHAR(20)"))
                        conn.commit()

                # 9. Add last_reminder_sent to patient_users (for weekly verification reminders)
                if 'patient_users' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('patient_users')]
                    if 'last_reminder_sent' not in columns:
                        app.logger.info(f"Adding 'last_reminder_sent' column to patient_users table in {name} database...")
                        with engine.connect() as conn:
                            conn.execute(text("ALTER TABLE patient_users ADD COLUMN last_reminder_sent TIMESTAMP"))
                            conn.commit()
                        app.logger.info(f"Successfully updated {name} schema for patient_users.")

                # 10. Add test-specific prompt columns to ai_settings
                if 'ai_settings' in inspector.get_table_names():
                    columns = [c['name'] for c in inspector.get_columns('ai_settings')]
                    with engine.connect() as conn:
                        if 'prompt_fbc' not in columns:
                            app.logger.info(f"Adding 'prompt_fbc' column to ai_settings table in {name} database...")
                            conn.execute(text("ALTER TABLE ai_settings ADD COLUMN prompt_fbc TEXT"))
                        if 'prompt_lipid' not in columns:
                            app.logger.info(f"Adding 'prompt_lipid' column to ai_settings table in {name} database...")
                            conn.execute(text("ALTER TABLE ai_settings ADD COLUMN prompt_lipid TEXT"))
                        if 'prompt_lft' not in columns:
                            app.logger.info(f"Adding 'prompt_lft' column to ai_settings table in {name} database...")
                            conn.execute(text("ALTER TABLE ai_settings ADD COLUMN prompt_lft TEXT"))
                        if 'prompt_kft' not in columns:
                            app.logger.info(f"Adding 'prompt_kft' column to ai_settings table in {name} database...")
                            conn.execute(text("ALTER TABLE ai_settings ADD COLUMN prompt_kft TEXT"))
                        conn.commit()

            except Exception as e:
                app.logger.error(f"Migration error for {name}: {e}")
