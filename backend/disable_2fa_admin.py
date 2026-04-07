import sqlite3
import os

db_path = 'c:\\Users\\DELL\\Documents\\Legit HealthCare\\Legit HealthCare App\\backend\\instance\\hc_system.db'

def disable_admin_2fa():
    if not os.path.exists(db_path):
        print("Database not found.")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL, backup_codes = NULL WHERE username = 'admin'")
    
    if cursor.rowcount > 0:
        print(f"Successfully disabled 2FA for 'admin'. Rows affected: {cursor.rowcount}")
    else:
        print("User 'admin' not found or 2FA was already disabled.")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    disable_admin_2fa()
