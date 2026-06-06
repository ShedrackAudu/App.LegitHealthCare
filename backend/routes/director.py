from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from models import db, BioData, ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, DirectorReview, AuditLog
from datetime import datetime
from decorators import require_permission

director_bp = Blueprint('director', __name__)

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@director_bp.route('/get-patient-history/<staff_id>', methods=['GET'])
@require_permission('director_review')
def get_patient_history(staff_id):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid section context"}), 400
    
    screening_year = request.args.get('year')
    if not screening_year:
        return jsonify({"error": "Year is required"}), 400
        
    try:
        year_int = int(screening_year)
    except ValueError:
        return jsonify({"error": "Invalid screening year format"}), 400
        
    # Gather all results
    history = {}
    
    # 1. Consultation
    consult = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if consult:
        history['consultation'] = {c.name: getattr(consult, c.name) for c in consult.__table__.columns}
        
    # 2. Lab Results
    fbc = FBCResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if fbc:
        history['fbc'] = {c.name: getattr(fbc, c.name) for c in fbc.__table__.columns}
        
    kft = KFTResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if kft:
        history['kft'] = {c.name: getattr(kft, c.name) for c in kft.__table__.columns}
        
    lipid = LipidResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if lipid:
        history['lipid'] = {c.name: getattr(lipid, c.name) for c in lipid.__table__.columns}
        
    lft = LFTResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if lft:
        history['lft'] = {c.name: getattr(lft, c.name) for c in lft.__table__.columns}
        
    special = SpecialTestsResult.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if special:
        history['special'] = {c.name: getattr(special, c.name) for c in special.__table__.columns}
        
    # 3. Existing Director Review
    review = DirectorReview.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
    if review:
        history['review'] = {c.name: getattr(review, c.name) for c in review.__table__.columns}
        if 'fbs_rbs_remark' in history['review']:
            history['review']['sugar_remark'] = history['review']['fbs_rbs_remark']
        
    if not history:
        return jsonify({"message": "No data found for this patient in the selected year"}), 404
        
    return jsonify(history), 200

@director_bp.route('/save-director-review', methods=['POST'])
@require_permission('director_review')
def save_director_review():
    data = request.json
    staff_id = data.get('staff_id')
    screening_year = data.get('screening_year')
    
    if not staff_id or not screening_year:
        return jsonify({"error": "Staff ID and Screening Year are required"}), 400
        
    try:
        year_int = int(screening_year)
    except ValueError:
        return jsonify({"error": "Invalid screening year format"}), 400
        
    # 1. Define sets of fields for each model to handle bidirectional sync
    model_configs = [
        {
            'model': DirectorReview,
            'fields': ['comment_one', 'comment_two', 'comment_three', 'comment_four', 
                       'overall_assessment', 'overall_lab_remark', 'other_remarks', 
                       'other_assessments', 'assessment_hx_pe', 'dm_status', 'htn_status', 
                       'bp', 'pulse', 'spo2', 'hs_status', 'chest_status', 'abdomen', 
                       'breast_exam', 'breast_remark', 'luts', 'chronic_cough', 
                       'chronic_chest_pain', 'chest_infection', 'heart_dx', 'palor', 
                       'jaundice', 'murmur', 'psa', 'psa_remark', 'fbs', 'rbs', 'fbs_rbs_remark',
                       'ua_result', 'ua_remark', 'ua_remark_others', 'breast_others', 'abdomen_others'],
            'mappings': {'sugar_remark': 'fbs_rbs_remark'}
        },
        {
            'model': ConsultationData,
            'fields': ['bp', 'pulse', 'spo2', 'hs_status', 'chest_status', 'abdomen', 
                       'breast_exam', 'breast_remark', 'luts', 'chronic_cough', 
                       'chronic_chest_pain', 'chest_infection', 'heart_dx', 'palor', 
                       'jaundice', 'murmur', 'psa', 'psa_remark', 'fbs', 'rbs', 'sugar_remark', 
                       'ua_result', 'ua_remark', 'ua_remark_others', 'breast_others', 'abdomen_others', 'dm_status', 'htn_status', 
                       'assessment_hx_pe', 'other_assessments', 'overall_lab_remark', 
                       'other_remarks', 'overall_assessment']
        },
        {
            'model': FBCResult,
            'fields': ['pcv', 'wbc', 'hgb', 'plt', 'rbc', 'lymp_percent', 'lymp_abs', 
                       'mid_percent', 'mid_abs', 'gra_percent', 'gra_abs', 'mcv', 
                       'mch', 'mchc', 'rdw', 'pdw', 'fbc_remark']
        },
        {
            'model': KFTResult,
            'fields': ['potassium', 'sodium', 'chloride', 'bicarbonate_ca', 'hco3', 
                       'kft_remark']
        },
        {
            'model': LipidResult,
            'fields': ['total_cholesterol', 'triglycerides', 'hdl', 'ldl', 'lp_remark']
        },
        {
            'model': LFTResult,
            'fields': ['ast', 'alt', 'alp', 'tb', 'cb', 'urea', 'creatinine', 'lft_remark']
        },
        {
            'model': SpecialTestsResult,
            'fields': ['ecg_result', 'ecg_remark', 'spirometry_result', 'spirometry_remark', 
                       'audiometry_result', 'audiometry_remark', 'weight', 'height']
        }
    ]

    # Capture director's name from JWT identity
    user_id = get_jwt_identity()
    director_name = None
    if user_id and user_id != 'undefined' and user_id != 'null':
        try:
            from models import StaffUser
            u_id = int(str(user_id))
            user = StaffUser.query.get(u_id)
            if user:
                director_name = user.first_name
        except Exception as e:
            pass

    try:
        for config in model_configs:
            model = config['model']
            fields = config['fields']
            mappings = config.get('mappings', {})
            
            # Find or create record
            record = model.query.filter_by(staff_id=staff_id, screening_year=year_int).first()
            if not record:
                record = model(staff_id=staff_id, screening_year=year_int)
                if model == DirectorReview:
                    record.first_submitted_at = datetime.now()
                db.session.add(record)
            
            # Attribute director's name to consulted_by_name if model is ConsultationData and name is blank
            if model == ConsultationData and director_name:
                if not record.consulted_by_name:
                    record.consulted_by_name = director_name
            
            # Update specific fields
            updated = False
            for field in fields:
                # Use mapping if provided, else use the raw field name from the incoming data
                source_key = field
                # Inverse lookup for mapping if the incoming data uses the UI name but DB has a different name
                if field in mappings.values():
                    # Find the key that maps to this field
                    for k, v in mappings.items():
                        if v == field:
                            source_key = k
                            break
                
                if source_key in data:
                    val = data[source_key]
                    if hasattr(record, field):
                        setattr(record, field, val)
                        updated = True
            
            if not updated and model != DirectorReview:
                # If nothing was updated for a secondary model, don't necessarily keep it in session if it's new
                # But for simplicity in this sync, we just commit.
                pass

        # Remove patient from Consultation Queue
        from models import QueueEntry
        from sqlalchemy import func
        db.session.query(QueueEntry).filter(
            func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
            QueueEntry.screening_year == year_int, 
            QueueEntry.department == 'Consultation'
        ).delete(synchronize_session=False)

        # Log action
        AuditLog.log_action(
            action='Save Director Review',
            resource=f"Patient:{staff_id}",
            details={"message": f"Saved/Updated director review for Patient {staff_id} for screening year {screening_year}.", "screening_year": screening_year}
        )
        db.session.commit()
        
        # Trigger notification check
        from utils.notification_logic import trigger_report_ready_notification
        bind = get_bind()
        if bind:
             trigger_report_ready_notification(staff_id, screening_year, bind)

        return jsonify({"message": "Director review and departmental records updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
