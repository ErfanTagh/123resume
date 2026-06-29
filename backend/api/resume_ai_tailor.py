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
# One comprehensive pass aims for the full match; the user accepts/rejects each
# suggestion individually, so there is no need to dribble out ~20% per round.
ROUND_TARGET_BOOST = 100
MAX_ROUNDS = 5
# Max suggestions returned in a single comprehensive pass.
MAX_SUGGESTIONS_PER_PASS = 10

ALLOWED_SECTIONS = frozenset(
    {
        "professional_summary",
        "professional_title",
        "location",
        "skills",
        "work_experience",
        "projects",
    }
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


def _names_to_text(items: List[Any], *keys: str) -> str:
    """Join a list of strings or dicts (using the first present key) into 'a, b, c'."""
    names: List[str] = []
    for item in items or []:
        if isinstance(item, str) and item.strip():
            names.append(item.strip())
        elif isinstance(item, dict):
            for k in keys:
                val = item.get(k)
                if isinstance(val, str) and val.strip():
                    names.append(val.strip())
                    break
    return ", ".join(names)


def build_resume_snapshot(resume_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Compact structured snapshot for tailoring (no PII beyond what's needed).

    Certifications and languages are intentionally omitted — they are binary
    (have it or not) and must never be reworded or tailored. Education and the
    work/project technology stacks are included as READ-ONLY context so the model
    can write more relevant edits, but only the ALLOWED_SECTIONS are editable.
    """
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
                # Read-only context (NOT directly editable): the tech stack used.
                "technologies": _names_to_text(exp.get("technologies"), "technology"),
            }
        )
    projects = []
    for i, proj in enumerate(resume_doc.get("projects") or []):
        projects.append(
            {
                "index": i,
                "name": (proj.get("name") or "").strip(),
                "description": (proj.get("description") or "").strip(),
                "technologies": _names_to_text(proj.get("technologies"), "technology"),
            }
        )
    # Education is read-only context only (not an editable section).
    education = []
    for edu in resume_doc.get("education") or []:
        if not isinstance(edu, dict):
            continue
        education.append(
            {
                "degree": (edu.get("degree") or "").strip(),
                "field": (
                    edu.get("field") or edu.get("field_of_study") or edu.get("fieldOfStudy") or ""
                ).strip(),
                "institution": (edu.get("institution") or "").strip(),
            }
        )
    return {
        "professional_summary": (personal.get("summary") or "").strip(),
        "professional_title": (
            personal.get("professional_title") or personal.get("professionalTitle") or ""
        ).strip(),
        "location": (personal.get("location") or "").strip(),
        "skills": _skills_to_display(resume_doc.get("skills") or []),
        "skills_list": [
            {"skill": (s.get("skill") or "").strip()}
            for s in (resume_doc.get("skills") or [])
            if isinstance(s, dict) and (s.get("skill") or "").strip()
        ],
        "work_experience": work,
        "projects": projects,
        "education_context": education,
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
    elif section == "professional_title":
        apply_data["title"] = after[:200]
        if not before:
            before = snapshot.get("professional_title") or "(empty)"
    elif section == "location":
        apply_data["location"] = after[:200]
        if not before:
            before = snapshot.get("location") or "(empty)"
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
    allowed_sections: List[str] | None = None,
    allowed_work_indexes: List[int] | None = None,
    allowed_project_indexes: List[int] | None = None,
) -> Dict[str, Any]:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    lang = normalize_output_language(output_language)
    snapshot = build_resume_snapshot(resume_doc)
    rnd = max(1, min(int(round_number or 1), MAX_ROUNDS))
    skip = set(skip_ids or [])

    # Scope: which parts of the resume the user allows the AI to change.
    # None => no restriction (back-compat). Indexes only constrain their section.
    scoped_sections = (
        {s for s in allowed_sections if s in ALLOWED_SECTIONS}
        if isinstance(allowed_sections, list)
        else None
    )
    work_idx_filter = (
        {int(i) for i in allowed_work_indexes}
        if isinstance(allowed_work_indexes, list)
        else None
    )
    proj_idx_filter = (
        {int(i) for i in allowed_project_indexes}
        if isinstance(allowed_project_indexes, list)
        else None
    )

    def _in_scope(norm: Dict[str, Any]) -> bool:
        ap = norm.get("apply") or {}
        sec = ap.get("section")
        if scoped_sections is not None and sec not in scoped_sections:
            return False
        if sec == "work_experience" and work_idx_filter is not None:
            return ap.get("work_index") in work_idx_filter
        if sec == "projects" and proj_idx_filter is not None:
            return ap.get("project_index") in proj_idx_filter
        return True

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

    # Build a human-readable allowed-scope instruction for the model (when restricted).
    scope_rule = ""
    if scoped_sections is not None:
        parts: List[str] = []
        if "professional_summary" in scoped_sections:
            parts.append("professional_summary")
        if "skills" in scoped_sections:
            parts.append("skills")
        if "work_experience" in scoped_sections:
            if work_idx_filter is not None:
                allowed = ", ".join(str(i) for i in sorted(work_idx_filter)) or "none"
                parts.append(f"work_experience (ONLY work_index in [{allowed}])")
            else:
                parts.append("work_experience")
        if "projects" in scoped_sections:
            if proj_idx_filter is not None:
                allowed = ", ".join(str(i) for i in sorted(proj_idx_filter)) or "none"
                parts.append(f"projects (ONLY project_index in [{allowed}])")
            else:
                parts.append("projects")
        allowed_desc = "; ".join(parts) if parts else "none"
        scope_rule = (
            f"- ALLOWED SCOPE — the user permits changes ONLY to: {allowed_desc}. "
            "Do NOT suggest changes to any other section or to any experience/project outside the allowed indexes.\n"
        )

    system = (
        "You are a resume tailoring coach. Suggest small, truthful edits so a resume fits a job better. "
        "Reply with a single JSON object only (no markdown fences). "
        "Never invent employers, degrees, dates, or metrics not supported by the resume."
    )
    user = f"""
Tailor this resume for the job. Round {rnd} of {MAX_ROUNDS}.

Rules:
- Suggest a COMPREHENSIVE set of changes in this single pass — up to {MAX_SUGGESTIONS_PER_PASS} — covering EVERY weak
  area at once (professional_summary, skills, each relevant work_experience entry, projects, and title/location when
  truthful). Do not hold anything back for "later rounds": propose every worthwhile change now.
- Aim to raise the match from {current_pct:.0f}% as close to 100% as is TRUTHFULLY possible. The user reviews and
  accepts or rejects each suggestion individually, so include every genuinely helpful edit.
- Each suggestion must be independent so it can be accepted or rejected on its own.
- Do NOT repeat suggestion ids already skipped: {list(skip) or "none"}.
- Only use sections: professional_summary, professional_title, location, skills, work_experience, projects.
- The snapshot's "education_context" and each entry's "technologies" are READ-ONLY context: use them to write more relevant edits, but never output a suggestion that edits education or a technologies list.
{scope_rule}- professional_title: align the headline title with the target job title ONLY when truthful (e.g., add a specialization the resume supports). Never claim a seniority or role the resume does not back up.
- location: only reformat or clarify the EXISTING location (e.g., add country, standard format). Do NOT invent a new city or imply relocation the resume doesn't state.
- For work_experience use work_index (0-based) and field "description" or "responsibilities".
- For skills: skills_after must list ALL existing skills, AND ADD any job-relevant skill the candidate already
  DEMONSTRATES elsewhere in the resume — i.e. it appears in a work description/bullet, a project description, or a
  technologies list — but is missing from the skills list. This is the main way to raise the skills match: surface
  skills the resume PROVES but the skills list omits. Put job-relevant skills first; keep every existing skill.
  When the job names a required skill and the resume shows evidence of it (e.g. it is in a project's technologies),
  add it. Do NOT add a skill that appears NOWHERE in the resume (skills, work, projects, technologies, summary) —
  that would be fabrication; if the job needs a skill the resume shows no evidence of, do not invent it.
  Skills are NAMES ONLY — never append proficiency levels, ratings, or labels (e.g. "Advanced", "Beginner",
  "Grundkenntnisse") to a skill; the builder has no skill-level field.
- {lang_rule}
- "before" must match current resume content; "after" is your improved version.

Return JSON:
{{
  "suggestions": [
    {{
      "id": "unique-stable-id",
      "section": "professional_summary|professional_title|location|skills|work_experience|projects",
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
        max_tokens=min(int(getattr(settings, "DEEPSEEK_TAILOR_MAX_TOKENS", 4096)), 4096),
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
        # Enforce the user's allowed scope server-side, regardless of model output.
        if norm and _in_scope(norm):
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
