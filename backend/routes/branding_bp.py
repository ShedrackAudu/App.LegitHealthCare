from flask import Blueprint, request, jsonify, current_app, send_from_directory, Response
from models import db, AppBranding, AuditLog
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
                import uuid
                ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
                unique_filename = f"{uuid.uuid4().hex}_{filename}"
                
                # If SVG or ICO, save directly
                if ext in ['svg', 'ico']:
                    file_path = os.path.join(upload_folder, unique_filename)
                    file.save(file_path)
                    return f"/api/branding/uploads/{unique_filename}"
                
                # Otherwise, optimize and convert to WebP
                try:
                    from PIL import Image
                    img = Image.open(file)
                    
                    if img.mode not in ('RGB', 'RGBA'):
                        img = img.convert('RGBA')
                    
                    # Proportional resize if dimensions exceed 1920px
                    max_size = 1920
                    if img.width > max_size or img.height > max_size:
                        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                    
                    webp_filename = f"{uuid.uuid4().hex}_{filename.rsplit('.', 1)[0]}.webp"
                    file_path = os.path.join(upload_folder, webp_filename)
                    img.save(file_path, 'WEBP', quality=85)
                    return f"/api/branding/uploads/{webp_filename}"
                except Exception as e:
                    current_app.logger.error(f"Image optimization failed: {e}")
                    # Fallback to direct save
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
    AuditLog.log_action("Update Branding", resource=f"AppBranding:{branding.id}", details={"clinic_name": branding.clinic_name})
    return jsonify({"message": "Branding updated successfully"}), 200

@branding_bp.route('/uploads/<filename>', methods=['GET', 'OPTIONS'])
def uploaded_file(filename):
    if request.method == 'OPTIONS':
        response = Response('', status=204)
        return _cors_headers(response)
    upload_folder = os.path.join(current_app.root_path, 'static', 'uploads')
    response = send_from_directory(upload_folder, filename)
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
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
        AuditLog.log_action("Clear Branding Asset", resource=f"AppBranding:{branding.id}", details={"field": field})
    
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
    # We prefer the APP_URL env var, but fall back to the actual request URL
    # to ensure icons always resolve even if the domain just changed.
    backend_url = os.getenv('APP_URL', '').rstrip('/')
    if not backend_url:
        backend_url = request.url_root.rstrip('/')

    # Frontend origin — used for start_url and scope so the installed PWA
    # opens the React app, not the Flask backend.
    # We try: 1. FRONTEND_URL env var, 2. Origin header, 3. Referer header.
    frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
    if not frontend_url:
        # Origin header is sent by browsers for cross-origin manifest fetches
        origin = request.headers.get('Origin', '').rstrip('/')
        if origin:
            frontend_url = origin
        else:
            # Fallback to Referer if Origin is missing (some older browsers/proxies)
            referer = request.headers.get('Referer', '')
            if referer:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                frontend_url = f"{parsed.scheme}://{parsed.netloc}"

    # Final fallback: if we still don't have a frontend URL, we assume 
    # the frontend is on the same domain as the backend (unlikely in production).
    start_url = (frontend_url + '/') if frontend_url else '/'
    scope = (frontend_url + '/') if frontend_url else '/'

    # Resolve icon(s)
    icons_list = []
    
    raw_icon = None
    if branding:
        raw_icon = branding.favicon if branding.favicon else branding.logo_light

    if raw_icon:
        # Custom uploaded icon (Favicon or Logo)
        if raw_icon.startswith('http'):
            icon_src = raw_icon
        else:
            clean_icon = raw_icon if raw_icon.startswith('/') else f"/{raw_icon}"
            icon_src = backend_url + clean_icon
        
        is_svg = raw_icon.lower().endswith('.svg')
        icons_list = [{
            "src": icon_src,
            "sizes": "any" if is_svg else "512x512",
            "type": "image/svg+xml" if is_svg else "image/png",
            "purpose": "any maskable"
        }]
    else:
        # Fallback to default frontend icons
        base = frontend_url if frontend_url else ''
        icons_list = [
            {
                "src": f"{base}/icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": f"{base}/icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ]

    theme = request.cookies.get('theme', 'dark')
    background_color = "#000000" if theme == "dark" else "#ffffff"

    manifest = {
        "name": clinic_name,
        "short_name": clinic_name[:12],
        "description": "Premium Healthcare Management System",
        "start_url": start_url,
        "scope": scope,
        "display": "standalone",
        "background_color": background_color,
        "orientation": "portrait",
        "icons": icons_list
    }

    manifest_data = json.dumps(manifest)
    response = Response(manifest_data, mimetype='application/manifest+json')
    # Instruct browser not to cache the manifest long-term so clinic
    # name/logo changes propagate within minutes instead of days.
    response.headers['Cache-Control'] = 'no-cache, max-age=300'
    return _cors_headers(response)
