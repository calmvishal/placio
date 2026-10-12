import asyncio
import logging
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any

from app.core.config import settings

logger = logging.getLogger("tpo.email_service")
IST = timezone(timedelta(hours=5, minutes=30))

def _send_smtp_sync(to_email: str, subject: str, html_body: str, text_body: str) -> Dict[str, Any]:
    """
    Synchronous SMTP sending executed in a background worker thread.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Attach text and HTML parts
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                user = settings.SMTP_USER.strip()
                pwd = settings.SMTP_PASSWORD.replace(" ", "").strip()
                server.login(user, pwd)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())

        logger.info(f"[EMAIL LIVE SENT] Successfully delivered to {to_email} via {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        return {"status": "sent", "recipient": to_email, "subject": subject}
    except Exception as exc:
        logger.error(f"[EMAIL SMTP ERROR] Failed to send email to {to_email}: {exc}")
        return {"status": "failed", "recipient": to_email, "error": str(exc)}

async def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> Dict[str, Any]:
    """
    Asynchronously sends an email. If SMTP is disabled or credentials are blank,
    logs mock delivery without blocking or raising exceptions.
    """
    if not to_email or "@" not in to_email:
        logger.warning(f"[EMAIL SKIPPED] Invalid recipient email address: '{to_email}'")
        return {"status": "skipped", "reason": "invalid_email"}

    plain_text = text_body or subject

    if not settings.SMTP_ENABLED or not settings.SMTP_USER:
        # Mock mode for development & local environments
        logger.info(
            f"\n=======================================================\n"
            f"[MOCK EMAIL DISPATCHED]\n"
            f"To: {to_email}\n"
            f"From: {settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>\n"
            f"Subject: {subject}\n"
            f"Timestamp: {datetime.now(timezone.utc).isoformat()}\n"
            f"-------------------------------------------------------\n"
            f"{plain_text}\n"
            f"=======================================================\n"
        )
        return {
            "status": "mock_delivered",
            "recipient": to_email,
            "subject": subject,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    # Live delivery in background thread
    return await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_body, plain_text)

async def send_status_update_email(
    to_email: str,
    student_name: str,
    company_name: str,
    job_title: str,
    new_status: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an email notification to the student when their application status is updated.
    """
    subject = f"Application Status Update: {company_name} - {new_status}"

    status_color_map = {
        "Selected": "#10b981",
        "Shortlisted": "#6366f1",
        "Interview Scheduled": "#8b5cf6",
        "Assessment": "#3b82f6",
        "Under Review": "#f59e0b",
        "Rejected": "#ef4444",
        "Applied": "#06b6d4",
    }
    badge_color = status_color_map.get(new_status, "#4f46e5")

    text_body = (
        f"Dear {student_name},\n\n"
        f"Your application for {company_name} ({job_title}) has been updated.\n"
        f"New Recruitment Stage: {new_status}\n"
        f"{f'TPO Notes: {notes}' if notes else ''}\n\n"
        f"Please log in to the TPO Portal to view full details and track your progress.\n\n"
        f"Best regards,\n"
        f"Training & Placement Cell"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: #1e1b4b; padding: 24px 32px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }}
        .header p {{ margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }}
        .content {{ padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.6; }}
        .badge {{ display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: #ffffff; background-color: {badge_color}; margin: 12px 0; }}
        .info-box {{ background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 16px 0; border-left: 4px solid {badge_color}; }}
        .info-row {{ margin-bottom: 6px; font-size: 13px; }}
        .info-row strong {{ color: #475569; }}
        .footer {{ padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }}
        .btn {{ display: inline-block; padding: 10px 24px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>TPO Placement & Training Portal</h1>
          <p>Official Recruitment Status Notification</p>
        </div>
        <div class="content">
          <p>Dear <strong>{student_name}</strong>,</p>
          <p>Your placement application for <strong>{company_name}</strong> has been updated by the placement department.</p>
          
          <div style="text-align: center; margin: 16px 0;">
            <div class="badge">{new_status}</div>
          </div>

          <div class="info-box">
            <div class="info-row"><strong>Company:</strong> {company_name}</div>
            <div class="info-row"><strong>Role / Position:</strong> {job_title}</div>
            <div class="info-row"><strong>Current Stage:</strong> <span style="font-weight: 700; color: {badge_color};">{new_status}</span></div>
            {f'<div class="info-row"><strong>Officer Notes:</strong> {notes}</div>' if notes else ''}
          </div>

          <p>Please visit the portal to view full status progression, schedule details, and next instructions.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/student/applications" class="btn">View My Applications</a>
          </div>
        </div>
        <div class="footer">
          &copy; {datetime.now().year} Training & Placement Cell. This is an automated notification.
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email(to_email, subject, html_body, text_body)

async def send_interview_scheduled_email(
    to_email: str,
    student_name: str,
    company_name: str,
    job_title: str,
    round_name: str,
    scheduled_at: datetime,
    mode: str,
    venue_or_link: str,
    instructions: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an email notification to the student when an interview is scheduled.
    """
    if scheduled_at.tzinfo:
        local_dt = scheduled_at.astimezone(IST)
    else:
        local_dt = scheduled_at.replace(tzinfo=timezone.utc).astimezone(IST)
    date_str = local_dt.strftime("%A, %d %B %Y at %I:%M %p")
    subject = f"Interview Scheduled: {company_name} - {round_name} ({date_str})"

    text_body = (
        f"Dear {student_name},\n\n"
        f"You have an interview scheduled with {company_name} for the position of {job_title}.\n\n"
        f"Interview Details:\n"
        f"- Round: {round_name}\n"
        f"- Date & Time: {date_str}\n"
        f"- Mode: {mode}\n"
        f"- Venue / Link: {venue_or_link}\n"
        f"{f'- Instructions: {instructions}' if instructions else ''}\n\n"
        f"Please ensure you join on time with your resume and student ID.\n\n"
        f"Best regards,\n"
        f"Training & Placement Cell"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: #4338ca; padding: 24px 32px; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.02em; }}
        .header p {{ margin: 4px 0 0; font-size: 12px; color: #e0e7ff; }}
        .content {{ padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.6; }}
        .calendar-box {{ background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin: 20px 0; }}
        .cal-title {{ font-size: 16px; font-weight: 700; color: #3730a3; margin-bottom: 12px; }}
        .detail-row {{ margin-bottom: 8px; font-size: 13px; display: flex; }}
        .detail-label {{ width: 110px; font-weight: 600; color: #4b5563; flex-shrink: 0; }}
        .detail-value {{ color: #111827; font-weight: 500; }}
        .footer {{ padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }}
        .btn {{ display: inline-block; padding: 11px 26px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Interview Invitation</h1>
          <p>{company_name} Placement Drive</p>
        </div>
        <div class="content">
          <p>Dear <strong>{student_name}</strong>,</p>
          <p>Congratulations! You have been shortlisted for an interview round with <strong>{company_name}</strong> for the <strong>{job_title}</strong> role.</p>

          <div class="calendar-box">
            <div class="cal-title">📅 {round_name}</div>
            <div class="detail-row"><span class="detail-label">Date & Time:</span> <span class="detail-value">{date_str}</span></div>
            <div class="detail-row"><span class="detail-label">Mode:</span> <span class="detail-value">{mode}</span></div>
            <div class="detail-row"><span class="detail-label">Venue / Link:</span> <span class="detail-value"><a href="{venue_or_link}" style="color: #4338ca; font-weight: 600;">{venue_or_link}</a></span></div>
            {f'<div class="detail-row"><span class="detail-label">Instructions:</span> <span class="detail-value">{instructions}</span></div>' if instructions else ''}
          </div>

          <p>Please ensure you are prepared with your college ID, resume copy, and test setup (for online interviews) at least 10 minutes before the scheduled time.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/student/interviews" class="btn">View Interview Schedule in Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; {datetime.now().year} Training & Placement Cell. Good luck with your interview!
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email(to_email, subject, html_body, text_body)

async def send_interview_reminder_email(
    to_email: str,
    student_name: str,
    company_name: str,
    job_title: str,
    round_name: str,
    scheduled_at: datetime,
    mode: str,
    venue_or_link: str,
    instructions: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends an urgent or scheduled reminder email to the candidate regarding upcoming interview round.
    """
    if scheduled_at.tzinfo:
        local_dt = scheduled_at.astimezone(IST)
    else:
        local_dt = scheduled_at.replace(tzinfo=timezone.utc).astimezone(IST)
    date_str = local_dt.strftime("%A, %d %B %Y at %I:%M %p")
    subject = f"[Reminder] Upcoming Interview: {company_name} - {round_name} ({date_str})"

    text_body = (
        f"Dear {student_name},\n\n"
        f"This is a friendly reminder from the Placement Cell regarding your upcoming interview with {company_name}.\n\n"
        f"Interview Details:\n"
        f"- Role: {job_title}\n"
        f"- Round: {round_name}\n"
        f"- Date & Time: {date_str}\n"
        f"- Mode: {mode}\n"
        f"- Venue / Link: {venue_or_link}\n"
        f"{f'- Instructions: {instructions}' if instructions else ''}\n\n"
        f"Please be ready 10-15 minutes prior to the start time with your resume and student ID.\n\n"
        f"Best regards,\n"
        f"Training & Placement Cell"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
        .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 24px 32px; color: #ffffff; border-bottom: 3px solid #6366f1; }}
        .header h1 {{ margin: 0; font-size: 18px; font-weight: 700; }}
        .header p {{ margin: 4px 0 0; font-size: 12px; color: #cbd5e1; }}
        .content {{ padding: 32px; color: #1e293b; font-size: 14px; line-height: 1.6; }}
        .reminder-badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 12px; margin-bottom: 12px; }}
        .calendar-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1; }}
        .cal-title {{ font-size: 15px; font-weight: 700; color: #1e1b4b; margin-bottom: 12px; }}
        .detail-row {{ margin-bottom: 8px; font-size: 13px; display: flex; }}
        .detail-label {{ width: 110px; font-weight: 600; color: #64748b; flex-shrink: 0; }}
        .detail-value {{ color: #0f172a; font-weight: 600; }}
        .footer {{ padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b; }}
        .btn {{ display: inline-block; padding: 11px 26px; border-radius: 8px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; margin-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>Interview Reminder</h1>
          <p>{company_name} Placement Drive</p>
        </div>
        <div class="content">
          <div class="reminder-badge">🔔 Action Required</div>
          <p>Dear <strong>{student_name}</strong>,</p>
          <p>This is a reminder that you have an upcoming interview round with <strong>{company_name}</strong> for the <strong>{job_title}</strong> role.</p>

          <div class="calendar-box">
            <div class="cal-title">📅 {round_name}</div>
            <div class="detail-row"><span class="detail-label">Date & Time:</span> <span class="detail-value">{date_str}</span></div>
            <div class="detail-row"><span class="detail-label">Mode:</span> <span class="detail-value">{mode}</span></div>
            <div class="detail-row"><span class="detail-label">Venue / Link:</span> <span class="detail-value"><a href="{venue_or_link}" style="color: #4f46e5; font-weight: 600;">{venue_or_link}</a></span></div>
            {f'<div class="detail-row"><span class="detail-label">Instructions:</span> <span class="detail-value">{instructions}</span></div>' if instructions else ''}
          </div>

          <p>Please make sure you join or report on time. Have your college ID and resume ready.</p>

          <div style="text-align: center; margin-top: 24px;">
            <a href="http://localhost:5173/student/interviews" class="btn">Open My Interview Schedules</a>
          </div>
        </div>
        <div class="footer">
          &copy; {datetime.now().year} Training & Placement Cell. Automated reminder.
        </div>
      </div>
    </body>
    </html>
    """

    return await send_email(to_email, subject, html_body, text_body)
