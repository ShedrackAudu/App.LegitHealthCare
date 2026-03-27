from flask import Blueprint, request, jsonify, current_app
from models import db, PatientPortalUser
from auth_utils import generate_otp
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
    
    for ctx in contexts:
        try:
            engine = db.engines.get(ctx)
            if not engine:
                engine = db.get_engine(bind=ctx)
            
            if not engine:
                continue
            
            with engine.connect() as conn:
                # Dynamically check for columns
                check_cols_query = text("PRAGMA table_info(bio_data)")
                actual_cols = [c[1] for c in conn.execute(check_cols_query).fetchall()]
                
                # Columns we want to select
                requested_cols = ['staff_id', 'first_name', 'middle_name', 'last_name', 'department', 'gender', 'dob', 'phone', 'email', 'section']
                available_cols = [c for c in requested_cols if c in actual_cols]
                
                select_clause = ", ".join(available_cols)
                query = text(f"SELECT {select_clause} FROM bio_data WHERE staff_id = :sid OR staff_id LIKE :sid_like")
                res = conn.execute(query, {"sid": clean_id, "sid_like": f"%{clean_id}"})
                result = res.fetchone()
                
                if result:
                    # Map result to dictionary
                    row_dict = dict(zip(available_cols, result))
                    results.append({
                        "staff_id": str(row_dict.get('staff_id')),
                        "first_name": row_dict.get('first_name'),
                        "middle_name": row_dict.get('middle_name'),
                        "last_name": row_dict.get('last_name'),
                        "department": row_dict.get('department'),
                        "gender": row_dict.get('gender'),
                        "dob": str(row_dict.get('dob')) if row_dict.get('dob') else None,
                        "phone": row_dict.get('phone'),
                        "email": row_dict.get('email'),
                        "section": row_dict.get('section') or ctx.upper(),
                        "context": ctx
                    })
        except Exception as e:
            print(f"Error searching in {ctx}: {str(e)}")
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
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
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
        subject = "Patient Account Verification - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(first_name, otp)
        EmailService.send_email(email, subject, html_content)
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
    
    return jsonify({
        "message": "OTP sent to your email. Please verify to complete registration.",
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
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()
    
    try:
        subject = "New Verification Code - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(user.first_name, otp)
        EmailService.send_email(user.email, subject, html_content)
    except Exception as e:
        return jsonify({"error": f"Error sending email: {str(e)}"}), 500
    
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
        
    if user.otp_code == otp_code and user.otp_expiry > datetime.utcnow():
        user.is_verified = True
        user.otp_code = None
        db.session.commit()
        return jsonify({
            "message": "Welcome! Your account has been successfully created.",
            "user": user.to_dict()
        }), 201
    
    return jsonify({"error": "Invalid or expired OTP"}), 400
