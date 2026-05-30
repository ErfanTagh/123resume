"""
Parse raw resume text into structured CV JSON using DeepSeek (OpenAI-compatible API).
Falls back to regex parser in parse_views when this raises or when no API key is set.
"""
from __future__ import annotations

import copy
import json
import logging
import re
from typing import Any, Dict, List

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client
from .resume_parser.utils import get_empty_structure

logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 28_000


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def _s(v: Any, limit: int = 8000) -> str:
    if v is None:
        return ""
    return str(v)[:limit]


def _norm_interests(raw: Any) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    if not isinstance(raw, list):
        return out
    for x in raw[:25]:
        if isinstance(x, dict):
            out.append({"interest": _s(x.get("interest"), 200)})
        elif isinstance(x, str) and x.strip():
            out.append({"interest": x.strip()[:200]})
    return out


def _norm_tech_list(raw: Any, key: str) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    if not isinstance(raw, list):
        return out
    for x in raw[:40]:
        if isinstance(x, dict) and x.get(key):
            out.append({key: _s(x.get(key), 200)})
        elif isinstance(x, str) and x.strip():
            out.append({key: x.strip()[:200]})
    return out


def _norm_work(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        return copy.deepcopy(get_empty_structure()["workExperience"])
    out: List[Dict[str, Any]] = []
    for item in raw[:20]:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "position": _s(item.get("position"), 400),
                "company": _s(item.get("company"), 400),
                "location": _s(item.get("location"), 300),
                "startDate": _s(item.get("startDate"), 40),
                "endDate": _s(item.get("endDate"), 40),
                "description": _s(item.get("description"), 12000),
                "responsibilities": [
                    {"responsibility": _s(r.get("responsibility"), 2000)}
                    for r in (item.get("responsibilities") or [])
                    if isinstance(r, dict) and r.get("responsibility")
                ][:30],
                "technologies": _norm_tech_list(item.get("technologies"), "technology"),
                "competencies": _norm_tech_list(item.get("competencies"), "competency"),
                "link": _s(item.get("link"), 500),
            }
        )
    return out if out else copy.deepcopy(get_empty_structure()["workExperience"])


def _norm_education(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list) or not raw:
        return copy.deepcopy(get_empty_structure()["education"])
    out: List[Dict[str, Any]] = []
    for item in raw[:15]:
        if not isinstance(item, dict):
            continue
        key_courses = []
        for c in item.get("keyCourses") or []:
            if isinstance(c, dict) and c.get("course"):
                key_courses.append({"course": _s(c.get("course"), 400)})
            elif isinstance(c, str) and c.strip():
                key_courses.append({"course": c.strip()[:400]})
        descriptions = []
        for d in item.get("descriptions") or []:
            if isinstance(d, dict) and d.get("description"):
                descriptions.append({"description": _s(d.get("description"), 2000)})
            elif isinstance(d, str) and d.strip():
                descriptions.append({"description": d.strip()[:2000]})
        out.append(
            {
                "degree": _s(item.get("degree"), 400),
                "institution": _s(item.get("institution"), 400),
                "location": _s(item.get("location"), 300),
                "startDate": _s(item.get("startDate"), 40),
                "endDate": _s(item.get("endDate"), 40),
                "field": _s(item.get("field"), 400),
                "keyCourses": key_courses[:40],
                "descriptions": descriptions[:20],
                "link": _s(item.get("link"), 500),
            }
        )
    return out if out else copy.deepcopy(get_empty_structure()["education"])


def _norm_projects(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw[:20]:
        if not isinstance(item, dict):
            continue
        highlights = []
        for h in item.get("highlights") or []:
            if isinstance(h, dict) and h.get("highlight"):
                highlights.append({"highlight": _s(h.get("highlight"), 1000)})
            elif isinstance(h, str) and h.strip():
                highlights.append({"highlight": h.strip()[:1000]})
        out.append(
            {
                "name": _s(item.get("name"), 400),
                "description": _s(item.get("description"), 8000),
                "highlights": highlights[:25],
                "technologies": _norm_tech_list(item.get("technologies"), "technology"),
                "startDate": _s(item.get("startDate"), 40),
                "endDate": _s(item.get("endDate"), 40),
                "link": _s(item.get("link"), 500),
            }
        )
    return out


def _norm_certificates(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw[:30]:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "name": _s(item.get("name"), 400),
                "organization": _s(item.get("organization"), 400),
                "issueDate": _s(item.get("issueDate"), 40),
                "expirationDate": _s(item.get("expirationDate"), 40),
                "credentialId": _s(item.get("credentialId"), 200),
                "url": _s(item.get("url"), 800),
            }
        )
    return out


def _norm_languages(raw: Any) -> List[Dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, str]] = []
    for item in raw[:25]:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "language": _s(item.get("language"), 120),
                "proficiency": _s(item.get("proficiency"), 120),
            }
        )
    return out


def _norm_skills(raw: Any) -> List[Dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, str]] = []
    for item in raw[:80]:
        if isinstance(item, dict) and item.get("skill"):
            s = _s(item.get("skill"), 200)
            if s:
                out.append({"skill": s})
        elif isinstance(item, str) and item.strip():
            out.append({"skill": item.strip()[:200]})
    return out


def normalize_ai_parse(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Merge model output into a safe structure matching CVFormData / ResumeData."""
    base = get_empty_structure()
    if not isinstance(raw, dict):
        return base

    pi = raw.get("personalInfo")
    if isinstance(pi, dict):
        for key in (
            "firstName",
            "lastName",
            "email",
            "phone",
            "location",
            "professionalTitle",
            "profileImage",
            "linkedin",
            "github",
            "website",
            "summary",
        ):
            if key in pi and pi[key] is not None:
                lim = 12000 if key == "summary" else 800
                base["personalInfo"][key] = _s(pi[key], lim)
        ints = _norm_interests(pi.get("interests"))
        if ints:
            base["personalInfo"]["interests"] = ints

    base["workExperience"] = _norm_work(raw.get("workExperience"))
    base["education"] = _norm_education(raw.get("education"))
    base["projects"] = _norm_projects(raw.get("projects"))
    base["certificates"] = _norm_certificates(raw.get("certificates"))
    base["languages"] = _norm_languages(raw.get("languages"))
    skills = _norm_skills(raw.get("skills"))
    base["skills"] = skills if skills else [{"skill": ""}]

    so = raw.get("sectionOrder")
    if isinstance(so, list) and all(isinstance(x, str) for x in so):
        base["sectionOrder"] = [x for x in so if x][:20]

    tpl = raw.get("template")
    if isinstance(tpl, str) and tpl in (
        "modern",
        "classic",
        "minimal",
        "creative",
        "latex",
        "starRover",
        "slateCopper",
    ):
        base["template"] = tpl

    for row in base.get("workExperience") or []:
        if isinstance(row, dict):
            row.setdefault("link", "")
    for row in base.get("education") or []:
        if isinstance(row, dict):
            row.setdefault("link", "")
            row.setdefault("descriptions", [])

    return base


PARSE_SYSTEM = """You extract structured resume/CV data from plain text for the 123Resume web app.
Output a single JSON object only (no markdown fences, no commentary). Use camelCase keys exactly as specified.
Use empty strings for unknown text fields and sensible empty arrays where appropriate.
Dates: prefer YYYY-MM when you can infer month+year; otherwise empty string.
Do not invent employers, degrees, or dates not supported by the text."""


def parse_resume_text_with_deepseek(text: str) -> Dict[str, Any]:
    """
    Full pipeline: truncate → DeepSeek → normalize.
    Raises on configuration or model/JSON errors (caller may fall back to regex parser).
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    t = (text or "").strip()
    if not t:
        raise ValueError("empty text")
    if len(t) > MAX_INPUT_CHARS:
        t = t[:MAX_INPUT_CHARS] + "\n\n[TRUNCATED]"

    schema_hint = """
Return JSON with this shape (all keys required at top level):
{
  "personalInfo": {
    "firstName","lastName","email","phone","location","professionalTitle","profileImage",
    "linkedin","github","website","summary","interests":[{"interest":""}]
  },
  "workExperience": [{
    "position","company","location","startDate","endDate","description",
    "responsibilities":[{"responsibility":""}],
    "technologies":[{"technology":""}],
    "competencies":[{"competency":""}],
    "link"
  }],
  "education": [{
    "degree","institution","location","startDate","endDate","field",
    "keyCourses":[{"course":""}],"descriptions":[{"description":""}],"link"
  }],
  "projects": [{"name","description","highlights":[{"highlight":""}],"technologies":[{"technology":""}],"startDate","endDate","link"}],
  "certificates": [{"name","organization","issueDate","expirationDate","credentialId","url"}],
  "languages": [{"language","proficiency"}],
  "skills": [{"skill":""}],
  "sectionOrder": ["summary","workExperience","education","projects","certificates","skills","languages","interests"],
  "template": "modern"
}
Use arrays with one object with empty strings if a section is missing.
""".strip()

    user_msg = f"{schema_hint}\n\n--- RESUME TEXT ---\n{t}"

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": PARSE_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=settings.DEEPSEEK_RESUME_PARSE_MAX_TOKENS,
        temperature=0.05,
    )
    raw_text = (completion.choices[0].message.content or "").strip()
    if not raw_text:
        raise ValueError("empty model response")

    try:
        parsed = _extract_json_object(raw_text)
    except json.JSONDecodeError as e:
        logger.warning("AI parse JSON error: %s snippet=%s", e, raw_text[:500])
        raise

    normalized = normalize_ai_parse(parsed)
    log_deepseek_exchange("resume_parse", completion, raw_text, normalized)
    return normalized
