"""
Batch "Improve my resume" via Claude.

Rewrites ONLY free-text fields the user can edit in the builder:
  - personalInfo.summary            (professional summary)
  - workExperience[i].description   (role summary)
  - projects[i].description         (project description)

Returns a list of proposed changes — each with the react-hook-form field
`path`, a human `label`, the `original` text, and the `improved` text — so the
frontend can present an Accept/Reject card per change.

Three kinds of change, each with `points` (estimated overall-score gain, 0–10 scale):
  - rewrites of text that already exists (no facts invented),
  - additions (kind "add"): new skills, work bullets and project highlights
    that fit the candidate's roles. These are proposals: the user is told to
    accept only what is true for them, and the model may not invent numbers.
    For an addition, `path` is the array to append to and `original` is "".
  - deletions (kind "delete"): existing text that hurts the resume (filler,
    ambiguity, duplication), with a `reason`; `improved` is "".
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from django.conf import settings

from .ai_response_log import log_ai_exchange
from .ai_client import ai_request_options, get_ai_client
from .ai_language import normalize_output_language, output_language_rule

logger = logging.getLogger(__name__)

# Safety caps so one call can't blow up the prompt.
MAX_ITEMS = 24
MAX_ITEM_CHARS = 1200
MAX_OUTPUT_CHARS = 600
MAX_NEW_SKILLS = 5
MAX_NEW_BULLETS_PER_ROLE = 2
MAX_NEW_BULLETS = 6
MAX_NEW_HIGHLIGHTS = 3
MAX_ADDITION_CHARS = 220
MAX_DELETIONS = 6
MAX_REASON_CHARS = 180

# Per-change score gain (same 0–10 scale as the resume score).
MIN_POINTS = 0.1
MAX_POINTS = 1.0


def _clamp_points(value: Any) -> float:
    """Normalize the model's estimated score gain to one decimal in [MIN, MAX]."""
    try:
        pts = float(value)
    except (TypeError, ValueError):
        return MIN_POINTS
    return round(min(MAX_POINTS, max(MIN_POINTS, pts)), 1)


def _normalize_points_to_gap(changes: List[Dict[str, Any]], gap: float) -> List[Dict[str, Any]]:
    """
    Rescale the per-change points so they add up to EXACTLY `gap` (the distance
    from the current score to 10). The model's own points are kept as weights;
    allocation happens in tenths with largest-remainder rounding, so a user who
    accepts every suggestion lands precisely on 10/10.
    """
    if not changes or gap <= 0:
        for c in changes:
            c["points"] = 0.0
        return changes
    weights = [float(c.get("points") or 0.0) for c in changes]
    total = sum(weights)
    if total <= 0:
        weights = [1.0] * len(changes)
        total = float(len(changes))
    gap_tenths = int(round(gap * 10))
    raw = [w / total * gap_tenths for w in weights]
    allocated = [int(x) for x in raw]
    leftover = gap_tenths - sum(allocated)
    by_remainder = sorted(range(len(raw)), key=lambda i: raw[i] - allocated[i], reverse=True)
    for i in by_remainder[:leftover]:
        allocated[i] += 1
    for change, tenths in zip(changes, allocated):
        change["points"] = tenths / 10.0
    return changes


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


def _roles_and_skills(resume: Dict[str, Any]) -> Dict[str, Any]:
    """What the model needs to propose additions: roles, projects, existing skills."""
    roles = []
    work = _get_block(resume, "workExperience", "work_experience") or []
    if isinstance(work, list):
        for idx, exp in enumerate(work):
            if isinstance(exp, dict) and (_norm(exp.get("position")) or _norm(exp.get("company"))):
                bullets = [
                    _norm_subitem(r, "responsibility") for r in (exp.get("responsibilities") or [])
                ]
                roles.append({
                    "role": idx,
                    "position": _norm(exp.get("position")),
                    "company": _norm(exp.get("company")),
                    "existing_bullets": [b for b in bullets if b][:8],
                })
    projects = []
    for idx, proj in enumerate(resume.get("projects") or []):
        if isinstance(proj, dict) and _norm(proj.get("name")):
            projects.append({"project": idx, "name": _norm(proj.get("name")),
                             "description": _norm(proj.get("description"))[:300]})

    skills = [_norm_subitem(sk, "skill") for sk in (resume.get("skills") or [])]
    groups = resume.get("skillGroups") or resume.get("skill_groups") or []
    for g in groups if isinstance(groups, list) else []:
        if isinstance(g, dict):
            skills += [_norm_subitem(sk, "skill") for sk in (g.get("skills") or [])]
    skills = [sk for sk in skills if sk]

    # New skills go where the user keeps theirs: the flat list, or the first group.
    flat = [sk for sk in (resume.get("skills") or []) if _norm_subitem(sk, "skill")]
    skills_path = "skills"
    if not flat and isinstance(groups, list) and groups and isinstance(groups[0], dict):
        skills_path = "skillGroups.0.skills"
    return {"roles": roles, "projects": projects, "skills": skills, "skills_path": skills_path}


def _collect_additions(parsed: Dict[str, Any], ctx: Dict[str, Any]) -> List[Dict[str, str]]:
    """Validate the model's proposed additions into change dicts (kind "add")."""
    adds = parsed.get("additions") if isinstance(parsed.get("additions"), dict) else {}
    out: List[Dict[str, str]] = []

    have = {sk.lower() for sk in ctx["skills"]}
    for raw in (adds.get("skills") or [])[: MAX_NEW_SKILLS * 2]:
        # Entries are either plain strings or {"text": ..., "points": ...}.
        points = _clamp_points(raw.get("points") if isinstance(raw, dict) else None)
        skill = _norm(raw.get("text") if isinstance(raw, dict) else raw)[:60]
        if skill and skill.lower() not in have and len([c for c in out if c["kind"] == "add"]) < MAX_NEW_SKILLS:
            have.add(skill.lower())
            out.append({"path": ctx["skills_path"], "label": "New skill", "original": "",
                        "improved": skill, "kind": "add", "points": points})

    roles = {r["role"]: r for r in ctx["roles"]}
    per_role: Dict[int, int] = {}
    n_bullets = 0
    for row in adds.get("bullets") or []:
        if not isinstance(row, dict) or n_bullets >= MAX_NEW_BULLETS:
            continue
        try:
            idx = int(row.get("role"))
        except (TypeError, ValueError):
            continue
        text = _norm(row.get("text"))[:MAX_ADDITION_CHARS].lstrip("-• ").strip()
        role = roles.get(idx)
        if not role or not text or per_role.get(idx, 0) >= MAX_NEW_BULLETS_PER_ROLE:
            continue
        if text.lower() in {b.lower() for b in role["existing_bullets"]}:
            continue
        per_role[idx] = per_role.get(idx, 0) + 1
        n_bullets += 1
        label_role = " at ".join([p for p in (role["position"], role["company"]) if p])
        out.append({"path": f"workExperience.{idx}.responsibilities", "label": f"New bullet — {label_role}",
                    "original": "", "improved": text, "kind": "add",
                    "points": _clamp_points(row.get("points"))})

    projects = {p["project"]: p for p in ctx["projects"]}
    n_high = 0
    for row in adds.get("highlights") or []:
        if not isinstance(row, dict) or n_high >= MAX_NEW_HIGHLIGHTS:
            continue
        try:
            idx = int(row.get("project"))
        except (TypeError, ValueError):
            continue
        text = _norm(row.get("text"))[:MAX_ADDITION_CHARS].lstrip("-• ").strip()
        if idx in projects and text:
            n_high += 1
            out.append({"path": f"projects.{idx}.highlights", "label": f"New highlight — {projects[idx]['name']}",
                        "original": "", "improved": text, "kind": "add",
                        "points": _clamp_points(row.get("points"))})
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


def improve_resume_fields(
    resume: Dict[str, Any],
    output_language: str = "en",
    current_score: float | None = None,
) -> List[Dict[str, Any]]:
    """
    Returns a list of proposed changes:
      [{path, label, original, improved, kind?}, ...]
    Rewrites only where the improved text differs meaningfully from the original,
    then additions (kind "add"). Empty list means "nothing to improve".
    """
    if not settings.AI_ENABLED:
        raise RuntimeError("AI provider is not configured")

    lang = normalize_output_language(output_language)
    items = collect_improvable_items(resume)
    ctx = _roles_and_skills(resume)
    if not items and not ctx["roles"]:
        return []

    lang_rule = output_language_rule(lang, writes="each improved text", source="that field's original text")

    # Points: with the current score known, the suggestions must together close
    # the exact gap to a 10/10 (the backend rescales to guarantee the sum).
    gap = round(max(0.0, 10.0 - current_score), 1) if current_score is not None else None
    if gap is not None:
        points_rule = (
            f"POINTS. The resume's current overall score is {current_score}/10. For EVERY rewrite, addition "
            f"and deletion, give \"points\": that change's share of the remaining {gap} points. The points of "
            f"ALL your suggestions together MUST add up to exactly {gap}, so a user who applies every single "
            "suggestion reaches a 10/10 resume. Weight each change's share by its real impact: fixing a vague "
            "summary or an empty section is worth far more than a cosmetic rewording. Cover every real "
            "weakness you can find, so that applying everything genuinely earns the perfect score."
        )
    else:
        points_rule = (
            f"POINTS. The resume has an overall score from 0 to 10. For EVERY rewrite, addition and deletion you "
            f"propose, estimate \"points\": how much the overall score would improve if the user applies that one "
            f"change, as a number between {MIN_POINTS} and {MAX_POINTS} (one decimal). Be honest and conservative: "
            f"a cosmetic rewording is {MIN_POINTS}; a change that fixes a real weakness (vague summary, empty "
            "bullet, unprofessional wording) is worth more. Points are estimates, not a promise."
        )

    # Compact list the model sees — id + kind + context + original text only.
    model_items = [
        {"id": it["id"], "kind": it["kind"], "context": it["context"], "original": it["original"]}
        for it in items
    ]

    system = (
        "You improve resumes: you rewrite existing text fields, propose relevant additions, "
        "and flag text that hurts the resume and should be removed. "
        "Reply with a single JSON object only (no markdown fences). "
        "Rewrites keep the same facts; never invent employers, dates, numbers or metrics."
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

{points_rule}

PART 2 — ADDITIONS. Also propose new content the candidate can add, whenever you find anything relevant:
- "skills": up to {MAX_NEW_SKILLS} skills that fit their roles and title and are NOT already in their skills list
  (core tools and abilities someone in these roles almost certainly uses).
- "bullets": for each role, up to {MAX_NEW_BULLETS_PER_ROLE} new bullet points (max {MAX_NEW_BULLETS} in total) about work
  someone in that position at that company very likely did, judging from the title, company and existing text.
  Start with a strong action verb. Don't repeat what an existing bullet already says.
- "highlights": up to {MAX_NEW_HIGHLIGHTS} new project highlights, only when a project's description supports them.
The candidate decides whether each addition is true for them, so: NEVER put numbers, percentages, amounts,
team sizes or other metrics in an addition, and never name employers, clients or certifications that aren't in the resume.
Write additions in the resume's own language. Return empty lists when nothing fits.

PART 3 — DELETIONS. Flag up to {MAX_DELETIONS} input fields (by id) whose text actively HURTS the
resume and is better deleted than rewritten: meaningless filler, vague buzzword soup with no content,
duplicated statements, unprofessional or ambiguous claims a recruiter would question. For each, give
a short "reason" (max {MAX_REASON_CHARS} characters, in the resume's own language, addressed to the
user) and "points". Only flag text that is genuinely harmful — an empty list is the normal case.
Never flag a field you are also meaningfully rewriting; pick one: rewrite it OR delete it.

Return JSON exactly as:
{{"items": [{{"id": "<id>", "improved": "<improved text>", "points": <number>}}, ...],
  "additions": {{"skills": [{{"text": "<skill>", "points": <number>}}, ...],
                 "bullets": [{{"role": <role number>, "text": "<bullet>", "points": <number>}}, ...],
                 "highlights": [{{"project": <project number>, "text": "<highlight>", "points": <number>}}, ...]}},
  "deletions": [{{"id": "<id>", "reason": "<why this hurts the resume>", "points": <number>}}, ...]}}
Include one item per input id, preserving ids.

Fields to improve (JSON):
{json.dumps(model_items, ensure_ascii=False)}

Roles, projects and current skills (for additions; "role"/"project" are the numbers to return):
{json.dumps({"roles": ctx["roles"], "projects": ctx["projects"], "skills": ctx["skills"]}, ensure_ascii=False)}
""".strip()

    client = get_ai_client()
    completion = client.chat.completions.create(
        **ai_request_options(),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        # Long / German resumes produce many improved fields; a low cap truncated
        # the JSON mid-string and broke parsing. Give ample room and force JSON mode.
        max_tokens=getattr(settings, "AI_RESUME_IMPROVE_MAX_TOKENS", 8192),
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

    improved_by_id: Dict[str, Dict[str, Any]] = {}
    for row in parsed.get("items") or []:
        if not isinstance(row, dict):
            continue
        rid = str(row.get("id") or "").strip()
        improved = _norm(row.get("improved"))
        if rid and improved:
            improved_by_id[rid] = {
                "improved": improved[:MAX_OUTPUT_CHARS],
                "points": _clamp_points(row.get("points")),
            }

    # Deletions: fields whose text hurts the resume. A deletion wins over a
    # rewrite of the same field (the model is told to pick one, but be safe).
    deletions_by_id: Dict[str, Dict[str, Any]] = {}
    for row in (parsed.get("deletions") or [])[:MAX_DELETIONS]:
        if not isinstance(row, dict):
            continue
        rid = str(row.get("id") or "").strip()
        if rid:
            deletions_by_id[rid] = {
                "reason": _norm(row.get("reason"))[:MAX_REASON_CHARS],
                "points": _clamp_points(row.get("points")),
            }

    changes: List[Dict[str, Any]] = []
    for it in items:
        original = it["original"]
        deletion = deletions_by_id.get(it["id"])
        if deletion:
            changes.append(
                {
                    "path": it["path"],
                    "label": it["label"],
                    "original": original,
                    "improved": "",
                    "kind": "delete",
                    "reason": deletion["reason"],
                    "points": deletion["points"],
                }
            )
            continue
        row = improved_by_id.get(it["id"])
        improved = row["improved"] if row else ""
        # Skip when the model returned nothing or text that is effectively unchanged.
        if not improved or improved.strip().lower() == original.strip().lower():
            continue
        changes.append(
            {
                "path": it["path"],
                "label": it["label"],
                "original": original,
                "improved": improved,
                "points": row["points"],
            }
        )

    changes += _collect_additions(parsed, ctx)

    # Make "accept everything → 10/10" arithmetically true, whatever the model said.
    if gap is not None:
        changes = _normalize_points_to_gap(changes, gap)

    logger.info(
        "resume_improve model_ok lang=%s items_in=%d changes_out=%d",
        lang,
        len(items),
        len(changes),
    )
    log_ai_exchange(
        "resume_improve",
        completion,
        raw,
        {"changes": [{"path": c["path"], "improved": c["improved"][:120]} for c in changes]},
    )
    return changes
