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
        
        # Diagnostic Logging (Masked)
        print(f"--- EMAIL DIAGNOSTIC ---")
        print(f"Server: {config.get('server')}")
        print(f"Port: {config.get('port')}")
        print(f"User: {config.get('username')[:3]}***@{config.get('username').split('@')[-1] if '@' in config.get('username') else '???'}")
        print(f"Pass Set: {'YES' if config.get('password') else 'NO'}")
        print(f"------------------------")

        # Validation
        if not config.get("username") or not config.get("password"):
            error_msg = f"SMTP Configuration Missing. USER: {config.get('username')}, PASS_SET: {bool(config.get('password'))}"
            print(f"Error: {error_msg}")
            raise Exception("SMTP credentials are not set. Check environment variables.")

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
            
            # Smart Connection Logic
            is_ssl = (smtp_port == 465)
            
            if is_ssl:
                server_conn = smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=25)
            else:
                server_conn = smtplib.SMTP(smtp_server, smtp_port, timeout=25)

            with server_conn as server:
                server.set_debuglevel(1) # HIGH VERBOSITY FOR PROD DEBUGGING
                
                if not is_ssl:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                
                try:
                    server.login(str(config["username"]), str(config["password"]))
                except smtplib.SMTPAuthenticationError:
                    raise Exception("Authentication Failed: Check your username and App Password.")
                    
                server.send_message(msg)
            
            return True
        except socket.timeout:
            raise Exception(f"Connection timed out at {smtp_server}:{smtp_port}. Check firewall/port.")
        except Exception as e:
            # Check for common dev/test overrides
            error_str = str(e).lower()
            if "authentication failed" in error_str or "timeout" in error_str or "connection refused" in error_str:
                # If we suspect it's a dev machine without internet or config, log it nicely
                print(f"\n\n!!! EMAIL SERVICE NOTICE !!!")
                print(f"Failed to send real email to: {to_email}")
                print(f"Reason: {str(e)}")
                print(f"!!! Proceeding without sending email (Fallback) !!!\n\n")
                
                # We return False here if we want the caller to handle the failure, 
                # or True if we want to swallow it for development. 
                # For production safety, we should let the caller (app.py) know it failed.
                return False 
            
            print(f"Critical Email Error: {e}")
            raise e

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
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; }}
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
                .footer {{ font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="text-align: center;">
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
                    <p>&copy; {datetime.now().year} Legit HealthCare - System Generated Notification</p>
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
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; }}
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
                .footer-bar {{ background-color: #D2F1EE; padding: 15px 25px; margin-top: 40px; border-radius: 4px; font-size: 13px; color: #475569; }}
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
                        <p>&copy; {current_year} Legit HealthCare Services Ltd</p>
                        <p>Leading Edge in Healthcare delivery.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """


