"""Unit tests for connector store display-name fallback (no live MongoDB)."""
from datetime import datetime
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase

from connector import store


class DisplayNameTests(SimpleTestCase):
    databases = []

    def test_display_name_joins_personal_info(self):
        doc = {
            "name": "",
            "personal_info": {
                "first_name": "Erfan",
                "last_name": "Taghvaei",
                "professional_title": "Software-Ingenieur",
            },
        }
        self.assertEqual(store._display_name(doc), "Erfan-Taghvaei-Software-Ingenieur")

    def test_display_name_untitled_when_empty(self):
        self.assertEqual(store._display_name({"personal_info": {}}), "Untitled Resume")
        self.assertEqual(store._display_name({}), "Untitled Resume")

    @patch("connector.store._db")
    def test_list_and_get_use_generated_name_when_name_empty(self, mock_db):
        rid = ObjectId()
        doc = {
            "_id": rid,
            "user_id": 1,
            "name": "",
            "template": "modern",
            "updated_at": datetime(2026, 1, 15, 12, 0, 0),
            "overall_score": None,
            "personal_info": {
                "first_name": "Erfan",
                "last_name": "Taghvaei",
                "professional_title": "Software-Ingenieur",
            },
        }
        expected = "Erfan-Taghvaei-Software-Ingenieur"

        find_cursor = MagicMock()
        find_cursor.sort.return_value = [doc]
        mock_db.return_value.resumes.find.return_value = find_cursor
        mock_db.return_value.resumes.find_one.return_value = doc

        listed = store.list_resumes(1)
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["name"], expected)

        got = store.get_resume(1, str(rid))
        self.assertEqual(got["name"], expected)
        # Display-only: store must not write the generated name back.
        mock_db.return_value.resumes.update_one.assert_not_called()
