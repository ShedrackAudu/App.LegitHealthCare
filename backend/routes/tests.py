from flask import Blueprint, request, jsonify
from models import db, BioData, FBCResult, KFTResult, LipidResult, LFTResult, SpecialTestsResult, User
from datetime import datetime
from decorators import require_permission

tests_bp = Blueprint('tests', __name__)

PERM_MAP = {
    'fbc': 'lab_fbc',
    'kft': 'lab_kft',
    'lipid': 'lab_lipid',
    'lft': 'lab_lft',
    'special': 'lab_tests' # General fallback for special tests or use lab_ecg/etc if needed
}

@tests_bp.route('/save-test/<test_type>', methods=['POST'])
def save_test_result(test_type):
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    perm_name = PERM_MAP.get(test_type, 'lab_tests')
    if not user.has_permission(perm_name) and user.username != 'admin':
        return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    data = request.json
    staff_id = data.get('staff_id')
    screening_year = data.get('screening_year')
    
    if not staff_id or not screening_year:
        return jsonify({"error": "Staff ID and Screening Year are required"}), 400

    # Map test types to models
    model_map = {
        'fbc': FBCResult,
        'kft': KFTResult,
        'lipid': LipidResult,
        'lft': LFTResult,
        'special': SpecialTestsResult
    }
    
    model_class = model_map.get(test_type)
    if not model_class:
        return jsonify({"error": "Invalid test type"}), 400
        
    # Check if record already exists for this year, update if so
    record = model_class.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    
    if not record:
        record = model_class(staff_id=staff_id, screening_year=screening_year)
        db.session.add(record)
        
    # Update fields while checking for state transitions for queue tracking
    ecg_filled = False
    spiro_filled = False
    audio_filled = False
    
    for key, value in data.items():
        if hasattr(record, key) and key not in ['id', 'staff_id', 'screening_year', 'created_at']:
            old_val = getattr(record, key)
            setattr(record, key, value)
            
            # Check for special tests queue transitions
            if test_type == 'special':
                if key == 'ecg_result' and value and not old_val:
                    ecg_filled = True
                if key == 'spirometry_result' and value and not old_val:
                    spiro_filled = True
                if key == 'audiometry_result' and value and not old_val:
                    audio_filled = True

    if test_type == 'special':
        from models import QueueEntry
        from sqlalchemy import func
        if ecg_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == screening_year, 
                QueueEntry.department == 'ECG'
            ).delete(synchronize_session=False)
        if spiro_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == screening_year, 
                QueueEntry.department == 'Spirometry'
            ).delete(synchronize_session=False)
        if audio_filled:
            db.session.query(QueueEntry).filter(
                func.trim(QueueEntry.staff_id) == func.trim(staff_id), 
                QueueEntry.screening_year == screening_year, 
                QueueEntry.department == 'Audiometry'
            ).delete(synchronize_session=False)

    try:
        db.session.commit()
        return jsonify({"message": f"{test_type.upper()} results saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@tests_bp.route('/get-test/<test_type>/<staff_id>', methods=['GET'])
def get_test_result(test_type, staff_id):
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    perm_name = PERM_MAP.get(test_type, 'lab_tests')
    if not user.has_permission(perm_name) and user.username != 'admin':
        return jsonify({"error": f"Permission '{perm_name}' required"}), 403

    screening_year = request.args.get('year')
    if not screening_year:
        return jsonify({"error": "Year is required"}), 400
        
    model_map = {
        'fbc': FBCResult,
        'kft': KFTResult,
        'lipid': LipidResult,
        'lft': LFTResult,
        'special': SpecialTestsResult
    }
    
    model_class = model_map.get(test_type)
    if not model_class:
        return jsonify({"error": "Invalid test type"}), 400
        
    record = model_class.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
    
    if not record:
        return jsonify({"message": "No records found"}), 404
        
    # Convert to dict
    result = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    return jsonify(result), 200
