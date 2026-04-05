from flask import Blueprint, request, jsonify, current_app, send_from_directory
from models import db, AppBranding
from werkzeug.utils import secure_filename
import os

branding_bp = Blueprint('branding_bp', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'svg', 'ico'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@branding_bp.route('', methods=['GET'], strict_slashes=False)
@branding_bp.route('/', methods=['GET'], strict_slashes=False)
def get_branding():
    # Since RoutingSession handles db engine switching based on X-Company-Context header automatically,
    # querying AppBranding.query.first() correctly pulls from the appropriate clinic database.
    branding = AppBranding.query.first()
    if not branding:
        branding = AppBranding(clinic_name="Legit HealthCare")
        db.session.add(branding)
        db.session.commit()
    
    return jsonify(branding.to_dict()), 200

@branding_bp.route('', methods=['POST'], strict_slashes=False)
@branding_bp.route('/', methods=['POST'], strict_slashes=False)
def update_branding():
    branding = AppBranding.query.first()
    if not branding:
        branding = AppBranding()
        db.session.add(branding)

    # Update text fields
    if 'clinic_name' in request.form:
        branding.clinic_name = request.form['clinic_name']
    if 'address' in request.form:
        branding.address = request.form['address']
    if 'email' in request.form:
        branding.email = request.form['email']
    if 'phone' in request.form:
        branding.phone = request.form['phone']
    if 'social_links' in request.form:
        # Expecting JSON string from frontend
        branding.social_links = request.form['social_links']

    # Identify upload folder
    # We will store uploads in backend/static/uploads
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    
    # helper for saving files
    def save_upload(file_key):
        if file_key in request.files:
            file = request.files[file_key]
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # To prevent conflicts across companies, prepend the context if possible.
                # However, since they are distinct systems, a uuid or timestamp might be safer.
                import uuid
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                file_path = os.path.join(upload_folder, unique_filename)
                file.save(file_path)
                return f"/api/branding/uploads/{unique_filename}"
        return None

    # Handle file uploads
    logo_light_url = save_upload('logo_light')
    if logo_light_url:
        branding.logo_light = logo_light_url

    logo_dark_url = save_upload('logo_dark')
    if logo_dark_url:
        branding.logo_dark = logo_dark_url

    favicon_url = save_upload('favicon')
    if favicon_url:
        branding.favicon = favicon_url

    # Hero Images
    hero_1_url = save_upload('hero_image_1')
    if hero_1_url:
        branding.hero_image_1 = hero_1_url

    hero_2_url = save_upload('hero_image_2')
    if hero_2_url:
        branding.hero_image_2 = hero_2_url

    hero_team_url = save_upload('hero_image_team')
    if hero_team_url:
        branding.hero_image_team = hero_team_url

    header_url = save_upload('header_image')
    if header_url:
        branding.header_image = header_url

    footer_url = save_upload('footer_image')
    if footer_url:
        branding.footer_image = footer_url

    signature_url = save_upload('signature_image')
    if signature_url:
        branding.signature_image = signature_url

    db.session.commit()
    return jsonify({"message": "Branding updated successfully"}), 200

@branding_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    return send_from_directory(upload_folder, filename)

@branding_bp.route('/clear', methods=['POST'])
def clear_branding_asset():
    data = request.json
    field = data.get('field')
    
    valid_fields = ['logo_light', 'logo_dark', 'favicon', 'hero_image_1', 'hero_image_2', 'hero_image_team', 'header_image', 'footer_image', 'signature_image']
    if field not in valid_fields:
        return jsonify({"error": "Invalid field"}), 400
        
    branding = AppBranding.query.first()
    if branding:
        # Optionally delete file from static/uploads if needed
        # current_val = getattr(branding, field)
        # if current_val:
        #    ... logic to parse filename and delete ...
        
        setattr(branding, field, None)
        db.session.commit()
    
    return jsonify({"message": f"Cleared {field}"}), 200
