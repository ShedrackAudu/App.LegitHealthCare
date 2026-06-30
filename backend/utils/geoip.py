import urllib.request
import json
import random

MOCK_LOCATIONS = [
    {"country": "United States", "city": "New York", "lat": 40.7128, "lng": -74.0060},
    {"country": "United Kingdom", "city": "London", "lat": 51.5074, "lng": -0.1278},
    {"country": "Germany", "city": "Frankfurt", "lat": 50.1109, "lng": 8.6821},
    {"country": "Japan", "city": "Tokyo", "lat": 35.6762, "lng": 139.6503},
    {"country": "Australia", "city": "Sydney", "lat": -33.8688, "lng": 151.2093},
    {"country": "Nigeria", "city": "Lagos", "lat": 6.5244, "lng": 3.3792},
    {"country": "South Africa", "city": "Cape Town", "lat": -33.9249, "lng": 18.4241},
    {"country": "Brazil", "city": "São Paulo", "lat": -23.5505, "lng": -46.6333},
    {"country": "India", "city": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    {"country": "Canada", "city": "Toronto", "lat": 43.6532, "lng": -79.3832}
]

def resolve_ip_location(ip):
    # Strip port if present
    if ip and ":" in ip and not ip.startswith("::"):
        ip = ip.split(":")[0]

    # Handle local/loopback/private addresses
    if not ip or ip in ["127.0.0.1", "::1", "localhost"] or ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.16.") or ip.startswith("172.31."):
        return random.choice(MOCK_LOCATIONS)

    try:
        url = f"http://ip-api.com/json/{ip}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=1.0) as response:
            data = json.loads(response.read().decode())
            if data.get('status') == 'success':
                return {
                    "country": data.get('country', 'Unknown'),
                    "city": data.get('city', 'Unknown'),
                    "lat": float(data.get('lat', 0.0)),
                    "lng": float(data.get('lon', 0.0))
                }
    except Exception as e:
        pass

    # Fallback to random mock location
    return random.choice(MOCK_LOCATIONS)
