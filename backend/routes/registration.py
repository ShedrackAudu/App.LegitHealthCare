from flask import Blueprint, request, jsonify, g
from models import db, BioData, ScreeningYearBioData, QueueTracker, QueueEntry, AuditLog
from datetime import datetime
from sqlalchemy import func
from decorators import require_permission

registration_bp = Blueprint('registration', __name__)

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@registration_bp.route('/patient/<staff_id>', methods=['GET'])
@require_permission('registration')
def get_patient(staff_id):
    # Comprehensive search (always in the context's main bio_data)
    bind = get_bind()
    if not bind: 
        return jsonify({"error": "Invalid section context"}), 400
    
    clean_staff_id = staff_id.strip()
    patient = BioData.query.filter(func.lower(BioData.staff_id) == func.lower(clean_staff_id)).first()
    
    if not patient:
        return jsonify({"error": "Patient not found"}), 404
        
    # NEW: Pull patient_id from the most recent screening record
    yearly_record = ScreeningYearBioData.query.filter_by(staff_id=patient.staff_id).order_by(ScreeningYearBioData.screening_year.desc()).first()
    patient_id = yearly_record.patient_id if yearly_record else None
    
    return jsonify({
        "staff_id": patient.staff_id,
        "patient_id": patient_id, # Added
        "first_name": patient.first_name,
        "middle_name": patient.middle_name,
        "last_name": patient.last_name,
        "department": patient.department,
        "gender": patient.gender,
        "dob": patient.dob.isoformat() if patient.dob else None,
        "age": patient.age,
        "phone": patient.phone,
        "email": patient.email,
        "race": patient.race,
        "nationality": patient.nationality
    }), 200

@registration_bp.route('/register-patient', methods=['POST'])
@require_permission('registration')
def register_patient():
    try:
        data = request.json
        bind = get_bind()
        if not bind: return jsonify({"error": "Invalid section context"}), 400
        
        screening_year = data.get('screening_year')
        staff_id = data.get('staff_id', '').strip()
        patient_id = data.get('patient_id') # Clinic ID for this year
        
        if not staff_id or not patient_id:
            return jsonify({"error": "Staff ID and Patient ID are required"}), 400

        # Check if patient already registered in this year
        existing_yearly = ScreeningYearBioData.query.filter_by(
            screening_year=screening_year, 
            staff_id=staff_id
        ).first()
        
        if existing_yearly:
            return jsonify({"error": "Patient already registered for this screening year"}), 400

        # Ensure Patient ID is unique for this year
        id_conflict = ScreeningYearBioData.query.filter_by(
            screening_year=screening_year,
            patient_id=patient_id
        ).first()
        if id_conflict:
            return jsonify({"error": f"Patient ID {patient_id} already issued for {screening_year}"}), 400

        # 1. Update/Create Comprehensive BioData
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        if not patient:
            patient = BioData(staff_id=staff_id)
            db.session.add(patient)
        
        # Update fields
        patient.first_name = data.get('first_name')
        patient.middle_name = data.get('middle_name')
        patient.last_name = data.get('last_name')
        patient.department = data.get('department')
        patient.gender = data.get('gender')
        if data.get('dob'):
            try:
                patient.dob = datetime.strptime(data['dob'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": f"Invalid date format: {data['dob']}. Expected YYYY-MM-DD"}), 400
        patient.age = data.get('age')
        patient.phone = data.get('phone')
        patient.email = data.get('email')
        patient.race = data.get('race')
        patient.nationality = data.get('nationality')

        # 2. Link to Screening Year
        # Flush to ensure BioData is available for FK constraint in some DBs
        db.session.flush()

        yearly_record = ScreeningYearBioData(
            screening_year=screening_year,
            patient_id=patient_id,
            staff_id=staff_id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            department=patient.department,
            gender=patient.gender,
            age=patient.age
        )
        db.session.add(yearly_record)
        
        # New Queue System: Create entries for specific clinical departments
        # First, clean up any existing entries for this staff/year to prevent duplicates
        QueueEntry.query.filter_by(staff_id=staff_id, screening_year=screening_year).delete()
        
        for dept in ['Consultation', 'Audiometry', 'Spirometry', 'ECG']:
            q_entry = QueueEntry(
                staff_id=staff_id,
                screening_year=screening_year,
                department=dept,
                status='Waiting'
            )
            db.session.add(q_entry)

        # Create Audit Log
        audit = AuditLog(
            user_id=data.get('user_id'), # Optional: frontend should send X-User-ID or similar
            action='Register Patient',
            resource=f"Patient:{staff_id}",
            details=f"Patient {patient.first_name} {patient.last_name} registered for year {screening_year}.",
            ip_address=request.remote_addr
        )
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({"message": "Registration successful", "staff_id": staff_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@registration_bp.route('/stats', methods=['GET'])
@require_permission('view_dashboard')
def get_registration_stats():
    bind = get_bind()
    year = request.args.get('year')
    if not bind or not year: return jsonify({"error": "Context missing"}), 400
    
    # Total in bio_data (Comprehensive)
    total_comprehensive = BioData.query.count()
    
    # Stats for the specific screening year
    base_query = ScreeningYearBioData.query.filter_by(screening_year=year)
    
    from datetime import time
    today_start = datetime.combine(datetime.utcnow().date(), time.min)
    today_end = datetime.combine(datetime.utcnow().date(), time.max)
    # Number registered today
    day_count = base_query.filter(ScreeningYearBioData.created_at >= today_start, ScreeningYearBioData.created_at <= today_end).count()
    
    # Gender counts
    males = base_query.filter_by(gender='Male').count()
    females = base_query.filter_by(gender='Female').count()
    
    # Age breakdown
    age_40_above = base_query.filter(ScreeningYearBioData.age >= 40).count()
    age_below_40 = base_query.filter(ScreeningYearBioData.age < 40).count()
    
    return jsonify({
        "total_comprehensive": total_comprehensive,
        "year_total": base_query.count(),
        "today": day_count,
        "males": males,
        "females": females,
        "age_40_above": age_40_above,
        "age_below_40": age_below_40
    }), 200
