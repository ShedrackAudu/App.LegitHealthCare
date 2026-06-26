from flask import Blueprint, request, jsonify
from models import db, Appointment, ScreeningYearBioData, AuditLog
from datetime import datetime
import os
from utils.email_utils import EmailService
from decorators import require_permission
from flask_jwt_extended import jwt_required, get_jwt_identity

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/appointments', methods=['POST'])
@require_permission(['manage_appointments', 'patient_access'])
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

    # Get patient bio-data (search both DCP and DCT if needed)
    from models import BioData, ScreeningYearBioData
    from sqlalchemy import text
    
    patient_data = None
    
    # 1. Try current context
    patient = BioData.query.filter_by(staff_id=staff_id).first()
    if patient:
        patient_data = {
            "name": f"{patient.first_name} {patient.last_name}",
            "dept": patient.department,
            "gender": patient.gender,
            "dob": patient.dob.isoformat() if patient.dob else None,
            "age": patient.age,
            "phone": patient.phone,
            "email": patient.email,
            "nationality": patient.nationality
        }
    
    if not patient_data:
        # 2. Search explicitly in all clinic binds
        for bind_key in ['dcp', 'dct']:
            try:
                engine = db.get_engine(bind='patients' if bind_key == 'patients' else bind_key)
                with engine.connect() as conn:
                    sql = text("SELECT first_name, last_name, department, gender, age, dob, phone, email, nationality FROM bio_data WHERE LOWER(staff_id) = LOWER(:sid)")
                    res = conn.execute(sql, {"sid": staff_id}).fetchone()
                    if res:
                        patient_data = {
                            "name": f"{res[0]} {res[1]}",
                            "dept": res[2],
                            "gender": res[3],
                            "dob": str(res[5]) if res[5] else None,
                            "age": res[4],
                            "phone": res[6],
                            "email": res[7],
                            "nationality": res[8]
                        }
                        break
            except:
                continue

    if not patient_data:
        # 3. Last resort fallback to ScreeningYearBioData in current context
        patient_fallback = ScreeningYearBioData.query.filter_by(staff_id=staff_id).first()
        if patient_fallback:
            patient_data = {
                "name": f"{patient_fallback.first_name} {patient_fallback.last_name}",
                "dept": patient_fallback.department,
                "gender": patient_fallback.gender,
                "dob": None,
                "age": patient_fallback.age,
                "phone": None,
                "email": None,
                "nationality": None
            }

    if not patient_data:
        return jsonify({"error": "Patient not found in directory"}), 404

    patient_name = patient_data['name']
    dept = patient_data['dept']
    gender = patient_data['gender']
    dob = patient_data['dob']
    age = patient_data['age']
    phone = patient_data['phone']
    email = patient_data['email']
    nationality = patient_data['nationality']

    # Detect who is booking
    from flask_jwt_extended import get_jwt, get_jwt_identity
    from models import StaffUser, PatientPortalUser
    
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    current_user_id = get_jwt_identity()
    
    booked_by_type = portal
    booked_by_username = "Unknown"
    
    if portal == 'patient':
        booker = PatientPortalUser.query.get(current_user_id)
        if booker:
            booked_by_username = booker.username # staff_id
    else:
        booker = StaffUser.query.get(current_user_id)
        if booker:
            booked_by_username = booker.username

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
        reason=reason,
        booked_by_type=booked_by_type,
        booked_by_username=booked_by_username
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
            
            if email:
                EmailService.send_email(
                    to_email=email,
                    subject=f"Appointment Confirmation: {patient_name} ({staff_id})",
                    html_content=email_content
                )
        except Exception as e:
            print(f"Appointment Email Error: {e}")
            # Don't fail the request if email fails, but log it

    # Log action
    AuditLog.log_action(
        action='Book Appointment',
        resource=f"Appointment:{staff_id}",
        details={"message": f"Booked appointment for Patient {patient_name} ({staff_id}) on {appointment_date.strftime('%Y-%m-%d')} ({time_slot}) for {reason}.", "staff_id": staff_id, "patient_name": patient_name, "appointment_date": appointment_date.strftime('%Y-%m-%d'), "time_slot": time_slot, "reason": reason}
    )
    db.session.commit()
    return jsonify({"message": "Appointment booked successfully", "appointment": appointment.to_dict()}), 201

@appointments_bp.route('/appointments', methods=['GET'])
@require_permission('manage_appointments')
def get_appointments():
    appointments = Appointment.query.order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200

@appointments_bp.route('/patient/appointments', methods=['GET'])
@jwt_required()
def get_patient_appointments():
    user_id = get_jwt_identity()
    from models import PatientPortalUser
    user = PatientPortalUser.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Filter by the patient's staff_id (which is their username in the portal)
    appointments = Appointment.query.filter_by(staff_id=user.username).order_by(Appointment.appointment_date.desc()).all()
    return jsonify([a.to_dict() for a in appointments]), 200

@appointments_bp.route('/appointments/<int:appointment_id>/complete', methods=['PATCH'])
@require_permission('manage_appointments')
def complete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
        
    appointment.status = 'Completed'
    # Log action
    AuditLog.log_action(
        action='Complete Appointment',
        resource=f"Appointment:{appointment.staff_id}",
        details={"message": f"Marked appointment for Patient {appointment.patient_name} ({appointment.staff_id}) on {appointment.appointment_date.strftime('%Y-%m-%d')} as Completed.", "appointment_id": appointment_id, "staff_id": appointment.staff_id}
    )
    db.session.commit()
    return jsonify({"message": "Appointment marked as completed", "appointment": appointment.to_dict()}), 200

@appointments_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@require_permission('manage_appointments')
def delete_appointment(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
        
    # Log action
    AuditLog.log_action(
        action='Delete Appointment',
        resource=f"Appointment:{appointment.staff_id}",
        details={"message": f"Deleted appointment for Patient {appointment.patient_name} ({appointment.staff_id}) on {appointment.appointment_date.strftime('%Y-%m-%d')}.", "appointment_id": appointment_id, "staff_id": appointment.staff_id}
    )
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
