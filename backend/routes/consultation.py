from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ConsultationData, ScreeningYearBioData
from sqlalchemy.orm import Session
from decorators import require_permission
import sys

consultation_bp = Blueprint('consultation', __name__)

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@consultation_bp.route('/screening/<int:year>/patient/<staff_id>', methods=['GET'])
@jwt_required()
def get_screening_patient(year, staff_id):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid section context"}), 400
    
    # Must be search in the specific screening year bio data
    record = ScreeningYearBioData.query.filter_by(screening_year=year, staff_id=staff_id).first()
    if not record:
        return jsonify({"error": "Patient not registered for this screening year"}), 404
        
    data = {
        "staff_id": record.staff_id,
        "first_name": record.first_name,
        "last_name": record.last_name,
        "department": record.department,
        "gender": record.gender,
        "age": record.age,
        "consultation": None
    }
    
    # Check for existing consultation data
    consultation = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=year).first()
    if consultation:
        data["consultation"] = {
            "luts": consultation.luts,
            "chronic_cough": consultation.chronic_cough,
            "chronic_chest_pain": consultation.chronic_chest_pain,
            "chest_infection": consultation.chest_infection,
            "heart_dx": consultation.heart_dx,
            "palor": consultation.palor,
            "jaundice": consultation.jaundice,
            "murmur": consultation.murmur,
            "chest_status": consultation.chest_status,
            "psa": consultation.psa,
            "psa_remark": consultation.psa_remark,
            "fbs": consultation.fbs,
            "rbs": consultation.rbs,
            "sugar_remark": consultation.sugar_remark,
            "ua_result": consultation.ua_result,
            "ua_remark": consultation.ua_remark,
            "ua_remark_others": consultation.ua_remark_others,
            "dm_status": consultation.dm_status,
            "htn_status": consultation.htn_status,
            "bp": consultation.bp,
            "pulse": consultation.pulse,
            "spo2": consultation.spo2,
            "hs_status": consultation.hs_status,
            "breast_exam": consultation.breast_exam,
            "breast_remark": consultation.breast_remark,
            "abdomen": consultation.abdomen,
            "assessment_hx_pe": consultation.assessment_hx_pe,
            "other_assessments": consultation.other_assessments,
            "overall_lab_remark": consultation.overall_lab_remark,
            "other_remarks": consultation.other_remarks,
            "overall_assessment": consultation.overall_assessment,
            "consulted_by_name": consultation.consulted_by_name
        }
        
    return jsonify(data), 200

@consultation_bp.route('/consultation', methods=['POST'])
@jwt_required()
def save_consultation():
    data = request.json
    staff_id = data.get('staff_id')
    screening_year = data.get('screening_year')
    
    if not staff_id or not screening_year:
        return jsonify({"error": "Staff ID and screening year required"}), 400
        
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid section context"}), 400
    
    # Check if record exists
    consultation = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if not consultation:
        consultation = ConsultationData(staff_id=staff_id, screening_year=screening_year)
        db.session.add(consultation)
        
    # Update fields
    fields = [
        'luts', 'chronic_cough', 'chronic_chest_pain', 'chest_infection', 'heart_dx',
        'palor', 'jaundice', 'murmur', 'chest_status', 'psa', 'psa_remark',
        'fbs', 'rbs', 'sugar_remark', 'ua_result', 'ua_remark', 'ua_remark_others', 'dm_status',
        'htn_status', 'bp', 'pulse', 'spo2', 'hs_status', 'breast_exam',
        'breast_remark', 'abdomen', 'assessment_hx_pe', 'other_assessments',
        'overall_lab_remark', 'other_remarks', 'overall_assessment'
    ]
    
    for field in fields:
        if field in data:
            setattr(consultation, field, data[field])
            
    # Capture consulting doctor's name from JWT identity
    user_id = get_jwt_identity()
    
    if user_id and user_id != 'undefined' and user_id != 'null':
        try:
            from models import StaffUser
            u_id = int(str(user_id))
            user = StaffUser.query.get(u_id)
            if user:
                consultation.consulted_by_name = user.first_name
                sys.stderr.write(f"[DEBUG] Successfully attributed to: {consultation.consulted_by_name}\n")
            else:
                sys.stderr.write(f"[DEBUG] No user found with ID: {user_id}\n")
        except Exception as e:
            sys.stderr.write(f"[DEBUG] Attribution error: {e}\n")
            import traceback
            traceback.print_exc(file=sys.stderr)
    else:
        sys.stderr.write(f"[DEBUG] JWT identity is MISSING or INVALID\n")
            
    # Remove from Consultation Queue
    from models import QueueEntry
    from sqlalchemy import func
    db.session.query(QueueEntry).filter(
        func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
        QueueEntry.screening_year == screening_year, 
        QueueEntry.department == 'Consultation'
    ).delete(synchronize_session=False)

    db.session.commit()
    
    # Trigger notification check
    from utils.notification_logic import trigger_report_ready_notification
    if bind:
        trigger_report_ready_notification(staff_id, screening_year, bind)
        
    return jsonify({"message": "Consultation data saved successfully"}), 200
