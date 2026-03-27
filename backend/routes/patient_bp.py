from flask import Blueprint, request, jsonify, current_app
from models import db, User, Role
from auth_utils import generate_otp, verify_otp
import pyotp
import os
from sqlalchemy import text
from datetime import datetime

from utils.email_utils import EmailService

patient_bp = Blueprint('patient_bp', __name__)

# Simple in-memory store for OTPs (email -> otp)
# In production, use Redis or a database table with expiry
otp_store = {}

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
                
                # Columns we want to select (only if they exist)
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
        
    # Return only the first result to match frontend expectation
    return jsonify(results[0]), 200

@patient_bp.route('/api/patient/claim', methods=['POST'])
def claim_account():
    data = request.json
    staff_id = data.get('staff_id')
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name', 'Patient')
    
    if not all([staff_id, email, password]):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Check if user already exists
    existing_user = User.query.filter((User.username == staff_id) | (User.email == email)).first()
    if existing_user:
        return jsonify({"error": "An account with this Staff ID or email already exists."}), 400
        
    # Generate OTP
    otp = generate_otp()
    otp_store[email] = otp
    print(f"--- DEBUG: OTP for {email}: {otp} ---")
    
    # Send Email
    try:
        subject = "Patient Account Verification - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(first_name, otp)
        sent = EmailService.send_email(email, subject, html_content)
        if not sent:
             print(f"--- FAILED to send email to {email} ---")
    except Exception as e:
        print(f"--- ERROR sending email to {email}: {str(e)} ---")
    
    return jsonify({
        "message": "OTP sent to your email. Please verify to complete registration.",
        "otp_sent": True
    }), 200

@patient_bp.route('/api/patient/resend-otp', methods=['POST'])
def resend_otp():
    data = request.json
    email = data.get('email')
    first_name = data.get('first_name', 'Patient')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    # Generate new OTP
    otp = generate_otp()
    otp_store[email] = otp
    print(f"--- DEBUG: Resent OTP for {email}: {otp} ---")
    
    # Send Email
    try:
        subject = "New Verification Code - Legit HealthCare"
        html_content = EmailService.get_patient_verification_template(first_name, otp)
        sent = EmailService.send_email(email, subject, html_content)
        if not sent:
             return jsonify({"error": "Failed to send email. Please check your connection."}), 500
    except Exception as e:
        return jsonify({"error": f"Error sending email: {str(e)}"}), 500
    
    return jsonify({
        "message": "A new verification code has been sent to your email.",
        "success": True
    }), 200

@patient_bp.route('/api/patient/verify-otp', methods=['POST'])
def verify_patient_otp():
    data = request.json
    staff_id = data.get('staff_id')
    email = data.get('email')
    password = data.get('password')
    otp_code = data.get('otp')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    phone = data.get('phone', 'N/A')
    section = data.get('section', 'DCP')
    department = data.get('department', 'N/A')
    
    # Verify OTP against our store
    stored_otp = otp_store.get(email)
    if not stored_otp or stored_otp != otp_code:
        # For legacy compatibility during transition, check if it's 6 digits
        if not verify_otp(otp_code):
            return jsonify({"error": "Invalid or expired OTP"}), 400
        
    # Create the user account
    patient_role = Role.query.filter_by(name='Patient').first()
    if not patient_role:
        return jsonify({"error": "Patient role not configured"}), 500
        
    try:
        new_user = User(
            username=staff_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            section=section,
            department=department,
            is_verified=True
        )
        new_user.set_password(password)
        new_user.roles.append(patient_role)
        
        db.session.add(new_user)
        db.session.commit()
        
        # Cleanup OTP store
        if email in otp_store:
            del otp_store[email]
            
        return jsonify({
            "message": "Welcome! Your account has been successfully created.",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"--- DEBUG: Failed to create account: {str(e)} ---")
        return jsonify({"error": f"Failed to create account: {str(e)}"}), 500
