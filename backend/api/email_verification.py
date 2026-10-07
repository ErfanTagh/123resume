"""
Email verification utilities
"""
import os
import secrets
import hashlib
import uuid
import json
from datetime import datetime, timedelta

import requests
from django.conf import settings
from django.template.loader import render_to_string


def generate_verification_token():
    """Generate a unique verification token"""
    return secrets.token_urlsafe(32)


def create_verification_link(token, domain):
    """Create a verification link"""
    return f"https://{domain}/verify-email?token={token}"


def send_verification_email(user_email, username, verification_link):
    """Send verification email to user with improved spam prevention"""
    subject = 'Verify Your Email - 123Resume'
    
    # Plain text email
    plain_message = f"""Welcome to 123Resume

Hi {username},

Thanks for signing up. To get started, please verify your email address by clicking the link below:

{verification_link}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The 123Resume Team

---
123Resume - Build Professional Resumes
https://123resume.de
© 2025 123Resume. All rights reserved.
"""
    
    # Improved HTML version with better structure
    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Verify Your Email - 123Resume</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #667eea; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to 123Resume</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Hi {username},</p>
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Thanks for signing up. To get started, please verify your email address by clicking the button below:</p>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{verification_link}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Verify Email Address</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 20px 0 10px; font-size: 14px; color: #666666;">Or copy and paste this link into your browser:</p>
                            <p style="margin: 0 0 20px; font-size: 14px; color: #667eea; word-break: break-all;">{verification_link}</p>
                            <p style="margin: 0 0 20px; font-size: 14px; color: #666666;">This link will expire in 24 hours.</p>
                            <p style="margin: 0; font-size: 14px; color: #999999;">If you didn't create an account, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                                Best regards,<br>
                                The 123Resume Team<br><br>
                                <a href="https://123resume.de" style="color: #667eea; text-decoration: none;">123resume.de</a><br>
                                © 2025 123Resume. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    # Send via Mailgun
    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=html_message,
        to_email=user_email,
        reply_to="contact@123resume.de",
    )


def send_welcome_email(user_email, username):
    """Send welcome email after successful verification"""
    subject = 'Email Verified - Welcome to 123Resume'
    
    plain_message = f"""Email Verified - Welcome to 123Resume

Great news, {username}!

Your email has been successfully verified. You're all set to start building your professional resume.

What's next?
- Create Your Resume: Use our step-by-step form
- Choose Templates: Modern, Classic, Minimal, or Creative
- Track Completeness: Get real-time scores
- Save & Export: Download as PDF anytime

Ready to get started? Visit https://123resume.de

© 2025 123Resume. All rights reserved.
"""
    
    html_message = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Email Verified - Welcome to 123Resume</h2>
    <p>Great news, {username}!</p>
    <p>Your email has been successfully verified. You're all set to start building your professional resume.</p>
    <h3>What's next?</h3>
    <ul>
        <li>Create Your Resume: Use our step-by-step form</li>
        <li>Choose Templates: Modern, Classic, Minimal, or Creative</li>
        <li>Track Completeness: Get real-time scores</li>
        <li>Save & Export: Download as PDF anytime</li>
    </ul>
    <p>Ready to get started? Visit <a href="https://123resume.de">https://123resume.de</a></p>
    <hr>
    <p style="color: #666; font-size: 12px;">© 2025 123Resume. All rights reserved.</p>
</body>
</html>
"""
    
    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=html_message,
        to_email=user_email,
        reply_to="contact@123resume.de",
    )


def send_password_reset_email(user_email, username, reset_link):
    """Send password reset email to user"""
    subject = 'Reset Your Password - 123Resume'
    
    plain_message = f"""Password Reset Request - 123Resume

Hi {username},

We received a request to reset your password for your 123Resume account.

Click the link below to reset your password:
{reset_link}

SECURITY NOTICE:
- This link expires in 1 hour
- If you didn't request this, please ignore this email
- Your password won't change unless you click the link above

If you didn't request a password reset, someone may be trying to access your account.

Best regards,
The 123Resume Team

---
123Resume - Build Professional Resumes
https://123resume.de
© 2025 123Resume. All rights reserved.
"""
    
    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Reset Your Password - 123Resume</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #667eea; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Password Reset Request</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Hi {username},</p>
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">We received a request to reset your password for your 123Resume account.</p>
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Click the button below to reset your password:</p>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="{reset_link}" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Reset Password</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 20px 0 10px; font-size: 14px; color: #666666;">Or copy and paste this link into your browser:</p>
                            <p style="margin: 0 0 20px; font-size: 14px; color: #667eea; word-break: break-all;">{reset_link}</p>
                            <div style="background-color: #f0f4ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #4c51bf;">SECURITY NOTICE:</p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4c51bf;">
                                    <li style="margin-bottom: 5px;">This link expires in 1 hour</li>
                                    <li style="margin-bottom: 5px;">If you didn't request this, please ignore this email</li>
                                    <li style="margin-bottom: 5px;">Your password won't change unless you click the link above</li>
                                </ul>
                            </div>
                            <p style="margin: 0; font-size: 14px; color: #666666;">If you didn't request a password reset, someone may be trying to access your account.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                                Best regards,<br>
                                The 123Resume Team<br><br>
                                <a href="https://123resume.de" style="color: #667eea; text-decoration: none;">123resume.de</a><br>
                                © 2025 123Resume. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=html_message,
        to_email=user_email,
        reply_to="contact@123resume.de",
    )


def send_password_changed_email(user_email, username):
    """Send confirmation email after password was changed"""
    subject = 'Password Changed - 123Resume'
    
    plain_message = f"""Password Successfully Changed - 123Resume

Hi {username},

Your password for your 123Resume account has been successfully changed.

DIDN'T CHANGE YOUR PASSWORD?
If you didn't make this change, please contact us immediately and secure your account.

You can now log in with your new password at https://123resume.de/login

Best regards,
The 123Resume Team

---
123Resume - Build Professional Resumes
https://123resume.de
© 2025 123Resume. All rights reserved.
"""
    
    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Password Changed - 123Resume</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
            <td style="padding: 20px 0;">
                <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #10b981; border-radius: 8px 8px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Password Changed</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Hi {username},</p>
                            <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Your password for your 123Resume account has been successfully changed.</p>
                            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991b1b;">DIDN'T CHANGE YOUR PASSWORD?</p>
                                <p style="margin: 10px 0 0; font-size: 14px; color: #991b1b;">If you didn't make this change, please contact us immediately and secure your account.</p>
                            </div>
                            <table role="presentation" style="width: 100%; margin: 30px 0;">
                                <tr>
                                    <td style="text-align: center;">
                                        <a href="https://123resume.de/login" style="display: inline-block; padding: 14px 32px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Log In Now</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; border-radius: 0 0 8px 8px;">
                            <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                                Best regards,<br>
                                The 123Resume Team<br><br>
                                <a href="https://123resume.de" style="color: #667eea; text-decoration: none;">123resume.de</a><br>
                                © 2025 123Resume. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    
    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=html_message,
        to_email=user_email,
        reply_to="contact@123resume.de",
    )


def send_feedback_email(support_email, reply_to_email, subject, plain_message):
    """
    Send a simple feedback/support email to the support inbox (plain text only).
    """
    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=None,
        to_email=support_email,
        reply_to=None,  # we include user email in the body, not as reply-to
    )


def send_ai_features_announcement_email(to_email: str, username: str = "") -> bool:
    """
    Product announcement: new AI resume score + assistant (Mailgun).

    Set BROADCAST_FROM_EMAIL in the environment to a full From header, e.g.
    "123Resume <contact@123resume.de>". That address must be authorized in Mailgun.
    If unset, defaults to 123Resume <contact@123resume.de>.
    """
    greet = (username or "").strip() or "there"
    subject = "New on 123Resume: AI feedback for your CV"

    plain_message = f"""Hi {greet},

We've added new AI-powered features to 123Resume to help you improve your CV faster:

• AI resume score — Get a structured score and practical feedback on your content, experience, skills, and ATS-related aspects.
• AI resume assistant — Ask for help with wording, bullet points, summaries, and how you present your experience.

These tools are there to support your writing; you stay in control of what goes on your CV.

What you need to do
Nothing is required. Log in, open your CV in the builder, and use the new options where you see them. If something does not load, try again in a moment or refresh the page.

Thank you for using 123Resume.

Best regards,
The 123Resume team

---
123Resume — https://123resume.de
"""

    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; margin: 0; padding: 0;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#f4f4f4;">
    <tr><td style="padding:20px 0;">
      <table role="presentation" style="width:600px;max-width:100%;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,.08);">
        <tr><td style="padding:32px 40px 24px;background:#667eea;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:22px;color:#fff;font-weight:600;">New AI features on 123Resume</h1>
        </td></tr>
        <tr><td style="padding:28px 40px;">
          <p style="margin:0 0 16px;font-size:16px;">Hi {greet},</p>
          <p style="margin:0 0 16px;font-size:16px;">We've added new <strong>AI-powered features</strong> to 123Resume to help you improve your CV faster:</p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:15px;">
            <li style="margin-bottom:10px;"><strong>AI resume score</strong> — Structured score and practical feedback on your content, experience, skills, and ATS-related aspects.</li>
            <li style="margin-bottom:10px;"><strong>AI resume assistant</strong> — Help with wording, bullet points, summaries, and how you present your experience.</li>
          </ul>
          <p style="margin:0 0 20px;font-size:15px;">These tools support your writing; <strong>you stay in control</strong> of what goes on your CV.</p>
          <h2 style="font-size:16px;margin:24px 0 8px;">What you need to do</h2>
          <p style="margin:0;font-size:15px;">Nothing is required. Log in, open your CV in the builder, and use the new options where you see them. If something does not load, try again in a moment or refresh the page.</p>
          <p style="margin:24px 0 0;font-size:15px;">Thank you for using 123Resume.</p>
          <p style="margin:16px 0 0;font-size:15px;">Best regards,<br>The 123Resume team</p>
        </td></tr>
        <tr><td style="padding:16px 40px;background:#f8f9fa;border-top:1px solid #e9ecef;border-radius:0 0 8px 8px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;"><a href="https://123resume.de" style="color:#667eea;">123resume.de</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    from_formatted = (os.getenv("BROADCAST_FROM_EMAIL") or "").strip()
    if not from_formatted:
        from_formatted = "123Resume <contact@123resume.de>"

    return _send_with_mailgun(
        subject=subject,
        plain_message=plain_message,
        html_message=html_message,
        to_email=to_email,
        reply_to="contact@123resume.de",
        from_formatted=from_formatted,
    )


def _send_with_mailgun(
    subject,
    plain_message,
    html_message,
    to_email,
    reply_to=None,
    from_formatted=None,
    extra=None,
):
    """
    Internal helper to send email via Mailgun HTTP API using configuration from settings.

    from_formatted: optional full RFC5322 From, e.g. "123Resume <contact@123resume.de>".
        If omitted, uses noreply@<MAILGUN_DOMAIN> (must be authorized in Mailgun).
    extra: optional extra Mailgun form fields (tags, List-Unsubscribe, tracking).
    """
    api_key = getattr(settings, "MAILGUN_API_KEY", "")
    domain = getattr(settings, "MAILGUN_DOMAIN", "")
    base_url = getattr(settings, "MAILGUN_BASE_URL", "https://api.mailgun.net")

    if not api_key or not domain:
        print("Mailgun not configured: missing MAILGUN_API_KEY or MAILGUN_DOMAIN")
        return False

    url = f"{base_url}/v3/{domain}/messages"

    # From must be authorized in Mailgun for the sending domain.
    if not from_formatted:
        from_address = f"noreply@{domain}"
        from_formatted = f"123Resume <{from_address}>"

    data = {
        "from": from_formatted,
        "to": [to_email],
        "subject": subject,
        "text": plain_message,
    }

    if html_message:
        data["html"] = html_message

    if reply_to:
        data["h:Reply-To"] = reply_to

    if extra:
        data.update(extra)

    try:
        resp = requests.post(url, auth=("api", api_key), data=data, timeout=10)
        resp.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Mailgun send failed: {e}")
        return False


def _job_tools_announcement_plain(greet: str) -> str:
    return f"""Hi {greet},

We've been busy improving 123Resume, and wanted to share what's new for you.

JOB MATCHING & COVER LETTER
• Compare your saved resume against any job description and get a match score
• Generate a tailored cover letter with AI (English or German)
• Choose the cover letter language independently of the site language

TAILOR YOUR RESUME TO A JOB
• Get AI suggestions to align your resume with a specific posting
• Review each change side by side before accepting or declining
• Improve match step by step (~20% per round), then download a tailored PDF

JOB TRACKER
• Track applications in one place: company, contact person, job link, status
• Record which resume version and cover letter you used for each application

SMARTER AI IN THE BUILDER
• Suggest with AI for work experience bullet points
• Improve with AI for role summaries, professional summary, and project descriptions

Log in at https://123resume.de → My Resumes to try the new tabs:
• Job matching & cover letter
• Job tracker

If anything doesn't load, refresh the page or try again in a moment.

Thank you for using 123Resume.

Best regards,
Erfan
123Resume — https://123resume.de

---

Hallo {greet},

wir haben 123Resume weiter verbessert und möchten Ihnen die Neuerungen kurz vorstellen.

STELLENABGLEICH & ANSCHREIBEN
• Gespeicherten Lebenslauf mit einer Stellenbeschreibung vergleichen und einen Übereinstimmungswert erhalten
• Passendes Anschreiben per KI erstellen (Englisch oder Deutsch)
• Sprache des Anschreibens unabhängig von der Oberflächensprache wählen

LEBENSLAUF AN STELLE ANPASSEN
• KI-Vorschläge, um den Lebenslauf gezielt auf eine Stelle auszurichten
• Jede Änderung im Vergleich prüfen und übernehmen oder ablehnen
• Schrittweise verbessern (~20 % pro Runde), dann angepasstes PDF herunterladen

BEWERBUNGSÜBERSICHT
• Bewerbungen an einem Ort verwalten: Unternehmen, Ansprechpartner, Link, Status
• Dokumentieren, welche Lebenslauf-Version und welches Anschreiben Sie verwendet haben

INTELLIGENTERE KI IM EDITOR
• Mit KI vorschlagen für Tätigkeitsbeschreibungen
• Mit KI verbessern für Rollen-Zusammenfassungen, Profil und Projekte

Einloggen unter https://123resume.de → Meine Lebensläufe, neue Registerkarten:
• Stellenabgleich & Anschreiben
• Bewerbungsübersicht

Falls etwas nicht lädt: Seite neu laden oder kurz später erneut versuchen.

Vielen Dank, dass Sie 123Resume nutzen.

Mit freundlichen Grüßen,
Erfan
123Resume — https://123resume.de
"""


def _job_tools_announcement_html(greet: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What's new on 123Resume</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #eff6ff; margin: 0; padding: 0;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#eff6ff;">
    <tr><td style="padding:24px 12px;">
      <table role="presentation" style="width:600px;max-width:100%;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 14px rgba(37,99,235,0.12);">
        <tr>
          <td style="padding:32px 36px 28px;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 50%,#3b82f6 100%);">
            <p style="margin:0 0 8px;font-size:13px;color:#bfdbfe;letter-spacing:0.04em;text-transform:uppercase;">Product update</p>
            <h1 style="margin:0;font-size:24px;color:#ffffff;font-weight:700;line-height:1.3;">What's new on 123Resume</h1>
            <p style="margin:12px 0 0;font-size:15px;color:#dbeafe;">Job matching, cover letters, AI tailoring &amp; more</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 8px;">
            <p style="margin:0 0 16px;font-size:16px;color:#334155;">Hi {greet},</p>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;">We've been busy improving <strong style="color:#1d4ed8;">123Resume</strong>. Here is what you can use today:</p>

            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;">
              <tr><td style="padding:14px 16px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">Job matching &amp; cover letter</p>
                <p style="margin:0;font-size:14px;color:#475569;">Match score for any job · AI cover letters in English or German</p>
              </td></tr>
            </table>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;">
              <tr><td style="padding:14px 16px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">Tailor resume to a job</p>
                <p style="margin:0;font-size:14px;color:#475569;">Review AI suggestions side by side · accept changes · download tailored PDF</p>
              </td></tr>
            </table>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px;">
              <tr><td style="padding:14px 16px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">Job tracker</p>
                <p style="margin:0;font-size:14px;color:#475569;">Track applications, contacts, links, and which resume &amp; letter you used</p>
              </td></tr>
            </table>
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px;">
              <tr><td style="padding:14px 16px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">Smarter AI in the builder</p>
                <p style="margin:0;font-size:14px;color:#475569;">Suggest &amp; improve bullets, summaries, and project descriptions</p>
              </td></tr>
            </table>

            <p style="margin:0 0 20px;font-size:15px;color:#475569;">
              <a href="https://123resume.de/resumes" style="display:inline-block;padding:12px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Open My Resumes</a>
            </p>

            <hr style="border:none;border-top:1px solid #dbeafe;margin:24px 0;">

            <p style="margin:0 0 16px;font-size:16px;color:#334155;">Hallo {greet},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;">Neu bei <strong style="color:#1d4ed8;">123Resume</strong>:</p>
            <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;color:#475569;">
              <li style="margin-bottom:8px;"><strong>Stellenabgleich &amp; Anschreiben</strong> — Übereinstimmungswert und KI-Anschreiben (DE/EN)</li>
              <li style="margin-bottom:8px;"><strong>Lebenslauf anpassen</strong> — KI-Vorschläge prüfen, übernehmen, PDF laden</li>
              <li style="margin-bottom:8px;"><strong>Bewerbungsübersicht</strong> — Bewerbungen und verwendete Unterlagen dokumentieren</li>
              <li style="margin-bottom:8px;"><strong>KI im Editor</strong> — Vorschläge und Verbesserungen für Inhalte</li>
            </ul>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;">
              <a href="https://123resume.de/resumes" style="color:#2563eb;font-weight:600;">123resume.de/resumes</a>
            </p>

            <p style="margin:0;font-size:15px;color:#475569;">Thank you for using 123Resume.</p>
            <p style="margin:16px 0 0;font-size:15px;color:#334155;">Best regards / Mit freundlichen Grüßen,<br><strong>Erfan</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;">
              <a href="https://123resume.de" style="color:#2563eb;text-decoration:none;font-weight:600;">123resume.de</a>
              &nbsp;·&nbsp; contact@123resume.de
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_job_tools_announcement_email(to_email: str, username: str = "") -> bool:
    """Product update: job matching, cover letters, tailoring, job tracker (Mailgun)."""
    greet = (username or "").strip() or "there"
    subject = "What's new on 123Resume — job tools, AI tailoring & cover letters"

    from_formatted = (os.getenv("BROADCAST_FROM_EMAIL") or "").strip()
    if not from_formatted:
        from_formatted = "123Resume <contact@123resume.de>"

    return _send_with_mailgun(
        subject=subject,
        plain_message=_job_tools_announcement_plain(greet),
        html_message=_job_tools_announcement_html(greet),
        to_email=to_email,
        reply_to="contact@123resume.de",
        from_formatted=from_formatted,
    )



# --- Claude AI announcement --------------------------------------------------
#
# Real improve-output examples kept because they show stronger wording without
# inventing claims the candidate never made.
AI_MODEL_EXAMPLES_EN = [
    ("made reports about how the posts did",
     "Analyzed social media performance and compiled reports to inform marketing strategies."),
    ("did training for new people",
     "Conducted training sessions for new team members."),
    ("helped set up the new store displays",
     "Assisted in setting up new store displays to enhance visual merchandising."),
]
AI_MODEL_EXAMPLES_DE = [
    ("habe neue Kollegen eingearbeitet",
     "Arbeitete neue Kollegen ein und unterstützte deren Integration ins Team."),
    ("war zuständig für die Kundenbetreuung am Telefon",
     "Betreute Kunden telefonisch und gewährleistete eine professionelle Beratung."),
]

_ROSE = "#e11d63"
_VIOLET = "#7c3aed"


def _ai_model_example_html(before: str, after: str, before_label: str, after_label: str) -> str:
    from html import escape
    return f"""
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px;">
              <tr><td style="padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-bottom:none;border-radius:10px 10px 0 0;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:#94a3b8;">{before_label}</p>
                <p style="margin:0;font-size:14px;color:#64748b;">{escape(before)}</p>
              </td></tr>
              <tr><td style="padding:12px 16px;background:#fdf2f8;border:1px solid #fbcfe8;border-left:4px solid {_ROSE};border-radius:0 0 10px 10px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.08em;color:{_ROSE};">{after_label}</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#1e293b;">{escape(after)}</p>
              </td></tr>
            </table>"""


def _ai_model_announcement_plain(greet: str) -> str:
    en = "\n".join(f"  Before: {b}\n  After:  {a}\n" for b, a in AI_MODEL_EXAMPLES_EN)
    de = "\n".join(f"  Vorher:  {b}\n  Nachher: {a}\n" for b, a in AI_MODEL_EXAMPLES_DE)
    return f"""Hi {greet},

Big news: 123Resume now runs on Claude — one of the world's most advanced AI models.

That means sharper solutions for your resume, fresher career-ready tips, and suggestions that help you stand out ahead of your competition. Think clearer wording, stronger impact, and guidance that feels current — not generic.

What you get with Claude on 123Resume:
• Smarter resume scores and actionable feedback
• Stronger bullet points, summaries, and improvements you can accept or reject
• Up-to-date tips that help your application feel polished and competitive

See the difference on real resume lines:

{en}
Your edge in the job market starts with a resume that sounds like you at your best.

Open any resume and try Improve my resume, AI score, or job matching — you stay in control of every change.
https://123resume.de/resumes

---

Hallo {greet},

gute Nachrichten: 123Resume läuft jetzt mit Claude — einem der fortschrittlichsten KI-Modelle der Welt.

Sie erhalten präzisere Lösungen für Ihren Lebenslauf, aktuellere Tipps und Vorschläge, die Ihnen helfen, sich von der Konkurrenz abzuheben: klarere Formulierungen, mehr Wirkung und Feedback, das wirklich weiterhilft.

Was Claude für Sie tut:
• Intelligentere Lebenslauf-Bewertung mit konkreten Hinweisen
• Stärkere Bullet Points und Zusammenfassungen — Sie entscheiden, was übernommen wird
• Aktuelle Tipps, damit Ihre Bewerbung professionell und wettbewerbsfähig wirkt

{de}
Öffnen Sie einen Lebenslauf und testen Sie „Lebenslauf verbessern“, die KI-Bewertung oder den Stellenabgleich.
https://123resume.de/resumes

Best regards / Mit freundlichen Grüßen,
Erfan
123Resume
https://123resume.de

Unsubscribe: %tag_unsubscribe_url%
"""


def _ai_model_announcement_html(greet: str) -> str:
    from html import escape
    g = escape(greet)
    en_examples = "".join(_ai_model_example_html(b, a, "BEFORE", "AFTER") for b, a in AI_MODEL_EXAMPLES_EN)
    de_examples = "".join(_ai_model_example_html(b, a, "VORHER", "NACHHER") for b, a in AI_MODEL_EXAMPLES_DE)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>123Resume now runs on Claude</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:#1e293b;background:#fdf2f8;margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">123Resume now uses Claude AI — sharper resume tips, stronger wording, and a real edge over the competition.</div>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#fdf2f8;">
    <tr><td style="padding:24px 12px;">
      <table role="presentation" style="width:600px;max-width:100%;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 20px rgba(225,29,99,0.12);">
        <tr>
          <td bgcolor="{_ROSE}" style="padding:36px 36px 32px;background-color:{_ROSE};background-image:linear-gradient(135deg,{_ROSE} 0%,#c026d3 55%,{_VIOLET} 100%);">
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#fce7f3;letter-spacing:0.12em;text-transform:uppercase;">Powered by Claude</p>
            <h1 style="margin:0;font-size:28px;color:#ffffff;font-weight:800;line-height:1.2;">Your career toolkit<br>just leveled up</h1>
            <p style="margin:12px 0 0;font-size:15px;color:#fce7f3;">Sharper tips. Stronger wording. A real edge.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 36px 6px;">
            <p style="margin:0 0 14px;font-size:16px;color:#334155;">Hi {g},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;">Big news: <strong style="color:{_ROSE};">123Resume</strong> now runs on <strong>Claude</strong> — one of the world's most advanced AI models.</p>
            <p style="margin:0 0 20px;font-size:15px;color:#475569;">That means smarter solutions for your resume, fresher career-ready guidance, and suggestions that help you <strong>stand out ahead of your competition</strong> with wording that feels current, confident, and recruiter-ready.</p>

            <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;">
              <tr><td style="padding:14px 16px;background:#fdf2f8;border-left:4px solid {_ROSE};border-radius:0 8px 8px 0;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:{_ROSE};">What Claude unlocks for you</p>
                <p style="margin:0;font-size:14px;color:#475569;">Smarter scores · stronger bullets &amp; summaries · up-to-date tips you can accept or reject</p>
              </td></tr>
            </table>

            <p style="margin:0 0 14px;font-size:15px;color:#475569;">See the difference on real resume lines:</p>
{en_examples}
            <table role="presentation" style="width:100%;border-collapse:collapse;margin:22px 0 22px;">
              <tr><td bgcolor="#fdf4ff" style="padding:20px 22px;background:#fdf4ff;border-radius:12px;border:1px solid #f5d0fe;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:{_VIOLET};letter-spacing:0.1em;text-transform:uppercase;">Your competitive edge</p>
                <p style="margin:0;font-size:16px;color:#1e293b;">A polished, professional resume is still the first filter. Claude helps you sound like <strong>you at your best</strong> — so you go into applications with an unfair advantage.</p>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:15px;color:#475569;">Open a resume and try <strong>Improve my resume</strong>, AI score, or job matching. You stay in control of every change.</p>
            <p style="margin:18px 0 26px;">
              <a href="https://123resume.de/resumes" style="display:inline-block;padding:14px 28px;background:{_ROSE};color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;">Try Claude on my resume →</a>
            </p>

            <hr style="border:none;border-top:1px solid #fbcfe8;margin:8px 0 26px;">

            <p style="margin:0 0 14px;font-size:16px;color:#334155;">Hallo {g},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;">gute Nachrichten: <strong style="color:{_ROSE};">123Resume</strong> läuft jetzt mit <strong>Claude</strong> — einem der fortschrittlichsten KI-Modelle der Welt.</p>
            <p style="margin:0 0 18px;font-size:15px;color:#475569;">Sie erhalten präzisere Lösungen, aktuellere Tipps und Vorschläge, die Ihnen helfen, sich <strong>von der Konkurrenz abzuheben</strong>.</p>
{de_examples}
            <p style="margin:18px 0 8px;font-size:15px;color:#475569;">Öffnen Sie einen Lebenslauf und testen Sie <strong>„Lebenslauf verbessern“</strong>, die KI-Bewertung oder den Stellenabgleich. Sie behalten die volle Kontrolle.</p>
            <p style="margin:18px 0 26px;">
              <a href="https://123resume.de/resumes" style="display:inline-block;padding:12px 24px;background:#ffffff;color:{_ROSE};text-decoration:none;border-radius:999px;font-weight:700;font-size:15px;border:2px solid {_ROSE};">Claude ausprobieren →</a>
            </p>

            <p style="margin:0 0 26px;font-size:15px;color:#334155;">Best regards / Mit freundlichen Grüßen,<br><strong>Erfan</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#64748b;">
              <a href="https://123resume.de" style="color:{_ROSE};text-decoration:none;font-weight:600;">123resume.de</a>
              &nbsp;·&nbsp; contact@123resume.de
              &nbsp;·&nbsp; <a href="%tag_unsubscribe_url%" style="color:#64748b;">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_ai_model_announcement_email(to_email: str, name: str = "") -> bool:
    """Product update: Claude-powered AI on 123Resume (Mailgun)."""
    greet = (name or "").strip() or "there"
    from_formatted = (os.getenv("BROADCAST_FROM_EMAIL") or "").strip() or "123Resume <contact@123resume.de>"
    return _send_with_mailgun(
        subject="123Resume now runs on Claude — get ahead of the competition",
        plain_message=_ai_model_announcement_plain(greet),
        html_message=_ai_model_announcement_html(greet),
        to_email=to_email,
        reply_to="contact@123resume.de",
        from_formatted=from_formatted,
        extra={
            # Tag-based unsubscribe: opting out of product updates must not
            # suppress password-reset / verification mail from this domain.
            "o:tag": "product-update",
            "o:tracking": "yes",
            "h:List-Unsubscribe": "<%tag_unsubscribe_url%>",
            "h:List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )
