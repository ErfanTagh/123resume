"""
Incremental resume tailoring suggestions for a target job (DeepSeek).
Each round suggests ~20% match improvement across summary, skills, experience, projects.
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

MAX_JOB_CHARS = 10_000
ROUND_TARGET_BOOST = 20
MAX_ROUNDS = 5

ALLOWED_SECTIONS = frozenset(
    {"professional_summary", "skills", "work_experience", "projects"}
)


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


def _skills_to_display(skills: List[Dict[str, Any]]) -> str:
    names = []
    for s in skills or []:
        if isinstance(s, dict) and s.get("skill"):
            names.append(str(s["skill"]).strip())
        elif isinstance(s, str) and s.strip():
            names.append(s.strip())
    return ", ".join(names) if names else "(empty)"


def _responsibilities_to_text(items: List[Any]) -> str:
    lines = []
    for item in items or []:
        if isinstance(item, dict) and item.get("responsibility"):
            lines.append(str(item["responsibility"]).strip())
        elif isinstance(item, str) and item.strip():
            lines.append(item.strip())
    return "\n".join(lines) if lines else ""


def build_resume_snapshot(resume_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Compact structured snapshot for tailoring (no PII beyond what's needed)."""
    personal = resume_doc.get("personal_info") or {}
    work = []
    for i, exp in enumerate(resume_doc.get("work_experience") or []):
        work.append(
            {
                "index": i,
                "position": (exp.get("position") or "").strip(),
                "company": (exp.get("company") or "").strip(),
                "description": (exp.get("description") or "").strip(),
                "responsibilities": _responsibilities_to_text(exp.get("responsibilities")),
            }
        )
    projects = []
    for i, proj in enumerate(resume_doc.get("projects") or []):
        projects.append(
            {
                "index": i,
                "name": (proj.get("name") or "").strip(),
                "description": (proj.get("description") or "").strip(),
            }
        )
    return {
        "professional_summary": (personal.get("summary") or "").strip(),
        "skills": _skills_to_display(resume_doc.get("skills") or []),
        "skills_list": [
            {"skill": (s.get("skill") or "").strip()}
            for s in (resume_doc.get("skills") or [])
            if isinstance(s, dict) and (s.get("skill") or "").strip()
        ],
        "work_experience": work,
        "projects": projects,
    }


def _normalize_suggestion(raw: Dict[str, Any], snapshot: Dict[str, Any]) -> Dict[str, Any] | None:
    section = str(raw.get("section") or "").strip()
    if section not in ALLOWED_SECTIONS:
        return None

    sid = str(raw.get("id") or f"{section}-{raw.get('index', 0)}").strip()
    label = str(raw.get("label") or section).strip()[:200]
    before = str(raw.get("before") or "").strip()
    after = str(raw.get("after") or "").strip()
    if not after or before == after:
        return None

    apply_data: Dict[str, Any] = {"section": section}

    if section == "professional_summary":
        apply_data["summary"] = after
        if not before:
            before = snapshot.get("professional_summary") or "(empty)"
    elif section == "skills":
        skills_raw = raw.get("skills_after")
        if isinstance(skills_raw, list) and skills_raw:
            skills = []
            for s in skills_raw:
                if isinstance(s, dict) and s.get("skill"):
                    skills.append({"skill": str(s["skill"]).strip()})
                elif isinstance(s, str) and s.strip():
                    skills.append({"skill": s.strip()})
        else:
            skills = [{"skill": x.strip()} for x in after.split(",") if x.strip()]
        if not skills:
            return None
        apply_data["skills"] = [
            {"skill": str(s["skill"]).strip()[:100]}
            for s in skills
            if str(s.get("skill") if isinstance(s, dict) else s).strip()
        ]
        if not before:
            before = snapshot.get("skills") or "(empty)"
    elif section == "work_experience":
        try:
            idx = int(raw.get("work_index", raw.get("index", -1)))
        except (TypeError, ValueError):
            return None
        work_items = snapshot.get("work_experience") or []
        if idx < 0 or idx >= len(work_items):
            return None
        apply_data["work_index"] = idx
        field = str(raw.get("field") or "description").strip()
        if field not in ("description", "responsibilities"):
            field = "description"
        apply_data["field"] = field
        if field == "description":
            apply_data["description"] = after
        else:
            bullets = raw.get("responsibilities_after")
            if isinstance(bullets, list) and bullets:
                apply_data["responsibilities"] = [
                    {
                        "responsibility": str(
                            b.get("responsibility") if isinstance(b, dict) else b
                        ).strip()[:500]
                    }
                    for b in bullets
                    if str(b.get("responsibility") if isinstance(b, dict) else b).strip()
                ]
            else:
                apply_data["responsibilities"] = [
                    {"responsibility": line.strip()[:500]}
                    for line in after.split("\n")
                    if line.strip()
                ]
            if not apply_data["responsibilities"]:
                return None
        if not before:
            w = work_items[idx]
            before = w.get("description") or w.get("responsibilities") or "(empty)"
        if not label or label == section:
            w = work_items[idx]
            label = f"{w.get('position') or 'Role'} at {w.get('company') or 'Company'}"
    elif section == "projects":
        try:
            idx = int(raw.get("project_index", raw.get("index", -1)))
        except (TypeError, ValueError):
            return None
        proj_items = snapshot.get("projects") or []
        if idx < 0 or idx >= len(proj_items):
            return None
        apply_data["project_index"] = idx
        apply_data["description"] = after
        if not before:
            before = (proj_items[idx].get("description") or "(empty)")
        if not label or label == section:
            label = proj_items[idx].get("name") or f"Project {idx + 1}"

    return {
        "id": sid,
        "section": section,
        "label": label,
        "before": before[:3000],
        "after": after[:3000],
        "apply": apply_data,
    }


def generate_tailor_suggestions(
    resume_doc: Dict[str, Any],
    job_title: str,
    job_description: str,
    *,
    round_number: int = 1,
    current_match_percentage: float = 0.0,
    skip_ids: List[str] | None = None,
    output_language: str = "en",
) -> Dict[str, Any]:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    snapshot = build_resume_snapshot(resume_doc)
    rnd = max(1, min(int(round_number or 1), MAX_ROUNDS))
    skip = set(skip_ids or [])

    try:
        current_pct = float(current_match_percentage or 0)
    except (TypeError, ValueError):
        current_pct = 0.0
    current_pct = max(0.0, min(100.0, current_pct))
    target_pct = min(100.0, current_pct + ROUND_TARGET_BOOST)

    jd = (job_description or "").strip()
    if len(jd) > MAX_JOB_CHARS:
        jd = jd[:MAX_JOB_CHARS] + "\n[TRUNCATED]"
    if not jd:
        raise ValueError("insufficient job description")

    jt = (job_title or "").strip()[:500]
    snapshot_json = json.dumps(snapshot, ensure_ascii=False)

    if lang == "de":
        lang_rule = "Schreiben Sie vorgeschlagene Texte auf Deutsch (professionell, keine erfundenen Fakten)."
    else:
        lang_rule = "Write suggested text in English (professional, no invented facts)."

    system = (
        "You are a resume tailoring coach. Suggest small, truthful edits so a resume fits a job better. "
        "Reply with a single JSON object only (no markdown fences). "
        "Never invent employers, degrees, dates, or metrics not supported by the resume."
    )
    user = f"""
Tailor this resume for the job. Round {rnd} of {MAX_ROUNDS}.

Rules:
- Suggest 1 to 3 changes ONLY (prioritize highest impact for round {rnd}).
- Target improving match from {current_pct:.0f}% toward ~{target_pct:.0f}% (+{ROUND_TARGET_BOOST}% this round).
- Round 1: focus on professional_summary and skills if weak.
- Later rounds: refine work_experience descriptions/responsibilities and project descriptions.
- Do NOT repeat suggestion ids already skipped: {list(skip) or "none"}.
- Only use sections: professional_summary, skills, work_experience, projects.
- For work_experience use work_index (0-based) and field "description" or "responsibilities".
- For skills: skills_after must list ALL skills (reordered with job-relevant ones first, keep every existing skill).
- {lang_rule}
- "before" must match current resume content; "after" is your improved version.

Return JSON:
{{
  "suggestions": [
    {{
      "id": "unique-stable-id",
      "section": "professional_summary|skills|work_experience|projects",
      "label": "Human label",
      "before": "current text",
      "after": "improved text",
      "work_index": 0,
      "project_index": 0,
      "field": "description|responsibilities",
      "skills_after": [{{"skill": "Python"}}],
      "responsibilities_after": [{{"responsibility": "bullet"}}]
    }}
  ],
  "projected_match_percentage": {target_pct}
}}

Job title: {jt or "(not provided)"}

Job description:
{jd}

Current resume snapshot:
{snapshot_json}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=min(int(getattr(settings, "DEEPSEEK_TAILOR_MAX_TOKENS", 2048)), 2048),
        temperature=0.35,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    try:
        data = _extract_json_object(raw)
    except json.JSONDecodeError as e:
        logger.warning("Tailor JSON parse error: %s snippet=%s", e, raw[:400])
        raise ValueError("invalid model response") from e

    suggestions: List[Dict[str, Any]] = []
    for item in data.get("suggestions") or []:
        if not isinstance(item, dict):
            continue
        sid = str(item.get("id") or "").strip()
        if sid and sid in skip:
            continue
        norm = _normalize_suggestion(item, snapshot)
        if norm:
            suggestions.append(norm)

    try:
        projected = float(data.get("projected_match_percentage", target_pct))
    except (TypeError, ValueError):
        projected = target_pct
    projected = max(current_pct, min(100.0, round(projected, 1)))

    out = {
        "suggestions": suggestions,
        "round": rnd,
        "max_rounds": MAX_ROUNDS,
        "current_match_percentage": current_pct,
        "projected_match_percentage": projected,
        "round_target_boost": ROUND_TARGET_BOOST,
    }
    log_deepseek_exchange(
        "resume_tailor",
        completion,
        raw,
        {"suggestion_count": len(suggestions), "round": rnd},
    )
    return out
