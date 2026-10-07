"""
Server-side resume scoring via DeepSeek using a fixed rubric and JSON output.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.core.cache import cache

from .ai_language import normalize_output_language, output_language_rule  # noqa: F401 (re-exported)
from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import deepseek_max_tokens, deepseek_request_options, get_deepseek_client

logger = logging.getLogger(__name__)

# The score is the model's judgment of interview chances: 1 = thrown out, 10 = very likely.
SCORE_MIN, SCORE_MAX = 1.0, 10.0

# Cache identical resumes so repeated "Get score" returns the SAME number (no LLM jitter)
# and avoids redundant API calls. Bump SCORE_CACHE_VERSION whenever the rubric/prompt
# changes so previously cached scores are invalidated.
SCORE_CACHE_VERSION = "v8"
SCORE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30  # 30 days


def _score_cache_key(resume: Dict[str, Any], lang: str) -> str:
    """Stable key from a canonical JSON of the resume CONTENT + language + model + rubric version.

    Visual-only fields (styling, template, section order) are excluded so that changing
    colors or fonts does not bust the cache or change the score — only content matters.
    """
    try:
        canonical = json.dumps(
            _strip_non_content(resume),
            sort_keys=True,
            separators=(",", ":"),
            default=str,
            ensure_ascii=False,
        )
    except Exception:
        canonical = repr(resume)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    model = getattr(settings, "AI_MODEL", "")
    return f"resume_score:{SCORE_CACHE_VERSION}:{model}:{lang}:{digest}"

# Must match frontend resumeScorer + CVFormContainer category mapping
EXPECTED_CATEGORIES: List[Tuple[str, float]] = [
    ("Content Quality", 3.0),
    ("Professional Summary", 1.0),
    ("Experience Section", 2.0),
    ("Skills & Proficiency", 1.0),
    ("Education & Certifications", 0.5),
    ("ATS Optimization", 0.5),
]


def summarize_resume_payload_for_log(data: Dict[str, Any]) -> Dict[str, Any]:
    """PII-safe counts for debugging empty or wrong AI scores."""
    if not isinstance(data, dict):
        return {"error": "not_a_dict"}
    pi = data.get("personalInfo") or data.get("personal_info") or {}
    if not isinstance(pi, dict):
        pi = {}
    work = data.get("workExperience") or data.get("work_experience") or []
    if not isinstance(work, list):
        work = []
    with_role = 0
    with_bullets = 0
    for exp in work:
        if not isinstance(exp, dict):
            continue
        if (exp.get("position") or exp.get("company") or "").strip():
            with_role += 1
        bullets = 0
        for resp in exp.get("responsibilities") or []:
            if isinstance(resp, str) and resp.strip():
                bullets += 1
            elif isinstance(resp, dict) and (resp.get("responsibility") or "").strip():
                bullets += 1
        if bullets or (exp.get("description") or "").strip():
            with_bullets += 1
    skills = data.get("skills") or []
    skill_n = (
        len([s for s in skills if isinstance(s, dict) and (s.get("skill") or "").strip()])
        if isinstance(skills, list)
        else 0
    )
    return {
        "template": data.get("template"),
        "has_work_experience_key": "workExperience" in data,
        "has_work_experience_snake_key": "work_experience" in data,
        "work_experience_count": len(work),
        "work_with_position_or_company": with_role,
        "work_with_bullets_or_description": with_bullets,
        "education_count": len(data.get("education") or []) if isinstance(data.get("education"), list) else 0,
        "skills_count": skill_n,
        "summary_chars": len((pi.get("summary") or "")),
    }


def estimate_resume_pages(data: Dict[str, Any]) -> float:
    """Mirror frontend estimateResumeLength (~250 words per page)."""
    if not isinstance(data, dict):
        return 0.0
    pi = data.get("personalInfo") or {}
    wc = 0
    wc += len((pi.get("summary") or "").split())
    wc += len((pi.get("professionalTitle") or "").split())

    work_list = data.get("workExperience") or data.get("work_experience") or []
    for exp in work_list:
        if not isinstance(exp, dict):
            continue
        wc += len((exp.get("description") or "").split())
        wc += len((exp.get("position") or "").split())
        wc += len((exp.get("company") or "").split())
        for resp in exp.get("responsibilities") or []:
            if isinstance(resp, str):
                wc += len(resp.split())
            elif isinstance(resp, dict):
                wc += len((resp.get("responsibility") or "").split())

    for edu in data.get("education") or []:
        if not isinstance(edu, dict):
            continue
        wc += len((edu.get("degree") or "").split())
        wc += len((edu.get("field") or "").split())

    for proj in data.get("projects") or []:
        if not isinstance(proj, dict):
            continue
        wc += len((proj.get("description") or "").split())

    for pub in data.get("publications") or []:
        if not isinstance(pub, dict):
            continue
        wc += len((pub.get("title") or "").split())
        wc += len((pub.get("description") or "").split())
        wc += len((pub.get("publisher") or "").split())

    skills = data.get("skills") or []
    if isinstance(skills, list):
        wc += len(skills) * 0.5

    return wc / 250.0 if wc else 0.0


def _trim_text_fields(node: Any, max_len: int) -> None:
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if k in ("description", "summary") and isinstance(v, str) and len(v) > max_len:
                node[k] = v[:max_len] + "…"
            else:
                _trim_text_fields(v, max_len)
    elif isinstance(node, list):
        for item in node:
            _trim_text_fields(item, max_len)


# Non-content keys carry only visual/layout state. They add noise to the prompt and
# can bury real content (e.g. the professional title), making the model think a filled
# field is missing. Strip them before scoring — they have no bearing on the rubric.
_NON_CONTENT_TOP_KEYS = (
    "styling",
    "template",
    "sectionOrder",
    "section_order",
    "sectionStyling",
    "section_styling",
    "completenessScore",
    "clarityScore",
    "formattingScore",
    "impactScore",
    "overallScore",
)


def _strip_non_content(data: Dict[str, Any]) -> Dict[str, Any]:
    d = copy.deepcopy(data) if isinstance(data, dict) else {}
    for key in _NON_CONTENT_TOP_KEYS:
        d.pop(key, None)
    return d


def resume_json_for_prompt(data: Dict[str, Any], max_chars: int = 26000) -> str:
    d = _strip_non_content(data)
    for lim in (1500, 900, 600, 400, 280):
        _trim_text_fields(d, lim)
        out = json.dumps(d, default=str, ensure_ascii=False)
        if len(out) <= max_chars:
            return out
    return json.dumps(d, default=str, ensure_ascii=False)[:max_chars]


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def _normalize_categories(raw: Any, lang: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    by_name = {row.get("name"): row for row in raw if isinstance(row, dict)}
    default_fb = "Siehe Verbesserungsvorschläge." if lang == "de" else "See suggestions."
    missing_fb = (
        "Vom Modell nicht bewertet; Standardwert null."
        if lang == "de"
        else "Not scored by model; defaulting to zero."
    )
    for name, max_score in EXPECTED_CATEGORIES:
        row = by_name.get(name)
        if not isinstance(row, dict):
            score, feedback = 0.0, missing_fb
        else:
            try:
                score = float(row.get("score", 0))
            except (TypeError, ValueError):
                score = 0.0
            feedback = str(row.get("feedback") or "").strip() or default_fb
        score = max(0.0, min(float(max_score), round(score * 10) / 10))
        out.append(
            {
                "name": name,
                "score": score,
                "max_score": max_score,
                "feedback": feedback[:200],
            }
        )
    return out


# JSON example for the model prompt — must NOT live inside an f-string (braces break f-string parsing).
_RUBRIC_JSON_SHAPE = """
Return ONLY valid JSON with this shape (no markdown, no prose outside JSON):
{
  "overall_score": <number>,
  "overall_feedback": "<string>",
  "categories": [
    {"name":"Content Quality","score":<number>,"max_score":3,"feedback":"..."},
    {"name":"Professional Summary","score":<number>,"max_score":1,"feedback":"..."},
    {"name":"Experience Section","score":<number>,"max_score":2,"feedback":"..."},
    {"name":"Skills & Proficiency","score":<number>,"max_score":1,"feedback":"..."},
    {"name":"Education & Certifications","score":<number>,"max_score":0.5,"feedback":"..."},
    {"name":"ATS Optimization","score":<number>,"max_score":0.5,"feedback":"..."}
  ],
  "suggestions": ["..."]
}
""".strip()


def _previous_review_block(previous: Optional[Dict[str, Any]]) -> str:
    """
    Prompt context for a re-score after the user edited the resume.

    Without it every re-score was judged from scratch, so the number drifted for
    reasons unrelated to what the user changed. With the old score and the exact
    edits, the model judges whether those edits moved the interview chances.
    """
    if not isinstance(previous, dict):
        return ""
    try:
        score = float(previous.get("score"))
    except (TypeError, ValueError):
        return ""
    lines = []
    for ch in (previous.get("changes") or [])[:20]:
        if not isinstance(ch, dict):
            continue
        before = str(ch.get("before") or "").strip()[:300]
        after = str(ch.get("after") or "").strip()[:300]
        if before == after:
            continue
        where = str(ch.get("path") or "").strip()[:80]
        lines.append(f'- {where}: "{before or "(empty)"}" -> "{after or "(removed)"}"')
    if not lines:
        return ""
    return f"""
PREVIOUS REVIEW
This resume scored {score:.1f} before the candidate made these edits (many are suggestions from our AI they accepted):
{chr(10).join(lines)}
Score the CURRENT resume on its own merits, but stay consistent with that earlier review: edits that genuinely
improve the interview chances should raise the score by as much as they are worth; do not move the score for
reasons unrelated to these edits.
"""


def score_resume_with_deepseek(
    resume: Dict[str, Any],
    output_language: str = "en",
    previous: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Returns dict with keys: overall_score, estimated_pages, categories, suggestions, overall_feedback
    (snake_case for DRF JSON).

    output_language: fallback language for the prose (it follows the resume's own language).
    previous: optional {score, changes:[{path, before, after}]} from the last score, see
    _previous_review_block. Not part of the cache key: the same resume gets the same score.
    """
    lang = normalize_output_language(output_language)

    # Deterministic cache: identical resume + language => identical score, served
    # from cache without another (jittery) model call.
    cache_key = _score_cache_key(resume, lang)
    try:
        cached = cache.get(cache_key)
    except Exception:
        cached = None
    if isinstance(cached, dict):
        logger.info("resume_score cache hit key=%s overall=%s", cache_key, cached.get("overall_score"))
        return cached

    estimated_pages = estimate_resume_pages(resume)
    payload = resume_json_for_prompt(resume)

    lang_rules = output_language_rule(
        lang,
        writes='every human-readable string: each category\'s "feedback", every string in "suggestions" and the full "overall_feedback"',
    ) + """
- JSON **keys** stay in English. Each category "name" and numeric "max_score" MUST match the rubric exactly
  (the English names below are required by the app parser), whatever language the prose is in.
"""
    target_role = ""
    pi = resume.get("personalInfo") or resume.get("personal_info") or {}
    if isinstance(pi, dict):
        target_role = str(pi.get("professionalTitle") or pi.get("professional_title") or "").strip()
    if not target_role:
        work = resume.get("workExperience") or resume.get("work_experience") or []
        if isinstance(work, list) and work and isinstance(work[0], dict):
            target_role = str(work[0].get("position") or "").strip()

    rubric = f"""
You are an experienced recruiter reviewing a resume for the 123Resume builder.
{lang_rules}

THE SCORE
Give "overall_score" from 1 to 10 (one decimal): your honest judgment of how likely this resume is to get
the candidate an INTERVIEW for the role it targets: {target_role or "the role its experience points to"}.
- 10 = very high chance of an interview call for that role.
- 1 = the resume would be thrown out within seconds for that role.
Judge it the way a real recruiter for that role would in a 30-second read: relevant experience and
concrete achievements, a clear story for that one role, skills that match it, and nothing missing that
gets resumes rejected (no location, no dates, empty sections). More than 2 pages (estimated_pages) hurts.

Also rate six areas, each "score" from 0 to its max_score by the same judgment (how much that area helps
the interview chance), with "feedback": **one** short line in the OUTPUT LANGUAGE starting with "- " (max ~120 characters):
1) Content Quality (max 3)  2) Professional Summary (max 1)  3) Experience Section (max 2)
4) Skills & Proficiency (max 1)  5) Education & Certifications (max 0.5)  6) ATS Optimization (max 0.5)
{_previous_review_block(previous)}
SUGGESTIONS: "suggestions" is an array of **at most 4** strings in the OUTPUT LANGUAGE, the edits that would most
raise the interview chance. Each is **one** line starting with "- " (max ~110 characters).
- Each must point at a field the user can edit in the builder and say what to change: the summary, a role's
  description or bullets, the skills list, a project, education, certificates, or a missing location/LinkedIn/
  GitHub/website (`personalInfo.location`, `.linkedin`, `.github`, `.website`).
- CHECK the JSON first: never suggest adding something that is already filled in (a job's company link is
  `workExperience[i].link`); for filled fields, suggest how to strengthen them instead.
- Never suggest layout, design, fonts, templates, photos, file formats or "ATS-friendly formatting": the builder
  handles those. Never suggest skill levels or ratings. Never "open to relocation". No vague advice like "proofread".

"overall_feedback": **one string** in the OUTPUT LANGUAGE, 3 to 5 lines separated by newlines, each starting with
"- " (max ~90 characters): top strength, main risk, top fix. No score numbers.

{_RUBRIC_JSON_SHAPE}
""".strip()

    user_msg = (
        f"{rubric}\n\n"
        f'estimated_pages (server): {estimated_pages:.2f}\n\n'
        f"resume_json:\n{payload}"
    )

    client = get_deepseek_client()
    max_out = settings.DEEPSEEK_RESUME_SCORE_MAX_TOKENS
    completion = client.chat.completions.create(
        **deepseek_request_options(),
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an experienced recruiter. Output only valid JSON as instructed. "
                    "Follow OUTPUT LANGUAGE for every prose field."
                ),
            },
            {"role": "user", "content": user_msg},
        ],
        max_tokens=deepseek_max_tokens(max_out),
        # Run-to-run jitter is handled by the content cache: same resume => same score.
        temperature=0,
    )
    raw_text = (completion.choices[0].message.content or "").strip()
    if not raw_text:
        raise ValueError("Empty model response")

    try:
        parsed = _extract_json_object(raw_text)
    except json.JSONDecodeError as e:
        logger.warning("Failed to parse AI score JSON: %s | snippet=%s", e, raw_text[:400])
        raise

    try:
        overall = float(parsed.get("overall_score", 0))
    except (TypeError, ValueError):
        overall = 0.0
    overall = max(SCORE_MIN, min(SCORE_MAX, round(overall * 10) / 10))

    categories = _normalize_categories(parsed.get("categories"), lang)
    suggestions_raw = parsed.get("suggestions") or []
    if not isinstance(suggestions_raw, list):
        suggestions_raw = []
    suggestions = []
    for s in suggestions_raw:
        if isinstance(s, str) and s.strip():
            suggestions.append(s.strip()[:120])
    suggestions = list(dict.fromkeys(suggestions))[:5]

    overall_feedback_raw = parsed.get("overall_feedback")
    if isinstance(overall_feedback_raw, str):
        overall_feedback = overall_feedback_raw.strip()[:600]
    else:
        overall_feedback = ""

    result = {
        "overall_score": overall,
        "estimated_pages": round(estimated_pages * 100) / 100,
        "categories": categories,
        "suggestions": suggestions,
        "overall_feedback": overall_feedback,
    }
    log_deepseek_exchange("resume_score", completion, raw_text, result)

    # Cache so the same resume always returns this exact score on future requests.
    try:
        cache.set(cache_key, result, SCORE_CACHE_TTL_SECONDS)
    except Exception:
        logger.warning("resume_score cache.set failed for key=%s", cache_key)

    return result
