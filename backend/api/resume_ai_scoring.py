"""
Server-side resume scoring via DeepSeek using a fixed rubric and JSON output.
"""
from __future__ import annotations

import copy
import json
import logging
import re
from typing import Any, Dict, List, Tuple

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client

logger = logging.getLogger(__name__)

# Holistic overall_score floor after model + length adjustments (matches rubric baseline for DeepSeek).
OVERALL_SCORE_BASE = 2.5

# Must match frontend resumeScorer + CVFormContainer category mapping
EXPECTED_CATEGORIES: List[Tuple[str, float]] = [
    ("Content Quality", 3.0),
    ("Professional Summary", 1.0),
    ("Experience Section", 2.0),
    ("Skills & Proficiency", 1.0),
    ("Education & Certifications", 0.5),
    ("ATS Optimization", 0.5),
]


def estimate_resume_pages(data: Dict[str, Any]) -> float:
    """Mirror frontend estimateResumeLength (~250 words per page)."""
    if not isinstance(data, dict):
        return 0.0
    pi = data.get("personalInfo") or {}
    wc = 0
    wc += len((pi.get("summary") or "").split())
    wc += len((pi.get("professionalTitle") or "").split())

    for exp in data.get("workExperience") or []:
        if not isinstance(exp, dict):
            continue
        wc += len((exp.get("description") or "").split())
        wc += len((exp.get("position") or "").split())
        wc += len((exp.get("company") or "").split())

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


def resume_json_for_prompt(data: Dict[str, Any], max_chars: int = 26000) -> str:
    d = copy.deepcopy(data) if isinstance(data, dict) else {}
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


def _normalize_categories(raw: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    by_name = {row.get("name"): row for row in raw if isinstance(row, dict)}
    for name, max_score in EXPECTED_CATEGORIES:
        row = by_name.get(name)
        if not isinstance(row, dict):
            score, feedback = 0.0, "Not scored by model; defaulting to zero."
        else:
            try:
                score = float(row.get("score", 0))
            except (TypeError, ValueError):
                score = 0.0
            feedback = str(row.get("feedback") or "").strip() or "See suggestions."
        score = max(0.0, min(float(max_score), round(score * 10) / 10))
        out.append(
            {
                "name": name,
                "score": score,
                "max_score": max_score,
                "feedback": feedback[:500],
            }
        )
    return out


def score_resume_with_deepseek(resume: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns dict with keys: overall_score, estimated_pages, categories, suggestions
    (snake_case for DRF JSON).
    """
    estimated_pages = estimate_resume_pages(resume)
    payload = resume_json_for_prompt(resume)

    rubric = """
You score a resume JSON for the 123Resume builder. Apply this rubric strictly:

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

CATEGORIES (exact names and max_score — you MUST output all six):
1) Content Quality — max_score 3
2) Professional Summary — max_score 1
3) Experience Section — max_score 2
4) Skills & Proficiency — max_score 1
5) Education & Certifications — max_score 0.5
6) ATS Optimization — max_score 0.5

Each category needs: "name" (exact string above), "score" (0 to max_score inclusive), "max_score" (exact as listed),
and short "feedback" (one or two sentences).

Also return "overall_score" from 0 to 10 (float, one decimal) using the **2.5 baseline** described above,
and "suggestions": array of 3-8 concise improvement strings (no duplicates).

Return ONLY valid JSON with this shape (no markdown, no prose outside JSON):
{
  "overall_score": <number>,
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
                "content": "You are an expert resume reviewer. Output only valid JSON as instructed.",
            },
            {"role": "user", "content": user_msg},
        ],
        max_tokens=max_out,
        temperature=0.2,
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

    categories = _normalize_categories(parsed.get("categories"))
    suggestions_raw = parsed.get("suggestions") or []
    if not isinstance(suggestions_raw, list):
        suggestions_raw = []
    suggestions = []
    for s in suggestions_raw:
        if isinstance(s, str) and s.strip():
            suggestions.append(s.strip()[:400])
    suggestions = list(dict.fromkeys(suggestions))[:10]

    result = {
        "overall_score": overall,
        "estimated_pages": round(estimated_pages * 100) / 100,
        "categories": categories,
        "suggestions": suggestions,
    }
    log_deepseek_exchange("resume_score", completion, raw_text, result)
    return result
