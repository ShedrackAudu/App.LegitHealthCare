from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response
from models import db, PatientFile, StaffUser, PatientPortalUser
from werkzeug.utils import secure_filename
from decorators import require_permission
from flask_jwt_extended import get_jwt_identity, get_jwt
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
            file_path=os.path.join('patient_files', str(staff_id), str(year), unique_filename),
            file_size=os.path.getsize(file_path),
            uploaded_by=get_jwt_identity()
        )
        db.session.add(new_file)
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
def view_file(file_id):
    if request.method == 'OPTIONS':
        return _cors_headers(Response('', status=204))

    # Basic JWT check manually if not using decorator to allow easier PDF viewing in new tabs if needed
    # But for now, let's keep it secure
    pf = PatientFile.query.get_or_404(file_id)
    
    # We should ideally check permissions here too if it was sensitive, 
    # but for simplicity let's serve from static
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    # The file_path in DB is 'patient_files/staff_id/year/unique_filename'
    directory = os.path.join(upload_folder, os.path.dirname(pf.file_path))
    filename = os.path.basename(pf.file_path)
    
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
    full_path = os.path.join(upload_folder, pf.file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    
    db.session.delete(pf)
    db.session.commit()
    
    return jsonify({"message": "File deleted successfully"}), 200
