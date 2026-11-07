"""
Tests for resume translation without calling Claude: language levels, and the
token and time budget the translate call gets.

    python manage.py test api.test_resume_translate
"""
import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from api import resume_ai_translate as tr


def _resume(levels):
    return {
        "personalInfo": {"professionalTitle": "Softwareentwickler"},
        "languages": [{"language": f"Sprache {i}", "proficiency": level} for i, level in enumerate(levels)],
    }


class LanguageLevelTests(SimpleTestCase):
    def test_known_labels_in_any_language_become_keys(self):
        resume = _resume(["Fließend", "Muttersprache", "verhandlungssicher", "Akıcı", "Native", "basic"])
        slots = tr._collect_slots(resume)
        self.assertEqual(
            [lang["proficiency"] for lang in resume["languages"]],
            ["fluent", "native", "fluent", "fluent", "native", "basic"],
        )
        # Known levels need no translation, only the language names do
        self.assertNotIn("language_level", {s.kind for s in slots})

    def test_unknown_free_text_is_translated_and_cefr_stays(self):
        resume = _resume(["Konversationssicher", "C1", "b2+", ""])
        slots = tr._collect_slots(resume)
        levels = [s for s in slots if s.kind == "language_level"]
        self.assertEqual([s.text for s in levels], ["Konversationssicher"])
        self.assertEqual([lang["proficiency"] for lang in resume["languages"]], ["Konversationssicher", "C1", "b2+", ""])
        self.assertEqual(tr._KIND_TO_CATEGORY["language_level"], "languages")


@override_settings(AI_ENABLED=True, AI_RESUME_TRANSLATE_MAX_TOKENS=8192, RESUME_TRANSLATE_TIMEOUT_SECONDS=50)
class TranslateCallTests(SimpleTestCase):
    def test_one_long_attempt_with_room_for_a_full_resume(self):
        resume = _resume(["Fließend", "Konversationssicher"])
        create = MagicMock()

        def answer(**kwargs):
            items = json.loads(kwargs["messages"][1]["content"].split("Fields to translate (JSON):", 1)[1])
            translated = [{"id": it["id"], "translated": f"EN {it['text']}"} for it in items]
            return SimpleNamespace(
                model="claude-test",
                choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps({"items": translated})), finish_reason="stop")],
                usage=None,
            )

        create.side_effect = answer
        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
        with patch.object(tr, "get_ai_client", return_value=client):
            out = tr.translate_resume(resume, "en")["resume"]

        kwargs = create.call_args.kwargs
        self.assertEqual(kwargs["max_tokens"], 8192)
        self.assertEqual(kwargs["timeout"], 50)
        self.assertEqual(out["languages"][0]["proficiency"], "fluent")
        self.assertEqual(out["languages"][1]["proficiency"], "EN Konversationssicher")
        self.assertEqual(out["styling"]["resumeLanguage"], "en")
