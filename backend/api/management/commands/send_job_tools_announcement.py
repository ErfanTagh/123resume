"""
Send the job-tools product update email to all active users (Mailgun).
"""
import os
import time

from django.core.management.base import BaseCommand
from pymongo import MongoClient

from api.email_verification import send_job_tools_announcement_email


def _mongo_db():
    connection_string = os.getenv("MONGODB_CONNECTION_STRING")
    if connection_string:
        try:
            client = MongoClient(connection_string)
            client.admin.command("ping")
        except Exception:
            connection_string = None

    if not connection_string:
        mongo_host = os.getenv("MONGODB_HOST", "mongodb")
        mongo_port = int(os.getenv("MONGODB_PORT", 27017))
        mongo_username = os.getenv("MONGODB_USERNAME", "")
        mongo_password = os.getenv("MONGODB_PASSWORD", "")

        if mongo_username and mongo_password:
            client = MongoClient(
                mongo_host,
                mongo_port,
                username=mongo_username,
                password=mongo_password,
                authSource="admin",
                authMechanism="SCRAM-SHA-1",
            )
        else:
            client = MongoClient(mongo_host, mongo_port)

    mongo_db_name = os.getenv("MONGODB_NAME", "resume_db")
    return client[mongo_db_name]


def _active_user_emails():
    db = _mongo_db()
    users = list(
        db.auth_user.find({"is_active": True}, {"email": 1, "username": 1, "first_name": 1})
    )
    seen = set()
    out = []
    for user in users:
        email = (user.get("email") or "").strip()
        if not email or "@" not in email:
            continue
        key = email.lower()
        if key in seen:
            continue
        seen.add(key)
        name = (user.get("first_name") or user.get("username") or "").strip()
        out.append((email, name))
    return sorted(out, key=lambda x: x[0].lower())


class Command(BaseCommand):
    help = "Send job-tools product update email to all active users."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List recipients only; do not send.",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.6,
            help="Seconds between sends (default 0.6).",
        )

    def handle(self, *args, **options):
        recipients = _active_user_emails()
        self.stdout.write(f"Found {len(recipients)} active user(s) with email.")

        if options["dry_run"]:
            for email, name in recipients:
                self.stdout.write(f"  {email} ({name or 'no name'})")
            return

        ok = 0
        fail = 0
        for email, name in recipients:
            if send_job_tools_announcement_email(email, name):
                ok += 1
                self.stdout.write(self.style.SUCCESS(f"Sent: {email}"))
            else:
                fail += 1
                self.stdout.write(self.style.ERROR(f"Failed: {email}"))
            if options["delay"] > 0:
                time.sleep(options["delay"])

        self.stdout.write(self.style.SUCCESS(f"Done. sent={ok} failed={fail}"))
