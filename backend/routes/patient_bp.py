from flask import Blueprint, request, jsonify, current_app
from models import db, PatientPortalUser
from auth_utils import generate_otp, is_password_strong
import os
from sqlalchemy import text
from datetime import datetime, timedelta

from utils.email_utils import EmailService

patient_bp = Blueprint('patient_bp', __name__)

@patient_bp.route('/api/patient/search', methods=['GET'])
def search_patient():
    staff_id = request.args.get('staff_id')
    if not staff_id:
        return jsonify({"error": "Staff ID is required"}), 400
        
    results = []
    # Search in both contexts (DCP and DCT)
    contexts = ['dcp', 'dct']
    clean_id = staff_id.strip()
    
    # Check if this patient already has a verified account in the portal
    # Explicitly check the 'patients' bind via raw SQL to ensure engine accuracy
    try:
        patients_engine = db.get_engine(app=current_app, bind='patients')
        with patients_engine.connect() as conn:
            check_q = text("SELECT id FROM patient_users WHERE username = :sid AND is_verified = 1")
            res = conn.execute(check_q, {"sid": clean_id}).fetchone()
            if res:
                return jsonify({
                    "error": "An account for this Staff ID already exists in the Patient Portal.",
                    "already_exists": True,
                    "login_url": "/login?portal=patient"
                }), 409
    except Exception as e:
        print(f"Error checking for existing user in portal bind: {str(e)}")
        # Continue search anyway if check fails


    for ctx in contexts:
        try:
            engine = db.engines.get(ctx)
            if not engine:
                engine = db.get_engine(bind=ctx)
            
            if not engine:
                continue
            
            with engine.connect() as conn:
                # Portable way to check columns (works on Postgres and SQLite)
                res_cols = conn.execute(text("SELECT * FROM bio_data LIMIT 0"))
                actual_cols = res_cols.keys()
                
                # Columns we want to select
                requested_cols = ['staff_id', 'first_name', 'middle_name', 'last_name', 'department', 'gender', 'dob', 'phone', 'email']
                available_cols = [c for c in requested_cols if c in actual_cols]
                
                select_clause = ", ".join(available_cols)
                # Robust search: Case-insensitive (LOWER), handles prefix/suffix, and trims
                # Use LOWER(...) LIKE LOWER(...) for cross-DB case-insensitive partial match
                query = text(f"SELECT {select_clause} FROM bio_data WHERE LOWER(TRIM(staff_id)) = LOWER(:sid) OR LOWER(staff_id) LIKE LOWER(:sid_like)")
                res = conn.execute(query, {"sid": clean_id, "sid_like": f"%{clean_id}%"})
                result = res.fetchone()
                
                if result:
                    # Map result to dictionary using ._mapping for SQLAlchemy 1.4/2.0
                    row_dict = dict(result._mapping)
                    results.append({
                        "staff_id": str(row_dict.get('staff_id')),
                        "first_name": row_dict.get('first_name'),
                        "middle_name": row_dict.get('middle_name', ''),
                        "last_name": row_dict.get('last_name'),
                        "department": row_dict.get('department'),
                        "gender": row_dict.get('gender'),
                        "dob": str(row_dict.get('dob')) if row_dict.get('dob') else None,
                        "phone": row_dict.get('phone'),
                        "email": row_dict.get('email', ''),
                        "section": ctx.upper(),
                        "context": ctx
                    })
        except Exception as e:
            print(f"DEBUG: Error searching in {ctx}: {str(e)}")
            continue
            
    if not results:
        return jsonify({"error": "Patient records not found in the system."}), 404
        
    return jsonify(results[0]), 200

@patient_bp.route('/api/patient/claim', methods=['POST'])
def claim_account():
    data = request.json
    staff_id = data.get('staff_id', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password')
    first_name = data.get('first_name', 'Patient')
    last_name = data.get('last_name', '')
    phone = data.get('phone', 'N/A')
    
    if not all([staff_id, email, password]):
        return jsonify({"error": "Missing required fields"}), 400
        
    if not is_password_strong(password):
        return jsonify({"error": "Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol."}), 400
        
    # Check if user already exists in ISOLATED database
    existing_user = PatientPortalUser.query.filter(
        (PatientPortalUser.username == staff_id) | 
        (PatientPortalUser.email == email)
    ).first()
    
    if existing_user:
        if existing_user.is_verified:
            return jsonify({"error": "An account with this Staff ID or email already exists."}), 400
        # If not verified, we can overwrite/reuse
        user = existing_user
    else:
        user = PatientPortalUser(username=staff_id, email=email, phone=phone, first_name=first_name, last_name=last_name)
    
    # Generate OTP and store in DB
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.now() + timedelta(minutes=15)
    user.set_password(password)
    
    if not existing_user:
        db.session.add(user)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        error_msg = str(e)
        if "UNIQUE constraint failed" in error_msg:
            if "users.username" in error_msg or "patient_users.username" in error_msg:
                return jsonify({"error": "This Staff ID is already registered."}), 400
            if "users.email" in error_msg or "patient_users.email" in error_msg:
                return jsonify({"error": "This email is already in use."}), 400
            if "users.phone" in error_msg or "patient_users.phone" in error_msg:
                return jsonify({"error": "This phone number is already in use."}), 400
        return jsonify({"error": f"Database error: {error_msg}"}), 500
    
    # Send Email
    try:
        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        # Ensure logo_url is absolute for email clients
        if logo_url and logo_url.startswith('/'):
            base_url = request.url_root.rstrip('/')
            if 'onrender.com' in base_url and base_url.startswith('http:'):
                base_url = base_url.replace('http:', 'https:')
            logo_url = f"{base_url}{logo_url}"
            
        subject = "Patient Account Verification - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(first_name, otp, logo_url=logo_url)
        success = EmailService.send_email(email, subject, html_content)
        
        if not success:
             return jsonify({
                "message": "Account created, but we couldn't send the verification email. Please contact the administrator or check SMTP settings.",
                "user_id": user.id,
                "email_error": True
            }), 201
            
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return jsonify({
            "message": f"Account created, but email service failed: {str(e)}",
            "user_id": user.id,
            "email_error": True
        }), 201
    
    return jsonify({
        "message": "Verification code sent to your email. Please verify to complete registration.",
        "user_id": user.id,
        "otp_sent": True
    }), 200

@patient_bp.route('/api/patient/resend-otp', methods=['POST'])
def resend_otp():
    data = request.json
    email = data.get('email')
    
    user = PatientPortalUser.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.now() + timedelta(minutes=15)
    db.session.commit()
    
    try:
        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        # Ensure logo_url is absolute for email clients
        if logo_url and logo_url.startswith('/'):
            base_url = request.url_root.rstrip('/')
            if 'onrender.com' in base_url and base_url.startswith('http:'):
                base_url = base_url.replace('http:', 'https:')
            logo_url = f"{base_url}{logo_url}"
            
        subject = "New Verification Code - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(user.first_name, otp, logo_url=logo_url)
        success = EmailService.send_email(user.email, subject, html_content)
        
        if not success:
            return jsonify({"error": "Failed to connect to the email server. Please try again later or contact support."}), 500
            
    except Exception as e:
        return jsonify({"error": f"Email service error: {str(e)}"}), 500
    
    return jsonify({
        "message": "A new verification code has been sent to your email.",
        "success": True
    }), 200

@patient_bp.route('/api/patient/verify-otp', methods=['POST'])
def verify_patient_otp():
    data = request.json
    email = data.get('email')
    otp_code = data.get('otp')
    
    user = PatientPortalUser.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if user.otp_code == otp_code and user.otp_expiry > datetime.now():
        user.is_verified = True
        user.otp_code = None
        db.session.commit()
        return jsonify({
            "message": "Welcome! Your account has been successfully created.",
            "user": user.to_dict()
        }), 201
    
    return jsonify({"error": "Invalid or expired OTP"}), 400

@patient_bp.route('/api/patient/reports/years', methods=['GET'])
def get_report_years():
    staff_id = request.headers.get('X-Staff-ID')
    if not staff_id:
        return jsonify({"error": "X-Staff-ID header required"}), 400
        
    clean_id = staff_id.strip()
    years_set = set()
    contexts = ['dcp', 'dct']
    
    for ctx in contexts:
        try:
            engine = db.engines.get(ctx)
            if not engine:
                engine = db.get_engine(bind=ctx)
            
            with engine.connect() as conn:
                # Use raw SQL for consistent cross-bind behavior if needed, 
                # but ScreeningYearBioData is standard model. 
                # Routing session handles binds if we set header, but here we loop manually.
                query = text("SELECT DISTINCT screening_year FROM screening_year_bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
                res = conn.execute(query, {"sid": clean_id})
                for row in res:
                    years_set.add(row[0])
        except Exception as e:
            print(f"Error fetching years in {ctx}: {str(e)}")
            continue
            
    years = sorted(list(years_set), reverse=True)
    return jsonify(years), 200

@patient_bp.route('/api/patient/profile', methods=['GET'])
def get_patient_profile():
    staff_id = request.headers.get('X-Staff-ID')
    if not staff_id:
        return jsonify({"error": "X-Staff-ID header required"}), 400
        
    clean_id = staff_id.strip()
    contexts = ['dcp', 'dct']
    
    for ctx in contexts:
        try:
            # Access engine directly from db.engines for maximum reliability
            engine = db.engines.get(ctx)
            if not engine:
                continue
                
            with engine.connect() as conn:
                query = text("SELECT staff_id, first_name, middle_name, last_name, department, gender, dob, age, phone, email, race, nationality FROM bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
                res = conn.execute(query, {"sid": clean_id})
                result = res.fetchone()
                
                if result:
                    # Robust mapping
                    row = dict(result._mapping)
                    return jsonify({
                        "staff_id": str(row.get('staff_id')),
                        "first_name": row.get('first_name'),
                        "middle_name": row.get('middle_name'),
                        "last_name": row.get('last_name'),
                        "department": row.get('department', 'General'),
                        "gender": row.get('gender', 'N/A'),
                        "dob": str(row.get('dob')) if row.get('dob') else 'N/A',
                        "age": row.get('age', 'N/A'),
                        "phone": row.get('phone', 'N/A'),
                        "email": row.get('email', 'N/A'),
                        "race": row.get('race', 'N/A'),
                        "nationality": row.get('nationality', 'N/A'),
                        "section": ctx.upper()
                    }), 200
        except Exception as e:
            print(f"DEBUG: Error in {ctx} profile: {str(e)}")
            continue
            
    return jsonify({"error": "Patient profile not found in any clinical section."}), 404

@patient_bp.route('/api/patient/reset-password/request', methods=['POST'])
def reset_password_request():
    data = request.json
    email = data.get('email')
    
    user = PatientPortalUser.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "No account found with this email address."}), 404
        
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expiry = datetime.now() + timedelta(minutes=15)
    db.session.commit()
    
    try:
        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        if logo_url and logo_url.startswith('/'):
            base_url = request.url_root.rstrip('/')
            if 'onrender.com' in base_url and base_url.startswith('http:'):
                base_url = base_url.replace('http:', 'https:')
            logo_url = f"{base_url}{logo_url}"
            
        subject = "Password Reset Verification - Legit HealthCare"
        html_content = EmailService.get_otp_template(user.first_name, otp, logo_url=logo_url)
        success = EmailService.send_email(user.email, subject, html_content)
        
        if not success:
            return jsonify({"error": "System was unable to connect to the mail server. Please contact your system administrator."}), 500
            
    except Exception as e:
        return jsonify({"error": f"Internal System Error: {str(e)}"}), 500
        
    return jsonify({"message": "A 6-digit reset code has been sent to your email.", "success": True}), 200

@patient_bp.route('/api/patient/reset-password/verify', methods=['POST'])
def reset_password_verify():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    new_password = data.get('new_password')
    
    if not all([email, otp, new_password]):
        return jsonify({"error": "All fields are required."}), 400
        
    user = PatientPortalUser.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found."}), 404
        
    if user.otp_code != otp or user.otp_expiry < datetime.now():
        return jsonify({"error": "Invalid or expired verification code."}), 400
        
    # Strong password check (optional but recommended)
    from auth_utils import is_password_strong
    if not is_password_strong(new_password):
        return jsonify({"error": "New password does not meet safety requirements."}), 400
        
    user.set_password(new_password)
    user.otp_code = None # Clear OTP after use
    db.session.commit()
    
    return jsonify({"message": "Your password has been reset successfully. You can now log in.", "success": True}), 200

