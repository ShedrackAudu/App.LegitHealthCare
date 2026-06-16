import os
import time

# Set default timezone to WAT (Africa/Lagos)
os.environ['TZ'] = 'Africa/Lagos'
if hasattr(time, 'tzset'):
    time.tzset()

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, set_access_cookies, unset_jwt_cookies
from models import db, StaffUser, PatientPortalUser, BioData, ScreeningYearBioData, User, bcrypt, AuditLog
from extensions import mail, jwt, limiter, socketio
from auth_utils import generate_otp, send_otp_email, is_password_strong
from utils.ip import get_client_ip
from setup_system import setup_system
from socket_handlers import init_socket_handlers


load_dotenv()

app = Flask(__name__)

# Extension Initialization
limiter.init_app(app)

# CORS Hardening (Phase 5)

# CORS Hardening (Phase 5)
frontend_urls = [url.strip() for url in os.getenv('FRONTEND_URL', '*').split(',')]
if 'http://localhost:5173' in frontend_urls and 'http://localhost:5174' not in frontend_urls:
    frontend_urls.append('http://localhost:5174')
    
from flask_cors import CORS
CORS(app, resources={r"/*": {"origins": frontend_urls}}, supports_credentials=True)

socketio.init_app(app, cors_allowed_origins=frontend_urls, ping_timeout=60, ping_interval=25)

# Configuration
raw_db_url = os.getenv('DATABASE_URL')
if raw_db_url:
    # Render/Heroiku provides 'postgres://', but SQLAlchemy 1.4+ requires 'postgresql://'
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = raw_db_url
    
    has_params = '?' in raw_db_url
    separator = '&' if has_params else '?'
    
    # For Render/Production, use PostgreSQL schemas for multi-tenant isolation
    app.config['SQLALCHEMY_BINDS'] = {
        'dcp': raw_db_url + separator + "options=-csearch_path%3Ddcp,public",
        'dct': raw_db_url + separator + "options=-csearch_path%3Ddct,public",
        'patients': raw_db_url + separator + "options=-csearch_path%3Dpatients,public"
    }
else:
    # Use SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(app.instance_path, 'hc_system.db')}"
    app.config['SQLALCHEMY_BINDS'] = {
        'dcp': f"sqlite:///{os.path.join(app.instance_path, 'dcp.db')}",
        'dct': f"sqlite:///{os.path.join(app.instance_path, 'dct.db')}",
        'patients': f"sqlite:///{os.path.join(app.instance_path, 'hc_patients.db')}"
    }

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
if not app.config['SECRET_KEY']:
    if os.getenv('FLASK_ENV') == 'production':
        raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable MUST be set in production.")
    app.config['SECRET_KEY'] = 'dev-secret-key-insecure-only-for-local'
    print("WARNING: Using insecure default SECRET_KEY. This is only acceptable for local development.")

# Email config (to be filled by user)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['APP_URL'] = os.getenv('APP_URL', 'http://localhost:5173')
app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', app.config['APP_URL'])
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=4)
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies', 'query_string']
app.config['JWT_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False # Set to True later for full CSRF protection
app.config['JWT_ACCESS_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_SAMESITE'] = 'Lax' if os.getenv('FLASK_ENV') != 'production' else 'None'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16MB limit

db.init_app(app)
bcrypt.init_app(app)
mail.init_app(app)
jwt.init_app(app)

# JWT Error Handlers
@jwt.unauthorized_loader
def unauthorized_response(callback):
    return jsonify({"error": "Unauthorized: Missing Authorization Header"}), 401

@jwt.invalid_token_loader
def invalid_token_response(callback):
    return jsonify({"error": "Security Alert: Invalid authentication token provided."}), 401

@jwt.expired_token_loader
def expired_token_response(jwt_header, jwt_payload):
    return jsonify({"error": "Session Expired: Please log in again to continue."}), 401

from flask_limiter import RateLimitExceeded
@app.errorhandler(RateLimitExceeded)
def handle_rate_limit_exceeded(e):
    return jsonify({
        "error": "Too many requests",
        "message": "Security policy limit reached. Please wait a moment before trying again.",
        "retry_after": e.description
    }), 429

# Automated Schema Management
from utils.migrations import ensure_schema
with app.app_context():
    ensure_schema(app)

# Import Blueprints (avoid circular imports by importing after extensions init)
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
from routes.files_bp import files_bp
from routes.inventory_bp import inventory_bp
from routes.report_customization_bp import report_customization_bp
from routes.webhooks import webhooks_bp

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
app.register_blueprint(files_bp, url_prefix='/api/files')
app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
app.register_blueprint(report_customization_bp, url_prefix='/api/report-customization')
app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')



# Initialize Socket.IO handlers
init_socket_handlers(socketio)

def init_db():
    with app.app_context():
        # Create schemas in postgres
        if 'SQLALCHEMY_DATABASE_URI' in app.config and app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgresql'):
            with db.engine.connect() as conn:
                from sqlalchemy import text
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS dcp;"))
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS dct;"))
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS patients;"))
                conn.commit()

        # Create tables in default database
        db.create_all()
        # Create tables in all other binds
        for bind_name in app.config.get('SQLALCHEMY_BINDS', {}):
            engine = db.engines[bind_name]
            db.metadata.create_all(bind=engine)

        # Dynamic migrations: alter columns to TEXT for assessment_hx_pe in postgresql
        for engine_key, engine_instance in ([('default', db.engine)] + list(db.engines.items())):
            if engine_instance.dialect.name == 'postgresql':
                with engine_instance.connect() as conn:
                    from sqlalchemy import text
                    try:
                        conn.execute(text("ALTER TABLE consultation_data ALTER COLUMN assessment_hx_pe TYPE TEXT;"))
                        conn.commit()
                    except Exception:
                        pass
                    try:
                        conn.execute(text("ALTER TABLE director_reviews ALTER COLUMN assessment_hx_pe TYPE TEXT;"))
                        conn.commit()
                    except Exception:
                        pass

from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    # Pass through HTTP errors (like 404, 429) as JSON so they're handled correctly by frontend
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    
    app.logger.error(f"Unhandled Exception: {e}")
    # Return a generic error message in production
    return jsonify({"error": "Internal Server Error"}), 500

# Context processor for DB routing
@app.before_request
def set_db_context():
    pass


@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "healthy", "timestamp": datetime.utcnow().isoformat()}), 200


@app.route('/api/config/staff-signup-status', methods=['GET'])
def signup_status():
    from models import SystemConfig
    config = SystemConfig.query.get('staff_signup_enabled')
    # Default to true if not set
    is_enabled = config.value.lower() == 'true' if config else True
    return jsonify({"staff_signup_enabled": is_enabled}), 200

@app.route('/api/config/default-theme', methods=['GET'])
def get_default_theme():
    from models import SystemConfig
    config = SystemConfig.query.get('default_theme')
    # Default to 'light' if not set
    theme = config.value if config else 'light'
    return jsonify({"default_theme": theme}), 200

@app.route('/api/config/bulk-ai-review-status', methods=['GET'])
def get_bulk_ai_review_status():
    from models import SystemConfig
    config = SystemConfig.query.get('bulk_ai_review_enabled')
    # Default to true if not set
    is_enabled = config.value.lower() == 'true' if config else True
    return jsonify({"bulk_ai_review_enabled": is_enabled}), 200

@app.route('/api/config/bulk-report-download-status', methods=['GET'])
def get_bulk_report_download_status():
    from models import SystemConfig
    config = SystemConfig.query.get('bulk_report_download_enabled')
    # Default to true if not set
    is_enabled = config.value.lower() == 'true' if config else True
    return jsonify({"bulk_report_download_enabled": is_enabled}), 200

@app.route('/api/config/ticker', methods=['GET'])
def get_ticker_config():
    from models import SystemConfig
    msg_config = SystemConfig.query.get('ticker_message')
    icon_config = SystemConfig.query.get('ticker_icon')
    enabled_config = SystemConfig.query.get('ticker_enabled')
    
    return jsonify({
        "message": msg_config.value if msg_config else "",
        "icon": icon_config.value if icon_config else "info",
        "enabled": (enabled_config.value.lower() == 'true') if enabled_config else False
    }), 200


@app.route('/signup', methods=['POST'])
@limiter.limit("5 per hour")
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
        
    username = data.get('username', '').strip().lower()
    
    # Reject special characters except underscore
    import re
    if not re.match(r'^[a-z0-9_]+$', username):
        return jsonify({"error": "Username can only contain lowercase letters, numbers, and underscores."}), 400

    # Config Check
    if data.get('email') != 'admin@legit.com':
        from models import SystemConfig
        config = SystemConfig.query.get('staff_signup_enabled')
        is_enabled = config.value.lower() == 'true' if config else True
        if not is_enabled:
            return jsonify({"error": "Staff registration is currently disabled by the system administrator."}), 403

    existing_user_by_username = User.query.filter_by(username=username).first()
    if existing_user_by_username:
        if existing_user_by_username.is_verified:
            return jsonify({"error": "Username already exists"}), 400
        else:
            # Re-use unverified account
            new_user = existing_user_by_username
            new_user.first_name = data['first_name']
            new_user.last_name = data['last_name']
            new_user.phone = data['phone']
            new_user.email = data['email']
            new_user.set_password(data['password'])
    else:
        existing_user_by_email = User.query.filter_by(email=data['email']).first()
        if existing_user_by_email:
            if existing_user_by_email.is_verified:
                return jsonify({"error": "Email already exists"}), 400
            else:
                # Re-use unverified account
                new_user = existing_user_by_email
                new_user.first_name = data['first_name']
                new_user.last_name = data['last_name']
                new_user.username = username
                new_user.phone = data['phone']
                new_user.set_password(data['password'])
        else:
            new_user = User(
                first_name=data['first_name'],
                last_name=data['last_name'],
                username=username,
                phone=data['phone'],
                email=data['email']
            )
            new_user.set_password(data['password'])
            db.session.add(new_user)
    
    # Generate OTP
    otp = generate_otp()
    new_user.otp_code = otp
    new_user.otp_expiry = datetime.now() + timedelta(minutes=10)
    
    db.session.commit()
    
    try:
        success = send_otp_email(new_user, otp)
        if not success:
            app.logger.error(f"Failed to send welcome OTP to {new_user.email}")
            return jsonify({
                "message": "User created, but we couldn't send the verification email. Please contact IT to manually verify your account or check your SMTP settings.",
                "user_id": new_user.id,
                "email_error": True
            }), 201
    except Exception as e:
        app.logger.error(f"SMTP Error during registration: {e}")
        return jsonify({
            "message": f"User created, but email service failed: {str(e)}",
            "user_id": new_user.id,
            "email_error": True
        }), 201
    
    return jsonify({"message": "User created. Please verify OTP sent to your email.", "user_id": new_user.id}), 201

@app.route('/api/resend-otp', methods=['POST'])
@limiter.limit("5 per hour")
def resend_otp():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If an account exists, a new code has been sent."}), 200
        
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.now() + timedelta(minutes=10)
    db.session.commit()
    
    try:
        success = send_otp_email(user, otp)
        if not success:
             return jsonify({"error": "Failed to connect to email server"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
    return jsonify({"message": "New code sent!"}), 200


@app.route('/verify-otp', methods=['POST'])
@limiter.limit("5 per hour")
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
        
    if user.otp_code == otp and user.otp_expiry > datetime.now():
        user.is_verified = True
        user.otp_code = None
        db.session.commit()
        return jsonify({"message": "Email verified successfully. You can now login."}), 200
    
    return jsonify({"error": "Invalid or expired OTP"}), 400

@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.json
    identifier = (data.get('identity') or data.get('username') or '').strip()
    password = data.get('password')
    portal = data.get('portal', 'auto')
    
    app.logger.info(f"Login attempt for: {identifier} (Portal Param: {portal})")
    
    from models import StaffUser, PatientPortalUser
    from sqlalchemy import func
    
    user = None
    detected_portal = None

    if portal in ['staff', 'auto']:
        user = StaffUser.query.filter(
            (func.lower(StaffUser.username) == func.lower(identifier)) | 
            (func.lower(StaffUser.email) == func.lower(identifier)) | 
            (StaffUser.phone == identifier)
        ).first()
        if user:
            detected_portal = 'staff'

    # Try Patient if user not found and portal is 'patient' or 'auto'
    if not user and portal in ['patient', 'auto']:
        user = PatientPortalUser.query.filter(
            (func.lower(PatientPortalUser.username) == func.lower(identifier)) | 
            (func.lower(PatientPortalUser.email) == func.lower(identifier)) | 
            (PatientPortalUser.phone == identifier)
        ).first()
        if user:
            detected_portal = 'patient'
    
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if user and user.check_password(password):
        if not user.is_verified:
            # Generate a new OTP so they can continue
            otp = generate_otp()
            user.otp_code = otp
            user.otp_expiry = datetime.now() + timedelta(minutes=10)
            db.session.commit()
            
            # Try to send it
            try:
                send_otp_email(user, otp)
            except:
                pass # Silently fail, user can resend on the next page
                
            return jsonify({
                "error": "Please verify your email first", 
                "needs_verification": True,
                "user_id": user.id,
                "email": user.email,
                "portal": detected_portal
            }), 403
            
        # 2FA Enforcement
        if getattr(user, 'is_2fa_enabled', False):
            return jsonify({
                "requires_2fa": True,
                "user_id": user.id,
                "portal": detected_portal,
                "message": "Two-factor authentication required"
            }), 200
            
        user.last_seen_at = datetime.now()
        
        # Log successful login
        try:
            login_log = AuditLog(
                user_id=user.id,
                action="LOGIN_SUCCESS",
                resource=f"{detected_portal.capitalize()} Portal",
                details=json.dumps({
                    "method": "PASSWORD",
                    "identity": identifier,
                    "portal": detected_portal,
                    "timestamp": datetime.now().isoformat()
                }),
                ip_address=get_client_ip()
            )
            db.session.add(login_log)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"Login audit failed for {identifier}: {e}")
        
        # Generate JWT with detected portal
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"portal": detected_portal}
        )
        
        response = jsonify({
            "message": "Login successful",
            "token": access_token, 
            "portal": detected_portal,
            "user": user.to_dict()
        })
        set_access_cookies(response, access_token)
        return response, 200
        
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    data = request.json
    identity = data.get('identity', '').strip()
    portal = data.get('portal', 'auto')
    
    from models import StaffUser, PatientPortalUser
    from sqlalchemy import func
    
    user = None
    if portal in ['staff', 'auto']:
        user = StaffUser.query.filter(
            (func.lower(StaffUser.username) == func.lower(identity)) | 
            (func.lower(StaffUser.email) == func.lower(identity)) | 
            (StaffUser.phone == identity)
        ).first()

    if not user and portal in ['patient', 'auto']:
        user = PatientPortalUser.query.filter(
            (func.lower(PatientPortalUser.username) == func.lower(identity)) | 
            (func.lower(PatientPortalUser.email) == func.lower(identity)) | 
            (PatientPortalUser.phone == identity)
        ).first()
    
    if not user:
        # Standardize response to prevent user enumeration (SEC-007)
        # We return a 200 OK even if the user isn't found to keep attackers guessing.
        return jsonify({
            "message": "If an account with that identity exists, a recovery code has been sent to the registered email.",
            "user_id": None,
            "portal": portal
        }), 200
        
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.now() + timedelta(minutes=15)
    db.session.commit()
    
    from auth_utils import send_otp_email
    try:
        success = send_otp_email(user, otp, subject="Password Recovery Code")
        if not success:
            app.logger.error(f"Failed to send recovery email to {user.email}")
            return jsonify({"error": "The system could not connect to the email server. Please ensure MAIL_USERNAME and MAIL_PASSWORD are set correctly in your environment variables."}), 500
    except Exception as e:
        app.logger.error(f"Detailed SMTP error: {e}")
        return jsonify({"error": f"Email Service Error: {str(e)}"}), 500
        
    detected_portal = 'staff' if StaffUser.query.get(user.id) == user else 'patient'
    # Actually, it's safer to check the model class
    detected_portal = 'staff' if isinstance(user, StaffUser) else 'patient'

    return jsonify({
        "message": "If an account with that identity exists, a recovery code has been sent to the registered email.",
        "user_id": user.id,
        "portal": detected_portal
    }), 200

@app.route('/forgot-password/verify', methods=['POST'])
@limiter.limit("5 per minute")
def verify_recovery_otp():
    data = request.json
    user_id = data.get('user_id')
    otp = data.get('otp')
    portal = data.get('portal', 'auto')
    
    from models import StaffUser, PatientPortalUser
    user = StaffUser.query.get(user_id) if portal == 'staff' else PatientPortalUser.query.get(user_id) if portal == 'patient' else None
    
    if not user:
        # If auto, try both
        user = StaffUser.query.get(user_id) or PatientPortalUser.query.get(user_id)
        
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp and user.otp_expiry > datetime.now():
        return jsonify({"message": "OTP verified successfully"}), 200
        
    return jsonify({"error": "Invalid or expired recovery code"}), 400

@app.route('/forgot-password/reset', methods=['POST'])
@limiter.limit("5 per hour")
def reset_password():
    data = request.json
    user_id = data.get('user_id')
    otp = data.get('otp')
    new_password = data.get('password')
    portal = data.get('portal', 'auto')
    
    if not new_password or not is_password_strong(new_password):
        return jsonify({"error": "Password does not meet strength requirements (8+ chars, UC, LC, Digit, Symbol)."}), 400
        
    from models import StaffUser, PatientPortalUser
    user = StaffUser.query.get(user_id) if portal == 'staff' else PatientPortalUser.query.get(user_id) if portal == 'patient' else None
    
    if not user:
        user = StaffUser.query.get(user_id) or PatientPortalUser.query.get(user_id)
        
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp and user.otp_expiry > datetime.now():
        user.set_password(new_password)
        user.is_verified = True # Resetting via email/OTP verifies the account
        user.otp_code = None # Clear OTP after success
        user.otp_expiry = None
        db.session.commit()
        return jsonify({"message": "Password reset successful. You can now login."}), 200
        
    return jsonify({"error": "Auth session expired or invalid"}), 400

@app.route('/login/2fa', methods=['POST'])
@limiter.limit("5 per minute")
def login_2fa():
    data = request.json
    user_id = data.get('user_id')
    code = data.get('code')
    portal = data.get('portal', 'auto')
    
    from models import StaffUser, PatientPortalUser
    user = StaffUser.query.get(user_id) if portal == 'staff' else PatientPortalUser.query.get(user_id) if portal == 'patient' else None
    
    if not user:
        user = StaffUser.query.get(user_id) or PatientPortalUser.query.get(user_id)
        
    if not user or not getattr(user, 'is_2fa_enabled', False):
        return jsonify({"error": "Invalid request"}), 400
    
    # Redetect portal if it was auto
    detected_portal = portal
    if portal == 'auto':
        detected_portal = 'staff' if isinstance(user, StaffUser) else 'patient'
        
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
        user.last_seen_at = datetime.now()
        
        # Log successful 2FA login
        try:
            login_2fa_log = AuditLog(
                user_id=user.id,
                action="LOGIN_2FA_SUCCESS",
                resource=f"{detected_portal.capitalize()} Portal",
                details=json.dumps({
                    "method": "2FA_TOTP" if user.totp_secret else "2FA_BACKUP",
                    "portal": detected_portal,
                    "timestamp": datetime.now().isoformat()
                }),
                ip_address=get_client_ip()
            )
            db.session.add(login_2fa_log)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"2FA Login audit failed for user {user.id}: {e}")
        
        # Generate token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"portal": detected_portal}
        )
        
        response = jsonify({
            "message": "Login successful",
            "token": access_token,
            "portal": detected_portal,
            "user": user.to_dict()
        })
        set_access_cookies(response, access_token)
        return response, 200
        
    return jsonify({"error": "Invalid 2FA code"}), 401
@app.route('/api/logout', methods=['POST'])
@jwt_required(optional=True)
def logout():
    from datetime import datetime, timedelta
    user_id = get_jwt_identity()
    if user_id:
        user = User.query.get(user_id)
        if user:
            user.last_seen_at = datetime.now() - timedelta(days=1)
            db.session.commit()
    response = jsonify({"message": "Logout complete"})
    unset_jwt_cookies(response)
    return response, 200

# Initialize Database and System (Run on startup)
with app.app_context():
    init_db()
    try:
        setup_system(app, purge=False)
    except Exception as e:
        app.logger.error(f"Error initializing system: {e}")

    try:
        from utils.scheduler import init_scheduler
        init_scheduler(app)
    except Exception as e:
        app.logger.error(f"Error starting scheduler: {e}")

if __name__ == '__main__':
    is_debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    socketio.run(app, debug=is_debug, port=5000, host='0.0.0.0', allow_unsafe_werkzeug=True)
