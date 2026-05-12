from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response
from models import db, AppBranding
from werkzeug.utils import secure_filename
from decorators import require_permission
import os
import json

branding_bp = Blueprint('branding_bp', __name__)

def _cors_headers(response):
    """Add CORS headers required for cross-origin manifest and asset fetching."""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Company-Context'
    return response

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
@require_permission('manage_branding')
def update_branding():
    branding = AppBranding.query.first()
    if not branding:
        branding = AppBranding()
        db.session.add(branding)

    # Update text fields from either form or json data
    data = request.form.to_dict() if request.form else {}
    if request.is_json:
        data.update(request.json)
    
    current_app.logger.info(f"Final data to update: {data}")

    if 'clinic_name' in data:
        branding.clinic_name = data['clinic_name']
    if 'clinic_slogan' in data:
        branding.clinic_slogan = data['clinic_slogan']
    if 'address' in data:
        branding.address = data['address']
    if 'email' in data:
        branding.email = data['email']
    if 'phone' in data:
        branding.phone = data['phone']
    if 'whatsapp' in data:
        branding.whatsapp = data['whatsapp']
    if 'social_links' in data:
        branding.social_links = data['social_links']
    if 'doctor_name' in data:
        branding.doctor_name = data['doctor_name']
    if 'doctor_post' in data:
        branding.doctor_post = data['doctor_post']

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

    auth_url = save_upload('auth_branding_image')
    if auth_url:
        branding.auth_branding_image = auth_url

    auth_logo_url = save_upload('auth_logo')
    if auth_logo_url:
        branding.auth_logo = auth_logo_url

    db.session.commit()
    return jsonify({"message": "Branding updated successfully"}), 200

@branding_bp.route('/uploads/<filename>', methods=['GET', 'OPTIONS'])
def uploaded_file(filename):
    if request.method == 'OPTIONS':
        response = Response('', status=204)
        return _cors_headers(response)
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    response = send_from_directory(upload_folder, filename)
    return _cors_headers(response)

@branding_bp.route('/clear', methods=['POST'])
@require_permission('manage_branding')
def clear_branding_asset():
    data = request.json
    field = data.get('field')
    
    valid_fields = [
        'logo_light', 'logo_dark', 'favicon', 'hero_image_1', 'hero_image_2', 
        'hero_image_team', 'header_image', 'footer_image', 'signature_image',
        'auth_branding_image', 'auth_logo'
    ]
    if field not in valid_fields:
        return jsonify({"error": "Invalid field"}), 400
        
    branding = AppBranding.query.first()
    if branding:
        setattr(branding, field, None)
        db.session.commit()
    
    return jsonify({"message": f"Cleared {field}"}), 200

@branding_bp.route('/manifest.json', methods=['GET', 'OPTIONS'])
def get_pwa_manifest():
    """Dynamic PWA manifest endpoint.
    
    Returns a clinic-branded Web App Manifest. Icon URLs are made absolute so they
    resolve correctly when the manifest is fetched cross-origin in production
    (e.g. frontend on Render static site, backend on Render web service).
    
    Required env vars for production:
      - APP_URL: The backend's public URL (e.g. https://my-backend.onrender.com)
      - FRONTEND_URL: The frontend's public URL (e.g. https://my-app.onrender.com)
        Used as the start_url and scope so the PWA opens the frontend, not the backend.
    """
    if request.method == 'OPTIONS':
        response = Response('', status=204)
        return _cors_headers(response)

    branding = AppBranding.query.first()
    clinic_name = branding.clinic_name if branding and branding.clinic_name else "Legit HealthCare"

    # Backend origin — used to make icon URLs absolute.
    # Falls back to the request origin so relative paths always resolve.
    backend_url = os.getenv('APP_URL', '').rstrip('/')
    if not backend_url:
        backend_url = request.url_root.rstrip('/')

    # Frontend origin — used for start_url and scope so the installed PWA
    # opens the React app, not the Flask backend.
    # Dynamically resolve from Origin or Referer to support custom domains seamlessly.
    frontend_url = request.headers.get('Origin')
    if not frontend_url:
        referer = request.headers.get('Referer')
        if referer:
            from urllib.parse import urlparse
            parsed = urlparse(referer)
            frontend_url = f"{parsed.scheme}://{parsed.netloc}"
            
    # Fallback to environment variable if headers are missing
    if not frontend_url:
        frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
        
    frontend_url = frontend_url.rstrip('/') if frontend_url else ''
    start_url = (frontend_url + '/') if frontend_url else '/'
    scope = (frontend_url + '/') if frontend_url else '/'

    # Resolve icon URL to an absolute URL
    raw_logo = branding.logo_light if branding and branding.logo_light else None
    if raw_logo:
        if raw_logo.startswith('http'):
            # Already absolute
            icon_src = raw_logo
        else:
            # Relative path — make it absolute using backend URL
            icon_src = backend_url + raw_logo
        is_svg = raw_logo.lower().endswith('.svg')
    else:
        # Fallback: use the frontend's built-in favicon
        icon_src = (frontend_url + '/favicon.svg') if frontend_url else '/favicon.svg'
        is_svg = True

    manifest = {
        "name": clinic_name,
        "short_name": clinic_name[:12],
        "description": "Premium Healthcare Management System",
        "start_url": start_url,
        "scope": scope,
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#0d9488",
        "orientation": "portrait",
        "icons": [
            {
                "src": icon_src,
                "sizes": "any" if is_svg else "512x512",
                "type": "image/svg+xml" if is_svg else "image/png",
                "purpose": "any maskable"
            }
        ]
    }

    manifest_data = json.dumps(manifest)
    response = Response(manifest_data, mimetype='application/manifest+json')
    # Instruct browser not to cache the manifest long-term so clinic
    # name/logo changes propagate within minutes instead of days.
    response.headers['Cache-Control'] = 'no-cache, max-age=300'
    return _cors_headers(response)
