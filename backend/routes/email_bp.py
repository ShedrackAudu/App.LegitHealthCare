from flask import Blueprint, request, jsonify
import os
from dotenv import set_key, load_dotenv

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
        return jsonify({"message": f"Test email sent successfully to {recipient}!"}), 200
    else:
        return jsonify({"error": "Failed to send test email. Please check your credentials (Gmail App Password) and SMTP settings."}), 500

@email_bp.route('/report', methods=['POST'])
def send_patient_report():
    from utils.email_utils import EmailService
    from utils.report_utils import generate_patient_report_pdf
    
    data = request.json
    recipient = data.get('email')
    report_data = data.get('report_data')
    
    if not recipient or not report_data:
        return jsonify({"error": "Email and Report Data are required"}), 400
        
    try:
        # Generate PDF
        pdf_bytes = generate_patient_report_pdf(report_data)
        
        # Get Email Template
        bio = report_data.get('bio', {})
        first_name = bio.get('first_name', 'Patient')
        screening_year = bio.get('screening_year', 'Current Year')
        company = bio.get('company', 'Legit HealthCare') # Or DCP/DCT
        
        html_content = EmailService.get_report_template(first_name, screening_year, company)
        
        # Send Email
        filename = f"Medical_Report_{bio.get('staff_id')}_{screening_year}.pdf"
        success = EmailService.send_email(
            recipient,
            f"Your Medical Screening Report - {screening_year}",
            html_content,
            attachment_data=pdf_bytes,
            attachment_filename=filename
        )
        
        if success:
            return jsonify({"message": f"Medical report sent successfully to {recipient}"}), 200
        else:
            return jsonify({"error": "Sytem failed to send the email. Please check Email Configuration."}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@email_bp.route('/download-report', methods=['POST'])
def download_patient_report():
    from utils.report_utils import generate_patient_report_pdf
    from flask import send_file
    import io
    
    data = request.json
    report_data = data.get('report_data')
    
    if not report_data:
        return jsonify({"error": "Report Data is required"}), 400
        
    try:
        pdf_bytes = generate_patient_report_pdf(report_data)
        bio = report_data.get('bio', {})
        filename = f"Medical_Report_{bio.get('staff_id')}_{bio.get('screening_year')}.pdf"
        
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
