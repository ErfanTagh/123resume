"""
Generate a tailored cover letter via DeepSeek from resume + job posting.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client
from .resume_ai_scoring import normalize_output_language

logger = logging.getLogger(__name__)

MAX_RESUME_CHARS = 14_000
MAX_JOB_CHARS = 10_000
MAX_COVER_LETTER_CHARS = 6_000


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            text = text[start : end + 1]
    return json.loads(text)


def _normalize_letter(text: str) -> str:
    letter = (text or "").replace("\r\n", "\n").strip()
    letter = re.sub(r"\n{3,}", "\n\n", letter)
    if len(letter) > MAX_COVER_LETTER_CHARS:
        letter = letter[: MAX_COVER_LETTER_CHARS - 1].rstrip() + "…"
    return letter


def _parse_letter_from_model(raw: str) -> str:
    try:
        data = _extract_json_object(raw)
        for key in ("cover_letter", "letter", "text", "content"):
            val = _normalize_letter(str(data.get(key) or ""))
            if val:
                return val
    except json.JSONDecodeError as e:
        logger.warning("Cover letter JSON parse error: %s", e)

    plain = _normalize_letter(raw)
    if plain and not plain.startswith("{"):
        return plain
    raise ValueError("empty cover letter in model response")


def generate_cover_letter_with_deepseek(
    resume_text: str,
    job_title: str,
    job_description: str,
    output_language: str = "en",
) -> str:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    rt = (resume_text or "").strip()
    if len(rt) > MAX_RESUME_CHARS:
        rt = rt[:MAX_RESUME_CHARS] + "\n[TRUNCATED]"
    jt = (job_title or "").strip()[:500]
    jd = (job_description or "").strip()
    if len(jd) > MAX_JOB_CHARS:
        jd = jd[:MAX_JOB_CHARS] + "\n[TRUNCATED]"

    if not rt:
        raise ValueError("insufficient resume content")
    if not jd:
        raise ValueError("insufficient job description")

    if lang == "de":
        lang_rule = (
            "Schreiben Sie das Anschreiben auf **Deutsch** (professionelles Hochdeutsch, Sie-Form)."
        )
        greeting_hint = "Beginnen Sie mit einer passenden Anrede (z. B. „Sehr geehrte Damen und Herren,“ wenn kein Name bekannt ist)."
        closing_hint = "Schließen Sie mit „Mit freundlichen Grüßen“ und dem Namen des Kandidaten aus dem Lebenslauf."
    else:
        lang_rule = "Write the cover letter in **English** (professional US-style business letter)."
        greeting_hint = "Start with an appropriate greeting (e.g. Dear Hiring Manager, if no name is given)."
        closing_hint = "End with a professional sign-off and the candidate's name from the resume."

    system = (
        "You write tailored job application cover letters. "
        "Reply with a single JSON object only (no markdown fences). "
        "Use only facts supported by the resume — do not invent employers, dates, degrees, or metrics."
    )
    user = f"""
Write a tailored cover letter for this job application.

Rules:
- 3–4 short paragraphs plus greeting and sign-off.
- Explain fit between the candidate's background and this role.
- Mention 2–3 relevant strengths or experiences from the resume.
- Do not copy the job description verbatim.
- Do not fabricate information not in the resume.
- {lang_rule}
- {greeting_hint}
- {closing_hint}

Return JSON: {{"cover_letter": "<full letter text with paragraph breaks as \\\\n\\\\n>"}}

Target job title: {jt or "(not provided)"}

Job description:
{jd}

Candidate resume (source of truth for facts):
{rt}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=min(
            int(getattr(settings, "DEEPSEEK_COVER_LETTER_MAX_TOKENS", 2048)),
            2048,
        ),
        temperature=0.35,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    letter = _parse_letter_from_model(raw)
    logger.info(
        "cover_letter_generate model_ok lang=%s resume_chars=%d letter_chars=%d",
        lang,
        len(rt),
        len(letter),
    )
    log_deepseek_exchange("cover_letter_generate", completion, raw, {"cover_letter": letter[:500]})
    return letter
