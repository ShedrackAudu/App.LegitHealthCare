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
        appointment_date = datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    # Get patient bio-data for the email and confirmation
    # We fetch from ScreeningYearBioData (default DB) to get the latest info
    patient = ScreeningYearBioData.query.filter_by(staff_id=staff_id).first()
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    appointment = Appointment(
        staff_id=staff_id,
        patient_name=f"{patient.first_name} {patient.last_name}",
        department=patient.department,
        gender=patient.gender,
        dob=patient.dob,
        age=patient.age,
        phone=patient.phone,
        email=patient.email,
        nationality=patient.nationality,
        appointment_date=appointment_date,
        reason=reason
    )
    
    db.session.add(appointment)
    
    # Send email to head doctor
    head_doctor_email = os.getenv('HEAD_DOCTOR_EMAIL')
    if head_doctor_email:
        patient_data = {
            "Staff ID": patient.staff_id,
            "Full Name": f"{patient.first_name} {patient.last_name}",
            "Department": patient.department,
            "Gender": patient.gender,
            "DOB": patient.dob,
            "Age": patient.age,
            "Phone": patient.phone,
            "Email": patient.email,
            "Nationality": patient.nationality
        }
        
        email_content = EmailService.get_appointment_template(
            patient_data, 
            appointment_date.strftime('%Y-%m-%d %H:%M'), 
            reason
        )
        
        EmailService.send_email(
            to_email=head_doctor_email,
            subject=f"New Appointment: {patient.first_name} {patient.last_name} ({staff_id})",
            html_content=email_content
        )

    db.session.commit()
    return jsonify({"message": "Appointment booked successfully", "appointment": appointment.to_dict()}), 201

@appointments_bp.route('/appointments', methods=['GET'])
def get_appointments():
    appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200
