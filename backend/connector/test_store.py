"""Unit tests for connector store display-name fallback (no live MongoDB)."""
from datetime import datetime
from unittest.mock import MagicMock, patch

from bson import ObjectId
from django.test import SimpleTestCase, override_settings

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


class _FakeCollection:
    def __init__(self, docs=None):
        self.docs = {d["_id"]: d for d in (docs or [])}

    def _match(self, doc, query):
        for key, want in query.items():
            if isinstance(want, dict) and "$nin" in want:
                if doc.get(key) in want["$nin"]:
                    return False
            elif doc.get(key) != want:
                return False
        return True

    def find_one(self, query, projection=None):
        return next((d for d in self.docs.values() if self._match(d, query)), None)

    def find(self, query, projection=None):
        return [d for d in self.docs.values() if self._match(d, query)]

    def update_one(self, query, update, upsert=False):
        doc = self.docs.setdefault(query["_id"], {"_id": query["_id"]})
        for key, amount in update.get("$inc", {}).items():
            doc[key] = doc.get(key, 0) + amount
        doc.update(update.get("$set", {}))

    def replace_one(self, query, doc, upsert=False):
        self.docs[query["_id"]] = doc


class _FakeDb(dict):
    def __missing__(self, name):
        self[name] = _FakeCollection()
        return self[name]

    @property
    def resumes(self):
        return self["resumes"]


@override_settings(SEARCHAPI_API_KEY="test", JOB_SUGGESTIONS_USER_DAILY_LIMIT=1, JOB_SUGGESTIONS_TOTAL_DAILY_LIMIT=10)
class SuggestJobsTests(SimpleTestCase):
    databases = []

    def setUp(self):
        self.rid = ObjectId()
        resume = {
            "_id": self.rid,
            "user_id": 1,
            "personal_info": {"professional_title": "Software Engineer", "location": "Berlin, DE"},
            "work_experience": [{"position": "Developer", "start_date": "2022-01", "end_date": ""}],
            "skills": [{"skill": "React"}, {"skill": "Python"}],
        }
        self.db = _FakeDb()
        self.db["resumes"] = _FakeCollection([resume])
        self.db["job_applications"] = _FakeCollection([
            {"_id": ObjectId(), "user_id": 1, "job_link": "https://www.linkedin.com/jobs/view/react-dev-4400000002", "status": "saved"},
            {"_id": ObjectId(), "user_id": 2, "job_link": "https://www.linkedin.com/jobs/view/senior-4400000001", "status": "applied"},
        ])
        patcher = patch("connector.store._db", return_value=self.db)
        patcher.start()
        self.addCleanup(patcher.stop)
        jobs = [
            {"job_id": "4400000001", "title": "Senior Python Engineer", "company": "A", "location": "Berlin",
             "posted_at": "1 day ago", "date": "2026-11-06", "link": "https://www.linkedin.com/jobs/view/senior-4400000001",
             "company_logo": "", "note": ""},
            {"job_id": "4400000002", "title": "React Developer", "company": "B", "location": "Berlin",
             "posted_at": "2 hours ago", "date": "2026-11-07", "link": "https://www.linkedin.com/jobs/view/react-dev-4400000002",
             "company_logo": "", "note": ""},
        ]
        fetch = patch("api.job_suggestions._fetch_from_searchapi", return_value=jobs)
        self.fetch = fetch.start()
        self.addCleanup(fetch.stop)

    def test_searches_with_the_resumes_title_and_city(self):
        out = store.suggest_jobs(1, str(self.rid), "", "")
        self.fetch.assert_called_once_with("Software Engineer", "Berlin, Germany")
        self.assertEqual(out["query"]["keywords"], "Software Engineer")
        self.assertEqual(out["user_level"], "mid")
        senior, react = out["jobs"]
        self.assertEqual((senior["matched_skills"], senior["level_fit"]), (["Python"], "neutral"))
        self.assertEqual((react["matched_skills"], react["level_fit"]), (["React"], "fit"))
        # Only this user's tracker counts
        self.assertNotIn("in_tracker", senior)
        self.assertEqual(react["in_tracker"], "saved")
        self.assertIn(f"resume={self.rid}", out["suggestions_url"])
        self.assertNotIn("company_logo", react)

    def test_the_daily_limit_is_explained_and_cached_searches_still_work(self):
        store.suggest_jobs(1, str(self.rid), "", "")
        with self.assertRaises(store.ConnectorError) as ctx:
            store.suggest_jobs(1, str(self.rid), "Data Engineer", "")
        self.assertIn("1 new search per day", str(ctx.exception))
        again = store.suggest_jobs(1, str(self.rid), "", "")
        self.assertTrue(again["from_cache"])
        self.assertEqual(self.fetch.call_count, 1)

    def test_a_resume_without_a_title_asks_for_keywords(self):
        self.db["resumes"].docs[self.rid]["personal_info"]["professional_title"] = ""
        self.db["resumes"].docs[self.rid]["work_experience"] = []
        with self.assertRaises(store.ConnectorError) as ctx:
            store.suggest_jobs(1, str(self.rid), "", "")
        self.assertIn("keywords", str(ctx.exception))
        self.fetch.assert_not_called()

    def test_someone_elses_resume_is_refused(self):
        with self.assertRaises(store.ConnectorError):
            store.suggest_jobs(2, str(self.rid), "", "")
        self.fetch.assert_not_called()
