import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

class EmailService:
    @staticmethod
    def _get_smtp_config():
        load_dotenv(override=True)
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
                body {{ font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f4f7fb; }}
                .wrapper {{ padding: 40px 20px; }}
                .container {{ max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }}
                .top-accent {{ height: 8px; background: linear-gradient(90deg, #10b981 0%, #3b82f6 100%); }}
                .header {{ padding: 40px 30px 20px; text-align: center; }}
                .logo {{ font-size: 24px; font-weight: 900; color: #0f172a; letter-spacing: -0.04em; }}
                .content {{ padding: 0 40px 40px; text-align: center; }}
                .content h2 {{ color: #0f172a; font-size: 24px; font-weight: 700; margin-bottom: 10px; }}
                .content p {{ font-size: 16px; color: #64748b; margin-bottom: 30px; }}
                .otp-card {{ background: #f8fafc; border-radius: 16px; padding: 30px; border: 2px solid #f1f5f9; margin-bottom: 30px; }}
                .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 0.2em; color: #10b981; margin: 0; }}
                .timer {{ font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; margin-top: 10px; }}
                .footer {{ background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #f1f5f9; }}
                .footer p {{ margin: 5px 0; font-size: 12px; color: #94a3b8; font-weight: 500; }}
                .socials {{ margin-top: 15px; }}
                .social-link {{ color: #64748b; text-decoration: none; margin: 0 10px; font-size: 12px; font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="top-accent"></div>
                    <div class="header">
                        <div class="logo">LEGIT HEALTHCARE</div>
                    </div>
                    <div class="content">
                        <h2>Account Verification</h2>
                        <p>Hi {first_name}, welcome to Legit HealthCare! Use the code below to complete your patient account setup.</p>
                        
                        <div class="otp-card">
                            <h1 class="otp-code">{otp_code}</h1>
                            <div class="timer">Valid for 10 minutes</div>
                        </div>
                        
                        <p style="font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2026 Legit HealthCare Services Ltd.</p>
                        <p>Quality Care • Secure Technology • Patient Privacy</p>
                        <div class="socials">
                            <a href="#" class="social-link">Support</a>
                            <a href="#" class="social-link">Privacy Policy</a>
                        </div>
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
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: center; }}
                .header {{ background: #0f172a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; }}
                .otp-box {{ font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0f172a; background: #f1f5f9; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px dashed #cbd5e1; }}
                .footer {{ font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verification Code</h1>
                </div>
                <div class="content">
                    <p>Dear {first_name},</p>
                    <p>Verify your action on our platform using the One Time Password below:</p>
                    <div class="otp-box">{otp_code}</div>
                    <p>Condition: <strong>The OTP expires in 5 minutes.</strong></p>
                </div>
                <div class="footer">
                    Regards,<br>
                    <strong>ICT Department</strong>,<br>
                    Legit HealthCare Services Ltd.
                </div>
            </div>
        </body>
        </html>
        """

