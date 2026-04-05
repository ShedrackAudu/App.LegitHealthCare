from flask import Blueprint, request, jsonify
from models import db, Appointment, ScreeningYearBioData
from datetime import datetime
import os
from utils.email_utils import EmailService

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/appointments', methods=['POST'])
def create_appointment():
    data = request.json
    staff_id = data.get('staff_id')
    appointment_date_str = data.get('appointment_date')
    reason = data.get('reason')
    
    if not staff_id or not appointment_date_str or not reason:
        return jsonify({"error": "Staff ID, appointment date, and reason are required"}), 400
        
    try:
        # User requested DD-MM-YYYY format
        if ' ' in appointment_date_str: # e.g. 31-03-2026 14:30
            appointment_date = datetime.strptime(appointment_date_str, '%d-%m-%Y %H:%M')
        elif 'T' in appointment_date_str: # Handle ISO from frontend
            appointment_date = datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
        else: # strictly DD-MM-YYYY
            try:
                appointment_date = datetime.strptime(appointment_date_str, '%d-%m-%Y')
            except ValueError:
                # Fallback to YYYY-MM-DD
                appointment_date = datetime.strptime(appointment_date_str, '%Y-%m-%d')
    except ValueError as e:
        print(f"Date Parse Error: {e}")
        return jsonify({"error": f"Invalid date. Expected DD-MM-YYYY, got {appointment_date_str}"}), 400

    # Get patient bio-data from global BioData table
    from models import BioData
    patient = BioData.query.filter_by(staff_id=staff_id).first()
    
    if not patient:
        # Fallback to ScreeningYearBioData if not in master BioData (though it should be)
        from models import ScreeningYearBioData
        patient_fallback = ScreeningYearBioData.query.filter_by(staff_id=staff_id).first()
        if not patient_fallback:
            return jsonify({"error": "Patient not found in directory"}), 404
        
        patient_name = f"{patient_fallback.first_name} {patient_fallback.last_name}"
        dept = patient_fallback.department
        gender = patient_fallback.gender
        dob = None
        age = patient_fallback.age
        phone = None
        email = None
        nationality = None
    else:
        patient_name = f"{patient.first_name} {patient.last_name}"
        dept = patient.department
        gender = patient.gender
        dob = patient.dob.isoformat() if patient.dob else None
        age = patient.age
        phone = patient.phone
        email = patient.email
        nationality = patient.nationality

    appointment = Appointment(
        staff_id=staff_id,
        patient_name=patient_name,
        department=dept,
        gender=gender,
        dob=dob,
        age=age,
        phone=phone,
        email=email,
        nationality=nationality,
        appointment_date=appointment_date,
        reason=reason
    )
    
    db.session.add(appointment)
    
    # Send email to head doctor
    # Note: Using load_dotenv to ensure fresh values if updated via config UI
    from dotenv import load_dotenv
    load_dotenv(override=True)
    head_doctor_email = os.getenv('HEAD_DOCTOR_EMAIL')
    
    if head_doctor_email:
        patient_data = {
            "Staff ID": staff_id,
            "Full Name": patient_name,
            "Department": dept or "N/A",
            "Gender": gender or "N/A",
            "DOB": dob or "N/A",
            "Age": age or "N/A",
            "Phone": phone or "N/A",
            "Email": email or "N/A",
            "Nationality": nationality or "N/A"
        }
        
        try:
            email_content = EmailService.get_appointment_template(
                patient_data, 
                appointment_date.strftime('%Y-%m-%d %H:%M'), 
                reason
            )
            
            EmailService.send_email(
                to_email=head_doctor_email,
                subject=f"New Appointment: {patient_name} ({staff_id})",
                html_content=email_content
            )
        except Exception as e:
            print(f"Appointment Email Error: {e}")
            # Don't fail the request if email fails, but log it

    db.session.commit()
    return jsonify({"message": "Appointment booked successfully", "appointment": appointment.to_dict()}), 201

@appointments_bp.route('/appointments', methods=['GET'])
def get_appointments():
    appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200
