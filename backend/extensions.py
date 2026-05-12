from flask_mail import Mail
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_socketio import SocketIO

# Initialize extensions without attaching to an app yet (keeps app.py clean)
mail = Mail()
jwt = JWTManager()
limiter = Limiter(key_func=get_remote_address, storage_uri="memory://")
socketio = SocketIO()
