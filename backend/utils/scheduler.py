"""
Weekly Patient Account Verification Reminder Scheduler.

Uses APScheduler to run a background job every week that sends reminder emails
to patients who started the account claiming process but never completed
OTP verification (is_verified == False).
"""
import os
import atexit
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger


scheduler = BackgroundScheduler(daemon=True)


def send_weekly_verification_reminders(app):
    """
    Queries all unverified PatientPortalUser records and sends a 
    reminder email to each patient who hasn't received a reminder 
    in the past 7 days.
    """
    with app.app_context():
        try:
            from models import db, PatientPortalUser, AppBranding
            from utils.email_utils import EmailService
            from flask import current_app

            print("[SCHEDULER] Starting weekly verification reminder job...")

            # 1. Query unverified patients who haven't received a reminder in the last 7 days
            seven_days_ago = datetime.now() - timedelta(days=7)
            unverified_patients = PatientPortalUser.query.filter(
                PatientPortalUser.is_verified == False,
                db.or_(
                    PatientPortalUser.last_reminder_sent == None,
                    PatientPortalUser.last_reminder_sent < seven_days_ago
                )
            ).all()

            if not unverified_patients:
                print("[SCHEDULER] No unverified patients require a reminder at this time.")
                return

            print(f"[SCHEDULER] Found {len(unverified_patients)} unverified patient(s) to remind.")

            # 2. Fetch branding and app URL
            branding = AppBranding.query.first()
            clinic_name = branding.clinic_name if branding and branding.clinic_name else "Legit HealthCare"
            logo_url = branding.logo_light if branding and branding.logo_light else None

            app_url = current_app.config.get('FRONTEND_URL', current_app.config.get('APP_URL', 'http://localhost:5173'))
            if logo_url and logo_url.startswith('/'):
                backend_url = current_app.config.get('APP_URL', 'http://localhost:5173')
                logo_url = f"{backend_url.rstrip('/')}{logo_url}"

            # 3. Determine screening year (use the current year as default)
            screening_year = str(datetime.now().year)

            # 4. Send reminders
            sent_count = 0
            fail_count = 0

            for patient in unverified_patients:
                try:
                    subject = f"Reminder: Complete Your Patient Account Verification - Legit HealthCare"
                    html_content = EmailService.get_registration_success_template(
                        first_name=patient.first_name,
                        year=screening_year,
                        clinic_name=clinic_name,
                        app_url=app_url,
                        logo_url=logo_url,
                        is_reminder=True
                    )

                    success = EmailService.send_email(patient.email, subject, html_content)
                    if success:
                        patient.last_reminder_sent = datetime.now()
                        sent_count += 1
                        print(f"[SCHEDULER] Reminder sent to {patient.email}")
                    else:
                        fail_count += 1
                        print(f"[SCHEDULER] Failed to send reminder to {patient.email}")

                except Exception as e:
                    fail_count += 1
                    print(f"[SCHEDULER] Error sending reminder to {patient.email}: {e}")

            # 5. Commit all timestamp updates
            db.session.commit()
            print(f"[SCHEDULER] Reminder job complete. Sent: {sent_count}, Failed: {fail_count}")

        except Exception as e:
            print(f"[SCHEDULER] CRITICAL ERROR in reminder job: {e}")
            import traceback
            traceback.print_exc()


def init_scheduler(app):
    """
    Initializes and starts the APScheduler BackgroundScheduler.
    The scheduler runs the weekly verification reminder job every 7 days.
    
    Guards:
    - SCHEDULER_ENABLED env var can be set to 'false' to disable.
    - Only starts once (prevents duplicate schedulers in multi-worker setups).
    """
    # Allow disabling via environment variable or in testing mode
    if os.getenv('SCHEDULER_ENABLED', 'true').lower() == 'false' or app.config.get('TESTING'):
        print("[SCHEDULER] Disabled via SCHEDULER_ENABLED=false or TESTING mode")
        return

    # Prevent duplicate schedulers (e.g., when Gunicorn pre-forks workers)
    if scheduler.running:
        print("[SCHEDULER] Already running, skipping duplicate init.")
        return

    # Schedule the weekly job: every Monday at 10:00 AM
    scheduler.add_job(
        func=send_weekly_verification_reminders,
        trigger=CronTrigger(day_of_week='mon', hour=10, minute=0),
        args=[app],
        id='weekly_verification_reminder',
        name='Weekly Patient Verification Reminder',
        replace_existing=True
    )

    scheduler.start()
    print("[SCHEDULER] Background scheduler started. Weekly verification reminders active (Mondays at 10:00 AM).")

    # Ensure clean shutdown
    atexit.register(lambda: scheduler.shutdown(wait=False))
