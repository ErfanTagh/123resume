"""
Tests for job suggestions without MongoDB or SearchApi: a small in-memory
stand-in for the two collections, and the HTTP call patched out.

    python manage.py test api.test_job_suggestions
"""
from datetime import datetime, timedelta
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from api import job_suggestions as js


class _Collection:
    def __init__(self):
        self.docs = {}

    def find_one(self, query):
        return self.docs.get(query["_id"])

    def update_one(self, query, update, upsert=False):
        doc = self.docs.setdefault(query["_id"], {"_id": query["_id"]})
        for key, amount in update.get("$inc", {}).items():
            doc[key] = doc.get(key, 0) + amount
        doc.update(update.get("$set", {}))

    def replace_one(self, query, doc, upsert=False):
        self.docs[query["_id"]] = doc


class _Db(dict):
    def __missing__(self, name):
        self[name] = _Collection()
        return self[name]


_JOB = {"job_id": "1", "title": "React Developer", "company_name": "Acme", "link": "https://x/1"}


@override_settings(
    SEARCHAPI_API_KEY="test",
    JOB_SUGGESTIONS_CACHE_HOURS=24,
    JOB_SUGGESTIONS_USER_DAILY_LIMIT=2,
    JOB_SUGGESTIONS_TOTAL_DAILY_LIMIT=3,
)
class FindJobsTests(SimpleTestCase):
    def setUp(self):
        self.db = _Db()
        patcher = patch.object(js, "_fetch_from_searchapi", side_effect=lambda q, loc: [js._slim_job(_JOB)])
        self.fetch = patcher.start()
        self.addCleanup(patcher.stop)

    def test_second_search_comes_from_cache_and_costs_nothing(self):
        jobs, _, cached = js.find_jobs(self.db, 1, "React Developer", "Berlin")
        self.assertFalse(cached)
        self.assertEqual(jobs[0]["company"], "Acme")
        # Same search by another user, different casing: shared cache
        _, _, cached = js.find_jobs(self.db, 2, "react developer", "berlin")
        self.assertTrue(cached)
        self.assertEqual(self.fetch.call_count, 1)
        self.assertEqual(js.searches_left_today(self.db, 2), 2)

    def test_stale_cache_searches_again(self):
        js.find_jobs(self.db, 1, "React Developer", "Berlin")
        entry = next(iter(self.db[js.CACHE_COLLECTION].docs.values()))
        entry["fetched_at"] = datetime.utcnow() - timedelta(hours=25)
        _, _, cached = js.find_jobs(self.db, 1, "React Developer", "Berlin")
        self.assertFalse(cached)
        self.assertEqual(self.fetch.call_count, 2)

    def test_user_limit(self):
        js.find_jobs(self.db, 1, "A", "")
        js.find_jobs(self.db, 1, "B", "")
        with self.assertRaises(js.JobSearchError) as ctx:
            js.find_jobs(self.db, 1, "C", "")
        self.assertEqual(ctx.exception.code, "limit_user")
        # Cached searches still work after the limit
        _, _, cached = js.find_jobs(self.db, 1, "A", "")
        self.assertTrue(cached)

    def test_total_limit(self):
        js.find_jobs(self.db, 1, "A", "")
        js.find_jobs(self.db, 2, "B", "")
        js.find_jobs(self.db, 3, "C", "")
        with self.assertRaises(js.JobSearchError) as ctx:
            js.find_jobs(self.db, 4, "D", "")
        self.assertEqual(ctx.exception.code, "limit_total")
        self.assertEqual(js.searches_left_today(self.db, 4), 0)

    @override_settings(SEARCHAPI_API_KEY="")
    def test_not_configured(self):
        with self.assertRaises(js.JobSearchError) as ctx:
            js.find_jobs(self.db, 1, "A", "")
        self.assertEqual(ctx.exception.code, "not_configured")


class HelperTests(SimpleTestCase):
    def test_normalize_location(self):
        self.assertEqual(js.normalize_location("Kaiserslautern, DE"), "Kaiserslautern, Germany")
        self.assertEqual(js.normalize_location(" Wien ,  at "), "Wien, Austria")
        self.assertEqual(js.normalize_location("Berlin"), "Berlin")
        self.assertEqual(js.normalize_location(""), "")

    def test_defaults_fall_back_to_latest_position(self):
        resume = {"personal_info": {"location": "Köln, DE"}, "work_experience": [{"position": "Data Analyst"}]}
        self.assertEqual(js.resume_search_defaults(resume), ("Data Analyst", "Köln, Germany"))

    def test_resume_skills_merges_list_and_groups(self):
        resume = {
            "skills": [{"skill": "React"}, {"skill": ""}],
            "skill_groups": [{"name": "Backend", "skills": [{"skill": "react"}, {"skill": "Django"}]}],
        }
        self.assertEqual(js.resume_skills(resume), ["React", "Django"])

    def test_annotate_jobs_whole_words_only_and_keeps_order(self):
        jobs = [{"title": "Google Ads Manager"}, {"title": "Senior React & Go Developer"}, {"title": "C++ Werkstudent"}]
        annotated = js.annotate_jobs(jobs, ["Go", "React", "C++", "C"])
        self.assertEqual(
            [(j["title"], j["matched_skills"], j["level"]) for j in annotated],
            [
                ("Google Ads Manager", [], "mid"),
                ("Senior React & Go Developer", ["Go", "React"], "senior"),
                ("C++ Werkstudent", ["C++"], "entry"),
            ],
        )

    def test_job_level(self):
        cases = {
            "Werkstudent:in Softwareentwicklung (m/w/d)": "entry",
            "(Junior) Software Consultant": "entry",
            "Duales Studium - Bachelor of Science - Informatik": "entry",
            "Praktikant (m/w/d) Data Science": "entry",
            "Sr. Backend Engineer": "senior",
            "Tech Lead Platform": "senior",
            "Teamleiter IT": "senior",
            "Backend Entwickler (gn)": "mid",
            "Leadership Coach": "mid",  # "lead" inside another word doesn't count
            "Junior to Senior Developer": "mid",
            "Internal Tools Engineer": "mid",  # not "intern"
        }
        for title, level in cases.items():
            self.assertEqual(js.job_level(title), level, title)

    def test_experience_years_merges_overlaps_and_caps_future_ends(self):
        today = datetime(2026, 11, 7)
        resume = {"work_experience": [
            {"start_date": "2020-08", "end_date": "2022-08"},   # 25 months
            {"start_date": "2022-01", "end_date": "2022-12"},   # overlaps: adds Sep-Dec 2022
            {"start_date": "2026-07", "end_date": "2027-01"},   # ends in the future: up to Nov 2026
            {"start_date": "", "end_date": "2020-01"},          # no start: ignored
            {"start_date": "2027-02", "end_date": ""},           # starts in the future: ignored
        ]}
        self.assertEqual(js.experience_years(resume, today), round((29 + 5) / 12, 1))
        self.assertEqual(js.experience_years({"work_experience": [{"start_date": "2025-11"}]}, today), 1.1)

    def test_user_level(self):
        self.assertIsNone(js.user_level(0))
        self.assertEqual(js.user_level(1.5), "entry")
        self.assertEqual(js.user_level(4.9), "mid")
        self.assertEqual(js.user_level(6), "senior")
