from app import app, db
from sqlalchemy import text, inspect

def add_column():
    with app.app_context():
        # Check all binds
        for bind in [None, 'dcp', 'dct']:
            try:
                engine = db.get_engine(bind=bind)
                inspector = inspect(engine)
                columns = [c['name'] for c in inspector.get_columns('queue_entries')]
                if 'queue_number' not in columns:
                    db.session.execute(text('ALTER TABLE queue_entries ADD COLUMN queue_number INTEGER'))
                    db.session.commit()
                    print(f"Column added to {bind or 'default'} database")
                else:
                    print(f"Column already exists in {bind or 'default'} database")
            except Exception as e:
                print(f"Error updating {bind or 'default'}: {e}")

if __name__ == "__main__":
    add_column()
