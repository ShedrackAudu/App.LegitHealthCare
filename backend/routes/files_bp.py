from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response
from models import db, PatientFile, StaffUser, PatientPortalUser, AuditLog
from werkzeug.utils import secure_filename
from decorators import require_permission
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import os
import uuid
import mimetypes
from datetime import datetime

files_bp = Blueprint('files_bp', __name__)

def _cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Company-Context'
    return response

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@files_bp.route('/upload', methods=['POST'])
@require_permission(['lab_spirometry', 'lab_audiometry', 'lab_ecg', 'consultation', 'view_records'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    staff_id = request.form.get('staff_id')
    year = request.form.get('year')
    department = request.form.get('department') # Spirometry, Audiometry...

    if not all([staff_id, year, department]):
        return jsonify({"error": "Missing metadata (staff_id, year, department)"}), 400

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Create storage path
        upload_folder = os.path.join(current_app.root_path, 'static', 'uploads', 'patient_files', str(staff_id), str(year))
        os.makedirs(upload_folder, exist_ok=True)
        
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)

        # Save to DB
        new_file = PatientFile(
            staff_id=staff_id,
            screening_year=int(year),
            department=department,
            filename=filename,
            file_path=os.path.join('patient_files', str(staff_id), str(year), unique_filename).replace('\\', '/'),
            file_size=os.path.getsize(file_path),
            uploaded_by=get_jwt_identity()
        )
        db.session.add(new_file)
        # Log action
        AuditLog.log_action(
            action='Upload Patient File',
            resource=f"Patient:{staff_id}",
            details={"message": f"Uploaded file '{filename}' for Patient {staff_id} (Department: {department}, Year: {year}).", "filename": filename, "department": department, "screening_year": year}
        )
        db.session.commit()

        return jsonify(new_file.to_dict()), 201
    
    return jsonify({"error": "Invalid file type. Only PDF and Images (JPG/PNG) allowed."}), 400

@files_bp.route('/list/<staff_id>/<year>', methods=['GET'])
@require_permission(['view_clinical_data', 'patient_access'])
def list_files(staff_id, year):
    # Security check for patients: can only view their own files
    claims = get_jwt()
    if claims.get('portal') == 'patient':
        user_id = get_jwt_identity()
        patient = PatientPortalUser.query.get(user_id)
        if not patient or patient.username.lower() != staff_id.lower():
            return jsonify({"error": "Access denied"}), 403

    files = PatientFile.query.filter_by(staff_id=staff_id, screening_year=int(year)).order_by(PatientFile.created_at.desc()).all()
    return jsonify([f.to_dict() for f in files]), 200

@files_bp.route('/view/<int:file_id>', methods=['GET', 'OPTIONS'])
@jwt_required()
def view_file(file_id):
    if request.method == 'OPTIONS':
        return _cors_headers(Response('', status=204))

    pf = PatientFile.query.get_or_404(file_id)
    
    # Security check: Determine if requester is authorized
    user_id = get_jwt_identity()
    claims = get_jwt()
    portal = claims.get('portal', 'staff')

    if portal == 'patient':
        # Patient can only view their own files
        patient = PatientPortalUser.query.get(user_id)
        if not patient or patient.username.lower() != pf.staff_id.lower():
            return jsonify({"error": "Unauthorized: You do not have permission to view this file."}), 403
    else:
        # Staff must have clinical viewing permissions
        staff = StaffUser.query.get(user_id)
        if not staff or not (staff.has_permission('view_clinical_data') or staff.has_permission('view_records') or staff.username == 'admin'):
            return jsonify({"error": "Unauthorized: Clinical permission required to view patient files."}), 403
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    # The file_path in DB is 'patient_files/staff_id/year/unique_filename'
    parts = pf.file_path.replace('\\', '/').split('/')
    full_path = os.path.join(upload_folder, *parts)
    directory = os.path.dirname(full_path)
    filename = os.path.basename(full_path)
    
    response = send_from_directory(directory, filename)
    # Set headers based on file type
    content_type, _ = mimetypes.guess_type(pf.filename)
    if content_type:
        response.headers['Content-Type'] = content_type
    response.headers['Content-Disposition'] = f'inline; filename="{pf.filename}"'
    return _cors_headers(response)

@files_bp.route('/<int:file_id>', methods=['DELETE'])
@require_permission(['lab_spirometry', 'lab_audiometry', 'lab_ecg', 'consultation'])
def delete_file(file_id):
    pf = PatientFile.query.get_or_404(file_id)
    
    # Delete from filesystem
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    parts = pf.file_path.replace('\\', '/').split('/')
    full_path = os.path.join(upload_folder, *parts)
    if os.path.exists(full_path):
        os.remove(full_path)
    
    db.session.delete(pf)
    # Log action
    AuditLog.log_action(
        action='Delete Patient File',
        resource=f"Patient:{pf.staff_id}",
        details={"message": f"Deleted file '{pf.filename}' for Patient {pf.staff_id} (Department: {pf.department}, Year: {pf.screening_year}).", "filename": pf.filename, "department": pf.department, "screening_year": pf.screening_year}
    )
    db.session.commit()
    
    return jsonify({"message": "File deleted successfully"}), 200
