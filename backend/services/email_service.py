import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..config import settings

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def send_otp_email(to_email: str, otp: str):
        subject = "EduBridge Password Reset Verification Code"
        body = f"""Hello,

You requested a password reset. Here is your 6-digit verification code:

    {otp}

This code will expire in 10 minutes. If you did not request this, please ignore this email.

Best regards,
EduBridge Team
"""

        if not settings.SMTP_SERVER or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            # Fallback: log OTP to console (dev mode only)
            logger.warning("SMTP credentials not configured — printing OTP to console (dev mode).")
            print("--- MOCK EMAIL ---")
            print(f"To: {to_email}")
            print(f"Subject: {subject}")
            print(f"OTP: {otp}")
            print("------------------")
            return

        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_USERNAME
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            server = smtplib.SMTP(settings.SMTP_SERVER, int(settings.SMTP_PORT))
            server.ehlo()
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USERNAME, to_email, msg.as_string())
            server.quit()
            logger.info(f"OTP email sent successfully to {to_email}")
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending OTP to {to_email}: {e}")
            raise RuntimeError(f"Failed to send OTP email: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error sending OTP to {to_email}: {e}")
            raise
