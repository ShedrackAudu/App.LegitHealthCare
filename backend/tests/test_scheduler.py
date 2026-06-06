import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from models import db, PatientPortalUser
from utils.scheduler import send_weekly_verification_reminders

def test_send_weekly_verification_reminders(client):
    app = client.application
    with app.app_context():
        # Clean up database to avoid conflicts
        db.session.query(PatientPortalUser).delete()
        db.session.commit()

        # 1. Create a patient who is already verified (should NOT receive email)
        p_verified = PatientPortalUser(
            username='p_verified',
            email='verified@example.com',
            phone='1111111111',
            first_name='Verified',
            last_name='User',
            is_verified=True
        )
        p_verified.set_password('TestPass1!')

        # 2. Create an unverified patient with no reminder sent (should receive email)
        p_unverified_new = PatientPortalUser(
            username='p_unverified_new',
            email='unverified_new@example.com',
            phone='2222222222',
            first_name='UnverifiedNew',
            last_name='User',
            is_verified=False,
            last_reminder_sent=None
        )
        p_unverified_new.set_password('TestPass1!')

        # 3. Create an unverified patient with reminder sent 8 days ago (should receive email)
        p_unverified_old = PatientPortalUser(
            username='p_unverified_old',
            email='unverified_old@example.com',
            phone='3333333333',
            first_name='UnverifiedOld',
            last_name='User',
            is_verified=False,
            last_reminder_sent=datetime.now() - timedelta(days=8)
        )
        p_unverified_old.set_password('TestPass1!')

        # 4. Create an unverified patient with reminder sent 3 days ago (should NOT receive email)
        p_unverified_recent = PatientPortalUser(
            username='p_unverified_recent',
            email='unverified_recent@example.com',
            phone='4444444444',
            first_name='UnverifiedRecent',
            last_name='User',
            is_verified=False,
            last_reminder_sent=datetime.now() - timedelta(days=3)
        )
        p_unverified_recent.set_password('TestPass1!')

        db.session.add(p_verified)
        db.session.add(p_unverified_new)
        db.session.add(p_unverified_old)
        db.session.add(p_unverified_recent)
        db.session.commit()

        # Mock EmailService.send_email
        with patch('utils.email_utils.EmailService.send_email') as mock_send_email:
            mock_send_email.return_value = True

            # Run the reminder job
            send_weekly_verification_reminders(app)

            # Check that send_email was called exactly twice (for new and old unverified patients)
            assert mock_send_email.call_count == 2

            sent_emails = [args[0] for args, kwargs in mock_send_email.call_args_list]
            assert 'unverified_new@example.com' in sent_emails
            assert 'unverified_old@example.com' in sent_emails
            assert 'verified@example.com' not in sent_emails
            assert 'unverified_recent@example.com' not in sent_emails

            # Reload users from db and check last_reminder_sent
            db.session.refresh(p_unverified_new)
            db.session.refresh(p_unverified_old)
            db.session.refresh(p_unverified_recent)

            assert p_unverified_new.last_reminder_sent is not None
            assert (datetime.now() - p_unverified_new.last_reminder_sent).total_seconds() < 10

            assert p_unverified_old.last_reminder_sent is not None
            assert (datetime.now() - p_unverified_old.last_reminder_sent).total_seconds() < 10

            # The recent one should remain unchanged (3 days ago)
            assert p_unverified_recent.last_reminder_sent is not None
            assert (datetime.now() - p_unverified_recent.last_reminder_sent).days == 3
