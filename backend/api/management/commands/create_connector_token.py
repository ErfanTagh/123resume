"""
Mint a personal access token for the Claude connector (connector/server.py).

    python manage.py create_connector_token <username-or-email> [--label "Claude Code"]

The token is printed once; only its hash is stored.
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from connector import store


class Command(BaseCommand):
    help = "Create a personal access token for the 123Resume Claude connector."

    def add_arguments(self, parser):
        parser.add_argument("user", help="Username or email")
        parser.add_argument("--label", default="Claude", help="Shown to the user later (e.g. 'Claude Code')")

    def handle(self, *args, **opts):
        who = opts["user"]
        user = User.objects.filter(username=who).first() or User.objects.filter(email=who).first()
        if not user:
            raise CommandError(f"No user '{who}'.")
        token = store.create_token(user.id, opts["label"])
        self.stdout.write(f"Token for {user.username} (id {user.id}), shown only once:\n{token}")
