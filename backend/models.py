from flask_sqlalchemy import SQLAlchemy
from flask import request
from datetime import datetime
from flask_bcrypt import Bcrypt
import json

from sqlalchemy.orm import Session, validates

class RoutingSession(Session):
    def __init__(self, *args, **kwargs):
        # Flask-SQLAlchemy passes the 'db' instance to the session constructor
        self.db = kwargs.pop('db', None)
        super().__init__(*args, **kwargs)

    def get_bind(self, mapper=None, *args, **kwargs):
        from flask import request, current_app
        
        # In case self.db wasn't initialized
        _db = self.db if self.db else db
        
        # 1. If we have a mapper, check its properties
        if mapper:
            try:
                table_name = getattr(mapper.persist_selectable, 'name', None)
                model_class = getattr(mapper, 'class_', None)
                
                # Check for global system tables
                if table_name in [
                    'ai_settings', 'app_branding', 'users', 'departments', 'roles', 
                    'permissions', 'user_roles', 'role_permissions', 'audit_logs', 
                    'temp_access_codes', 'access_requests', 'system_config', 
                    'report_verifications', 'chat_messages', 
                    'chat_groups', 'chat_group_members', 'user_contacts', 'notifications',
                    'inventory_categories', 'inventory_suppliers', 'inventory_items', 'inventory_transactions',
                    'report_parameters'
                ]:
                    return _db.engine
                
                # Check for explicit bind keys (e.g., 'patients')
                if model_class:
                    bind_key = getattr(model_class, '__bind_key__', None)
                    if bind_key and bind_key in _db.engines:
                        return _db.engines[bind_key]
            except:
                pass

        try:
            # 2. Check for dynamic context (e.g., 'X-Company-Context' header)
            if request:
                context = request.environ.get('HTTP_X_COMPANY_CONTEXT', '')
                if not context:
                    context = request.headers.get('X-Company-Context', '')
                # Fallback to query parameter for browser-initiated requests
                # (iframe, img, a tags cannot send custom headers)
                if not context:
                    context = request.args.get('company', '')
                context = context.lower()
                if context in _db.engines:
                    return _db.engines[context]
        except:
            pass
        
        # Fallback to the default engine (hc_system.db)
        return _db.engine

db = SQLAlchemy(session_options={'class_': RoutingSession})
bcrypt = Bcrypt()

# Association table for User and Role
user_roles = db.Table('user_roles',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True)
)

# Association table for Role and Permission
role_permissions = db.Table('role_permissions',
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id'), primary_key=True),
    db.Column('permission_id', db.Integer, db.ForeignKey('permissions.id'), primary_key=True)
)

# Staff users (Admins, Doctors, etc.) - Defaults to hc_system.db
class StaffUser(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # OTP verification
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # 2FA Settings
    totp_secret = db.Column(db.String(32), nullable=True)
    is_2fa_enabled = db.Column(db.Boolean, default=False)
    backup_codes = db.Column(db.Text, nullable=True) 
    must_reset_password = db.Column(db.Boolean, default=False)

    section = db.Column(db.String(10), nullable=True) # DCP or DCT
    department = db.Column(db.String(100), nullable=True)
    last_seen_at = db.Column(db.DateTime, default=datetime.now)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    contacts = db.relationship('UserContact', backref='user', lazy=True, cascade="all, delete-orphan")
    roles = db.relationship('Role', secondary=user_roles, backref=db.backref('assigned_users', lazy='dynamic'))

    def has_permission(self, permission_name):
        for role in self.roles:
            if role.name == 'Admin': return True
            for perm in role.permissions:
                if perm.name == permission_name: return True
        
        # Check active temporary access codes
        if hasattr(self, 'temp_codes') and self.temp_codes:
            now = datetime.now()
            for t in self.temp_codes:
                if t.permission and t.permission.name == permission_name:
                    if not t.is_revoked and t.times_used > 0:
                        if not t.expires_at or t.expires_at > now:
                            return True
        return False

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "is_verified": self.is_verified,
            "section": self.section,
            "department": self.department,
            "is_2fa_enabled": self.is_2fa_enabled,
            "must_reset_password": self.must_reset_password,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "roles": [role.name for role in self.roles],
            "permissions": list(set([p.name for role in self.roles for p in role.permissions])),
            "temp_access": [
                {
                    "permission_name": t.permission.name if t.permission else "Unknown",
                    "is_revoked": t.is_revoked,
                    "expires_at": t.expires_at.isoformat() if t.expires_at else None
                } for t in self.temp_codes if t.permission and t.times_used > 0
            ] if hasattr(self, 'temp_codes') else []
        }

# Isolated Patient Portal users - Uses 'patients' bind
class PatientPortalUser(db.Model):
    __tablename__ = 'patient_users'
    __bind_key__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=True)
    username = db.Column(db.String(50), unique=True, nullable=False) # Identity (Staff ID or Phone)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # 2FA Settings
    totp_secret = db.Column(db.String(32), nullable=True)
    is_2fa_enabled = db.Column(db.Boolean, default=False)
    backup_codes = db.Column(db.Text, nullable=True) 

    # OTP verification
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    must_reset_password = db.Column(db.Boolean, default=False)
    last_reminder_sent = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    last_seen_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        # Dynamically find the section (DCP/DCT) by checking both clinical databases
        section = None
        first_name = self.first_name
        last_name = self.last_name
        from flask import current_app
        from sqlalchemy import text
        
        for bind_key in ['dcp', 'dct']:
            try:
                engine = db.engines.get(bind_key)
                if not engine: continue
                sql = text("SELECT first_name, last_name FROM bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
                with engine.connect() as conn:
                    result = conn.execute(sql, {"sid": self.username}).fetchone()
                    if result:
                        section = bind_key.upper()
                        if result[0]:
                            first_name = result[0]
                        if result[1]:
                            last_name = result[1]
                        break
            except:
                continue

        return {
            "id": self.id,
            "first_name": first_name,
            "last_name": last_name,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "is_verified": self.is_verified,
            "is_2fa_enabled": self.is_2fa_enabled,
            "must_reset_password": self.must_reset_password,
            "user_type": "patient",
            "section": section,
            "roles": ["Patient"],
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None
        }

# Alias StaffUser for notification relations if needed

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False) # e.g. 'system', 'alert', 'message'
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    link = db.Column(db.String(255), nullable=True) # Optional link to redirect
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    user = db.relationship('StaffUser', backref=db.backref('notifications', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "link": self.link,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None
        }

class TempAccessCode(db.Model):
    __tablename__ = 'temp_access_codes'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Nullable for universal codes
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id'), nullable=False)
    code = db.Column(db.String(100), unique=True, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    is_multi_use = db.Column(db.Boolean, default=False)
    times_used = db.Column(db.Integer, default=0)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_revoked = db.Column(db.Boolean, default=False)
    generated_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('StaffUser', foreign_keys=[user_id], backref=db.backref('temp_codes', lazy=True))
    permission = db.relationship('Permission', backref=db.backref('permission_temp_codes', lazy=True))
    generator = db.relationship('StaffUser', foreign_keys=[generated_by])

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "user_id": self.user_id,
            "user_name": f"{self.user.first_name} {self.user.last_name}" if self.user else "Universal",
            "permission_name": self.permission.name if self.permission else "Unknown",
            "duration": self.duration_minutes,
            "is_multi_use": self.is_multi_use,
            "times_used": self.times_used,
            "is_revoked": self.is_revoked,
            "target_user_name": f"{self.user.first_name} {self.user.last_name}" if self.user else "Universal",
            "generated_by_name": f"{self.generator.first_name} {self.generator.last_name}" if self.generator else "System",
            "created_at": self.created_at.isoformat() + "Z",
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None,
        }

class TestResultArchive(db.Model):
    __tablename__ = 'test_result_archive'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    test_type = db.Column(db.String(50), nullable=False) # e.g., 'fbc', 'lft', 'ecg'
    test_data = db.Column(db.JSON, nullable=False)       # JSON dump of results
    created_at = db.Column(db.DateTime, default=datetime.now)

class AISettings(db.Model):
    __tablename__ = 'ai_settings'
    id = db.Column(db.Integer, primary_key=True)
    medical_parameters = db.Column(db.Text, default="[]") 
    system_prompt = db.Column(db.Text, default="You are a helpful medical assistant summarizing patient data into insights.")
    response_format = db.Column(db.String(50), default="Bullet Points")
    api_key = db.Column(db.String(255), nullable=True)
    model_selection = db.Column(db.String(50), default="gpt-4o")
    sample_comments = db.Column(db.Text, default="[]") 
    
    # New columns for test-specific prompts
    prompt_fbc = db.Column(db.Text, default=(
        "You are a medical assistant analyzing patient Full Blood Count (FBC) results. "
        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
    ))
    prompt_lipid = db.Column(db.Text, default=(
        "You are a medical assistant analyzing patient Lipid Profile results. "
        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
    ))
    prompt_lft = db.Column(db.Text, default=(
        "You are a medical assistant analyzing patient Liver Function Test (LFT) results. "
        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. For example, if Conjugated Bilirubin (CB) is 0.35 mg/dL and the reference range is 0-0.4 mg/dL, it is NORMAL. Treat all values within the ranges as normal. "
        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
    ))
    prompt_kft = db.Column(db.Text, default=(
        "You are a medical assistant analyzing patient Kidney Function Test (KFT) results. "
        "With your expert knowledge on laboratory tests and general health related matters, review the values against their reference ranges and write a very short summary (maximum of 130 characters) for the remark field. "
        "You MUST strictly adhere to the reference ranges provided in the user's input. Do NOT rely on your pre-trained clinical ranges if they differ. Do NOT consider a value high, low, elevated, or abnormal if it falls within the specified normal reference range. Treat all values within the ranges as normal. "
        "Avoid mentioning the test type and anything about the ranges in the comments/remark. "
        "Be direct, highly concise, and stay strictly under the 130 character limit. No extra details, intro, or formatting. Just the plain text remark."
    ))
    
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

class AppBranding(db.Model):
    __tablename__ = 'app_branding'
    id = db.Column(db.Integer, primary_key=True)
    clinic_name = db.Column(db.String(100), default="Legit HealthCare")
    logo_light = db.Column(db.String(255), nullable=True)
    logo_dark = db.Column(db.String(255), nullable=True)
    favicon = db.Column(db.String(255), nullable=True)
    clinic_slogan = db.Column(db.String(255), default="Excellence.")
    
    auth_branding_image = db.Column(db.String(255), nullable=True)
    auth_logo = db.Column(db.String(255), nullable=True)
    
    # Hero Illustration Images
    hero_image_1 = db.Column(db.String(255), nullable=True)
    hero_image_2 = db.Column(db.String(255), nullable=True)
    hero_image_team = db.Column(db.String(255), nullable=True)
    
    # Report Templates
    header_image = db.Column(db.String(255), nullable=True)
    footer_image = db.Column(db.String(255), nullable=True)
    signature_image = db.Column(db.String(255), nullable=True)
    
    # Contact & Social Info
    address = db.Column(db.Text, nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    whatsapp = db.Column(db.String(50), nullable=True)
    social_links = db.Column(db.Text, default='[]') # JSON string
    
    doctor_name = db.Column(db.String(100), default="Dr. Anyanwu Ugochukwu D. FMCPath")
    doctor_post = db.Column(db.String(100), default="Consultant in Charge")
    
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        social_links = []
        if self.social_links:
            try:
                social_links = json.loads(self.social_links)
            except:
                social_links = []
        return {
            "clinic_name": self.clinic_name,
            "clinic_slogan": self.clinic_slogan,
            "logo_light": self.logo_light,
            "logo_dark": self.logo_dark,
            "favicon": self.favicon,
            "auth_branding_image": self.auth_branding_image,
            "auth_logo": self.auth_logo,
            "hero_image_1": self.hero_image_1,
            "hero_image_2": self.hero_image_2,
            "hero_image_team": self.hero_image_team,
            "header_image": self.header_image,
            "footer_image": self.footer_image,
            "signature_image": self.signature_image,
            "address": self.address,
            "email": self.email,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "social_links": social_links,
            "doctor_name": self.doctor_name,
            "doctor_post": self.doctor_post
        }

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class QueueTracker(db.Model):
    __tablename__ = 'queue_tracker'
    id = db.Column(db.Integer, primary_key=True)
    consultation = db.Column(db.Integer, default=0)
    audiometry = db.Column(db.Integer, default=0)
    spirometry = db.Column(db.Integer, default=0)
    ecg = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    last_reset = db.Column(db.DateTime, default=datetime.now)


class Race(db.Model):
    __tablename__ = 'races'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class Nationality(db.Model):
    __tablename__ = 'nationalities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ReportParameter(db.Model):
    __tablename__ = 'report_parameters'
    id = db.Column(db.String(50), primary_key=True)  # unique string key like 'fbs', 'pcv', etc.
    category = db.Column(db.String(50), nullable=False)  # e.g., 'blood_sugar', 'fbc', 'kft', 'lipid', 'lft', 'ua', 'psa'
    parameter_name = db.Column(db.String(100), nullable=False)
    reference_value = db.Column(db.String(255), nullable=False)
    unit = db.Column(db.String(50), nullable=True)
    display_order = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "parameter_name": self.parameter_name,
            "reference_value": self.reference_value,
            "unit": self.unit or "",
            "display_order": self.display_order
        }

class BioData(db.Model):
    __tablename__ = 'bio_data'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), unique=True, nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    middle_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50), nullable=False)
    department = db.Column(db.String(50))
    gender = db.Column(db.String(20))
    dob = db.Column(db.Date)
    age = db.Column(db.Integer)
    phone = db.Column(db.String(50))
    email = db.Column(db.String(100))
    race = db.Column(db.String(50))
    nationality = db.Column(db.String(100))
    passport_image = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

class ScreeningYearBioData(db.Model):
    __tablename__ = 'screening_year_bio_data'
    id = db.Column(db.Integer, primary_key=True)
    screening_year = db.Column(db.Integer, nullable=False)
    patient_id = db.Column(db.String(50), nullable=False) # Clinic-assigned per year
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    # The requirement says this should be a copy or linked. Using a copy or FK is standard.
    # We'll store basic info here too as per "copy" requirement.
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    department = db.Column(db.String(50))
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    is_notified_ready = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    __table_args__ = (
        db.UniqueConstraint('staff_id', 'screening_year', name='_staff_year_uc'),
    )

class QueueEntry(db.Model):
    __tablename__ = 'queue_entries'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    department = db.Column(db.String(50), nullable=False, index=True) # Consultation, Audiometry, Spirometry, ECG
    status = db.Column(db.String(20), default='Waiting', index=True) # Waiting, Completed
    created_at = db.Column(db.DateTime, default=datetime.now)
    queue_number = db.Column(db.Integer, nullable=True)

class StaffPatientSeen(db.Model):
    __tablename__ = 'staff_patient_seen'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    staff_id = db.Column(db.String(50), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    department = db.Column(db.String(50), nullable=False, index=True) # 'Consultation', 'Spirometry', 'Audiometry', 'ECG'
    created_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'staff_id', 'screening_year', 'department', name='_user_patient_year_dept_uc'),
    )

class ConsultationData(db.Model):
    __tablename__ = 'consultation_data'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    
    # Medical Fields
    luts = db.Column(db.String(10)) # Yes/No
    chronic_cough = db.Column(db.String(10))
    chronic_chest_pain = db.Column(db.String(10))
    chest_infection = db.Column(db.String(10))
    heart_dx = db.Column(db.String(10))
    palor = db.Column(db.String(10))
    jaundice = db.Column(db.String(10))
    murmur = db.Column(db.String(10))
    chest_status = db.Column(db.String(50)) # Clinically Clear, etc.
    psa = db.Column(db.String(20)) # Negative, Positive, N/A
    psa_remark = db.Column(db.Text)
    fbs = db.Column(db.String(20))
    rbs = db.Column(db.String(20))
    sugar_remark = db.Column(db.String(50)) # Normal, Abnormal...
    ua_result = db.Column(db.String(50)) # No Abnormality...
    ua_remark = db.Column(db.String(50))
    ua_remark_others = db.Column(db.String(255))
    dm_status = db.Column(db.String(50)) # Yes-On Regular Meds, etc.
    htn_status = db.Column(db.String(50))
    bp = db.Column(db.String(20))
    pulse = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    hs_status = db.Column(db.String(20)) # Present, S3, S4
    breast_exam = db.Column(db.String(20))
    breast_remark = db.Column(db.String(50))
    breast_others = db.Column(db.String(255))
    abdomen = db.Column(db.String(50))
    abdomen_others = db.Column(db.String(255))
    assessment_hx_pe = db.Column(db.Text) # Satisfactory...
    other_assessments = db.Column(db.Text)
    overall_lab_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    overall_assessment = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    consulted_by_name = db.Column(db.String(100), nullable=True)

class FBCResult(db.Model):
    __tablename__ = 'fbc_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    pcv = db.Column(db.String(20))
    wbc = db.Column(db.String(20))
    plt = db.Column(db.String(20))
    lymp_percent = db.Column(db.String(20))
    lymp_abs = db.Column(db.String(20))
    gra_percent = db.Column(db.String(20))
    gra_abs = db.Column(db.String(20))
    mid_percent = db.Column(db.String(20))
    mid_abs = db.Column(db.String(20))
    rbc = db.Column(db.String(20))
    mcv = db.Column(db.String(20))
    mch = db.Column(db.String(20))
    mchc = db.Column(db.String(20))
    rdw = db.Column(db.String(20))
    pdw = db.Column(db.String(20))
    hgb = db.Column(db.String(20))
    fbc_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

class KFTResult(db.Model):
    __tablename__ = 'kft_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    potassium = db.Column(db.String(20))
    sodium = db.Column(db.String(20))
    chloride = db.Column(db.String(20))
    bicarbonate_ca = db.Column(db.String(20))
    hco3 = db.Column(db.String(20))
    kft_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

class LipidResult(db.Model):
    __tablename__ = 'lipid_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    total_cholesterol = db.Column(db.String(20))
    triglycerides = db.Column(db.String(20))
    hdl = db.Column(db.String(20))
    ldl = db.Column(db.String(20))
    lp_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

class LFTResult(db.Model):
    __tablename__ = 'lft_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    ast = db.Column(db.String(20))
    alt = db.Column(db.String(20))
    alp = db.Column(db.String(20))
    tb = db.Column(db.String(20))
    cb = db.Column(db.String(20))
    urea = db.Column(db.String(20))
    creatinine = db.Column(db.String(20))
    lft_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

class SpecialTestsResult(db.Model):
    __tablename__ = 'special_tests_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    ecg_result = db.Column(db.String(255))
    ecg_remark = db.Column(db.Text)
    spirometry_result = db.Column(db.String(255))
    weight = db.Column(db.String(20))
    height = db.Column(db.String(20))
    spirometry_remark = db.Column(db.Text)
    audiometry_result = db.Column(db.String(255))
    audiometry_remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)



class DirectorReview(db.Model):
    __tablename__ = 'director_reviews'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False, index=True)
    screening_year = db.Column(db.Integer, nullable=False, index=True)
    
    # Final Review Specific Fields
    dm_status = db.Column(db.String(50))
    htn_status = db.Column(db.String(50))
    bp = db.Column(db.String(20))
    pulse = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    hs_status = db.Column(db.String(20))
    breast_exam = db.Column(db.String(20))
    breast_remark = db.Column(db.String(50))
    breast_others = db.Column(db.String(255))
    abdomen = db.Column(db.String(50))
    abdomen_others = db.Column(db.String(255))
    psa = db.Column(db.String(20))
    psa_remark = db.Column(db.Text)
    fbs = db.Column(db.String(20))
    rbs = db.Column(db.String(20))
    fbs_rbs_remark = db.Column(db.String(50))
    ua_result = db.Column(db.String(50))
    ua_remark = db.Column(db.String(50))
    ua_remark_others = db.Column(db.String(255))
    
    # Missing Clinical Fields from Consultation
    luts = db.Column(db.String(10))
    chronic_cough = db.Column(db.String(10))
    chronic_chest_pain = db.Column(db.String(10))
    chest_infection = db.Column(db.String(10))
    heart_dx = db.Column(db.String(10))
    palor = db.Column(db.String(10))
    jaundice = db.Column(db.String(10))
    murmur = db.Column(db.String(10))
    chest_status = db.Column(db.String(50))
    
    assessment_hx_pe = db.Column(db.Text)
    other_assessments = db.Column(db.Text)
    overall_lab_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    overall_assessment = db.Column(db.Text)
    comment_one = db.Column(db.Text)
    comment_two = db.Column(db.Text)
    comment_three = db.Column(db.Text)
    comment_four = db.Column(db.Text)
    
    # Immutable timestamp
    first_submitted_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, onupdate=datetime.now)

class ChatGroup(db.Model):
    __tablename__ = 'chat_groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "avatar": self.avatar,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat()
        }

class ChatGroupMember(db.Model):
    __tablename__ = 'chat_group_members'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('chat_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(20), default='Member') # Admin, Moderator, Member
    is_muted = db.Column(db.Boolean, default=False)
    last_read_at = db.Column(db.DateTime, default=datetime.now)

class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id')) # For direct chat
    group_id = db.Column(db.Integer, db.ForeignKey('chat_groups.id')) # For group chat
    is_broadcast = db.Column(db.Boolean, default=False)
    content = db.Column(db.Text)
    message_type = db.Column(db.String(20), default='text') # text, voice, emoji
    
    # Advanced features
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    is_edited = db.Column(db.Boolean, default=False)
    parent_message_id = db.Column(db.Integer, db.ForeignKey('chat_messages.id'), nullable=True)
    reactions = db.Column(db.Text, default='[]') # JSON string of reactions: [{"emoji": "ðŸ‘", "user_id": 1}]
    
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)

    sender = db.relationship('StaffUser', foreign_keys=[sender_id], backref=db.backref('sent_messages', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": f"{self.sender.first_name} {self.sender.last_name}" if self.sender else "Unknown User",
            "receiver_id": self.receiver_id,
            "group_id": self.group_id,
            "is_broadcast": self.is_broadcast,
            "content": self.content if not self.is_deleted else "This message was deleted",
            "message_type": self.message_type,
            "is_deleted": self.is_deleted,
            "is_edited": self.is_edited,
            "parent_message_id": self.parent_message_id,
            "reactions": json.loads(self.reactions) if self.reactions else [],
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "created_at": self.created_at.isoformat()
        }

class UserContact(db.Model):
    __tablename__ = 'user_contacts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    label = db.Column(db.String(50), nullable=False) # e.g. 'Email', 'WhatsApp'
    value = db.Column(db.String(255), nullable=False)
    contact_type = db.Column(db.String(20), default='text') # text, link, email, phone
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "label": self.label,
            "value": self.value,
            "contact_type": self.contact_type,
            "created_at": self.created_at.isoformat()
        }

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255))
    permissions = db.relationship('Permission', secondary=role_permissions, backref=db.backref('assigned_roles', lazy='dynamic'))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "permissions": [p.name for p in self.permissions]
        }

class Permission(db.Model):
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(255))
    category = db.Column(db.String(50)) # e.g., 'Admin', 'Medical', 'Lab'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category
        }
class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True) # ID of Staff or Patient user
    action = db.Column(db.String(100), nullable=False)
    resource = db.Column(db.String(100))
    details = db.Column(db.Text) # JSON string
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('StaffUser', primaryjoin='AuditLog.user_id == StaffUser.id', foreign_keys=[user_id], backref=db.backref('audit_logs', lazy=True))

    def __init__(self, *args, **kwargs):
        user_id = kwargs.get('user_id')
        if user_id is not None:
            try:
                kwargs['user_id'] = int(user_id)
            except (ValueError, TypeError):
                kwargs['user_id'] = None

        # Auto-detect device/user_agent from Flask request context
        try:
            from flask import has_request_context, request
            if has_request_context():
                details = kwargs.get('details')
                details_data = {}
                if details:
                    try:
                        details_data = json.loads(details)
                    except:
                        details_data = {"message": details}
                else:
                    details_data = {}

                # Capture User Agent & Parse Platform/Browser
                user_agent_str = request.headers.get('User-Agent', '')
                platform = "Unknown OS"
                browser = "Unknown Browser"
                
                if user_agent_str:
                    ua_lower = user_agent_str.lower()
                    # Detect OS
                    if 'windows' in ua_lower:
                        platform = 'Windows'
                    elif 'macintosh' in ua_lower or 'mac os' in ua_lower:
                        platform = 'macOS'
                    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
                        platform = 'iOS'
                    elif 'android' in ua_lower:
                        platform = 'Android'
                    elif 'linux' in ua_lower:
                        platform = 'Linux'
                        
                    # Detect Browser
                    if 'edg/' in ua_lower or 'edge' in ua_lower:
                        browser = 'Edge'
                    elif 'opr/' in ua_lower or 'opera' in ua_lower:
                        browser = 'Opera'
                    elif 'chrome' in ua_lower or 'crios' in ua_lower:
                        browser = 'Chrome'
                    elif 'firefox' in ua_lower or 'fxios' in ua_lower:
                        browser = 'Firefox'
                    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
                        browser = 'Safari'

                details_data['device'] = {
                    "platform": platform,
                    "browser": browser,
                    "user_agent": user_agent_str
                }
                kwargs['details'] = json.dumps(details_data)
        except Exception:
            pass

        super().__init__(*args, **kwargs)

    @validates('user_id')
    def validate_user_id(self, key, value):
        if value is not None:
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        return None

    @classmethod
    def log_action(cls, action, resource=None, details=None, user_id=None, ip_address=None, commit=False):
        """
        Creates and adds an audit log entry. Auto-detects user and IP if not provided.
        """
        try:
            from flask_jwt_extended import get_jwt_identity, get_jwt
            from utils.ip import get_client_ip
            
            if user_id is None:
                try:
                    user_id = get_jwt_identity()
                except Exception:
                    pass
                if user_id is None:
                    try:
                        from flask import session
                        user_id = session.get('user_id')
                    except Exception:
                        pass
            
            if ip_address is None:
                try:
                    ip_address = get_client_ip()
                except Exception:
                    pass

            portal_type = 'staff'
            try:
                claims = get_jwt()
                portal_type = claims.get('portal', 'staff')
            except Exception:
                pass

            details_str = None
            if details is not None:
                if isinstance(details, (dict, list)):
                    if isinstance(details, dict) and 'portal' not in details:
                        details['portal'] = portal_type
                    details_str = json.dumps(details)
                else:
                    details_str = str(details)
            else:
                details_str = json.dumps({"portal": portal_type})

            log = cls(
                user_id=user_id,
                action=action,
                resource=resource,
                details=details_str,
                ip_address=ip_address
            )
            db.session.add(log)
            if commit:
                db.session.commit()
        except Exception as e:
            import sys
            sys.stderr.write(f"[AUDIT LOG ERROR] Failed to log action: {e}\n")

    def to_dict(self):
        details_data = {}
        if self.details:
            try:
                details_data = json.loads(self.details)
            except (ValueError, TypeError, json.JSONDecodeError):
                details_data = {"message": self.details}

        # Dynamic repair for existing records with "Unknown" device details
        if 'device' in details_data and isinstance(details_data['device'], dict):
            device = details_data['device']
            ua_str = device.get('user_agent', '')
            if (device.get('platform') == 'Unknown OS' or device.get('browser') == 'Unknown Browser') and ua_str:
                ua_lower = ua_str.lower()
                platform = device.get('platform')
                browser = device.get('browser')
                
                if platform == 'Unknown OS':
                    if 'windows' in ua_lower:
                        platform = 'Windows'
                    elif 'macintosh' in ua_lower or 'mac os' in ua_lower:
                        platform = 'macOS'
                    elif 'iphone' in ua_lower or 'ipad' in ua_lower:
                        platform = 'iOS'
                    elif 'android' in ua_lower:
                        platform = 'Android'
                    elif 'linux' in ua_lower:
                        platform = 'Linux'
                        
                if browser == 'Unknown Browser':
                    if 'edg/' in ua_lower or 'edge' in ua_lower:
                        browser = 'Edge'
                    elif 'opr/' in ua_lower or 'opera' in ua_lower:
                        browser = 'Opera'
                    elif 'chrome' in ua_lower or 'crios' in ua_lower:
                        browser = 'Chrome'
                    elif 'firefox' in ua_lower or 'fxios' in ua_lower:
                        browser = 'Firefox'
                    elif 'safari' in ua_lower and 'chrome' not in ua_lower:
                        browser = 'Safari'
                        
                device['platform'] = platform
                device['browser'] = browser

        user_name = "System"
        portal = details_data.get('portal', 'staff')
        patient_name = None
        patient_staff_id = None
        
        # 1. Check if resource is Patient-related
        if self.resource and self.resource.startswith("Patient:"):
            parts = self.resource.split(":")
            potential_id = parts[1] if len(parts) > 1 else None
            if potential_id:
                try:
                    bio = BioData.query.filter_by(staff_id=potential_id).first()
                    if not bio:
                        bio = BioData.query.filter_by(phone=potential_id).first()
                    if bio:
                        middle = f" {bio.middle_name}" if bio.middle_name else ""
                        patient_name = f"{bio.first_name}{middle} {bio.last_name}"
                        patient_staff_id = bio.staff_id
                except Exception:
                    pass

        # 2. Check if originator is Patient
        if portal == 'patient':
            if self.user_id:
                try:
                    # Look up in PatientPortalUser (which uses 'patients' bind)
                    patient = PatientPortalUser.query.get(self.user_id)
                    if patient:
                        bio = BioData.query.filter_by(staff_id=patient.username).first()
                        if not bio:
                            bio = BioData.query.filter_by(phone=patient.phone).first()
                        
                        if bio:
                            middle = f" {bio.middle_name}" if bio.middle_name else ""
                            patient_name = f"{bio.first_name}{middle} {bio.last_name}"
                            patient_staff_id = bio.staff_id
                            user_name = f"{patient_name} (Patient)"
                        else:
                            patient_name = f"{patient.first_name} {patient.last_name}"
                            patient_staff_id = patient.username
                            user_name = f"{patient_name} (Patient)"
                    else:
                        user_name = f"Patient {self.user_id}"
                except:
                    user_name = f"User {self.user_id}"
        else:
            if self.user:
                user_name = f"{self.user.first_name} {self.user.last_name}"
            elif self.user_id:
                try:
                    # Fallback query StaffUser explicitly (handles flush/after_insert states)
                    staff = StaffUser.query.get(self.user_id)
                    if staff:
                        user_name = f"{staff.first_name} {staff.last_name}"
                    else:
                        user_name = f"User {self.user_id}"
                except:
                    user_name = f"User {self.user_id}"

        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": user_name,
            "action": self.action,
            "resource": self.resource,
            "details": details_data,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat(),
            "patient_name": patient_name,
            "patient_staff_id": patient_staff_id
        }


class AccessRequest(db.Model):
    __tablename__ = 'access_requests'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    permission_name = db.Column(db.String(100), nullable=False)
    is_reviewed = db.Column(db.Boolean, default=False)
    review_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    user = db.relationship('StaffUser', foreign_keys='AccessRequest.user_id', backref=db.backref('access_requests', lazy=True, cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": f"{self.user.first_name} {self.user.last_name}" if self.user else "Unknown",
            "permission_name": self.permission_name,
            "is_reviewed": self.is_reviewed,
            "created_at": self.created_at.isoformat()
        }

class SystemConfig(db.Model):
    __tablename__ = 'system_config'
    key = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.Text)
    description = db.Column(db.String(255))
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

class PatientFile(db.Model):
    __tablename__ = 'patient_files'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False) # The patient's staff ID
    screening_year = db.Column(db.Integer, nullable=False)
    department = db.Column(db.String(50), nullable=False) # Spirometry, Audiometry
    filename = db.Column(db.String(255), nullable=False) # Original filename
    file_path = db.Column(db.String(512), nullable=False) # Path relative to uploads dir
    file_size = db.Column(db.Integer) # In bytes
    uploaded_by = db.Column(db.Integer) # Staff ID of the uploader
    created_at = db.Column(db.DateTime, default=datetime.now)

    uploader = db.relationship('StaffUser', primaryjoin='PatientFile.uploaded_by == StaffUser.id', foreign_keys=[uploaded_by], backref=db.backref('uploaded_files', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "screening_year": self.screening_year,
            "department": self.department,
            "filename": self.filename,
            "file_path": f"/api/files/view/{self.id}", # Proxy URL for viewing
            "file_size": self.file_size,
            "uploaded_by_name": f"{self.uploader.first_name} {self.uploader.last_name}" if self.uploader else "System",
            "created_at": self.created_at.isoformat()
        }

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False)
    patient_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    gender = db.Column(db.String(20))
    dob = db.Column(db.String(50))
    age = db.Column(db.Integer)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    nationality = db.Column(db.String(100))
    appointment_date = db.Column(db.DateTime, nullable=False)
    time_slot = db.Column(db.String(50)) # e.g. 10:00 AM - 10:30 AM
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Pending') # Pending, Completed, Cancelled
    booked_by_type = db.Column(db.String(20)) # staff, patient
    booked_by_username = db.Column(db.String(50)) # username or staff_id
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "staff_id": self.staff_id,
            "patient_name": self.patient_name,
            "department": self.department,
            "gender": self.gender,
            "dob": self.dob,
            "age": self.age,
            "phone": self.phone,
            "email": self.email,
            "nationality": self.nationality,
            "appointment_date": self.appointment_date.isoformat(),
            "time_slot": self.time_slot,
            "reason": self.reason,
            "status": self.status,
            "booked_by_type": self.booked_by_type,
            "booked_by_username": self.booked_by_username,
            "created_at": self.created_at.isoformat()
        }

class ReportVerification(db.Model):
    __tablename__ = 'report_verifications'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    section = db.Column(db.String(50), nullable=False) # e.g. 'DCP' or 'DCT' so we can look back up the patient
    verification_code = db.Column(db.String(100), unique=True, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "staff_id": self.staff_id,
            "screening_year": self.screening_year,
            "section": self.section,
            "verification_code": self.verification_code,
            "generated_at": self.generated_at.isoformat()
        }


class InventoryCategory(db.Model):
    __tablename__ = 'inventory_categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat()
        }

class InventorySupplier(db.Model):
    __tablename__ = 'inventory_suppliers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    contact_person = db.Column(db.String(100))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(50))
    address = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact_person": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "created_at": self.created_at.isoformat()
        }

class InventoryItem(db.Model):
    __tablename__ = 'inventory_items'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    sku = db.Column(db.String(50), unique=True)
    category_id = db.Column(db.Integer, db.ForeignKey('inventory_categories.id'))
    supplier_id = db.Column(db.Integer, db.ForeignKey('inventory_suppliers.id'))
    description = db.Column(db.Text)
    unit = db.Column(db.String(20)) # e.g., Tablets, Bottles, Pieces
    stock_level = db.Column(db.Integer, default=0)
    min_stock_level = db.Column(db.Integer, default=5)
    unit_price = db.Column(db.Float, default=0.0)
    expiry_date = db.Column(db.Date, nullable=True)
    location = db.Column(db.String(100)) # e.g., Shelf A, Room 2
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    category = db.relationship('InventoryCategory', backref='items')
    supplier = db.relationship('InventorySupplier', backref='items')

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else None,
            "description": self.description,
            "unit": self.unit,
            "stock_level": self.stock_level,
            "min_stock_level": self.min_stock_level,
            "unit_price": self.unit_price,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "location": self.location,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }

class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False) # 'Addition', 'Deduction', 'Adjustment'
    quantity = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.now)

    item = db.relationship('InventoryItem', backref='transactions')
    user = db.relationship('StaffUser', backref='inventory_transactions')

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "item_name": self.item.name if self.item else "Deleted Item",
            "user_id": self.user_id,
            "user_name": f"{self.user.first_name} {self.user.last_name}" if self.user else "Unknown",
            "transaction_type": self.transaction_type,
            "quantity": self.quantity,
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat()
        }

from sqlalchemy import event

# Compatibility Alias
User = StaffUser

@event.listens_for(Permission, 'after_insert')
def auto_assign_permission_to_admin(mapper, connection, target):
    """Automatically assign every new permission to the Admin role."""
    try:
        # Use a raw connection check to avoid session state conflicts during flush
        result = connection.execute(db.text("SELECT id FROM roles WHERE name = 'Admin'")).fetchone()
        if result:
            admin_role_id = result[0]
            # Check if association already exists (unlikely for new permission but safe)
            check = connection.execute(
                db.text("SELECT 1 FROM role_permissions WHERE role_id = :r_id AND permission_id = :p_id"),
                {"r_id": admin_role_id, "p_id": target.id}
            ).fetchone()
            
            if not check:
                connection.execute(
                    db.text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:r_id, :p_id)"),
                    {"r_id": admin_role_id, "p_id": target.id}
                )
    except Exception:
        # Fail silently during initial setup if roles table isn't ready
        pass

@event.listens_for(AuditLog, 'after_insert')
def on_audit_log_insert(mapper, connection, target):
    try:
        from extensions import socketio
        socketio.emit('new_audit_log', target.to_dict(), to='staff_events')
    except Exception as e:
        import sys
        sys.stderr.write(f"[AUDIT LOG SOCKET EMIT ERROR] {e}\n")


@event.listens_for(Session, 'before_flush')
def before_flush_audit(session, flush_context, instances):
    if getattr(session, '_in_audit_listener', False):
        return
    session._in_audit_listener = True
    try:
        new_audit_logs = []
        for obj in session.dirty:
            model_name = obj.__class__.__name__
            if model_name not in [
                'BioData', 'PatientPortalUser', 'ScreeningYearBioData', 
                'ConsultationData', 'FBCResult', 'KFTResult', 'LipidResult', 
                'LFTResult', 'SpecialTestsResult', 'DirectorReview'
            ]:
                continue
                
            from sqlalchemy.orm import attributes
            from sqlalchemy import inspect
            
            state = inspect(obj)
            before_state = {}
            after_state = {}
            changed_fields = []
            
            staff_id = getattr(obj, 'staff_id', None)
            if not staff_id and model_name == 'PatientPortalUser':
                staff_id = getattr(obj, 'username', None)
                
            for attr in state.mapper.column_attrs:
                hist = attributes.get_history(obj, attr.key)
                if hist.has_changes():
                    if attr.key in ['updated_at', 'last_login', 'last_seen_at', 'password_hash', 'otp_code', 'otp_expiry']:
                        continue
                        
                    old_val = hist.deleted[0] if hist.deleted else None
                    new_val = hist.added[0] if hist.added else getattr(obj, attr.key)
                    
                    if old_val == new_val:
                        continue
                        
                    def serialize_val(val):
                        if val is None:
                            return None
                        from datetime import datetime, date
                        from decimal import Decimal
                        if isinstance(val, (datetime, date)):
                            return val.isoformat()
                        if isinstance(val, Decimal):
                            return float(val)
                        return val
                        
                    before_state[attr.key] = serialize_val(old_val)
                    after_state[attr.key] = serialize_val(new_val)
                    changed_fields.append(attr.key)
                    
            if changed_fields:
                user_id = None
                ip_address = None
                portal_type = 'staff'
                try:
                    from flask_jwt_extended import get_jwt_identity, get_jwt
                    from utils.ip import get_client_ip
                    user_id = get_jwt_identity()
                    ip_address = get_client_ip()
                    claims = get_jwt()
                    portal_type = claims.get('portal', 'staff')
                except Exception:
                    pass
                    
                if not user_id:
                    try:
                        from flask import session as flask_session
                        user_id = flask_session.get('user_id')
                    except Exception:
                        pass
                        
                details = {
                    "action_type": "edit",
                    "model": model_name,
                    "staff_id": staff_id,
                    "changed_fields": changed_fields,
                    "before": before_state,
                    "after": after_state,
                    "portal": portal_type
                }
                
                screening_year = getattr(obj, 'screening_year', None)
                if screening_year:
                    details["screening_year"] = screening_year
                    
                resource_str = f"Patient:{staff_id}" if staff_id else f"{model_name}:{getattr(obj, 'id', 'unknown')}"
                
                action_name = f"Edit Patient {model_name.replace('Result', '').replace('Data', '').replace('Review', '')}"
                if model_name == 'PatientPortalUser':
                    action_name = "Edit Patient Portal Account"
                    
                log = AuditLog(
                    user_id=user_id,
                    action=action_name,
                    resource=resource_str,
                    details=json.dumps(details),
                    ip_address=ip_address
                )
                new_audit_logs.append(log)
                
        for log in new_audit_logs:
            session.add(log)
    except Exception as e:
        import sys
        sys.stderr.write(f"[AUDIT LOG BEFORE FLUSH ERROR] {e}\n")
    finally:
        session._in_audit_listener = False
