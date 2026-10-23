"""Unit tests for connector OAuth store, social redirect allowlist, and JWT helper."""
from datetime import datetime
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from connector import oauth_store as ost
from connector.login_pages import user_id_from_jwt
from api.social_views import _allowed_social_redirect_uri


class OAuthStoreTests(SimpleTestCase):
    databases = []

    @patch("connector.oauth_store._db")
    def test_issue_and_load_access_token(self, mock_db):
        db = MagicMock()
        mock_db.return_value = db
        stored = {}

        def insert_one(doc):
            stored[doc["token_sha256"]] = doc

        def find_one(query, projection=None):
            return stored.get(query.get("token_sha256"))

        db.connector_oauth_tokens.insert_one.side_effect = insert_one
        db.connector_oauth_tokens.find_one.side_effect = find_one

        access, refresh, expires_in = ost.issue_tokens(
            client_id="client-1",
            scopes=["resumes"],
            subject="42",
            resource="https://123resume.de/mcp",
        )
        self.assertTrue(access.startswith(ost.ACCESS_PREFIX))
        self.assertTrue(refresh.startswith(ost.REFRESH_PREFIX))
        self.assertEqual(expires_in, ost.ACCESS_TTL_SEC)

        loaded = ost.load_access_token(access)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["subject"], "42")
        self.assertEqual(loaded["client_id"], "client-1")
        self.assertIsNone(ost.load_access_token("mcp_at_notreal"))
        self.assertIsNone(ost.load_access_token("123r_pat_style"))

    @patch("connector.oauth_store._db")
    def test_authorization_code_roundtrip(self, mock_db):
        db = MagicMock()
        mock_db.return_value = db
        codes = {}

        def insert_one(doc):
            codes[doc["code_sha256"]] = doc

        def find_one(query):
            return codes.get(query.get("code_sha256"))

        def delete_one(query):
            codes.pop(query.get("code_sha256"), None)

        db.connector_oauth_codes.insert_one.side_effect = insert_one
        db.connector_oauth_codes.find_one.side_effect = find_one
        db.connector_oauth_codes.delete_one.side_effect = delete_one

        code = ost.save_authorization_code(
            {
                "client_id": "c1",
                "redirect_uri": "https://claude.ai/callback",
                "redirect_uri_provided_explicitly": True,
                "expires_at": datetime.utcnow().timestamp() + 300,
                "scopes": ["resumes"],
                "code_challenge": "challenge",
                "resource": "https://123resume.de/mcp",
                "subject": "7",
            }
        )
        doc = ost.get_authorization_code(code)
        self.assertEqual(doc["subject"], "7")
        ost.delete_authorization_code(code)
        self.assertIsNone(ost.get_authorization_code(code))


class SocialRedirectAllowlistTests(SimpleTestCase):
    databases = []

    @override_settings(DOMAIN="123resume.de")
    @patch.dict("os.environ", {"CONNECTOR_PUBLIC_URL": "https://123resume.de"}, clear=False)
    def test_allows_website_and_connector_paths(self):
        base = "https://123resume.de"
        self.assertEqual(
            _allowed_social_redirect_uri("https://123resume.de/oauth/callback", base),
            "https://123resume.de/oauth/callback",
        )
        self.assertEqual(
            _allowed_social_redirect_uri("https://123resume.de/connector/oauth/done", base),
            "https://123resume.de/connector/oauth/done",
        )
        self.assertIsNone(
            _allowed_social_redirect_uri("https://evil.example/oauth/callback", base)
        )
        self.assertIsNone(
            _allowed_social_redirect_uri("https://123resume.de/somewhere/else", base)
        )
        self.assertEqual(
            _allowed_social_redirect_uri("", base),
            "https://123resume.de/oauth/callback",
        )


class JwtHelperTests(SimpleTestCase):
    databases = []

    def test_invalid_jwt_returns_none(self):
        self.assertIsNone(user_id_from_jwt(""))
        self.assertIsNone(user_id_from_jwt("not-a-jwt"))
