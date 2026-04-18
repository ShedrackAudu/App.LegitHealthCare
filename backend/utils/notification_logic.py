import os
import threading
from flask import current_app
from models import db, BioData, ScreeningYearBioData, AppBranding
from utils.email_utils import EmailService
from utils.progress_utils import calculate_report_progress
from sqlalchemy import text

def trigger_report_ready_notification(staff_id, screening_year, section):
    """
    Spawns a background thread to check and send the notification.
    Ensures zero disruption to the main request flow.
    """
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
    Uses raw SQL with the sectional engine to avoid RoutingSession issues
    in background threads (no flask.request available).
    """
    try:
        # 1. Get the sectional engine
        engine = db.engines.get(section.lower())
        if not engine:
            print(f"[NOTIFICATION] Skip: Invalid section '{section}'")
            return False, "Invalid clinical section"

        # 2. Calculate progress
        percentage, points, status, missing = calculate_report_progress(staff_id, screening_year, engine)
        
        if percentage < 100:
            return False, f"Report incomplete ({percentage}%)"

        # 3. Check if already notified - use raw SQL with the sectional engine
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT id, is_notified_ready FROM screening_year_bio_data WHERE staff_id = :sid AND screening_year = :yr"),
                {"sid": staff_id, "yr": screening_year}
            ).fetchone()
        
        if not row:
            print(f"[NOTIFICATION] Skip: No screening record for {staff_id}/{screening_year}")
            return False, "Screening record not found"
            
        record_id = row[0]
        if row[1]:  # is_notified_ready
            return True, "Already notified"

        # 4. Fetch patient email from BioData - use raw SQL with the sectional engine
        with engine.connect() as conn:
            patient_row = conn.execute(
                text("SELECT first_name, email FROM bio_data WHERE staff_id = :sid"),
                {"sid": staff_id}
            ).fetchone()
        
        if not patient_row or not patient_row[1] or "@" not in patient_row[1]:
            print(f"[NOTIFICATION] Skip: No valid email for {staff_id}")
            return False, "Patient email not found or invalid"

        patient_first_name = patient_row[0]
        patient_email = patient_row[1]

        # 5. Prepare Email
        branding = AppBranding.query.first()
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        app_url = current_app.config.get('APP_URL', 'http://localhost:5173')
        if logo_url and logo_url.startswith('/'):
            logo_url = f"{app_url.rstrip('/')}{logo_url}"

        subject = f"Your {screening_year} Medical Report is Ready - Legit HealthCare"
        html_content = EmailService.get_report_ready_template(
            patient_first_name, 
            screening_year, 
            app_url, 
            logo_url=logo_url
        )

        # 6. Send Email
        success = EmailService.send_email(patient_email, subject, html_content)
        
        if success:
            # Mark as notified using raw SQL
            with engine.connect() as conn:
                conn.execute(
                    text("UPDATE screening_year_bio_data SET is_notified_ready = 1 WHERE id = :rid"),
                    {"rid": record_id}
                )
                conn.commit()
            print(f"[NOTIFICATION] Successfully sent to {patient_email}")
            return True, "Notification sent successfully"
        else:
            print(f"[NOTIFICATION] Email delivery failed for {patient_email}")
            return False, "Email service failure"

    except Exception as e:
        print(f"[NOTIFICATION] TRIGGER ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False, str(e)


def trigger_registration_success_notification(patient_email, patient_first_name, screening_year):
    """
    Sends the registration success email synchronously.
    Accepts patient data directly from the caller.
    """
    print(f"[REG-NOTIFICATION] Starting synchronous delivery to {patient_email}")
    return _trigger_registration_success_notification_sync(patient_email, patient_first_name, screening_year)

def _trigger_registration_success_notification_sync(patient_email, patient_first_name, screening_year):
    """
    Sends the registration success email.
    Patient data is passed directly - no database queries needed for patient info.
    Only queries AppBranding which is in the global/default database (always accessible).
    """
    try:
        print(f"[REG-NOTIFICATION] Preparing email for {patient_email}...")

        # 1. Get Branding (AppBranding is in the global system DB - always accessible)
        branding = AppBranding.query.first()
        clinic_name = branding.clinic_name if branding and branding.clinic_name else "Legit HealthCare"
        logo_url = branding.logo_light if branding and branding.logo_light else None
        
        # 2. Resolve URLs
        app_url = current_app.config.get('APP_URL', 'http://localhost:5173')
        if logo_url and logo_url.startswith('/'):
            logo_url = f"{app_url.rstrip('/')}{logo_url}"

        # 3. Prepare Content
        subject = f"Registration Successful: {screening_year} Medical Screening Program"
        html_content = EmailService.get_registration_success_template(
            patient_first_name,
            screening_year,
            clinic_name,
            app_url,
            logo_url=logo_url
        )

        # 4. Send
        print(f"[REG-NOTIFICATION] Sending to {patient_email}...")
        success = EmailService.send_email(patient_email, subject, html_content)
        if success:
            print(f"[REG-NOTIFICATION] SUCCESS: Email delivered to {patient_email}")
        else:
            print(f"[REG-NOTIFICATION] FAILED: Delivery error for {patient_email}")
        
        return success

    except Exception as e:
        print(f"[REG-NOTIFICATION] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

