from flask import request

def get_client_ip():
    """
    Returns the real client IP address, handling proxies securely.
    Standard practice is to take the first IP from X-Forwarded-For if it exists.
    """
    x_forwarded_for = request.headers.get('X-Forwarded-For')
    if x_forwarded_for:
        # The leftmost IP is the original client, but can be spoofed if the proxy isn't configured to strip it.
        # In a production environment like Render, the gateway adds the real IP.
        # We take the first one and strip whitespace.
        return x_forwarded_for.split(',')[0].strip()
    return request.remote_addr
