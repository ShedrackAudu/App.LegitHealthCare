import os
import threading
from flask import current_app
from models import db, BioData, ScreeningYearBioData, AppBranding
from utils.email_utils import EmailService
from utils.progress_utils import calculate_report_progress

def trigger_report_ready_notification(staff_id, screening_year, section):
    """
    Spawns a background thread to check and send the notification.
    Ensures zero disruption to the main request flow.
    """
    # Get the app instance to pass into the thread context
    app = current_app._get_current_object()
    
    thread = threading.Thread(
        target=_trigger_logic_async_wrapper, 
        args=(app, staff_id, screening_year, section)
    )
    thread.daemon = True
    thread.start()
    return True, "Background process started"

def _trigger_logic_async_wrapper(app, staff_id, screening_year, section):
    """Wrapper to provide app context to the background thread."""
    with app.app_context():
        _trigger_report_ready_notification_sync(staff_id, screening_year, section)

def _trigger_report_ready_notification_sync(staff_id, screening_year, section):
    """
    Actual synchronous logic (run in background).
    """
    try:
        # 1. Get the sectional engine
        engine = db.engines.get(section.lower())
        if not engine:
            return False, "Invalid clinical section"

        # 2. Calculate progress
        percentage, points, status, missing = calculate_report_progress(staff_id, screening_year, engine)
        
        if percentage < 100:
            return False, f"Report incomplete ({percentage}%)"

        # 3. Check if already notified
        record = ScreeningYearBioData.query.filter_by(staff_id=staff_id, screening_year=screening_year).first()
        if not record:
            return False, "Screening record not found"
            
        if record.is_notified_ready:
            return True, "Already notified"

        # 4. Fetch patient email from BioData
        patient = BioData.query.filter_by(staff_id=staff_id).first()
        if not patient or not patient.email or "@" not in patient.email:
            return False, "Patient email not found or invalid"

        # 5. Prepare Email
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        # Absolute logo URL for email clients
        app_url = current_app.config.get('APP_URL', 'http://localhost:5173')
        if logo_url and logo_url.startswith('/'):
            logo_url = f"{app_url.rstrip('/')}{logo_url}"

        subject = f"Your {screening_year} Medical Report is Ready - Legit HealthCare"
        html_content = EmailService.get_report_ready_template(
            patient.first_name, 
            screening_year, 
            app_url, 
            logo_url=logo_url
        )

        # 6. Send Email
        success = EmailService.send_email(patient.email, subject, html_content)
        
        if success:
            record.is_notified_ready = True
            db.session.commit()
            print(f"[NOTIFICATION] Successfully sent to {patient.email}")
            return True, "Notification sent successfully"
        else:
            print(f"[NOTIFICATION] Email delivery failed for {patient.email}")
            return False, "Email service failure"

    except Exception as e:
        print(f"NOTIFICATION TRIGGER ERROR: {str(e)}")
        return False, str(e)
