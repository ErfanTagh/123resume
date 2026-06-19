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
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            text = text[start : end + 1]
    return json.loads(text)


def _coerce_string_list(raw: Any, dict_keys: tuple[str, ...]) -> List[str]:
    out: List[str] = []
    if not isinstance(raw, list):
        return out
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
        elif isinstance(item, dict):
            for key in dict_keys:
                val = item.get(key)
                if isinstance(val, str) and val.strip():
                    out.append(val.strip())
                    break
    return out


def _parse_bullet_from_model(raw: str) -> str:
    try:
        data = _extract_json_object(raw)
        bullet = _normalize_bullet(str(data.get("bullet") or ""))
        if bullet:
            return bullet
    except json.JSONDecodeError as e:
        logger.warning("Work bullet JSON parse error: %s", e)

    # Fallback: model sometimes returns a single bullet line instead of JSON.
    line = _normalize_bullet(raw.split("\n")[0])
    if line and not line.startswith("{"):
        return line
    raise ValueError("empty bullet in model response")


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
        for b in _coerce_string_list(existing_bullets, ("responsibility", "bullet", "text"))
    ][:MAX_BULLETS]
    techs = [
        _clip(t, 80)
        for t in _coerce_string_list(technologies, ("technology", "name", "value"))
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

    bullet = _parse_bullet_from_model(raw)
    logger.info(
        "work_bullet_suggest model_ok lang=%s bullets_in=%d bullet_chars=%d",
        lang,
        len(bullets),
        len(bullet),
    )

    log_deepseek_exchange("work_bullet_suggest", completion, raw, {"bullet": bullet})
    return bullet
