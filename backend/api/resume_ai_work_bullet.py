"""
Suggest a new work-experience bullet via DeepSeek (structured JSON).
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client
from .resume_ai_scoring import normalize_output_language

logger = logging.getLogger(__name__)

MAX_FIELD_CHARS = 500
MAX_DESCRIPTION_CHARS = 2000
MAX_BULLET_CHARS = 320
MAX_BULLETS = 20
MAX_TECHNOLOGIES = 30


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def _clip(text: str, max_len: int) -> str:
    return (text or "").strip()[:max_len]


def _normalize_bullet(text: str) -> str:
    bullet = (text or "").strip()
    bullet = re.sub(r"^[\s•\-–—*]+\s*", "", bullet)
    bullet = re.sub(r"\s+", " ", bullet).strip()
    if len(bullet) > MAX_BULLET_CHARS:
        bullet = bullet[: MAX_BULLET_CHARS - 1].rstrip() + "…"
    return bullet


def suggest_work_experience_bullet(
    *,
    position: str = "",
    company: str = "",
    description: str = "",
    existing_bullets: List[str] | None = None,
    technologies: List[str] | None = None,
    output_language: str = "en",
) -> str:
    """
    Returns one new resume bullet (plain text, no leading bullet marker).
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    bullets = [
        _clip(b, MAX_BULLET_CHARS)
        for b in (existing_bullets or [])
        if isinstance(b, str) and b.strip()
    ][:MAX_BULLETS]
    techs = [
        _clip(t, 80)
        for t in (technologies or [])
        if isinstance(t, str) and t.strip()
    ][:MAX_TECHNOLOGIES]

    position = _clip(position, MAX_FIELD_CHARS)
    company = _clip(company, MAX_FIELD_CHARS)
    description = _clip(description, MAX_DESCRIPTION_CHARS)

    if not any([position, company, description, bullets]):
        raise ValueError("insufficient context")

    if lang == "de":
        lang_rule = (
            "Schreiben Sie die neue Aufzählung auf **Deutsch** (professionelles Hochdeutsch). "
            "Verwenden Sie die Sie-Form nicht — es ist ein Lebenslauf-Eintrag in der Ich-Form / neutral."
        )
    else:
        lang_rule = "Write the new bullet in **English** (professional US-style resume tone)."

    system = (
        "You help candidates write strong resume bullet points for work experience. "
        "Reply with a single JSON object only (no markdown fences). "
        "Do not invent employers, dates, team sizes, or metrics that are not reasonably implied by the context."
    )
    bullets_block = "\n".join(f"- {b}" for b in bullets) if bullets else "(none yet)"
    tech_block = ", ".join(techs) if techs else "(none provided)"

    user = f"""
Suggest exactly ONE new resume bullet for this role that complements the existing bullets without repeating them.

Rules:
- Start with a strong action verb.
- Be specific to the role and stack when possible.
- Prefer measurable impact only when numbers are plausible from context; never fabricate precise metrics.
- One sentence, max ~220 characters.
- Do NOT duplicate or lightly rephrase an existing bullet.
- {lang_rule}

Return JSON: {{"bullet": "<the new bullet text without a leading dash or bullet symbol>"}}

Job title: {position or "(not provided)"}
Company: {company or "(not provided)"}
Role summary / description:
{description or "(not provided)"}

Technologies: {tech_block}

Existing bullets:
{bullets_block}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=min(settings.DEEPSEEK_MAX_OUTPUT_TOKENS, 512),
        temperature=0.35,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    try:
        data = _extract_json_object(raw)
    except json.JSONDecodeError as e:
        logger.warning("Work bullet JSON parse error: %s snippet=%s", e, raw[:400])
        raise

    bullet = _normalize_bullet(str(data.get("bullet") or ""))
    if not bullet:
        raise ValueError("empty bullet in model response")

    log_deepseek_exchange("work_bullet_suggest", completion, raw, {"bullet": bullet})
    return bullet
