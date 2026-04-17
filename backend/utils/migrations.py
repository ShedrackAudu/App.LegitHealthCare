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
                            # Standard SQL works for both SQLite and PostgreSQL
                            conn.execute(text("ALTER TABLE screening_year_bio_data ADD COLUMN is_notified_ready BOOLEAN DEFAULT FALSE"))
                            conn.commit()
                        app.logger.info(f"Successfully updated {name} schema.")
                    else:
                        app.logger.debug(f"Column already exists in {name} database.")
            except Exception as e:
                app.logger.error(f"Migration error for {name}: {e}")
