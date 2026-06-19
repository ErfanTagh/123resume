"""
Improve a work-experience role summary via DeepSeek (structured JSON).
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

MAX_FIELD_CHARS = 500
MAX_DESCRIPTION_CHARS = 2000


def _clip(text: str, max_len: int) -> str:
    return (text or "").strip()[:max_len]


def _normalize_text(text: str) -> str:
    out = re.sub(r"\s+", " ", (text or "").strip())
    if len(out) > MAX_DESCRIPTION_CHARS:
        out = out[: MAX_DESCRIPTION_CHARS - 1].rstrip() + "…"
    return out


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


def _parse_description_from_model(raw: str) -> str:
    try:
        data = _extract_json_object(raw)
        for key in ("description", "text", "summary"):
            improved = _normalize_text(str(data.get(key) or ""))
            if improved:
                return improved
    except json.JSONDecodeError as e:
        logger.warning("Work description JSON parse error: %s", e)

    line = _normalize_text(raw.split("\n")[0])
    if line and not line.startswith("{"):
        return line
    raise ValueError("empty description in model response")


def improve_work_role_description(
    *,
    description: str = "",
    position: str = "",
    company: str = "",
    output_language: str = "en",
) -> str:
    """
    Returns an improved role summary (plain text, 1–2 sentences).
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    description = _clip(description, MAX_DESCRIPTION_CHARS)
    position = _clip(position, MAX_FIELD_CHARS)
    company = _clip(company, MAX_FIELD_CHARS)

    if not description and not (position or company):
        raise ValueError("insufficient context")

    if lang == "de":
        lang_rule = "Schreiben Sie die verbesserte Zusammenfassung auf **Deutsch** (professionelles Hochdeutsch)."
    else:
        lang_rule = "Write the improved summary in **English** (professional US-style resume tone)."

    system = (
        "You improve resume role summaries for work experience. "
        "Reply with a single JSON object only (no markdown fences). "
        "Keep the same facts — do not invent employers, dates, metrics, or tools not implied by the input."
    )

    user = f"""
Improve this work-experience role summary for a resume.

Rules:
- One or two concise sentences (max ~280 characters total).
- Strong, professional wording; impact-oriented where appropriate.
- Do not fabricate numbers, technologies, or achievements.
- Preserve the candidate's intent and only refine clarity and tone.
- {lang_rule}

Return JSON: {{"description": "<improved role summary>"}}

Job title: {position or "(not provided)"}
Company: {company or "(not provided)"}

Current role summary:
{description or "(empty — write a brief professional summary from the job title and company only)"}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=min(settings.DEEPSEEK_MAX_OUTPUT_TOKENS, 512),
        temperature=0.3,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    improved = _parse_description_from_model(raw)
    logger.info(
        "work_description_improve model_ok lang=%s in_chars=%d out_chars=%d",
        lang,
        len(description),
        len(improved),
    )
    log_deepseek_exchange("work_description_improve", completion, raw, {"description": improved})
    return improved
