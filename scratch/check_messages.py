import sqlite3
import os

db_path = 'backend/instance/hc_system.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("--- Groups ---")
    cursor.execute("SELECT id, name FROM chat_groups")
    groups = cursor.fetchall()
    for g in groups:
        print(f"ID: {g[0]}, Name: {g[1]}")
        
    print("\n--- Last 5 messages per Group ---")
    for g in groups:
        cursor.execute("SELECT id, sender_id, group_id, content FROM chat_messages WHERE group_id = ? ORDER BY created_at DESC LIMIT 5", (g[0],))
        msgs = cursor.fetchall()
        print(f"Group {g[1]} (ID {g[0]}): {len(msgs)} messages")
        for m in msgs:
            print(f"  [{m[0]}] User {m[1]}: {m[3][:30]}...")
            
    conn.close()
else:
    print("DB not found")
