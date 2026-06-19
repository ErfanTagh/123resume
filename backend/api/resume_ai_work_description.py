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

    return _call_improve_model(
        system=system,
        user=user,
        log_key="work_description_improve",
        lang=lang,
        in_len=len(description),
    )


def _call_improve_model(*, system: str, user: str, log_key: str, lang: str, in_len: int) -> str:
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
    logger.info("%s model_ok lang=%s in_chars=%d out_chars=%d", log_key, lang, in_len, len(improved))
    log_deepseek_exchange(log_key, completion, raw, {"description": improved})
    return improved


def improve_professional_summary(
    *,
    description: str = "",
    professional_title: str = "",
    output_language: str = "en",
) -> str:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    description = _clip(description, MAX_DESCRIPTION_CHARS)
    professional_title = _clip(professional_title, MAX_FIELD_CHARS)

    if not description and not professional_title:
        raise ValueError("insufficient context")

    if lang == "de":
        lang_rule = "Schreiben Sie die verbesserte Zusammenfassung auf **Deutsch** (professionelles Hochdeutsch)."
    else:
        lang_rule = "Write the improved summary in **English** (professional US-style resume tone)."

    system = (
        "You improve professional summaries at the top of resumes. "
        "Reply with a single JSON object only (no markdown fences). "
        "Keep the same facts — do not invent employers, dates, metrics, or credentials."
    )
    user = f"""
Improve this professional summary for a resume.

Rules:
- Two to four concise sentences (max ~400 characters total).
- Highlight strengths, focus, and value; strong professional tone.
- Do not fabricate numbers, employers, or achievements.
- Preserve the candidate's intent and only refine clarity and impact.
- {lang_rule}

Return JSON: {{"description": "<improved professional summary>"}}

Professional title: {professional_title or "(not provided)"}

Current professional summary:
{description or "(empty — write a brief summary from the professional title only)"}
""".strip()

    return _call_improve_model(
        system=system,
        user=user,
        log_key="professional_summary_improve",
        lang=lang,
        in_len=len(description),
    )


def improve_project_description(
    *,
    description: str = "",
    project_name: str = "",
    output_language: str = "en",
) -> str:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    description = _clip(description, MAX_DESCRIPTION_CHARS)
    project_name = _clip(project_name, MAX_FIELD_CHARS)

    if not description and not project_name:
        raise ValueError("insufficient context")

    if lang == "de":
        lang_rule = "Schreiben Sie die verbesserte Beschreibung auf **Deutsch** (professionelles Hochdeutsch)."
    else:
        lang_rule = "Write the improved description in **English** (professional US-style resume tone)."

    system = (
        "You improve project descriptions on resumes. "
        "Reply with a single JSON object only (no markdown fences). "
        "Keep the same facts — do not invent technologies, metrics, or outcomes not implied by the input."
    )
    user = f"""
Improve this resume project description.

Rules:
- One to three concise sentences (max ~320 characters total).
- Mention what was built and the impact or outcome when known.
- Do not fabricate metrics, stack, or team details.
- Preserve the candidate's intent and only refine clarity and tone.
- {lang_rule}

Return JSON: {{"description": "<improved project description>"}}

Project name: {project_name or "(not provided)"}

Current project description:
{description or "(empty — write a brief description from the project name only)"}
""".strip()

    return _call_improve_model(
        system=system,
        user=user,
        log_key="project_description_improve",
        lang=lang,
        in_len=len(description),
    )


def improve_resume_text(
    *,
    field_type: str,
    description: str = "",
    position: str = "",
    company: str = "",
    professional_title: str = "",
    project_name: str = "",
    output_language: str = "en",
) -> str:
    kind = (field_type or "work_description").strip().lower()
    if kind in ("work_description", "work-description", "role_summary"):
        return improve_work_role_description(
            description=description,
            position=position,
            company=company,
            output_language=output_language,
        )
    if kind in ("professional_summary", "professional-summary", "summary"):
        return improve_professional_summary(
            description=description,
            professional_title=professional_title,
            output_language=output_language,
        )
    if kind in ("project_description", "project-description", "project"):
        return improve_project_description(
            description=description,
            project_name=project_name,
            output_language=output_language,
        )
    raise ValueError("unsupported field type")
