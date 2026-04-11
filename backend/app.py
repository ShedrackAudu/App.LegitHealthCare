from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from models import db, StaffUser, PatientPortalUser, BioData, ScreeningYearBioData, User, bcrypt, AuditLog
import json
from auth_utils import mail, generate_otp, send_otp_email, is_password_strong
from routes.registration import registration_bp
from routes.consultation import consultation_bp
from routes.tests import tests_bp
from routes.director import director_bp
from routes.view_data import view_data_bp
from routes.account_bp import account_bp
from routes.security_bp import security_bp
from routes.notifications_bp import notifications_bp
from routes.branding_bp import branding_bp
from routes.departments_bp import departments_bp
from routes.queue_bp import queue_bp
from routes.ai_bp import ai_bp
from routes.messaging_bp import messaging_bp
from routes.contacts_bp import contacts_bp
from routes.admin_bp import admin_bp
from routes.email_bp import email_bp
from routes.config_bp import config_bp
from routes.appointments import appointments_bp
from routes.patient_bp import patient_bp
from socket_handlers import init_socket_handlers
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv


load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(app.instance_path, 'hc_system.db')}"
app.config['SQLALCHEMY_BINDS'] = {
    'dcp': f"sqlite:///{os.path.join(app.instance_path, 'dcp.db')}",
    'dct': f"sqlite:///{os.path.join(app.instance_path, 'dct.db')}",
    'patients': f"sqlite:///{os.path.join(app.instance_path, 'hc_patients.db')}"
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key-for-dev-only')

# Email config (to be filled by user)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

db.init_app(app)
bcrypt.init_app(app)
mail.init_app(app)

app.register_blueprint(registration_bp)
app.register_blueprint(consultation_bp)
app.register_blueprint(tests_bp, url_prefix='/api/tests')
app.register_blueprint(director_bp, url_prefix='/api/director')
app.register_blueprint(view_data_bp, url_prefix='/api')
app.register_blueprint(account_bp, url_prefix='/api/account')
app.register_blueprint(security_bp, url_prefix='/api/2fa')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(branding_bp, url_prefix='/api/branding')
app.register_blueprint(departments_bp, url_prefix='/api/departments')
app.register_blueprint(queue_bp, url_prefix='/api/queue')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(messaging_bp, url_prefix='/api/messages')
app.register_blueprint(contacts_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(email_bp, url_prefix='/api/email')
app.register_blueprint(config_bp, url_prefix='/api/config')
app.register_blueprint(appointments_bp, url_prefix='/api')
app.register_blueprint(patient_bp)



# Initialize Socket.IO handlers
init_socket_handlers(socketio)

def init_db():
    with app.app_context():
        # Create tables in default database
        db.create_all()
        # Create tables in all other binds
        for bind_name in app.config.get('SQLALCHEMY_BINDS', {}):
            engine = db.engines[bind_name]
            db.metadata.create_all(bind=engine)

from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors (like 404) so they're handled correctly
    if isinstance(e, HTTPException):
        return e
    
    app.logger.error(f"Unhandled Exception: {e}")
    # Return a generic error message in production
    return jsonify({"error": "Internal Server Error"}), 500

# Context processor for DB routing
@app.before_request
def set_db_context():
    pass


@app.route('/signup', methods=['POST'])
@cross_origin()
def signup():
    data = request.json
    
    # Validation
    required_fields = ['first_name', 'last_name', 'username', 'phone', 'email', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400
            
    if data.get('password') != data.get('confirm_password'):
        return jsonify({"error": "Passwords do not match"}), 400
        
    if not is_password_strong(data.get('password')):
        return jsonify({"error": "Password must be at least 8 chars long with 1 UC, 1 LC, 1 digit, and 1 special symbol."}), 400
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"error": "Username already exists"}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "Email already exists"}), 400

    new_user = User(
        first_name=data['first_name'],
        last_name=data['last_name'],
        username=data['username'],
        phone=data['phone'],
        email=data['email']
    )
    new_user.set_password(data['password'])
    
    # Generate OTP
    otp = generate_otp()
    new_user.otp_code = otp
    new_user.otp_expiry = datetime.utcnow() + timedelta(minutes=10)
    
    db.session.add(new_user)
    db.session.commit()
    
    send_otp_email(new_user, otp)
    
    return jsonify({"message": "User created. Please verify OTP sent to your email.", "user_id": new_user.id}), 201

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    user_id = data.get('user_id')
    otp = data.get('otp')
    portal = data.get('portal', 'staff')
    
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp and user.otp_expiry > datetime.utcnow():
        user.is_verified = True
        user.otp_code = None
        db.session.commit()
        return jsonify({"message": "Email verified successfully. You can now login."}), 200
    
    return jsonify({"error": "Invalid or expired OTP"}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    identifier = (data.get('identity') or data.get('username') or '').strip()
    password = data.get('password')
    portal = data.get('portal', 'staff')
    
    app.logger.info(f"Login attempt for: {identifier} (Portal: {portal})")
    
    from models import StaffUser, PatientPortalUser
    from sqlalchemy import func
    
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.filter(
        (func.lower(Model.username) == func.lower(identifier)) | 
        (func.lower(Model.email) == func.lower(identifier)) | 
        (Model.phone == identifier)
    ).first()
    
    if user and user.check_password(password):
        if not user.is_verified:
            return jsonify({"error": "Please verify your email first"}), 403
            
        # Optional: Add cross-portal block just in case
        if portal == 'staff' and not hasattr(user, 'roles'): # PatientPortalUser won't have roles
             return jsonify({"error": "This account does not have staff access."}), 403
        
        # 2FA Enforcement
        if getattr(user, 'is_2fa_enabled', False):
            return jsonify({
                "requires_2fa": True,
                "user_id": user.id,
                "message": "Two-factor authentication required"
            }), 200
            
        user.last_seen_at = datetime.utcnow()
        
        # Log successful login (when 2FA is skipped)
        login_log = AuditLog(
            user_id=user.id,
            action="LOGIN_SUCCESS",
            resource=f"{portal.capitalize()} Portal",
            details=json.dumps({
                "method": "PASSWORD",
                "identity": identifier,
                "portal": portal,
                "timestamp": datetime.utcnow().isoformat()
            }),
            ip_address=request.remote_addr
        )
        db.session.add(login_log)
        db.session.commit()
        
        return jsonify({
            "message": "Login successful",
            "token": "demo-token", 
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    identity = data.get('identity', '').strip()
    portal = data.get('portal', 'staff')
    
    from models import StaffUser, PatientPortalUser
    from sqlalchemy import func
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.filter(
        (func.lower(Model.username) == func.lower(identity)) | 
        (func.lower(Model.email) == func.lower(identity)) | 
        (Model.phone == identity)
    ).first()
    
    if not user:
        return jsonify({"error": "No account found with that identity."}), 404
        
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()
    
    from auth_utils import send_otp_email
    try:
        success = send_otp_email(user, otp, subject="Password Recovery Code")
        if not success:
            app.logger.error(f"Failed to send recovery email to {user.email}")
            return jsonify({"error": "System was unable to send the recovery email. Please check SMTP settings or contact IT."}), 500
    except Exception as e:
        app.logger.error(f"Failed to send recovery email: {e}")
        return jsonify({"error": "An unexpected error occurred while sending the recovery email."}), 500
        
    return jsonify({
        "message": "Recovery code sent to your registered email.",
        "user_id": user.id
    }), 200

@app.route('/forgot-password/verify', methods=['POST'])
def verify_recovery_otp():
    data = request.json
    user_id = data.get('user_id')
    otp = data.get('otp')
    portal = data.get('portal', 'staff')
    
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp and user.otp_expiry > datetime.utcnow():
        return jsonify({"message": "OTP verified successfully"}), 200
        
    return jsonify({"error": "Invalid or expired recovery code"}), 400

@app.route('/forgot-password/reset', methods=['POST'])
def reset_password():
    data = request.json
    user_id = data.get('user_id')
    otp = data.get('otp')
    new_password = data.get('password')
    portal = data.get('portal', 'staff')
    
    if not new_password or not is_password_strong(new_password):
        return jsonify({"error": "Password does not meet strength requirements (8+ chars, UC, LC, Digit, Symbol)."}), 400
        
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp and user.otp_expiry > datetime.utcnow():
        user.set_password(new_password)
        user.otp_code = None # Clear OTP after success
        user.otp_expiry = None
        db.session.commit()
        return jsonify({"message": "Password reset successful. You can now login."}), 200
        
    return jsonify({"error": "Auth session expired or invalid"}), 400

@app.route('/login/2fa', methods=['POST'])
def login_2fa():
    data = request.json
    user_id = data.get('user_id')
    code = data.get('code')
    portal = data.get('portal', 'staff')
    
    from models import StaffUser, PatientPortalUser
    Model = PatientPortalUser if portal == 'patient' else StaffUser
    
    user = Model.query.get(user_id)
    if not user or not getattr(user, 'is_2fa_enabled', False):
        return jsonify({"error": "Invalid request"}), 400
        
    import pyotp
    import json
    
    is_valid = False
    if user.totp_secret:
        totp = pyotp.totp.TOTP(user.totp_secret)
        is_valid = totp.verify(code)
        
    if not is_valid and user.backup_codes:
        backup_codes = json.loads(user.backup_codes)
        if code in backup_codes:
            is_valid = True
            backup_codes.remove(code)
            user.backup_codes = json.dumps(backup_codes)
            db.session.commit()
            
    if is_valid:
        user.last_seen_at = datetime.utcnow()
        
        # Log successful 2FA login
        login_2fa_log = AuditLog(
            user_id=user.id,
            action="LOGIN_2FA_SUCCESS",
            resource=f"{portal.capitalize()} Portal",
            details=json.dumps({
                "method": "2FA_TOTP" if user.totp_secret else "2FA_BACKUP",
                "portal": portal,
                "timestamp": datetime.utcnow().isoformat()
            }),
            ip_address=request.remote_addr
        )
        db.session.add(login_2fa_log)
        db.session.commit()
        
        return jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        }), 200
        
    return jsonify({"error": "Invalid 2FA code"}), 401
@app.route('/api/logout', methods=['POST'])
def logout():
    data = request.json
    user_id = data.get('user_id')
    portal = data.get('portal', 'staff')
    
    if user_id:
        try:
            logout_log = AuditLog(
                user_id=user_id,
                action="LOGOUT",
                resource=f"{portal.capitalize()} Portal",
                details=json.dumps({
                    "portal": portal,
                    "timestamp": datetime.utcnow().isoformat()
                }),
                ip_address=request.remote_addr
            )
            db.session.add(logout_log)
            db.session.commit()
            return jsonify({"message": "Logout recorded"}), 200
        except Exception as e:
            app.logger.error(f"Failed to log logout for user {user_id}: {e}")
            return jsonify({"error": "Logout logging failed"}), 500
            
    return jsonify({"message": "Logout complete (client-only)"}), 200

if __name__ == '__main__':
    init_db()
    
    # Automatically ensure admin account exists
    try:
        from setup_system import setup_system
        with app.app_context():
            setup_system(purge=False)
    except Exception as e:
        app.logger.error(f"Error initializing system: {e}")
        
    socketio.run(app, debug=False, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
        except Exception as e:
            app.logger.error(f"Failed to log logout for user {user_id}: {e}")
            return jsonify({"error": "Logout logging failed"}), 500
            
    return jsonify({"message": "Logout complete (client-only)"}), 200

if __name__ == '__main__':
    init_db()
    
    # Automatically ensure admin account exists
    try:
        from setup_system import setup_system
        with app.app_context():
            setup_system(purge=False)
    except Exception as e:
        app.logger.error(f"Error initializing system: {e}")
        
    socketio.run(app, debug=False, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
                    "portal": portal,
                    "timestamp": datetime.utcnow().isoformat()
                }),
                ip_address=request.remote_addr
            )
            db.session.add(logout_log)
            db.session.commit()
            return jsonify({"message": "Logout recorded"}), 200
        except Exception as e:
            app.logger.error(f"Failed to log logout for user {user_id}: {e}")
            return jsonify({"error": "Logout logging failed"}), 500
            
    return jsonify({"message": "Logout complete (client-only)"}), 200

if __name__ == '__main__':
    init_db()
    
    # Automatically ensure admin account exists
    try:
        from setup_system import setup_system
        with app.app_context():
            setup_system(purge=False)
    except Exception as e:
        app.logger.error(f"Error initializing system: {e}")
        
    socketio.run(app, debug=False, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
        except Exception as e:
            app.logger.error(f"Failed to log logout for user {user_id}: {e}")
            return jsonify({"error": "Logout logging failed"}), 500
            
    return jsonify({"message": "Logout complete (client-only)"}), 200

if __name__ == '__main__':
    init_db()
    
    # Automatically ensure admin account exists
    try:
        from setup_system import setup_system
        with app.app_context():
            setup_system(purge=False)
    except Exception as e:
        app.logger.error(f"Error initializing system: {e}")
        
    socketio.run(app, debug=False, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
