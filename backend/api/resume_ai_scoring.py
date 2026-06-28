"""
Server-side resume scoring via DeepSeek using a fixed rubric and JSON output.
"""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Tuple

from django.conf import settings
from django.core.cache import cache

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client

logger = logging.getLogger(__name__)

# Holistic overall_score floor after model + length adjustments (matches rubric baseline for DeepSeek).
OVERALL_SCORE_BASE = 2.5

# Cache identical resumes so repeated "Get score" returns the SAME number (no LLM jitter)
# and avoids redundant API calls. Bump SCORE_CACHE_VERSION whenever the rubric/prompt
# changes so previously cached scores are invalidated.
SCORE_CACHE_VERSION = "v6"
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
    model = getattr(settings, "DEEPSEEK_MODEL", "")
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


def normalize_output_language(raw: Any) -> str:
    """UI / résumé section language: 'de' or 'en' (default)."""
    if not isinstance(raw, str):
        return "en"
    v = raw.strip().lower()
    if v in ("de", "deutsch", "german"):
        return "de"
    return "en"


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


def _length_penalty(estimated_pages: float, overall: float) -> float:
    """Harsh deduction when content exceeds ~2 pages."""
    if estimated_pages <= 2.0:
        return overall
    excess = estimated_pages - 2.0
    penalty = min(3.0, excess * 1.5)
    return max(0.0, round((overall - penalty) * 10) / 10)


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


def score_resume_with_deepseek(
    resume: Dict[str, Any],
    output_language: str = "en",
) -> Dict[str, Any]:
    """
    Returns dict with keys: overall_score, estimated_pages, categories, suggestions, overall_feedback
    (snake_case for DRF JSON).

    output_language: 'en' or 'de' — all prose fields (feedback, suggestions, overall_feedback) should match.
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

    if lang == "de":
        lang_rules = """
OUTPUT LANGUAGE (critical)
- Write **all** human-readable strings in **German** (professional Hochdeutsch): each category's "feedback",
  every string in "suggestions", and the full "overall_feedback" text.
- Use **Sie**-Form for tips addressed to the candidate.
- JSON **keys** stay in English. Each category "name" and numeric "max_score" MUST match the rubric exactly
  (English names below are required for the app parser).
"""
        overall_fb_rule = """
Also return "overall_feedback": **one string** in **German** formatted as a **short bullet list only**:
- Use **3 to 5 lines** separated by newline characters.
- Each line MUST start with "- " (dash + space) followed by **at most ~90 characters** of text (one compact idea per line).
- Cover: top strength, main gap/risk, top 1-2 fix priorities. No score numbers. No long paragraphs.
"""
    else:
        lang_rules = """
OUTPUT LANGUAGE (critical)
- Write **all** human-readable strings in **English**: each category's "feedback", every string in "suggestions",
  and the full "overall_feedback" text.
- JSON **keys** stay in English. Each category "name" and numeric "max_score" MUST match the rubric exactly.
"""
        overall_fb_rule = """
Also return "overall_feedback": **one string** in **English** formatted as a **short bullet list only**:
- Use **3 to 5 lines** separated by newline characters.
- Each line MUST start with "- " (dash + space) followed by **at most ~90 characters** of text (one compact idea per line).
- Cover: top strength, main gap/risk, top 1-2 fix priorities. No score numbers. No long paragraphs.
"""

    rubric = f"""
You score a resume JSON for the 123Resume builder. Apply this rubric strictly:
{lang_rules}

OVERALL SCORE BASELINE (critical)
- Treat **2.5 / 10** as the **baseline** overall_score for a minimal but structurally valid resume (little real content filled in).
- **Build upward from 2.5** as the candidate demonstrates quality across the categories; cap at **10.0**.
- Use **below 2.5** only for clearly unusable, empty, irrelevant, or broken submissions (rare).
- Your **overall_score** must be a single number from **0 to 10** (one decimal), reflecting this baseline (for typical resumes you will usually output **2.5–10.0**).

WEIGHTING
- Work experience (maps mainly to "Experience Section" and partly "Content Quality"):
  Award BIG points for EACH job entry that has a solid description.
  Add EXTRA points when optional fields are filled: location, start/end dates, technologies,
  competencies, responsibilities, company link, richer description.
- Education (maps mainly to "Education & Certifications"):
  Award BIG points for EACH education entry; EXTRA when optional fields are filled:
  location, dates, field of study, key courses, extra descriptions, link.
- Projects: FAIR (moderate) points — reflect mainly under "Content Quality" and a little under ATS if relevant.
- Certifications: FAIR (moderate) points — under "Education & Certifications" together with degrees.
- Personal website: PLUS (noticeable bonus within relevant categories / overall balance).
- LinkedIn: PLUS.
- GitHub: PLUS.
- Length: estimated_pages (~250 words per resume page). If >2, treat as a serious issue:
  lower relevant category scores, add strong concision suggestions, and reflect the problem in overall_score.
  (The server may apply an additional length adjustment to overall_score.)

RECRUITER REVIEW PRINCIPLES (apply when scoring AND when writing feedback/suggestions — a real recruiter spends ~20s and hunts for QUALIFICATIONS, not keywords):
- QUALIFICATIONS OVER KEYWORDS: a strong experience/project bullet states WHAT (tech/skill) + HOW it was used + WHY it
  mattered in plain business terms + WHERE (team / product / industry). A bullet that is only a list of technologies with
  no how/why is weak ("keyword soup") — score it low and, in suggestions, show how to rewrite it as What+How+Why+Where.
- BUSINESS IMPACT IN PLAIN LANGUAGE: reward outcomes a non-technical manager understands (revenue, cost saved, time saved,
  uptime, users, risk reduced). Raw metrics or jargon with no business reason are weaker than impact tied to a reason.
- AVOID OVER-TECHNICAL, TOOL-DROPPING BULLETS: naming tools (e.g., S3, Lambda, Glue, Pinecone, SageMaker, Bedrock) without
  explaining why they mattered adds little — flag it.
- FOCUS ON ONE JOB TITLE: if the resume mixes distinct target titles (e.g., Full-Stack Engineer + Data Engineer), relevance
  is diluted — note it and suggest tailoring to a single target title.
- CONTACT/LOCATION: if a location (city/country) is missing from personalInfo, flag it as a likely rejection risk. NEVER
  suggest writing "open to relocation".
- NO DUPLICATE KEYWORDS within the same role's bullets — suggest consolidating instead of repeating the same tech.
- COMMUNICATION: value evidence of explaining technical work to non-technical stakeholders.
- Strong bullets usually surface ~3+ relevant skills used in real context (not a bare keyword list).

FIELD MAP — READ THE RESUME BEFORE SUGGESTING (critical)
- The professional title / headline is `personalInfo.professionalTitle`.
- Each job's role title is `workExperience[i].position`; the employer is `workExperience[i].company`.
- The COMPANY LINK for a job is `workExperience[i].link`. A project's link is `projects[i].link`; an education
  entry's link is `education[i].link`; a certificate's link is `certificates[i].url`.
- The professional summary is `personalInfo.summary`. Location is `personalInfo.location`.
  Links are `personalInfo.linkedin`, `personalInfo.github`, `personalInfo.website`.
- Skills are in `skills[]` and `skillGroups[]`. Education is in `education[]`. Projects in `projects[]`.
- BEFORE writing any suggestion, CHECK whether that field is already filled in the JSON — including links.
  NEVER tell the candidate to "add a link/role/title/summary/location/skill" that is ALREADY present
  (e.g. if `workExperience[i].link` is non-empty, do NOT suggest adding a company link; if professionalTitle
  or a position is filled, do NOT suggest adding a role/title). Only suggest adding something for entries where
  that exact field is genuinely empty.
  If a field already has content, your only valid suggestion about it is to IMPROVE the existing wording —
  and say so explicitly ("Strengthen your <field> by …"), never "add" it.

CATEGORIES (exact names and max_score — you MUST output all six):
1) Content Quality — max_score 3
2) Professional Summary — max_score 1
3) Experience Section — max_score 2
4) Skills & Proficiency — max_score 1
5) Education & Certifications — max_score 0.5
6) ATS Optimization — max_score 0.5

Each category needs: "name" (exact string above), "score" (0 to max_score inclusive), "max_score" (exact as listed),
and "feedback": **one** short bullet line in the OUTPUT LANGUAGE (start with "- ", max ~120 characters total).

Also return "overall_score" from 0 to 10 (float, one decimal) using the **2.5 baseline** described above,
and "suggestions": array of **at most 4** strings in the OUTPUT LANGUAGE (no duplicates): each string is **one** bullet
line starting with "- " plus a compact tip (max ~110 characters per string including the "- ").

SUGGESTIONS MUST BE FIXABLE INSIDE THE 123Resume BUILDER (critical)
- Every suggestion MUST be about EDITING THE CONTENT of a field the user can change in the builder:
  the professional summary, a work-experience role summary or bullet, the skills list, a project description,
  education details, certifications, or a missing contact field (location, LinkedIn, GitHub, website).
- Each suggestion should make it obvious WHICH field to edit and WHAT to change (e.g. "Rewrite your summary to…",
  "In your <role> experience, turn the tech list into What+How+Why+Where", "Add your city to your contact details",
  "Add 2–3 core skills you actually used in your roles").
- NEVER suggest anything about visual formatting, layout, design, fonts, font size, colors, spacing, margins,
  templates, section styling, file/export format (PDF/Word), photo, or generic "use an ATS-friendly format" advice.
  The builder handles all of that — such tips are off-limits and must not appear.
- NEVER suggest adding proficiency levels, skill levels, ratings, percentages, or bars to SKILLS (e.g. "Advanced",
  "Beginner", "Expert", "Grundkenntnisse", "Fortgeschritten"). The skills field stores names only and has no level
  input — such advice is not actionable in the builder and must not appear. (This does NOT apply to the separate
  Languages section, which has its own proficiency field; do not give skills-level advice there either.)
- NEVER give vague advice ("proofread", "make it pop", "be more professional"); always point to a concrete field + edit.
Make suggestions specific and actionable using the RECRUITER REVIEW PRINCIPLES above — prefer fixes like turning a
keyword-only bullet into What+How+Why+Where, adding plain-language business impact, adding a missing location,
adding a relevant skill, or tailoring a summary/role to one job title.
{overall_fb_rule}

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
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert resume reviewer. Output only valid JSON as instructed. "
                    "Follow OUTPUT LANGUAGE for every prose field."
                ),
            },
            {"role": "user", "content": user_msg},
        ],
        max_tokens=max_out,
        # Deterministic output: same prompt => same score (no run-to-run jitter).
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
    overall = max(0.0, min(10.0, round(overall * 10) / 10))
    overall = _length_penalty(estimated_pages, overall)
    overall = max(OVERALL_SCORE_BASE, min(10.0, round(overall * 10) / 10))

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
