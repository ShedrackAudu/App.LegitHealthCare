from flask import Blueprint, request, jsonify
from models import db, Appointment, ScreeningYearBioData
from datetime import datetime
import os
from utils.email_utils import EmailService
from decorators import require_permission

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/appointments', methods=['POST'])
@require_permission('manage_appointments')
def create_appointment():
    data = request.json
    staff_id = data.get('staff_id')
    appointment_date_str = data.get('appointment_date')
    time_slot = data.get('time_slot')
    reason = data.get('reason')
    
    if not staff_id or not appointment_date_str or not reason or not time_slot:
        return jsonify({"error": "Staff ID, appointment date, time slot, and reason are required"}), 400
        
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

    # Prevent Double Booking
    existing = Appointment.query.filter_by(
        appointment_date=appointment_date,
        time_slot=time_slot
    ).first()
    if existing:
        return jsonify({"error": f"The time slot {time_slot} is already booked for this date."}), 409

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
        time_slot=time_slot,
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
            "Nationality": nationality or "N/A",
            "Preferred Time Slot": time_slot or "Not Specified"
        }
        
        try:
            from models import AppBranding
            branding = AppBranding.query.first()
            logo_url = branding.logo_light if branding and branding.logo_light else None
            
            if logo_url and logo_url.startswith('/'):
                base_url = request.url_root.rstrip('/')
                if 'onrender.com' in base_url and base_url.startswith('http:'):
                    base_url = base_url.replace('http:', 'https:')
                logo_url = f"{base_url}{logo_url}"

            email_content = EmailService.get_appointment_template(
                patient_data, 
                appointment_date.strftime('%Y-%m-%d %H:%M'), 
                reason,
                logo_url=logo_url
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
@require_permission('manage_appointments')
def get_appointments():
    appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200

@appointments_bp.route('/appointments/<int:appointment_id>/complete', methods=['PATCH'])
@require_permission('manage_appointments')
def complete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
        
    appointment.status = 'Completed'
    db.session.commit()
    return jsonify({"message": "Appointment marked as completed", "appointment": appointment.to_dict()}), 200

@appointments_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@require_permission('manage_appointments')
def delete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
        
    db.session.delete(appointment)
    db.session.commit()
    return jsonify({"message": "Appointment deleted successfully"}), 200

@appointments_bp.route('/appointments/booked', methods=['GET'])
def get_booked_slots():
    date_str = request.args.get('date') # Expected DD-MM-YYYY
    if not date_str:
        return jsonify({"error": "Date parameter is required"}), 400
        
    try:
        # Match the parsing logic in create_appointment
        if '-' in date_str:
            target_date = datetime.strptime(date_str, '%d-%m-%Y')
        else:
            target_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
    except ValueError:
        try:
             target_date = datetime.strptime(date_str, '%Y-%m-%d')
        except:
             return jsonify({"error": "Invalid date format"}), 400
             
    booked = Appointment.query.filter_by(appointment_date=target_date).all()
    return jsonify([a.time_slot for a in booked if a.time_slot]), 200
