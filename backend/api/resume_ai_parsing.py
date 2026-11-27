"""
Parse raw resume text into structured CV JSON using Claude.
Falls back to regex parser in parse_views when this raises or when no API key is set.
"""
from __future__ import annotations

import copy
import json
import logging
import re
from typing import Any, Dict, List

from django.conf import settings

from .ai_response_log import log_ai_exchange
from .ai_client import ai_request_options, get_ai_client
from .resume_parser.utils import get_empty_structure

logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 28_000


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    elif text.startswith("```"):
        # A cut-off answer has no closing fence
        text = re.sub(r"^```(?:json)?\s*", "", text)
    return json.loads(text)


def _close_truncated_json(text: str) -> str:
    """
    Turn JSON that stops mid-way (the answer hit max_tokens) into valid JSON by
    cutting back to the last complete value and closing the open brackets.
    Whatever came before the cut is kept; the half-written last item is dropped.
    """
    stack: List[str] = []
    in_string = escaped = False
    cut_at, cut_stack = None, []
    for i, ch in enumerate(text):
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in "{[":
            stack.append("}" if ch == "{" else "]")
        elif ch in "}]":
            if stack:
                stack.pop()
            cut_at, cut_stack = i + 1, list(stack)
        elif ch == ",":
            # Everything before a comma at this level is complete
            cut_at, cut_stack = i, list(stack)
    if cut_at is None:
        raise ValueError("no complete JSON value to keep")
    return text[:cut_at] + "".join(reversed(cut_stack))


def _s(v: Any, limit: int = 8000) -> str:
    if v is None:
        return ""
    return str(v)[:limit]


# An ongoing role has an empty end date in the form (the month picker reads YYYY-MM only)
_ONGOING = {"present", "current", "now", "ongoing", "today", "heute", "aktuell", "bis heute", "laufend"}


def _end_date(v: Any) -> str:
    s = _s(v, 40).strip()
    return "" if s.lower() in _ONGOING else s


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


def _norm_tech_list(raw: Any, key: str, limit: int = 200) -> List[Dict[str, str]]:
    """List of {key: text}; the model may send plain strings to save tokens."""
    out: List[Dict[str, str]] = []
    if not isinstance(raw, list):
        return out
    for x in raw[:40]:
        if isinstance(x, dict) and x.get(key):
            out.append({key: _s(x.get(key), limit)})
        elif isinstance(x, str) and x.strip():
            out.append({key: x.strip()[:limit]})
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
                "endDate": _end_date(item.get("endDate")),
                "description": _s(item.get("description"), 12000),
                "responsibilities": _norm_tech_list(
                    item.get("responsibilities"), "responsibility", limit=2000
                )[:30],
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
                "endDate": _end_date(item.get("endDate")),
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
                "endDate": _end_date(item.get("endDate")),
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


def _norm_publications(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: List[Dict[str, Any]] = []
    for item in raw[:40]:
        if not isinstance(item, dict):
            continue
        out.append(
            {
                "title": _s(item.get("title") or item.get("name"), 500),
                "publisher": _s(item.get("publisher") or item.get("venue") or item.get("journal"), 400),
                "publicationDate": _s(
                    item.get("publicationDate") or item.get("publication_date") or item.get("date"),
                    40,
                ),
                "url": _s(item.get("url") or item.get("link") or item.get("doi"), 800),
                "description": _s(item.get("description"), 4000),
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


# Keys the model uses for a category label and for its list of skills when it
# returns a categorized skills section instead of a flat list.
_SKILL_NAME_KEYS = ("category", "name", "group", "title", "label", "type")
_SKILL_LIST_KEYS = ("skills", "items", "values", "list", "entries", "skillList")
_SKILL_MAX = 100  # must match SkillSerializer.skill max_length


def _skill_values_to_list(value: Any) -> List[str]:
    """Flatten a category's skills (a list, or a comma string) to clean names."""
    result: List[str] = []
    if isinstance(value, list):
        for v in value:
            if isinstance(v, dict):
                v = v.get("skill") or v.get("name") or v.get("value") or ""
            s = _s(v, _SKILL_MAX).strip()
            if s:
                result.append(s)
    elif isinstance(value, str):
        for part in value.split(","):
            s = part.strip()[:_SKILL_MAX]
            if s:
                result.append(s)
    return result


def _emit_skill_group(name: str, values: List[str], out: List[Dict[str, str]]) -> None:
    """Emit a category as one or more "Name: a, b, c" rows, each within the
    per-skill length limit. Templates re-merge rows that share a name, so a
    long category split across rows still renders as one group."""
    prefix = f"{name}: " if name else ""
    line = prefix
    for v in values:
        addition = v if line == prefix else f", {v}"
        if line != prefix and len(line) + len(addition) > _SKILL_MAX:
            out.append({"skill": line})
            line = prefix + v
        else:
            line += addition
    if line and line != prefix:
        out.append({"skill": line[:_SKILL_MAX]})


def _norm_skills(raw: Any) -> List[Dict[str, str]]:
    """Normalize the model's skills output to the flat [{"skill": ...}] form.

    Accepts every shape the model emits for a skills section, not only plain
    strings and {"skill": ...} dicts. Categorized shapes — {"category": "...",
    "items": [...]}, {"name": "...", "skills": [...]}, or a category-keyed dict
    like {"Programming": [...]} — become "Category: a, b, c" rows (which the
    templates split back into groups). Before this, any categorized section was
    silently dropped and the resume rendered no skills at all.
    """
    out: List[Dict[str, str]] = []

    def emit(item: Any) -> None:
        if isinstance(item, str):
            s = item.strip()[:_SKILL_MAX]
            if s:
                out.append({"skill": s})
            return
        if not isinstance(item, dict):
            return
        if item.get("skill"):  # already a flat skill
            s = _s(item.get("skill"), _SKILL_MAX).strip()
            if s:
                out.append({"skill": s})
            return
        name = next((_s(item.get(k), 120).strip() for k in _SKILL_NAME_KEYS if item.get(k)), "")
        values: List[str] = []
        for k in _SKILL_LIST_KEYS:
            if k in item:
                values = _skill_values_to_list(item.get(k))
                break
        if values:
            _emit_skill_group(name, values, out)
            return
        # Single-key dict, e.g. {"Programming": ["Python", "Java"]}
        for k, v in item.items():
            _emit_skill_group(_s(k, 120).strip(), _skill_values_to_list(v), out)

    if isinstance(raw, list):
        for item in raw[:80]:
            emit(item)
    elif isinstance(raw, dict):  # {"Programming": ["Python"], "Tools": "Docker"}
        for k, v in list(raw.items())[:80]:
            _emit_skill_group(_s(k, 120).strip(), _skill_values_to_list(v), out)

    return out[:120]


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
    base["publications"] = _norm_publications(raw.get("publications"))
    base["languages"] = _norm_languages(raw.get("languages"))
    skills = _norm_skills(raw.get("skills"))
    base["skills"] = skills if skills else [{"skill": ""}]

    # Templates render ONLY the sections listed in sectionOrder. Keep the
    # model's order, but weave in any standard section it left out — at its
    # canonical position, not the end — so a section that has data (skills,
    # languages, ...) is never hidden just because the model omitted it.
    # Empty sections render nothing anyway.
    standard_order = list(base.get("sectionOrder") or [])
    so = raw.get("sectionOrder")
    if isinstance(so, list) and all(isinstance(x, str) for x in so):
        merged = [x for x in so if x][:20]
        present = set(merged)
        for i, section in enumerate(standard_order):
            if section in present:
                continue
            # Slot it right after the nearest earlier canonical section that is
            # already in the list; if none precede it, put it at the front.
            insert_at = 0
            for prev in reversed(standard_order[:i]):
                if prev in present:
                    insert_at = merged.index(prev) + 1
                    break
            merged.insert(insert_at, section)
            present.add(section)
        base["sectionOrder"] = merged

    tpl = raw.get("template")
    if isinstance(tpl, str) and tpl in (
        "modern",
        "classic",
        "minimal",
        "creative",
        "latex",
        "starRover",
        "slateCopper",
        "prism",
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
Output a single minified JSON object only (no markdown fences, no commentary, no indentation).
Use camelCase keys exactly as specified.
Leave out any key or section the resume has no data for; the app fills in the blanks.
Copy the resume's wording; don't summarize, translate or rewrite it.
The text comes from a PDF, so two-column layouts may have their columns mixed on the same lines: put each piece back where it belongs.
Dates: YYYY-MM when month and year are known, YYYY when only the year is; leave endDate out for an ongoing role.
Do not invent employers, degrees, or dates not supported by the text."""


def parse_resume_text_with_ai(text: str) -> Dict[str, Any]:
    """
    Full pipeline: truncate → Claude → normalize.
    Raises on configuration or model/JSON errors (caller may fall back to regex parser).
    """
    if not settings.AI_ENABLED:
        raise RuntimeError("AI provider is not configured")

    t = (text or "").strip()
    if not t:
        raise ValueError("empty text")
    if len(t) > MAX_INPUT_CHARS:
        t = t[:MAX_INPUT_CHARS] + "\n\n[TRUNCATED]"

    # Lists of plain strings and left-out empty keys keep the answer short:
    # a full 2-page resume in the old verbose shape didn't fit the token limit.
    schema_hint = """
Return JSON with this shape. Every key is optional; omit what is empty.
{
  "personalInfo": {
    "firstName","lastName","email","phone","location","professionalTitle",
    "linkedin","github","website","summary","interests":["..."]
  },
  "workExperience": [{
    "position","company","location","startDate","endDate","description",
    "responsibilities":["one bullet per string"],
    "technologies":["..."],"competencies":["..."],"link"
  }],
  "education": [{
    "degree","institution","location","startDate","endDate","field",
    "keyCourses":["..."],"descriptions":["..."],"link"
  }],
  "projects": [{"name","description","highlights":["..."],"technologies":["..."],"startDate","endDate","link"}],
  "certificates": [{"name","organization","issueDate","expirationDate","credentialId","url"}],
  "publications": [{"title","publisher","publicationDate","url","description"}],
  "languages": [{"language","proficiency"}],
  "skills": ["..."],
  "sectionOrder": ["summary","workExperience","education","projects","certificates","publications","skills","languages","interests"]
}
Put a job's bullet points in "responsibilities", and use "description" only for a paragraph that isn't a bullet list.
sectionOrder: the sections in the order they appear in the resume. It MUST include every section you return data for (if you return "skills", "skills" must be in sectionOrder), using exactly these lowercase keys: summary, workExperience, education, projects, certificates, publications, skills, languages, interests.
""".strip()

    user_msg = f"{schema_hint}\n\n--- RESUME TEXT ---\n{t}"

    client = get_ai_client()
    completion = client.chat.completions.create(
        **ai_request_options(),
        messages=[
            {"role": "system", "content": PARSE_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=settings.AI_RESUME_PARSE_MAX_TOKENS,
        temperature=0.05,
        timeout=settings.RESUME_PARSE_TIMEOUT_SECONDS,
    )
    raw_text = (completion.choices[0].message.content or "").strip()
    if not raw_text:
        raise ValueError("empty model response")
    finish = getattr(completion.choices[0], "finish_reason", "")

    try:
        parsed = _extract_json_object(raw_text)
    except json.JSONDecodeError as e:
        if finish != "length":
            # Log the error position only: the text is the user's resume
            logger.warning("AI parse JSON error: %s (finish=%s)", e, finish)
            raise
        # Cut off at max_tokens: keep the complete part rather than dropping
        # everything for the much weaker rules parser.
        logger.warning("AI parse hit max_tokens (%s chars); keeping the complete part", len(raw_text))
        parsed = _extract_json_object(_close_truncated_json(raw_text))

    normalized = normalize_ai_parse(parsed)
    log_ai_exchange("resume_parse", completion, raw_text, normalized)
    return normalized
