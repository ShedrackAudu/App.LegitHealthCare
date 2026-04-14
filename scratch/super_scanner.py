import sqlite3
import os
import glob

instance_path = 'backend/instance'
db_files = glob.glob(os.path.join(instance_path, '*.db'))

for db_path in db_files:
    print(f"\n[{db_path}]")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cursor.fetchall()]
        
        if 'chat_groups' in tables:
            cursor.execute("SELECT COUNT(*) FROM chat_groups")
            count = cursor.fetchone()[0]
            print(f"  Groups: {count}")
            if count > 0:
                cursor.execute("SELECT id, name FROM chat_groups")
                for g in cursor.fetchall():
                   print(f"    - ID {g[0]}: {g[1]}")
        
        if 'chat_messages' in tables:
            cursor.execute("SELECT COUNT(*) FROM chat_messages")
            m_count = cursor.fetchone()[0]
            print(f"  Messages: {m_count}")
            if m_count > 0:
                cursor.execute("SELECT id, group_id, content FROM chat_messages WHERE group_id IS NOT NULL LIMIT 5")
                for m in cursor.fetchall():
                    print(f"    - Msg {m[0]} for Group {m[1]}: {m[2][:20]}...")
                    
        conn.close()
    except Exception as e:
        print(f"  Error: {e}")
