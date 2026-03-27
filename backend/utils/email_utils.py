import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')

class EmailService:
    @staticmethod
    def _get_smtp_config():
        load_dotenv(ENV_PATH, override=True)
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
        if not config.get("username") or not config.get("password"):
            print("Email configuration missing.")
            return False

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
            
            # For Gmail SMTP, usually port 587 with TLS
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(str(config["username"]), str(config["password"]))
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    @staticmethod
    def get_report_template(first_name, screening_year, company):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }}
                .wrapper {{ padding: 40px 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }}
                .header {{ background: #0f172a; color: #ffffff; padding: 40px 30px; text-align: left; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }}
                .header p {{ margin: 5px 0 0; font-size: 14px; opacity: 0.8; font-weight: 500; }}
                .content {{ padding: 40px 30px; }}
                .content p {{ margin-bottom: 20px; font-size: 16px; color: #334155; }}
                .highlight {{ color: #10b981; font-weight: 800; }}
                .footer {{ background: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }}
                .footer p {{ margin: 5px 0; font-size: 12px; color: #64748b; font-weight: 600; }}
                .btn {{ display: inline-block; padding: 14px 28px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 10px; }}
                .signature {{ margin-top: 40px; padding-top: 25px; border-top: 2px dashed #f1f5f9; }}
                .signature-name {{ font-weight: 800; color: #0f172a; margin: 0; font-size: 16px; }}
                .signature-title {{ margin: 2px 0; font-size: 13px; color: #64748b; font-weight: 500; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h1>LEGIT HEALTHCARE</h1>
                        <p>Staff Medical Screening Program</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>{first_name}</strong>,</p>
                        <p>Thank you for participating in this year's <span class="highlight">{screening_year} Annual Medical Screening Exercise</span>.</p>
                        <p>We are pleased to inform you that your clinical diagnostic results are now ready. Please find your detailed medical report attached to this email as a PDF document.</p>
                        <p>A physical copy of these results will also be delivered to the <strong>{company} Medical Team</strong> for official records and departmental dispatch.</p>
                        
                        <div class="signature">
                            <p class="signature-name">Dr. Anyanwu Ugochukwu D. FMCPath</p>
                            <p class="signature-title">Consultant in Charge</p>
                            <p class="signature-title">Legit HealthCare Services Ltd.</p>
                        </div>
                        
                        <p style="margin-top: 30px; text-align: center;">
                            <a href="https://bit.ly/SUNU-Doctor" class="btn">Consult with Doctor via WhatsApp</a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>&copy; {screening_year} LEGIT HEALTHCARE SERVICES LTD.</p>
                        <p>All Rights Reserved • Confidential Medical Record</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_appointment_template(patient_data, appointment_date, reason):
        items_html = ""
        for label, value in patient_data.items():
            items_html += f"<tr><td style='padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;'>{label}:</td><td style='padding: 8px; border-bottom: 1px solid #eee;'>{value}</td></tr>"

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
                    <p>System Generated Notification - Legit HealthCare</p>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_patient_verification_template(first_name, otp_code):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 0; background-color: #f1f5f9; }}
                .wrapper {{ padding: 60px 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); }}
                .header {{ background: #0f172a; padding: 40px; text-align: center; }}
                .logo {{ font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: 0.1em; }}
                .content {{ padding: 50px 40px; text-align: center; }}
                .content h2 {{ font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.02em; }}
                .content p {{ font-size: 16px; color: #475569; margin-bottom: 40px; }}
                .otp-wrap {{ position: relative; display: block; padding: 30px 10px; background: #f8fafc; border-radius: 20px; border: 2px solid #e2e8f0; margin: 0 20px 40px; }}
                .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 0.2em; color: #10b981; margin: 0; line-height: 1; white-space: nowrap; }}
                .subtext {{ font-size: 13px; color: #94a3b8; margin-top: 10px; font-weight: 600; text-transform: uppercase; }}
                .footer {{ padding: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; }}
                .footer strong {{ color: #64748b; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="logo">LEGIT HEALTHCARE</div>
                    </div>
                    <div class="content">
                        <h2>Hello {first_name}!</h2>
                        <p>We're excited to have you on board. Please use the verification code below to activate your patient account.</p>
                        
                        <div class="otp-wrap">
                            <h1 class="otp-code">{otp_code}</h1>
                            <div class="subtext">Expires in 10 minutes</div>
                        </div>
                        
                        <p style="font-size: 14px; margin-bottom: 0;">If you didn't create an account, you can ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 <strong>Legit HealthCare Services</strong><br>Quality Healthcare at your fingertips.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def get_otp_template(first_name, otp_code):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #0f172a; margin: 0; padding: 0; background-color: #f8fafc; }}
                .wrapper {{ padding: 40px 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
                .top-bar {{ height: 6px; background: #0f172a; }}
                .content {{ padding: 40px; text-align: center; }}
                .logo {{ font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 0.1em; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; display: inline-block; padding-bottom: 8px; }}
                .title {{ font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 15px; }}
                .message {{ font-size: 15px; color: #64748b; margin-bottom: 30px; }}
                .otp-card {{ background: #f1f5f9; border-radius: 12px; padding: 25px 10px; margin-bottom: 30px; }}
                .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #0f172a; margin: 0; white-space: nowrap; }}
                .expiry {{ font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 8px; }}
                .footer {{ padding: 30px; text-align: center; background: #fafafa; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="top-bar"></div>
                    <div class="content">
                        <div class="logo">LEGIT HEALTHCARE</div>
                        <h2 class="title">Password Reset</h2>
                        <p class="message">Hi {first_name}, use the one-time verification code below to reset your account password.</p>
                        
                        <div class="otp-card">
                            <h1 class="otp-code">{otp_code}</h1>
                            <div class="expiry">Valid for 15 minutes</div>
                        </div>
                        
                        <p style="font-size: 13px; color: #94a3b8;">If you didn't request a password reset, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 Legit HealthCare Services. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

