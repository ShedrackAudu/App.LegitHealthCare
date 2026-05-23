from flask import Blueprint, request, jsonify
from models import db, QueueEntry, BioData, ScreeningYearBioData, AuditLog
from sqlalchemy import func
from decorators import require_permission
from flask_jwt_extended import get_jwt_identity, get_jwt

queue_bp = Blueprint('queue_bp', __name__)

def get_bind():
    context = request.headers.get('X-Company-Context', '').lower()
    return context if context in ['dcp', 'dct'] else None

@queue_bp.route('/', methods=['GET'], strict_slashes=False)
@require_permission(['manage_queues', 'lab_spirometry', 'lab_audiometry', 'lab_ecg', 'consultation'])
def get_queue_counts():
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    year = request.args.get('year')
    if not year: return jsonify({"error": "Year required"}), 400

    # Get counts per department, joined with ScreeningYearBioData to ensure they are in the matrix
    counts = db.session.query(
        func.trim(QueueEntry.department), 
        func.count(QueueEntry.id)
    ).join(
        ScreeningYearBioData, 
        (func.trim(QueueEntry.staff_id) == func.trim(ScreeningYearBioData.staff_id)) & 
        (QueueEntry.screening_year == ScreeningYearBioData.screening_year)
    ).filter(
        QueueEntry.screening_year == year, 
        QueueEntry.status == 'Waiting'
    ).group_by(func.trim(QueueEntry.department)).all()
    
    result = {
        "consultation": 0,
        "audiometry": 0,
        "spirometry": 0,
        "ecg": 0
    }
    
    for dept, count in counts:
        if not dept: continue
        dept_key = dept.strip().lower()
        if dept_key in result:
            result[dept_key] = count
            
    return jsonify(result), 200

@queue_bp.route('/<department>', methods=['GET'], strict_slashes=False)
@require_permission(['manage_queues', 'lab_spirometry', 'lab_audiometry', 'lab_ecg', 'consultation'])
def get_department_queue(department):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    year = request.args.get('year')
    if not year: return jsonify({"error": "Year required"}), 400

    # Normalize department name
    dept_map = {
        'consultation': 'Consultation',
        'audiometry': 'Audiometry',
        'spirometry': 'Spirometry',
        'ecg': 'ECG'
    }
    target_dept = dept_map.get(department.lower())
    if not target_dept:
        return jsonify({"error": "Invalid department"}), 400

    # Check granular permission based on the requested department
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if portal == 'patient':
        return jsonify({"error": "Access denied for patients"}), 403
        
    from models import StaffUser
    user = StaffUser.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    is_authorized = False
    if user.username == 'admin' or user.has_permission('manage_queues'):
        is_authorized = True
    elif department.lower() == 'spirometry' and user.has_permission('lab_spirometry'):
        is_authorized = True
    elif department.lower() == 'audiometry' and user.has_permission('lab_audiometry'):
        is_authorized = True
    elif department.lower() == 'ecg' and user.has_permission('lab_ecg'):
        is_authorized = True
    elif department.lower() == 'consultation' and user.has_permission('consultation'):
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"error": f"Permission denied for {target_dept} queue"}), 403

    # Join with ScreeningYearBioData to ensure patient is in the screening matrix
    entries_with_bio = db.session.query(
        QueueEntry, ScreeningYearBioData
    ).join(
        ScreeningYearBioData,
        (func.trim(QueueEntry.staff_id) == func.trim(ScreeningYearBioData.staff_id)) &
        (QueueEntry.screening_year == ScreeningYearBioData.screening_year)
    ).filter(
        QueueEntry.department == target_dept,
        QueueEntry.screening_year == year,
        QueueEntry.status == 'Waiting'
    ).order_by(QueueEntry.created_at.asc()).all()

    patients = []
    for e, bio in entries_with_bio:
        patients.append({
            "staff_id": e.staff_id,
            "first_name": bio.first_name,
            "last_name": bio.last_name,
            "created_at": e.created_at.isoformat(),
            "queue_number": e.queue_number
        })

    return jsonify(patients), 200

@queue_bp.route('/reset', methods=['POST'])
@require_permission('system_maintenance')
def reset_queue():
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    QueueEntry.query.delete()
    db.session.commit()
    AuditLog.log_action("Reset Clinic Queue", resource="QueueEntry", details={"context": bind})
    return jsonify({"message": "Patient queuing tracker has been reset to zero for all departments."}), 200

@queue_bp.route('/assign-number', methods=['POST'])
@require_permission(['manage_queues', 'lab_spirometry', 'lab_audiometry', 'lab_ecg', 'consultation'])
def assign_queue_number():
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    data = request.json
    staff_id = data.get('staff_id')
    department = data.get('department')
    year = data.get('year')
    new_number = data.get('queue_number')
    
    if not all([staff_id, department, year]):
        return jsonify({"error": "Missing required fields"}), 400
        
    # Check permissions for this specific department
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')
    
    if portal == 'patient':
        return jsonify({"error": "Access denied for patients"}), 403
        
    from models import StaffUser
    user = StaffUser.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    is_authorized = False
    if user.username == 'admin' or user.has_permission('manage_queues'):
        is_authorized = True
    elif department.lower() == 'spirometry' and user.has_permission('lab_spirometry'):
        is_authorized = True
    elif department.lower() == 'audiometry' and user.has_permission('lab_audiometry'):
        is_authorized = True
    elif department.lower() == 'ecg' and user.has_permission('lab_ecg'):
        is_authorized = True
    elif department.lower() == 'consultation' and user.has_permission('consultation'):
        is_authorized = True
        
    if not is_authorized:
        return jsonify({"error": f"Permission denied for {department} queue"}), 403
        
    entry = QueueEntry.query.filter_by(
        staff_id=staff_id,
        department=department,
        screening_year=year,
        status='Waiting'
    ).first()
    
    if not entry:
        return jsonify({"error": "Queue entry not found"}), 404
        
    entry.queue_number = new_number
    db.session.commit()
    AuditLog.log_action("Assign Queue Number", resource=f"QueueEntry:{entry.id}", details={"staff_id": staff_id, "department": department, "queue_number": new_number, "context": bind})
    
    return jsonify({"message": f"Queue number updated to {new_number} for {staff_id}"}), 200

@queue_bp.route('/<department>/<staff_id>', methods=['DELETE'])
@require_permission('delete_from_queue')
def delete_patient_from_queue(department, staff_id):
    bind = get_bind()
    if not bind: return jsonify({"error": "Invalid context"}), 400
    
    year = request.args.get('year')
    if not year: return jsonify({"error": "Year required"}), 400

    # Normalize department name
    dept_map = {
        'consultation': 'Consultation',
        'audiometry': 'Audiometry',
        'spirometry': 'Spirometry',
        'ecg': 'ECG'
    }
    target_dept = dept_map.get(department.lower())
    if not target_dept:
        return jsonify({"error": "Invalid department"}), 400

    # Find the QueueEntry
    entry = QueueEntry.query.filter(
        func.trim(QueueEntry.staff_id) == func.trim(staff_id),
        QueueEntry.screening_year == int(year),
        QueueEntry.department == target_dept,
        QueueEntry.status == 'Waiting'
    ).first()

    if not entry:
        return jsonify({"error": "Patient not found in this queue"}), 404

    db.session.delete(entry)
    db.session.commit()

    AuditLog.log_action(
        "Remove Patient from Queue", 
        resource=f"QueueEntry:{entry.id}", 
        details={
            "staff_id": staff_id, 
            "department": target_dept, 
            "year": year, 
            "context": bind
        }
    )

    return jsonify({"message": f"Patient {staff_id} successfully removed from {target_dept} queue"}), 200

