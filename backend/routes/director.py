from flask import Blueprint, request, jsonify
from models import db, BioData, ConsultationData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, DirectorReview
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
        
    # Gather all results
    history = {}
    
    # 1. Consultation
    consult = ConsultationData.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if consult:
        history['consultation'] = {c.name: getattr(consult, c.name) for c in consult.__table__.columns}
        
    # 2. Lab Results
    fbc = FBCResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if fbc:
        history['fbc'] = {c.name: getattr(fbc, c.name) for c in fbc.__table__.columns}
        
    kft = KFTResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if kft:
        history['kft'] = {c.name: getattr(kft, c.name) for c in kft.__table__.columns}
        
    lipid = LipidResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if lipid:
        history['lipid'] = {c.name: getattr(lipid, c.name) for c in lipid.__table__.columns}
        
    lft = LFTResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if lft:
        history['lft'] = {c.name: getattr(lft, c.name) for c in lft.__table__.columns}
        
    special = SpecialTestsResult.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if special:
        history['special'] = {c.name: getattr(special, c.name) for c in special.__table__.columns}
        
    # 3. Existing Director Review
    review = DirectorReview.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    if review:
        history['review'] = {c.name: getattr(review, c.name) for c in review.__table__.columns}
        
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
        
    review = DirectorReview.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    
    if not review:
        review = DirectorReview(staff_id=staff_id, screening_year=screening_year)
        # Set first_submitted_at if this is the first time
        review.first_submitted_at = datetime.now()
        db.session.add(review)
        
    # Map form field names that differ from DirectorReview column names
    field_mappings = {
        'sugar_remark': 'fbs_rbs_remark',
    }
    
    # Fields that should never be overwritten by form data
    protected_fields = {'id', 'staff_id', 'screening_year', 'created_at', 'first_submitted_at', 'updated_at', 'consulted_by_name'}
    
    # Update all provided fields
    for key, value in data.items():
        # Apply field name mapping if one exists
        mapped_key = field_mappings.get(key, key)
        if hasattr(review, mapped_key) and mapped_key not in protected_fields:
            setattr(review, mapped_key, value)
            
    try:
        db.session.commit()
        
        # Trigger notification check
        from utils.notification_logic import trigger_report_ready_notification
        bind = get_bind()
        if bind:
             # Run in background or just call it (since it's relatively fast)
             # For now, we call it directly.
             success, msg = trigger_report_ready_notification(staff_id, screening_year, bind)
             print(f"Notification Check: {msg}")

        return jsonify({"message": "Director review saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
