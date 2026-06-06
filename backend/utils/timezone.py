from datetime import datetime
from zoneinfo import ZoneInfo

def wat_now():
    """Returns timezone-aware current time in WAT (Africa/Lagos)."""
    return datetime.now(ZoneInfo("Africa/Lagos"))

def wat_now_naive():
    """Returns timezone-naive current time in WAT (Africa/Lagos) for DB compatibility."""
    return datetime.now(ZoneInfo("Africa/Lagos")).replace(tzinfo=None)
