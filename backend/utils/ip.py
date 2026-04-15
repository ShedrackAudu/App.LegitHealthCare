from flask import request

def get_client_ip():
    """
    Returns the real client IP address, handling proxies if necessary.
    """
    if request.headers.get('X-Forwarded-For'):
        # In case of multiple proxies, the first one is the client
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr
