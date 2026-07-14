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
MAX_ITEMS = 24
MAX_ITEM_CHARS = 1200
MAX_OUTPUT_CHARS = 600


def _norm(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "").strip())


def _get_block(resume: Dict[str, Any], camel: str, snake: str) -> Any:
    val = resume.get(camel)
    if val is None:
        val = resume.get(snake)
    return val


def _norm_subitem(entry: Any, key: str) -> str:
    """Get normalized text from a list entry that is either a plain string or {key: text}."""
    if isinstance(entry, str):
        return _norm(entry)
    if isinstance(entry, dict):
        return _norm(entry.get(key))
    return ""


def collect_improvable_items(resume: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Walk the resume and return every free-text field worth improving, across ALL
    sections: professional summary, each work-experience role summary AND each of
    its bullet points, each education description, and each project description
    and highlight. Each item: {id, path, label, kind, context, original}.

    Only fields that already contain text are included (we never fabricate). Short
    label-like fields (titles, names, skills, dates) are intentionally excluded —
    improving them risks changing facts.
    """
    items: List[Dict[str, str]] = []

    def add(path: str, label: str, kind: str, context: str, text: str) -> bool:
        """Append an item if it has text and we are under the cap. Returns False when full."""
        if len(items) >= MAX_ITEMS:
            return False
        clean = _norm(text)
        if not clean:
            return True
        items.append(
            {
                "id": f"f{len(items)}",
                "path": path,
                "label": label,
                "kind": kind,
                "context": context,
                "original": clean[:MAX_ITEM_CHARS],
            }
        )
        return len(items) < MAX_ITEMS

    # Professional summary
    pi = _get_block(resume, "personalInfo", "personal_info")
    title = ""
    if isinstance(pi, dict):
        title = _norm(pi.get("professionalTitle") or pi.get("professional_title"))
        if not add(
            "personalInfo.summary",
            "Professional Summary",
            "professional_summary",
            f"Professional title: {title or '(not provided)'}",
            pi.get("summary"),
        ):
            return items

    # Work experience: role summary + each responsibility bullet
    work = _get_block(resume, "workExperience", "work_experience") or []
    if isinstance(work, list):
        for idx, exp in enumerate(work):
            if not isinstance(exp, dict):
                continue
            position = _norm(exp.get("position"))
            company = _norm(exp.get("company"))
            label_role = " at ".join([p for p in (position, company) if p]) or f"Experience {idx + 1}"
            ctx = f"Job title: {position or '(not provided)'}; Company: {company or '(not provided)'}"

            if not add(
                f"workExperience.{idx}.description",
                f"Experience — {label_role}",
                "work_description",
                ctx,
                exp.get("description"),
            ):
                return items

            responsibilities = exp.get("responsibilities") or []
            if isinstance(responsibilities, list):
                for j, resp in enumerate(responsibilities):
                    text = _norm_subitem(resp, "responsibility")
                    if not add(
                        f"workExperience.{idx}.responsibilities.{j}.responsibility",
                        f"Bullet {j + 1} — {label_role}",
                        "work_bullet",
                        ctx,
                        text,
                    ):
                        return items

    # Education: each description line
    education = resume.get("education") or []
    if isinstance(education, list):
        for idx, edu in enumerate(education):
            if not isinstance(edu, dict):
                continue
            degree = _norm(edu.get("degree"))
            institution = _norm(edu.get("institution"))
            label_edu = " — ".join([p for p in (degree, institution) if p]) or f"Education {idx + 1}"
            ctx = f"Degree: {degree or '(not provided)'}; Institution: {institution or '(not provided)'}"
            descriptions = edu.get("descriptions") or []
            if isinstance(descriptions, list):
                for j, d in enumerate(descriptions):
                    text = _norm_subitem(d, "description")
                    if not add(
                        f"education.{idx}.descriptions.{j}.description",
                        f"Education detail {j + 1} — {label_edu}",
                        "education_description",
                        ctx,
                        text,
                    ):
                        return items

    # Projects: description + each highlight
    projects = resume.get("projects") or []
    if isinstance(projects, list):
        for idx, proj in enumerate(projects):
            if not isinstance(proj, dict):
                continue
            name = _norm(proj.get("name")) or f"Project {idx + 1}"
            ctx = f"Project name: {name}"

            if not add(
                f"projects.{idx}.description",
                f"Project — {name}",
                "project_description",
                ctx,
                proj.get("description"),
            ):
                return items

            highlights = proj.get("highlights") or []
            if isinstance(highlights, list):
                for j, h in enumerate(highlights):
                    text = _norm_subitem(h, "highlight")
                    if not add(
                        f"projects.{idx}.highlights.{j}.highlight",
                        f"Highlight {j + 1} — {name}",
                        "project_highlight",
                        ctx,
                        text,
                    ):
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

Each field has a "kind". Treat it accordingly:
- "professional_summary": 2–4 polished sentences.
- "work_description": 1–2 concise sentences summarizing the role.
- "work_bullet" / "project_highlight": ONE single, tight accomplishment line — start with a strong
  action verb, no leading "- ", do NOT merge multiple bullets or expand into a paragraph.
- "project_description": 1–3 concise sentences.
- "education_description": 1–2 concise sentences.

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
        # Long / German resumes produce many improved fields; a low cap truncated
        # the JSON mid-string and broke parsing. Give ample room and force JSON mode.
        max_tokens=getattr(settings, "DEEPSEEK_RESUME_IMPROVE_MAX_TOKENS", 8192),
        temperature=0.3,
        response_format={"type": "json_object"},
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
