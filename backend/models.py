from flask_sqlalchemy import SQLAlchemy
from flask import request
from datetime import datetime
from flask_bcrypt import Bcrypt
import json

from sqlalchemy.orm import Session

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
                if table_name in ['ai_settings', 'app_branding', 'users', 'departments', 'roles', 'permissions', 'user_roles', 'role_permissions', 'audit_logs', 'temp_access_codes', 'access_requests', 'system_config', 'appointments']:
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
                context = request.headers.get('X-Company-Context', '').lower()
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

    section = db.Column(db.String(10), nullable=True) # DCP or DCT
    department = db.Column(db.String(100), nullable=True)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    contacts = db.relationship('UserContact', backref='user', lazy=True, cascade="all, delete-orphan")
    roles = db.relationship('Role', secondary=user_roles, backref=db.backref('assigned_users', lazy='dynamic'))

    def has_permission(self, permission_name):
        for role in self.roles:
            if role.name == 'Admin': return True
            for perm in role.permissions:
                if perm.name == permission_name: return True
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
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
            "roles": [role.name for role in self.roles],
            "permissions": list(set([p.name for role in self.roles for p in role.permissions]))
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
    
    # OTP verification
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow)

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
            "user_type": "patient",
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('StaffUser', foreign_keys=[user_id], backref=db.backref('temp_codes', lazy=True))
    permission = db.relationship('Permission', backref=db.backref('temp_codes', lazy=True))
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AISettings(db.Model):
    __tablename__ = 'ai_settings'
    id = db.Column(db.Integer, primary_key=True)
    medical_parameters = db.Column(db.Text, default="[]") 
    system_prompt = db.Column(db.Text, default="You are a helpful medical assistant summarizing patient data into insights.")
    response_format = db.Column(db.String(50), default="Bullet Points")
    api_key = db.Column(db.String(255), nullable=True)
    model_selection = db.Column(db.String(50), default="gpt-4o")
    sample_comments = db.Column(db.Text, default="[]") 
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AppBranding(db.Model):
    __tablename__ = 'app_branding'
    id = db.Column(db.Integer, primary_key=True)
    clinic_name = db.Column(db.String(100), default="Legit HealthCare")
    logo_light = db.Column(db.String(255), nullable=True)
    logo_dark = db.Column(db.String(255), nullable=True)
    favicon = db.Column(db.String(255), nullable=True)
    
    # Hero Illustration Images
    hero_image_1 = db.Column(db.String(255), nullable=True)
    hero_image_2 = db.Column(db.String(255), nullable=True)
    hero_image_team = db.Column(db.String(255), nullable=True)
    
    # Contact & Social Info
    address = db.Column(db.Text, nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    social_links = db.Column(db.Text, default='[]') # JSON string
    
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "clinic_name": self.clinic_name,
            "logo_light": self.logo_light,
            "logo_dark": self.logo_dark,
            "favicon": self.favicon,
            "hero_image_1": self.hero_image_1,
            "hero_image_2": self.hero_image_2,
            "hero_image_team": self.hero_image_team,
            "address": self.address,
            "email": self.email,
            "phone": self.phone,
            "social_links": json.loads(self.social_links) if self.social_links else []
        }

class Department(db.Model):
    __tablename__ = 'departments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class QueueTracker(db.Model):
    __tablename__ = 'queue_tracker'
    id = db.Column(db.Integer, primary_key=True)
    consultation = db.Column(db.Integer, default=0)
    audiometry = db.Column(db.Integer, default=0)
    spirometry = db.Column(db.Integer, default=0)
    ecg = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_reset = db.Column(db.DateTime, default=datetime.utcnow)


class Race(db.Model):
    __tablename__ = 'races'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Nationality(db.Model):
    __tablename__ = 'nationalities'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('staff_id', 'screening_year', name='_staff_year_uc'),
    )

class QueueEntry(db.Model):
    __tablename__ = 'queue_entries'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    department = db.Column(db.String(50), nullable=False) # Consultation, Audiometry, Spirometry, ECG
    status = db.Column(db.String(20), default='Waiting') # Waiting, Completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ConsultationData(db.Model):
    __tablename__ = 'consultation_data'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    
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
    dm_status = db.Column(db.String(50)) # Yes-On Regular Meds, etc.
    htn_status = db.Column(db.String(50))
    bp = db.Column(db.String(20))
    pulse = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    hs_status = db.Column(db.String(20)) # Present, S3, S4
    breast_exam = db.Column(db.String(20))
    breast_remark = db.Column(db.String(50))
    abdomen = db.Column(db.String(50))
    assessment_hx_pe = db.Column(db.String(100)) # Satisfactory...
    other_assessments = db.Column(db.Text)
    overall_lab_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    overall_assessment = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    consulted_by_name = db.Column(db.String(100), nullable=True)

class FBCResult(db.Model):
    __tablename__ = 'fbc_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class KFTResult(db.Model):
    __tablename__ = 'kft_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    potassium = db.Column(db.String(20))
    sodium = db.Column(db.String(20))
    chloride = db.Column(db.String(20))
    bicarbonate_ca = db.Column(db.String(20))
    hco3 = db.Column(db.String(20))
    urea = db.Column(db.String(20))
    creatinine = db.Column(db.String(20))
    kft_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LipidResult(db.Model):
    __tablename__ = 'lipid_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    total_cholesterol = db.Column(db.String(20))
    triglycerides = db.Column(db.String(20))
    hdl = db.Column(db.String(20))
    ldl = db.Column(db.String(20))
    lp_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LFTResult(db.Model):
    __tablename__ = 'lft_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    ast = db.Column(db.String(20))
    alt = db.Column(db.String(20))
    alp = db.Column(db.String(20))
    tb = db.Column(db.String(20))
    cb = db.Column(db.String(20))
    lft_remark = db.Column(db.Text)
    other_remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SpecialTestsResult(db.Model):
    __tablename__ = 'special_tests_results'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    ecg_result = db.Column(db.String(50))
    ecg_remark = db.Column(db.Text)
    spirometry_result = db.Column(db.String(50))
    weight = db.Column(db.String(20))
    height = db.Column(db.String(20))
    spirometry_remark = db.Column(db.Text)
    audiometry_result = db.Column(db.String(50))
    audiometry_remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DirectorReview(db.Model):
    __tablename__ = 'director_reviews'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.String(50), db.ForeignKey('bio_data.staff_id'), nullable=False)
    screening_year = db.Column(db.Integer, nullable=False)
    
    # Final Review Specific Fields
    dm_status = db.Column(db.String(50))
    htn_status = db.Column(db.String(50))
    bp = db.Column(db.String(20))
    pulse = db.Column(db.String(20))
    spo2 = db.Column(db.String(20))
    hs_status = db.Column(db.String(20))
    breast_exam = db.Column(db.String(20))
    breast_remark = db.Column(db.String(50))
    abdomen = db.Column(db.String(50))
    psa = db.Column(db.String(20))
    psa_remark = db.Column(db.Text)
    fbs = db.Column(db.String(20))
    rbs = db.Column(db.String(20))
    fbs_rbs_remark = db.Column(db.String(50))
    ua_result = db.Column(db.String(50))
    ua_remark = db.Column(db.String(50))
    
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
    
    assessment_hx_pe = db.Column(db.String(100))
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

class ChatGroup(db.Model):
    __tablename__ = 'chat_groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    avatar = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    last_read_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    reactions = db.Column(db.Text, default='[]') # JSON string of reactions: [{"emoji": "👍", "user_id": 1}]
    
    read_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    resource = db.Column(db.String(100))
    details = db.Column(db.Text) # JSON string
    ip_address = db.Column(db.String(45))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('StaffUser', foreign_keys='AuditLog.user_id', backref=db.backref('audit_logs', lazy=True))

    def to_dict(self):
        details_data = {}
        if self.details:
            try:
                details_data = json.loads(self.details)
            except (ValueError, TypeError, json.JSONDecodeError):
                details_data = {"message": self.details}

        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": f"{self.user.first_name} {self.user.last_name}" if self.user else "System",
            "action": self.action,
            "resource": self.resource,
            "details": details_data,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat()
        }


class AccessRequest(db.Model):
    __tablename__ = 'access_requests'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    permission_name = db.Column(db.String(100), nullable=False)
    is_reviewed = db.Column(db.Boolean, default=False)
    review_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    reason = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
            "reason": self.reason,
            "created_at": self.created_at.isoformat()
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
