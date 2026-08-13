import smtplib
import socket
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv
from datetime import datetime
from markupsafe import escape

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
    def send_email(to_email, subject, html_content, attachment_data=None, attachment_filename=None, custom_config=None, cc=None, bcc=None):
        config = custom_config or EmailService._get_smtp_config()
        
        # 1. Check for SendGrid (Bypasses Render SMTP Block)
        sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        if sendgrid_api_key:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail as SG_Mail, Attachment, FileContent, FileName, FileType, Disposition, Cc, Bcc
                import base64

                print("--- SENDGRID API DELIVERY ---")
                from_email = os.getenv('SENDGRID_FROM_EMAIL', config.get('username'))
                message = SG_Mail(
                    from_email=(from_email, config.get('display_name', 'Legit HealthCare')),
                    to_emails=to_email,
                    subject=subject,
                    html_content=html_content
                )

                # Add CC recipients
                if cc:
                    for addr in cc:
                        if addr:
                            message.add_cc(Cc(addr))

                # Add BCC recipients
                if bcc:
                    for addr in bcc:
                        if addr:
                            message.add_bcc(Bcc(addr))

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

            # Add CC header
            if cc:
                msg['Cc'] = ', '.join(cc)

            # Add BCC (not added as a header — handled in recipient list only)

            msg.attach(MIMEText(html_content, 'html'))

            if attachment_data and attachment_filename:
                part = MIMEApplication(attachment_data, Name=str(attachment_filename))
                part['Content-Disposition'] = f'attachment; filename="{attachment_filename}"'
                msg.attach(part)

            smtp_server = str(config["server"])
            smtp_port = int(config["port"])
            
            is_ssl = (smtp_port == 465)
            server_conn = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=25) if is_ssl else smtplib.SMTP(smtp_server, smtp_port, timeout=25)

            # Build full recipient list: To + CC + BCC
            all_recipients = [str(to_email)]
            if cc:
                all_recipients.extend(cc)
            if bcc:
                all_recipients.extend(bcc)

            with server_conn as server:
                if not is_ssl:
                    server.ehlo(); server.starttls(); server.ehlo()
                
                server.login(str(config["username"]), str(config["password"]))
                server.sendmail(str(config["username"]), all_recipients, msg.as_string())
            
            return True
        except Exception as e:
            print(f"SMTP Fallback Error: {e}")
            return False


    @staticmethod
    def get_report_template(first_name, screening_year, section, logo_url=None, app_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        # Ensure login and signup URLs are correct
        base_url = app_url.rstrip('/') if app_url else "http://localhost:5173"
        login_url = f"{base_url}/login"
        signup_url = f"{base_url}/signup?portal=patient"
        
        # Escape user-controlled data (SEC-008)
        e_first_name = escape(first_name)
        e_screening_year = escape(screening_year)
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
                .body-text {{ font-size: 14px; margin-bottom: 15px; color: #475569; }}
                .body-text p {{ margin: 6px 0; }}
                .cta-container {{ text-align: center; margin: 20px 0; }}
                .cta-button {{ background-color: #14b8a5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
                .signature {{ margin-top: 20px; font-size: 13px; color: #475569; }}
                .signed-section {{ margin-top: 15px; font-size: 13px; line-height: 1.4; color: #1e293b; }}
                .contact-section {{ margin-top: 20px; padding-top: 20px; font-size: 13px; color: #64748b; }}
                .contact-link {{ color: #14b8a5; text-decoration: none; font-weight: 600; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
                .footer p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                
                <div class="header">
                    <h1>{e_screening_year} Medical Report</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">Dear {e_first_name},</div>
                    
                    <div class="body-text">
                        <p>Thank you for participating in this year's Annual Medical Screening Exercise.</p>
                        <p>Please find attached your official Medical Report for the {e_screening_year} Annual Medical Screening.</p>
                        <p>The hard copy of your result will be given to the {section} Medical Team for dispatch to your department.</p>
                    </div>

                    <div class="body-text" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 15px;">
                        You can also view your full clinical findings and manage your information online by logging into your patient portal:
                    </div>
                    
                    <div class="cta-container">
                        <a href="{login_url}" class="cta-button">Login to My Portal</a>
                    </div>

                    <div class="body-text">
                        <strong>Don't have an account yet?</strong> Click below to claim your patient profile and set up your login credentials:
                    </div>

                    <div class="cta-container" style="margin: 15px 0 25px 0;">
                        <a href="{signup_url}" class="cta-button" style="background-color: #475569;">Claim / Create My Account</a>
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
                
                <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
                    <p>Leading Edge in Healthcare delivery.</p>
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

        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .content p {{ font-size: 14px; color: #475569; }}
                .content h3 {{ font-size: 16px; margin: 20px 0 10px 0; color: #1e293b; }}
                .data-table {{ width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }}
                .appointment-box {{ background: rgba(210, 241, 238, 0.4); border: 1px solid rgba(210, 241, 238, 0.8); padding: 12px 16px; border-radius: 8px; margin: 15px 0; }}
                .appointment-box p {{ margin: 4px 0; font-size: 14px; color: #333; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
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
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
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
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
                .body-text {{ font-size: 14px; margin-bottom: 15px; color: #475569; }}
                .otp-display {{ font-size: 28px; font-weight: 800; color: #1e293b; margin: 15px 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 5px; letter-spacing: -1px !important; word-spacing: 0 !important; line-height: 1; }}
                .expiry-text {{ font-size: 13px; color: #64748b; margin-bottom: 15px; }}
                .signature {{ margin-top: 20px; font-size: 13px; color: #475569; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
                .footer p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                
                <div class="header">
                    <h1>Verification Code</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">Hello {first_name}!</div>
                    
                    <div class="body-text">
                        You're receiving this email because your action on our platform needs to be verified using the One Time Password (OTP) shown below:
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
                
                <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
                    <p>Leading Edge in Healthcare delivery.</p>
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
    def get_welcome_template(first_name, username, password, portal_type='staff', app_url=None, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        # Determine Login URL
        base_url = app_url.rstrip('/') if app_url else "http://localhost:5173"
        login_url = f"{base_url}/login"
        
        # Escape user-controlled data (SEC-008)
        e_first_name = escape(first_name)
        e_username = escape(username)
        e_password = str(password)
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
                .body-text {{ font-size: 14px; margin-bottom: 15px; color: #475569; }}
                .details-box {{ background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #14b8a5; margin-bottom: 15px; }}
                .details-box p {{ margin: 4px 0; font-size: 14px; }}
                .cta-container {{ text-align: center; margin: 20px 0; }}
                .cta-button {{ background-color: #14b8a5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
                .signature {{ margin-top: 20px; font-size: 13px; color: #475569; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
                .footer p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                
                <div class="header">
                    <h1>Welcome Onboard!</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">Hello {e_first_name}!</div>
                    
                    <div class="body-text">
                        Your account has been successfully created based on your request. Below are your login details:
                    </div>
                    
                    <div class="details-box">
                        <p><strong>Username:</strong> {e_username}</p>
                        <p><strong>Temporary Password:</strong> {e_password}</p>
                    </div>
                    
                    <div class="body-text">
                        <p>For security reasons, you will be required to change your password upon your first login.</p>
                    </div>

                    <div class="cta-container">
                        <a href="{login_url}" class="cta-button">Login to My Portal</a>
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
                
                <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
                    <p>Leading Edge in Healthcare delivery.</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_report_ready_template(first_name, screening_year, app_url, logo_url=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        # Ensure login and signup URLs are correct
        login_url = f"{app_url.rstrip('/')}/login"
        signup_url = f"{app_url.rstrip('/')}/signup?portal=patient"
        
        # Escape user-controlled data (SEC-008)
        e_first_name = escape(first_name)
        e_screening_year = escape(screening_year)
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
                .body-text {{ font-size: 14px; margin-bottom: 10px; color: #475569; }}
                .body-text p {{ margin: 4px 0; }}
                .cta-container {{ text-align: center; margin: 20px 0; }}
                .cta-button {{ background-color: #14b8a5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
                .signature {{ margin-top: 20px; font-size: 13px; color: #475569; }}
                .signed-section {{ margin-top: 15px; font-size: 13px; line-height: 1.4; color: #1e293b; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
                .footer p {{ margin: 2px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                
                <div class="header">
                    <h1>Medical Report Ready</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">Dear {e_first_name},</div>
                    
                    <div class="body-text">
                        We are pleased to inform you that your medical report for the <strong>{e_screening_year} Annual Medical Screening</strong> is now complete and ready for your review.
                    </div>
                    
                    <div class="body-text">
                        You can view your full clinical findings and medical advice by logging into your patient portal account using the button below.
                    </div>
                    
                    <div class="cta-container">
                        <a href="{login_url}" class="cta-button">View My Medical Report</a>
                    </div>

                    <div class="body-text" style="border-top: 1px dashed #e2e8f0; padding-top: 15px; margin-top: 15px;">
                        <strong>Don't have a portal account yet?</strong> If you haven't registered on our patient portal, click below to claim your profile and set up your login credentials:
                    </div>

                    <div class="cta-container" style="margin: 15px 0 25px 0;">
                        <a href="{signup_url}" class="cta-button" style="background-color: #475569;">Claim / Create My Account</a>
                    </div>
                    
                    <div class="body-text" style="font-size: 14px; color: #64748b; text-align: center;">
                        If the buttons don't work, copy and paste the appropriate link:<br>
                        Login: <a href="{login_url}" style="color: #14b8a5;">{login_url}</a><br>
                        Claim Account: <a href="{signup_url}" style="color: #14b8a5;">{signup_url}</a>
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
                
                <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
                    <p>Leading Edge in Healthcare delivery.</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_registration_success_template(first_name, year, clinic_name, app_url, logo_url=None, is_reminder=False, username=None, temp_password=None):
        logo_html = f'<img src="{logo_url}" alt="Logo" style="width: 64px; height: 64px; border-radius: 12px; margin-bottom: 20px; object-fit: contain;">' if logo_url else '<div style="font-size: 19px; font-weight: 800; color: #14b8a5; margin-bottom: 20px;">LEGIT HEALTHCARE</div>'
        
        # Direct Login URL for patients
        login_url = f"{app_url.rstrip('/')}/login?portal=patient"
        
        # Escape user-controlled data (SEC-008)
        e_first_name = escape(first_name)
        e_year = escape(year)
        e_clinic_name = escape(clinic_name)

        # Conditional content based on whether this is a reminder or initial registration email
        if is_reminder:
            header_title = "Account Verification Reminder"
            intro_text = "We noticed your patient profile account is pending verification."
            detail_text = f"To access your {e_year} screening report and view your health records online, please complete your account verification."
            cta_text = "Click below to verify your email and activate your patient portal account:"
            cta_button_label = "Complete Account Setup"
            followup_text = "If you have already verified your account, you can safely disregard this email."
        elif temp_password:
            header_title = "Registration Successful"
            intro_text = f"""
                <p>We are pleased to inform you that you have been successfully registered for the <strong>{e_year} medical screening program</strong>.</p>
                <p>Your participation is an important step toward maintaining your health and overall well-being. Please note that we are currently processing your information, including your submitted data and laboratory samples, as part of the screening procedure.</p>
            """
            e_username = escape(username or '')
            e_temp_pass = str(temp_password)
            detail_text = f"""
                <p>An online Patient Portal account has been automatically created for you.<br>
                Your login details for the Patient Portal are as follows:</p>
                <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #14b8a5; margin: 15px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Username / Staff ID:</strong> {e_username}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Temporary Password:</strong> {e_temp_pass}</p>
                </div>
                <p>For security reasons, you will be required to change your temporary password upon your first login.</p>
            """
            cta_text = """
                Click the button below to log in to your Patient Portal account and track your screening report progress:
            """
            cta_button_label = "Login to Patient Portal"
            followup_text = """
                You will receive a follow-up email once your screening report is ready.
            """
        else:
            header_title = "Registration Successful"
            intro_text = f"""
                <p>We are pleased to inform you that you have been successfully registered for the <strong>{e_year} medical screening program</strong>.</p>
                <p>Your participation is an important step toward maintaining your health and overall well-being. Please note that we are currently processing your information, including your submitted data and laboratory samples, as part of the screening procedure.</p>
            """
            detail_text = ""
            cta_text = """
                Click the button below to log in to your Patient Portal account and track your screening report progress:
            """
            cta_button_label = "Login to Patient Portal"
            followup_text = """
                You will receive a follow-up email once your screening report is ready.
            """
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }}
                .header {{ background: #14b8a5; color: #ffffff; padding: 15px; border-radius: 8px 8px 0 0; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; }}
                .content {{ padding: 20px; }}
                .greeting {{ font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
                .body-text {{ font-size: 14px; margin-bottom: 10px; color: #475569; }}
                .body-text p {{ margin: 4px 0; }}
                .cta-container {{ text-align: center; margin: 20px 0; }}
                .cta-button {{ background-color: #14b8a5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; }}
                .signature {{ margin-top: 20px; font-size: 13px; color: #475569; }}
                .footer {{ background-color: rgba(210, 241, 238, 0.4); font-size: 11px; color: #475569; padding: 15px; border-radius: 6px; border-top: 1px solid rgba(210, 241, 238, 0.8); text-align: center; margin-top: 20px; }}
                .footer p {{ margin: 2px 0; }}
                .whatsapp-section {{ margin-top: 15px; padding: 15px; background-color: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b; }}
                .whatsapp-link {{ color: #14b8a5; text-decoration: none; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: left;">
                    {logo_html}
                </div>
                
                <div class="header">
                    <h1>{header_title}</h1>
                </div>
                
                <div class="content">
                    <div class="greeting">Dear {e_first_name},</div>
                    
                    <div class="body-text">
                        {intro_text}
                    </div>
                    
                    <div class="body-text">
                        {detail_text}
                    </div>
                    
                    <div class="body-text">
                        {cta_text}
                    </div>
                    
                    <div class="cta-container">
                        <a href="{login_url}" class="cta-button">{cta_button_label}</a>
                    </div>
                    
                    <div class="body-text">
                        <p style="margin: 0 0 10px 0;">{followup_text}</p>
                        <p style="margin: 0 0 10px 0;">If you have any questions or need to update your information, please do not hesitate to contact us.</p>
                        <p style="margin: 0;">Thank you for your cooperation and commitment to your health.</p>
                    </div>
                    
                    <div class="signature">
                        Kind regards,<br>
                        ICT Department<br>
                        {e_clinic_name}
                    </div>
                    
                    <div class="whatsapp-section">
                        For further information or to lodge a complaint, you may contact the Consultant in charge via WhatsApp:<br>
                        <a href="https://bit.ly/SUNU-Doctor" class="whatsapp-link">https://bit.ly/SUNU-Doctor</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>&copy; 2026 Legit HealthCare Services Ltd. All Rights Reserved.</p>
                    <p>Leading Edge in Healthcare delivery.</p>
                </div>
            </div>
        </body>
        </html>
        """
