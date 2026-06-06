import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_otp_email(to_email: str, otp: str):
        smtp_server = os.environ.get("SMTP_SERVER")
        smtp_port = os.environ.get("SMTP_PORT", 587)
        smtp_username = os.environ.get("SMTP_USERNAME")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        subject = "EduBridge Password Reset Verification Code"
        body = f"""
        Hello,

        You requested a password reset. Here is your 6-digit verification code:
        
        {otp}
        
        This code will expire in 10 minutes. If you did not request this, please ignore this email.

        Best regards,
        EduBridge Team
        """

        if not smtp_server or not smtp_username or not smtp_password:
            # Fallback to console logger if SMTP is not configured
            logger.warning("SMTP credentials not configured. Printing OTP to console.")
            print(f"--- MOCK EMAIL ---")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(body)
            print(f"------------------")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = smtp_username
            msg['To'] = to_email
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(smtp_server, int(smtp_port))
            server.starttls()
            server.login(smtp_username, smtp_password)
            text = msg.as_string()
            server.sendmail(smtp_username, to_email, text)
            server.quit()
            logger.info(f"OTP email sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            raise e
