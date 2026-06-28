"""
Batch "Improve my resume" via DeepSeek.

Rewrites ONLY free-text fields the user can edit in the builder:
  - personalInfo.summary            (professional summary)
  - workExperience[i].description   (role summary)
  - projects[i].description         (project description)

Returns a list of proposed changes — each with the react-hook-form field
`path`, a human `label`, the `original` text, and the `improved` text — so the
frontend can present an Accept/Reject card per change. No facts are invented:
the model only refines wording of text that already exists.
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

# Safety caps so one call can't blow up the prompt.
MAX_ITEMS = 12
MAX_ITEM_CHARS = 1200
MAX_OUTPUT_CHARS = 600


def _norm(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def _get_block(resume: Dict[str, Any], camel: str, snake: str) -> Any:
    val = resume.get(camel)
    if val is None:
        val = resume.get(snake)
    return val


def collect_improvable_items(resume: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Walk the resume and return a list of text fields worth improving.
    Each item: {id, path, label, kind, context, original}.
    Only fields that already contain text are included (we never fabricate).
    """
    items: List[Dict[str, str]] = []

    # Professional summary
    pi = _get_block(resume, "personalInfo", "personal_info")
    if isinstance(pi, dict):
        summary = _norm(pi.get("summary"))
        if summary:
            title = _norm(pi.get("professionalTitle") or pi.get("professional_title"))
            items.append(
                {
                    "id": f"f{len(items)}",
                    "path": "personalInfo.summary",
                    "label": "Professional Summary",
                    "kind": "professional_summary",
                    "context": f"Professional title: {title or '(not provided)'}",
                    "original": summary[:MAX_ITEM_CHARS],
                }
            )

    # Work experience descriptions
    work = _get_block(resume, "workExperience", "work_experience") or []
    if isinstance(work, list):
        for idx, exp in enumerate(work):
            if not isinstance(exp, dict):
                continue
            desc = _norm(exp.get("description"))
            if not desc:
                continue
            position = _norm(exp.get("position"))
            company = _norm(exp.get("company"))
            label_role = " at ".join([p for p in (position, company) if p]) or f"Experience {idx + 1}"
            items.append(
                {
                    "id": f"f{len(items)}",
                    "path": f"workExperience.{idx}.description",
                    "label": f"Experience — {label_role}",
                    "kind": "work_description",
                    "context": f"Job title: {position or '(not provided)'}; Company: {company or '(not provided)'}",
                    "original": desc[:MAX_ITEM_CHARS],
                }
            )
            if len(items) >= MAX_ITEMS:
                return items

    # Project descriptions
    projects = resume.get("projects") or []
    if isinstance(projects, list):
        for idx, proj in enumerate(projects):
            if not isinstance(proj, dict):
                continue
            desc = _norm(proj.get("description"))
            if not desc:
                continue
            name = _norm(proj.get("name"))
            items.append(
                {
                    "id": f"f{len(items)}",
                    "path": f"projects.{idx}.description",
                    "label": f"Project — {name or f'Project {idx + 1}'}",
                    "kind": "project_description",
                    "context": f"Project name: {name or '(not provided)'}",
                    "original": desc[:MAX_ITEM_CHARS],
                }
            )
            if len(items) >= MAX_ITEMS:
                return items

    return items


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


def improve_resume_fields(
    resume: Dict[str, Any],
    output_language: str = "en",
) -> List[Dict[str, str]]:
    """
    Returns a list of accepted-candidate changes:
      [{path, label, original, improved}, ...]
    Only fields whose improved text differs meaningfully from the original are
    returned. Empty list means "nothing to improve".
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    items = collect_improvable_items(resume)
    if not items:
        return []

    if lang == "de":
        lang_rule = (
            "Schreiben Sie jeden verbesserten Text auf **Deutsch** (professionelles Hochdeutsch)."
        )
    else:
        lang_rule = "Write each improved text in **English** (professional US-style resume tone)."

    # Compact list the model sees — id + kind + context + original text only.
    model_items = [
        {"id": it["id"], "kind": it["kind"], "context": it["context"], "original": it["original"]}
        for it in items
    ]

    system = (
        "You improve the wording of existing resume text fields. "
        "Reply with a single JSON object only (no markdown fences). "
        "Refine clarity, tone, and impact while KEEPING the same facts — never invent employers, "
        "dates, numbers, metrics, technologies, or achievements not present in the original."
    )
    user = f"""
Improve each resume text field below. Return a better version of the SAME content.

Rules:
- Keep the candidate's meaning; only refine clarity, structure, and professional tone.
- Do NOT fabricate metrics, tools, employers, or outcomes that are not already in the text.
- Keep each improved field roughly the same length as the original (max ~{MAX_OUTPUT_CHARS} characters).
- If a field is already strong and you cannot meaningfully improve it, return its text unchanged.
- {lang_rule}

Return JSON exactly as: {{"items": [{{"id": "<id>", "improved": "<improved text>"}}, ...]}}
Include one object per input id, preserving ids.

Fields to improve (JSON):
{json.dumps(model_items, ensure_ascii=False)}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=min(getattr(settings, "DEEPSEEK_MAX_OUTPUT_TOKENS", 2048), 2048),
        temperature=0.3,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    try:
        parsed = _extract_json_object(raw)
    except json.JSONDecodeError as e:
        logger.warning("resume_improve JSON parse error: %s | snippet=%s", e, raw[:300])
        raise

    improved_by_id: Dict[str, str] = {}
    for row in parsed.get("items") or []:
        if not isinstance(row, dict):
            continue
        rid = str(row.get("id") or "").strip()
        improved = _norm(row.get("improved"))
        if rid and improved:
            improved_by_id[rid] = improved[:MAX_OUTPUT_CHARS]

    changes: List[Dict[str, str]] = []
    for it in items:
        improved = improved_by_id.get(it["id"], "")
        original = it["original"]
        # Skip when the model returned nothing or text that is effectively unchanged.
        if not improved or improved.strip().lower() == original.strip().lower():
            continue
        changes.append(
            {
                "path": it["path"],
                "label": it["label"],
                "original": original,
                "improved": improved,
            }
        )

    logger.info(
        "resume_improve model_ok lang=%s items_in=%d changes_out=%d",
        lang,
        len(items),
        len(changes),
    )
    log_deepseek_exchange(
        "resume_improve",
        completion,
        raw,
        {"changes": [{"path": c["path"], "improved": c["improved"][:120]} for c in changes]},
    )
    return changes
