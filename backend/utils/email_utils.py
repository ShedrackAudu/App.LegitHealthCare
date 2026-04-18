import smtplib
import socket
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv
from datetime import datetime

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

class EmailService:
    @staticmethod
    def _get_smtp_config():
        # Load from .env if present, but DO NOT override system environment variables (like Render's)
        if os.path.exists(ENV_PATH):
            load_dotenv(ENV_PATH)
            
        return {
            "server": os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
            "port": int(os.getenv('MAIL_PORT', '587')),
            "username": os.getenv('MAIL_USERNAME', ''),
            "password": os.getenv('MAIL_PASSWORD', ''),
            "display_name": os.getenv('MAIL_DISPLAY_NAME', 'Legit HealthCare')
        }

    @staticmethod
    def send_email(to_email, subject, html_content, attachment_data=None, attachment_filename=None, custom_config=None):
        config = custom_config or EmailService._get_smtp_config()
        
        # 1. Check for SendGrid (Bypasses Render SMTP Block)
        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        if sendgrid_api_key:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail as SG_Mail, Attachment, FileContent, FileName, FileType, Disposition
                import base64

                print("--- SENDGRID API DELIVERY ---")
                from_email = os.getenv('SENDGRID_FROM_EMAIL', config.get('username'))
                message = SG_Mail(
                    from_email=(from_email, config.get('display_name', 'Legit HealthCare')),
                    to_emails=to_email,
                    subject=subject,
                    html_content=html_content
                )

                if attachment_data and attachment_filename:
                    encoded_file = base64.b64encode(attachment_data).decode()
                    attachedFile = Attachment(
                        FileContent(encoded_file),
                        FileName(attachment_filename),
                        FileType('application/pdf'),
                        Disposition('attachment')
                    )
                    message.add_attachment(attachedFile)

                sg = SendGridAPIClient(sendgrid_api_key)
                response = sg.send(message)
                print(f"SendGrid Status: {response.status_code}")
                return True
            except Exception as e:
                print(f"SendGrid API Error: {e}")
                # If API fails, we Fallback to SMTP
                print("Falling back to SMTP...")

        # 2. Legacy SMTP Fallback (For Local Testing)
        # Diagnostic Logging (Masked)
        print(f"--- SMTP FALLBACK DELIVERY ---")
        print(f"Server: {config.get('server')}")
        print(f"Port: {config.get('port')}")
        print(f"User: {config.get('username')[:3]}***")
        print(f"------------------------")

        if not config.get("username") or not config.get("password"):
            raise Exception("No email service configured (Missing SENDGRID_API_KEY or SMTP credentials).")

        try:
            msg = MIMEMultipart()
            display_name = config.get("display_name", "Legit HealthCare")
            msg['From'] = f"{display_name} <{config['username']}>"
            msg['To'] = str(to_email)
            msg['Subject'] = str(subject)

            msg.attach(MIMEText(html_content, 'html'))

            if attachment_data and attachment_filename:
                part = MIMEApplication(attachment_data, Name=str(attachment_filename))
                part['Content-Disposition'] = f'attachment; filename="{attachment_filename}"'
                msg.attach(part)

            smtp_server = str(config["server"])
            smtp_port = int(config["port"])
            
            is_ssl = (smtp_port == 465)
            server_conn = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=25) if is_ssl else smtplib.SMTP(smtp_server, smtp_port, timeout=25)

            with server_conn as server:
                if not is_ssl:
                    server.ehlo(); server.starttls(); server.ehlo()
                
                server.login(str(config["username"]), str(config["password"]))
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"SMTP Fallback Error: {e}")
            return False


    @staticmethod
    def get_report_template(first_name, screening_year, section, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="height: 80px; margin-bottom: 20px;"></div>'
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #ffffff; }}
                .wrapper {{ padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .logo-container {{ padding: 20px 0; }}
                .header-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-bottom: 30px; border-radius: 4px; }}
                .header-bar h1 {{ margin: 0; font-size: 24px; color: #1e293b; font-weight: 700; }}
                .content {{ padding: 0 25px; }}
                .greeting {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }}
                .body-text {{ font-size: 16px; margin-bottom: 25px; }}
                .signature {{ margin-top: 35px; font-size: 15px; color: #475569; }}
                .signed-section {{ margin-top: 25px; font-size: 15px; line-height: 1.4; color: #1e293b; }}
                .contact-section {{ margin-top: 30px; padding-top: 20px; font-size: 14px; color: #64748b; }}
                .contact-link {{ color: #0d9488; text-decoration: none; font-weight: 600; }}
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; text-align: left; }}
                .footer-bar p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    
                    <div class="header-bar">
                        <h1>{screening_year} Medical Report</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Dear {first_name},</div>
                        
                        <div class="body-text">
                            <p>Thanks for making yourself available for this year's Annual Medical Screening Excercise.</p>
                            <p>Please find attached your Medical Report for the year {screening_year}.</p>
                            <p>The hard copy of your result will be given to the {section} Medical Team for dispatch to your department.</p>
                        </div>
                        
                        <div class="signature">
                            Warm Regards,<br>
                            The ICT Team,<br>
                            Legit HealthCare Services Ltd.
                        </div>
                        
                        <div class="signed-section">
                            <strong>SIGNED:</strong><br>
                            Dr. Anyanwu Ugochukwu D. FMCPath<br>
                            Consultant in Charge<br>
                            Legit HealthCare Services Ltd.
                        </div>
                        
                        <div class="contact-section">
                            For more info and complaints, contact the Consultant in-charge (Doctor) on WhatsApp at: <br>
                            <a href="https://bit.ly/SUNU-Doctor" class="contact-link">https://bit.ly/SUNU-Doctor</a>
                        </div>
                    </div>
                    
                    <div class="footer-bar">
                        <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_appointment_template(patient_data, appointment_date, reason, logo_url=None):
        items_html = ""
        for label, value in patient_data.items():
            items_html += f"<tr><td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>{label}:</td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{value}</td></tr>"

        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">' if logo_url else '<div style="font-size: 24px; font-weight: 800; color: #0d9488; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #0f172a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
                .content {{ padding: 20px; }}
                .data-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                .appointment-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; margin: 20px 0; }}
                .footer {{ font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; text-align: left; }}
                .footer p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                <div class="header">
                    <h1>New Appointment Booked</h1>
                </div>
                <div class="content">
                    <p>A new appointment has been scheduled for the following patient:</p>
                    
                    <div class="appointment-box">
                        <p><strong>Appointment Date:</strong> {appointment_date}</p>
                        <p><strong>Reason:</strong> {reason}</p>
                    </div>
 
                    <h3>Patient Bio-Data:</h3>
                    <table class="data-table">
                        {items_html}
                    </table>
                </div>
                 <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                    <p>Leading Edge in Healthcare delivery.</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_patient_verification_template(first_name, otp_code, logo_url=None):
        # Format OTP (strictly remove any spaces)
        formatted_otp = str(otp_code).replace(" ", "")
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">' if logo_url else '<div style="font-size: 24px; font-weight: 800; color: #0d9488; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #ffffff; }}
                .wrapper {{ padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .logo-container {{ padding: 20px 0; }}
                .header-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-bottom: 30px; border-radius: 4px; }}
                .header-bar h1 {{ margin: 0; font-size: 24px; color: #1e293b; font-weight: 700; }}
                .content {{ padding: 0 25px; }}
                .greeting {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }}
                .body-text {{ font-size: 16px; margin-bottom: 25px; color: #475569; }}
                .otp-display {{ font-size: 36px; font-weight: 800; color: #1e293b; margin: 25px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 5px; letter-spacing: -1px !important; word-spacing: 0 !important; line-height: 1; }}
                .expiry-text {{ font-size: 15px; color: #64748b; margin-bottom: 30px; }}
                .signature {{ margin-top: 35px; font-size: 15px; color: #475569; }}
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; text-align: left; }}
                .footer-bar p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    
                    <div class="header-bar">
                        <h1>Verification Code</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Hello {first_name}!</div>
                        
                        <div class="body-text">
                            You're receiving the email because your action on our platform needs to be verified using a One Time Password:
                        </div>
                        
                        <div class="otp-display">{formatted_otp}</div>
                        
                        <div class="expiry-text">
                            The code expires in 10 minutes.
                        </div>
                        
                        <div class="body-text">
                            If you did not initiate the action, kindly ignore this mail.
                        </div>
                        
                        <div class="signature">
                            Regards,<br>
                            The ICT Team,<br>
                            Legit HealthCare Services Ltd.
                        </div>
                    </div>
                    
                    <div class="footer-bar">
                        <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_otp_template(first_name, otp_code, logo_url=None):
        # Use the same exact design as verification template for "all OTP related mails"
        return EmailService.get_patient_verification_template(first_name, otp_code, logo_url)

    @staticmethod
    def get_welcome_template(first_name, username, password, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="font-size: 24px; font-weight: 800; color: #0d9488; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        current_year = datetime.now().year
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #ffffff; }}
                .wrapper {{ padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .logo-container {{ padding: 20px 0; }}
                .header-bar {{ background-color: #D2F1EE; padding: 25px; margin-bottom: 30px; border-radius: 4px; }}
                .header-bar h1 {{ margin: 0; font-size: 28px; color: #1e293b; font-weight: 800; }}
                .content {{ padding: 0 25px; }}
                .greeting {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }}
                .body-text {{ font-size: 16px; margin-bottom: 25px; color: #475569; }}
                .details-box {{ background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #D2F1EE; margin-bottom: 25px; }}
                .details-box p {{ margin: 10px 0; font-size: 16px; }}
                .signature {{ margin-top: 35px; font-size: 15px; color: #475569; }}
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; text-align: left; }}
                .footer-bar p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    
                    <div class="header-bar">
                        <h1>Welcome Onboard!</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Hello {first_name}!</div>
                        
                        <div class="body-text">
                            Your account has been successfully created based on your request. Below are your login details:
                        </div>
                        
                        <div class="details-box">
                            <p><strong>Username:</strong> {username}</p>
                            <p><strong>Temporary Password:</strong> {password}</p>
                        </div>
                        
                        <div class="body-text">
                            <p>For security reasons, you will be required to change your password upon your first login.</p>
                            <p>To get started, simply log in using the credentials above and follow the prompt to set a new password.</p>
                        </div>
                        
                        <div class="body-text">
                            If you have any questions or need assistance, feel free to reach out to our support team. We're glad to have you here!
                        </div>
                        
                        <div class="signature">
                            Best Regards,<br>
                            The ICT Team,<br>
                            Legit HealthCare Services Ltd.
                        </div>
                    </div>
                    
                    <div class="footer-bar">
                        <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_report_ready_template(first_name, screening_year, app_url, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="height: 80px; margin-bottom: 20px;"></div>'
        
        # Ensure login URL is correct
        login_url = f"{app_url.rstrip('/')}/login?portal=patient"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #ffffff; }}
                .wrapper {{ padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .logo-container {{ padding: 20px 0; }}
                .header-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-bottom: 30px; border-radius: 4px; }}
                .header-bar h1 {{ margin: 0; font-size: 24px; color: #1e293b; font-weight: 700; }}
                .content {{ padding: 0 25px; }}
                .greeting {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }}
                .body-text {{ font-size: 16px; margin-bottom: 25px; color: #475569; }}
                .cta-container {{ text-align: center; margin: 35px 0; }}
                .cta-button {{ background-color: #0d9488; color: #ffffff !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; }}
                .signature {{ margin-top: 35px; font-size: 15px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
                .signed-section {{ margin-top: 25px; font-size: 15px; line-height: 1.4; color: #1e293b; }}
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; text-align: left; }}
                .footer-bar p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    
                    <div class="header-bar">
                        <h1>Medical Report Ready</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Dear {first_name},</div>
                        
                        <div class="body-text">
                            We are pleased to inform you that your medical report for the <strong>{screening_year} Annual Medical Screening</strong> is now complete and ready for your review.
                        </div>
                        
                        <div class="body-text">
                            You can view your full clinical findings and medical advice by logging into your patient portal account using the button below.
                        </div>
                        
                        <div class="cta-container">
                            <a href="{login_url}" class="cta-button">View My Medical Report</a>
                        </div>
                        
                        <div class="body-text" style="font-size: 14px; color: #64748b; text-align: center;">
                            If the button doesn't work, copy and paste this link:<br>
                            <a href="{login_url}" style="color: #0d9488;">{login_url}</a>
                        </div>
                        
                        <div class="signature">
                            Warm Regards,<br>
                            The ICT Team,<br>
                            Legit HealthCare Services Ltd.
                        </div>
                        
                        <div class="signed-section">
                            <strong>SIGNED:</strong><br>
                            Dr. Anyanwu Ugochukwu D. FMCPath<br>
                            Consultant in Charge<br>
                            Legit HealthCare Services Ltd.
                        </div>
                    </div>
                    
                    <div class="footer-bar">
                        <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    @staticmethod
    def get_registration_success_template(first_name, year, clinic_name, app_url, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="height: 80px; margin-bottom: 20px;"></div>'
        
        # Signup URL for patients to claim account
        signup_url = f"{app_url.rstrip('/')}/signup?portal=patient"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #ffffff; }}
                .wrapper {{ padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .logo-container {{ padding: 20px 0; }}
                .header-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-bottom: 30px; border-radius: 4px; }}
                .header-bar h1 {{ margin: 0; font-size: 24px; color: #1e293b; font-weight: 700; }}
                .content {{ padding: 0 25px; }}
                .greeting {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 20px; }}
                .body-text {{ font-size: 16px; margin-bottom: 25px; color: #475569; }}
                .cta-container {{ text-align: center; margin: 35px 0; }}
                .cta-button {{ background-color: #0d9488; color: #ffffff !important; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; }}
                .signature {{ margin-top: 35px; font-size: 15px; color: #475569; border-top: 1px solid #f1f5f9; padding-top: 20px; }}
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; text-align: left; }}
                .footer-bar p {{ margin: 2px 0; }}
                .whatsapp-section {{ margin-top: 25px; padding: 15px; background-color: #f8fafc; border-radius: 8px; font-size: 14px; color: #64748b; }}
                .whatsapp-link {{ color: #0d9488; text-decoration: none; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="logo-container">
                        {logo_html}
                    </div>
                    
                    <div class="header-bar">
                        <h1>Registration Successful</h1>
                    </div>
                    
                    <div class="content">
                        <div class="greeting">Dear {first_name},</div>
                        
                        <div class="body-text">
                            We are pleased to inform you that you have been successfully registered for the <strong>{year} medical screening program</strong>.
                        </div>
                        
                        <div class="body-text">
                            Your participation is an important step toward maintaining your health and overall well-being. Please note that we are currently processing your information, including your submitted data and laboratory samples, as part of the screening procedure.
                        </div>
                        
                        <div class="body-text">
                            In the meantime, kindly click the button below to create or claim your patient account. This will allow you to track your personal data and monitor the progress of your screening report:
                        </div>
                        
                        <div class="cta-container">
                            <a href="{signup_url}" class="cta-button">Create Patient Account</a>
                        </div>
                        
                        <div class="body-text">
                            You will receive a follow-up email once your report is ready.
                        </div>
                        
                        <div class="body-text">
                            If you have any questions or need to update your information, please do not hesitate to contact us.
                        </div>
                        
                        <div class="body-text">
                            Thank you for your cooperation and commitment to your health.
                        </div>
                        
                        <div class="signature">
                            Kind regards,<br>
                            ICT Department<br>
                            {clinic_name}
                        </div>
                        
                        <div class="whatsapp-section">
                            For further information or to lodge a complaint, you may contact the Consultant in charge via WhatsApp:<br>
                            <a href="https://bit.ly/SUNU-Doctor" class="whatsapp-link">https://bit.ly/SUNU-Doctor</a>
                        </div>
                    </div>
                    
                    <div class="footer-bar">
                        <p>&copy; 2026 Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
