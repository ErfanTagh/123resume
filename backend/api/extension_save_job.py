"""
Turn a job posting's page text into a clean, structured record with Claude, for
the browser extension's "Save job" button. Returns fields the job tracker stores
(title, company, a nicely formatted description) so the user can find it later.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List

from django.conf import settings

from .ai_client import ai_request_options, get_ai_client
from .ai_response_log import log_ai_exchange

logger = logging.getLogger(__name__)

MAX_INPUT_CHARS = 16_000
MAX_DESCRIPTION_CHARS = 11_000

SAVE_JOB_SYSTEM = """You extract a job posting's key facts from the visible text of a careers page.
Output a single minified JSON object only — no markdown fences, no commentary.
Copy wording from the posting; do not invent facts. Leave a field as "" or [] when the posting doesn't state it.
Keep each list to the most important 3-8 items, each a short phrase."""

SCHEMA_HINT = """Return JSON with exactly these keys:
{
  "job_title": "",
  "company": "",
  "location": "",
  "employment_type": "",
  "salary": "",
  "summary": "one or two sentences on the role",
  "responsibilities": ["..."],
  "requirements": ["..."],
  "nice_to_have": ["..."],
  "benefits": ["..."],
  "skills": ["key skills or technologies named"]
}"""


def _json_from_text(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    elif text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
    return json.loads(text)


def _s(v: Any, limit: int = 300) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()[:limit]


def _list(v: Any, limit: int = 8, item_limit: int = 300) -> List[str]:
    if not isinstance(v, list):
        return []
    out = []
    for x in v[:limit]:
        s = _s(x, item_limit)
        if s:
            out.append(s)
    return out


def format_job_description(p: Dict[str, Any]) -> str:
    """A readable plain-text record for the tracker's description field."""
    lines: List[str] = []
    if p.get("summary"):
        lines.append(_s(p["summary"], 1200))
        lines.append("")
    meta = [
        ("Location", p.get("location")),
        ("Type", p.get("employment_type")),
        ("Salary", p.get("salary")),
    ]
    meta_lines = [f"{label}: {_s(val, 200)}" for label, val in meta if _s(val)]
    if meta_lines:
        lines.extend(meta_lines)
        lines.append("")
    sections = [
        ("RESPONSIBILITIES", p.get("responsibilities")),
        ("REQUIREMENTS", p.get("requirements")),
        ("NICE TO HAVE", p.get("nice_to_have")),
        ("BENEFITS", p.get("benefits")),
    ]
    for title, items in sections:
        items = _list(items)
        if items:
            lines.append(title)
            lines.extend(f"- {it}" for it in items)
            lines.append("")
    skills = _list(p.get("skills"))
    if skills:
        lines.append("Skills: " + ", ".join(skills))
    return "\n".join(lines).strip()[:MAX_DESCRIPTION_CHARS]


def parse_job_posting(page_text: str, url: str = "", page_title: str = "") -> Dict[str, Any]:
    """
    Claude → structured job record. Returns a dict with at least job_title,
    company and job_description (plus location/employment_type/salary/skills).
    Raises on configuration, model or JSON errors.
    """
    if not settings.AI_ENABLED:
        raise RuntimeError("AI provider is not configured")

    text = (page_text or "").strip()
    if not text:
        raise ValueError("empty page text")
    if len(text) > MAX_INPUT_CHARS:
        text = text[:MAX_INPUT_CHARS] + "\n\n[TRUNCATED]"

    context = []
    if page_title:
        context.append(f"Page title: {_s(page_title, 300)}")
    if url:
        context.append(f"URL: {_s(url, 500)}")
    user_msg = f"{SCHEMA_HINT}\n\n" + "\n".join(context) + f"\n\n--- PAGE TEXT ---\n{text}"

    client = get_ai_client()
    completion = client.chat.completions.create(
        **ai_request_options(),
        messages=[
            {"role": "system", "content": SAVE_JOB_SYSTEM},
            {"role": "user", "content": user_msg},
        ],
        max_tokens=1500,
        temperature=0.1,
        timeout=settings.AI_TIMEOUT_SECONDS,
    )
    raw_text = (completion.choices[0].message.content or "").strip()
    if not raw_text:
        raise ValueError("empty model response")

    parsed = _json_from_text(raw_text)
    result = {
        "job_title": _s(parsed.get("job_title"), 300) or _s(page_title, 300) or "Untitled role",
        "company": _s(parsed.get("company"), 300) or "Unknown company",
        "location": _s(parsed.get("location"), 200),
        "employment_type": _s(parsed.get("employment_type"), 120),
        "salary": _s(parsed.get("salary"), 200),
        "skills": _list(parsed.get("skills")),
        "job_description": format_job_description(parsed),
    }
    log_ai_exchange("extension_save_job", completion, raw_text, result)
    return result
