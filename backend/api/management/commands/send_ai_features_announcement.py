"""
Send the AI features product announcement to all active users (one email per address).

Usage (from backend/ with Django settings loaded, or via docker exec):

  # Preview recipients only
  python manage.py send_ai_features_announcement --dry-run

  # Send to first 3 users (smoke test)
  python manage.py send_ai_features_announcement --limit 3

  # Send to everyone (active accounts, non-empty email, deduped by email)
  python manage.py send_ai_features_announcement

Requires Mailgun: MAILGUN_API_KEY, MAILGUN_DOMAIN.
Optional: BROADCAST_FROM_EMAIL="123Resume <contact@123resume.de>" if Mailgun rejects the default From.
"""
import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from api.email_verification import send_ai_features_announcement_email

User = get_user_model()


class Command(BaseCommand):
    help = "Email active users about new AI resume features (Mailgun)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List recipient count and sample emails; do not send.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Send to at most N users (after dedupe). 0 = no limit.",
        )
        parser.add_argument(
            "--sleep",
            type=float,
            default=0.25,
            help="Seconds to wait between Mailgun requests (rate limiting).",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        limit: int = options["limit"]
        sleep_s: float = options["sleep"]

        # Djongo mis-translates boolean WHERE on auth_user; load rows and filter in Python.
        rows = User.objects.all().values_list("email", "username", "is_active", "id")

        # Stable order by id, dedupe by lowercased email, only active accounts
        by_email: dict[str, tuple[str, str]] = {}
        for email, username, is_active, _pk in sorted(rows, key=lambda r: r[3]):
            if not is_active:
                continue
            key = (email or "").strip().lower()
            if not key:
                continue
            if key not in by_email:
                by_email[key] = ((email or "").strip(), (username or "").strip())

        recipients = list(by_email.values())
        total_unique = len(recipients)
        if limit > 0:
            recipients = recipients[:limit]

        self.stdout.write(
            f"Active users with unique email: {total_unique} (sending to {len(recipients)})"
        )
        if dry_run:
            for email, un in recipients[:15]:
                self.stdout.write(f"  would send: {email} ({un or 'no username'})")
            if len(recipients) > 15:
                self.stdout.write(f"  ... and {len(recipients) - 15} more")
            self.stdout.write(self.style.WARNING("Dry run — no messages sent."))
            return

        ok = 0
        failed = 0
        for i, (email, username) in enumerate(recipients):
            if send_ai_features_announcement_email(email, username):
                ok += 1
            else:
                failed += 1
                self.stderr.write(self.style.ERROR(f"Failed: {email}"))
            if sleep_s > 0 and i + 1 < len(recipients):
                time.sleep(sleep_s)

        self.stdout.write(self.style.SUCCESS(f"Done. Sent: {ok}, failed: {failed}"))
