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


class PhotoTests(SimpleTestCase):
    databases = []

    def test_photo_edits_are_refused_with_a_way_forward(self):
        doc = {"personal_info": {"first_name": "A", "profile_image": "data:image/jpeg;base64,xyz"}}
        for path in ("personal_info.profile_image", "personal_info.profile_image.0"):
            with self.assertRaises(store.ConnectorError) as ctx:
                store._apply(doc, {"op": "set", "path": path, "value": "x"})
            self.assertIn("edit_url", str(ctx.exception))
        self.assertEqual(doc["personal_info"]["profile_image"], "data:image/jpeg;base64,xyz")

    @patch("connector.store._db")
    def test_get_resume_says_whether_there_is_a_photo(self, mock_db):
        rid = ObjectId()
        mock_db.return_value.resumes.find_one.return_value = {
            "_id": rid, "user_id": 1, "personal_info": {"first_name": "A", "profile_image": "data:..."},
        }
        got = store.get_resume(1, str(rid))
        self.assertTrue(got["has_photo"])
        self.assertNotIn("profile_image", got["personal_info"])


class ApplicationTests(SimpleTestCase):
    databases = []

    def _col(self, mock_db):
        col = MagicMock()
        mock_db.return_value.__getitem__.return_value = col
        return col

    @patch("connector.store._db")
    def test_add_sets_today_and_warns_about_a_duplicate(self, mock_db):
        col = self._col(mock_db)
        existing = ObjectId()
        col.find_one.side_effect = lambda q, *a: {"_id": existing} if "company" in q else {"_id": q["_id"], **saved}
        saved = {}

        def insert_one(doc):
            saved.update(doc)
            return MagicMock(inserted_id=ObjectId())

        col.insert_one.side_effect = insert_one
        out = store.add_application(1, {"job_title": "Analyst", "company": "Bosch", "status": "applied"})
        self.assertIsInstance(saved["applied_at"], datetime)
        self.assertEqual(saved["user_id"], 1)
        self.assertIn(str(existing), out["note"])
        self.assertNotIn("user_id", out)

    @patch("connector.store._db")
    def test_add_refuses_someone_elses_resume(self, mock_db):
        self._col(mock_db)
        mock_db.return_value.resumes.find_one.return_value = None
        with self.assertRaises(store.ConnectorError):
            store.add_application(1, {"job_title": "A", "company": "B", "resume_id": str(ObjectId())})

    @patch("connector.store._db")
    def test_update_keeps_fields_not_given_and_takes_plain_dates(self, mock_db):
        col = self._col(mock_db)
        oid = ObjectId()
        col.find_one.return_value = {"_id": oid, "user_id": 1, "status": "applied", "job_title": "A", "company": "B"}
        store.update_application(1, str(oid), {"notes": "Interview on Monday", "applied_at": "2026-10-20"})
        changes = col.update_one.call_args[0][1]["$set"]
        self.assertNotIn("status", changes)  # the serializer default must not reset it
        self.assertEqual(changes["notes"], "Interview on Monday")
        self.assertEqual(changes["applied_at"].date().isoformat(), "2026-10-20")
        self.assertEqual(col.update_one.call_args[0][0], {"_id": oid, "user_id": 1})

    @patch("connector.store._db")
    def test_update_of_another_users_application_fails(self, mock_db):
        col = self._col(mock_db)
        col.find_one.return_value = None
        with self.assertRaises(store.ConnectorError):
            store.update_application(1, str(ObjectId()), {"status": "offer"})
        col.update_one.assert_not_called()

    def test_bad_status_is_explained(self):
        with self.assertRaises(store.ConnectorError):
            store._validated_application({"job_title": "A", "company": "B", "status": "ghosted"}, partial=False)
