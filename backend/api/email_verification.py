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
):
    """
    Internal helper to send email via Mailgun HTTP API using configuration from settings.

    from_formatted: optional full RFC5322 From, e.g. "123Resume <contact@123resume.de>".
        If omitted, uses noreply@<MAILGUN_DOMAIN> (must be authorized in Mailgun).
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

    try:
        resp = requests.post(url, auth=("api", api_key), data=data, timeout=10)
        resp.raise_for_status()
        return True
    except requests.RequestException as e:
        print(f"Mailgun send failed: {e}")
        return False

