"""
Unit-style tests for POST /api/ai/resume-score/ without a live MongoDB.

Uses APIRequestFactory + force_authenticate so `manage.py test api.test_resume_score_view`
works when DATABASES still point at Mongo (e.g. host `mongodb` unavailable on a laptop).
"""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import SimpleTestCase, override_settings
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from api.views.ai_views import resume_score


def _minimal_ai_score_result():
    return {
        "overall_score": 7.0,
        "estimated_pages": 1.0,
        "categories": [
            {"name": "Content Quality", "score": 2.0, "max_score": 3.0, "feedback": "- Solid."},
            {"name": "Professional Summary", "score": 0.8, "max_score": 1.0, "feedback": "- Good."},
            {"name": "Experience Section", "score": 1.5, "max_score": 2.0, "feedback": "- Ok."},
            {"name": "Skills & Proficiency", "score": 0.7, "max_score": 1.0, "feedback": "- Ok."},
            {"name": "Education & Certifications", "score": 0.4, "max_score": 0.5, "feedback": "- Ok."},
            {"name": "ATS Optimization", "score": 0.4, "max_score": 0.5, "feedback": "- Ok."},
        ],
        "suggestions": ["- Add metrics."],
        "overall_feedback": "- Strength\n- Gap\n- Fix",
    }


_RESUME = {
    "personalInfo": {
        "firstName": "Ada",
        "lastName": "Lovelace",
        "email": "ada@example.com",
        "interests": [],
    },
    "workExperience": [],
    "education": [],
    "projects": [],
    "certificates": [],
    "languages": [],
    "skills": [],
}


@override_settings(DEEPSEEK_API_KEY="test-key-for-resume-score-endpoint")
class ResumeScoreViewTests(SimpleTestCase):
    databases = []  # do not require DB setup for this suite

    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User(username="scoretester")

    @patch("api.views.ai_views.resume_ai_scoring.score_resume_with_deepseek")
    def test_resume_score_ok(self, mock_score):
        mock_score.return_value = _minimal_ai_score_result()
        request = self.factory.post(
            "/api/ai/resume-score/",
            {"resume": _RESUME, "outputLanguage": "en"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = resume_score(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["overall_score"], 7.0)
        self.assertEqual(len(response.data["categories"]), 6)
        self.assertIn("overall_feedback", response.data)
        mock_score.assert_called_once()

    def test_resume_score_requires_auth(self):
        request = self.factory.post(
            "/api/ai/resume-score/",
            {"resume": _RESUME},
            format="json",
        )
        response = resume_score(request)
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    @override_settings(DEEPSEEK_API_KEY="")
    def test_resume_score_503_without_api_key(self):
        request = self.factory.post(
            "/api/ai/resume-score/",
            {"resume": _RESUME},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = resume_score(request)
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_resume_score_rejects_non_object_resume(self):
        request = self.factory.post(
            "/api/ai/resume-score/",
            {"resume": "not-a-dict"},
            format="json",
        )
        force_authenticate(request, user=self.user)
        response = resume_score(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
