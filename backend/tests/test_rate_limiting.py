import requests
import time

BASE_URL = "http://localhost:5000"

def test_login_rate_limit():
    print("Testing Rate Limiting on /login...")
    payload = {
        "identity": "admin",
        "password": "wrongpassword",
        "portal": "staff"
    }
    
    for i in range(1, 8):
        try:
            response = requests.post(f"{BASE_URL}/login", json=payload)
            print(f"Attempt {i}: Status {response.status_code}")
            if response.status_code == 429:
                print("SUCCESS: Rate limit triggered!")
                print(f"Response: {response.json()}")
                return
        except Exception as e:
            print(f"Request failed: {e}")
            break
        time.sleep(0.1)
    
    print("FAILED: Rate limit not triggered after 7 attempts.")

if __name__ == "__main__":
    # Note: Requires the server to be running locally
    test_login_rate_limit()
