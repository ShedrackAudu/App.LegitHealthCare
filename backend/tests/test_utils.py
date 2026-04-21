import pytest
from auth_utils import generate_otp, is_password_strong
from utils.ip import get_client_ip
from flask import Flask

def test_otp_generation():
    otp = generate_otp()
    assert len(otp) == 6
    assert otp.isdigit()

def test_password_strength():
    assert is_password_strong("StrongPass1!")
    assert not is_password_strong("weak")
    assert not is_password_strong("NoDigit!")
    assert not is_password_strong("nodigit!1")

def test_get_client_ip():
    app = Flask(__name__)
    with app.test_request_context(environ_base={'REMOTE_ADDR': '127.0.0.1'}):
        assert get_client_ip() == '127.0.0.1'
    
    with app.test_request_context(headers={'X-Forwarded-For': '192.168.1.1, 10.0.0.1'}):
        assert get_client_ip() == '192.168.1.1'
