from flask import Blueprint, request, jsonify
import os
from dotenv import set_key, load_dotenv
from models import AuditLog

email_bp = Blueprint('email_bp', __name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

@email_bp.route('/settings', methods=['GET'])
def get_email_settings():
    load_dotenv(ENV_PATH, override=True)
    return jsonify({
        "MAIL_SERVER": os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
        "MAIL_PORT": os.getenv('MAIL_PORT', '587'),
        "MAIL_USERNAME": os.getenv('MAIL_USERNAME', ''),
        "MAIL_DISPLAY_NAME": os.getenv('MAIL_DISPLAY_NAME', 'Legit HealthCare'),
        "HEAD_DOCTOR_EMAIL": os.getenv('HEAD_DOCTOR_EMAIL', ''),
        # We don't send the password back for security, just a placeholder if it exists
        "HAS_PASSWORD": bool(os.getenv('MAIL_PASSWORD'))
    }), 200

@email_bp.route('/settings', methods=['POST'])
def update_email_settings():
    data = request.json
    try:
        if 'MAIL_SERVER' in data:
            set_key(ENV_PATH, 'MAIL_SERVER', data['MAIL_SERVER'])
        if 'MAIL_PORT' in data:
            set_key(ENV_PATH, 'MAIL_PORT', str(data['MAIL_PORT']))
        if 'MAIL_USERNAME' in data:
            set_key(ENV_PATH, 'MAIL_USERNAME', data['MAIL_USERNAME'])
        if 'MAIL_DISPLAY_NAME' in data:
            set_key(ENV_PATH, 'MAIL_DISPLAY_NAME', data['MAIL_DISPLAY_NAME'])
        if 'MAIL_PASSWORD' in data and data['MAIL_PASSWORD']:
            set_key(ENV_PATH, 'MAIL_PASSWORD', data['MAIL_PASSWORD'])
        if 'HEAD_DOCTOR_EMAIL' in data:
            set_key(ENV_PATH, 'HEAD_DOCTOR_EMAIL', data['HEAD_DOCTOR_EMAIL'])
        
        # Reload env in current process
        load_dotenv(ENV_PATH, override=True)
        AuditLog.log_action("Update Email Settings", resource="MailSettings", details={"MAIL_SERVER": data.get('MAIL_SERVER'), "MAIL_USERNAME": data.get('MAIL_USERNAME')})
        
        return jsonify({"message": "Email settings updated successfully. System may need restart for changes to take effect in some modules."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@email_bp.route('/test', methods=['POST'])
def test_email_settings():
    from utils.email_utils import EmailService
    data = request.json
    recipient = data.get('test_email')
    if not recipient:
        return jsonify({"error": "Test recipient email is required"}), 400
    
    # Use provided values for testing if they exist, else fallback to env
    custom_config = {
        "server": data.get('MAIL_SERVER'),
        "port": data.get('MAIL_PORT'),
        "username": data.get('MAIL_USERNAME'),
        "display_name": data.get('MAIL_DISPLAY_NAME') or os.getenv('MAIL_DISPLAY_NAME', 'Legit HealthCare'),
        "password": data.get('MAIL_PASSWORD') or os.getenv('MAIL_PASSWORD')
    }
    
    # Validate config
    if not custom_config["server"] or not custom_config["username"] or not custom_config["password"]:
         return jsonify({"error": "Incomplete configuration. Please fill in all fields before testing."}), 400

    success = EmailService.send_email(
        recipient, 
        "Legit HealthCare: SMTP Connection Test", 
        "<h1>Success!</h1><p>Your SMTP settings are correctly configured for Legit HealthCare Service.</p>",
        custom_config=custom_config
    )
    
    if success:
        AuditLog.log_action("Test Email Settings", resource="MailSettings", details={"recipient": recipient})
        return jsonify({"message": f"Test email sent successfully to {recipient}!"}), 200
    else:
        return jsonify({"error": "Failed to send test email. Please check your credentials (Gmail App Password) and SMTP settings."}), 500

@email_bp.route('/report', methods=['POST'])
def send_patient_report():
    """
    Accepts JSON body with pre-generated Base64 PDF attachment data + email details.
    Emails it to the patient.
    """
    from utils.email_utils import EmailService
    import base64

    data = request.json or {}
    recipient           = data.get('email', '')
    first_name          = data.get('first_name', 'Patient')
    screening_year      = data.get('screening_year', '')
    company             = data.get('company', 'Legit HealthCare')
    attachment_data_b64 = data.get('attachment_data')
    attachment_filename = data.get('attachment_filename', f"Medical_Report_{screening_year}.pdf")

    if not attachment_data_b64:
        return jsonify({"error": "Pre-generated PDF attachment data is required"}), 400
    if not recipient:
        return jsonify({"error": "Patient email is required"}), 400

    try:
        # Decode the frontend-generated PDF
        try:
            pdf_bytes = base64.b64decode(attachment_data_b64)
        except Exception as e:
            return jsonify({"error": "Invalid PDF data format"}), 400

        from models import AppBranding
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        if logo_url and logo_url.startswith('/'):
            base_url = request.url_root.rstrip('/')
            if 'onrender.com' in base_url and base_url.startswith('http:'):
                base_url = base_url.replace('http:', 'https:')
            logo_url = f"{base_url}{logo_url}"

        # Resolve frontend URL
        app_url = data.get('app_url')
        if not app_url:
            app_url = request.url_root.replace('5000', '5173').rstrip('/')

        html_content = EmailService.get_report_template(
            first_name, screening_year, company, logo_url=logo_url, app_url=app_url
        )

        success = EmailService.send_email(
            recipient,
            f"Your Medical Screening Report - {screening_year}",
            html_content,
            attachment_data=pdf_bytes,
            attachment_filename=attachment_filename
        )

        if success:
            AuditLog.log_action("Send Patient Report", resource=f"Patient:{data.get('staff_id', recipient)}", details={"recipient": recipient, "screening_year": screening_year})
            return jsonify({"message": f"Medical report sent successfully to {recipient}"}), 200
        else:
            return jsonify({"error": "Failed to send email. Check Email/SMTP settings."}), 500

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

