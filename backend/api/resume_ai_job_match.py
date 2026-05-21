"""
Resume–job fit scoring via DeepSeek (structured JSON).
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client

logger = logging.getLogger(__name__)

MAX_RESUME_CHARS = 14_000
MAX_JOB_CHARS = 10_000


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def match_job_with_deepseek(
    resume_text: str,
    job_title: str,
    job_description: str,
) -> Dict[str, float | str]:
    """
    Returns keys: match_percentage (0–100), similarity (0–1), resume_summary (str).
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    rt = (resume_text or "").strip()
    if len(rt) > MAX_RESUME_CHARS:
        rt = rt[:MAX_RESUME_CHARS] + "\n[TRUNCATED]"
    jt = (job_title or "").strip()[:500]
    jd = (job_description or "").strip()
    if len(jd) > MAX_JOB_CHARS:
        jd = jd[:MAX_JOB_CHARS] + "\n[TRUNCATED]"

    system = (
        "You evaluate how well a candidate's resume fits a specific job posting. "
        "Reply with a single JSON object only (no markdown fences). "
        "Be realistic: generic resumes should score lower; strong skill/title/experience overlap scores higher."
    )
    user = f"""
Return JSON with exactly these keys:
- "match_percentage": number from 0 to 100 (one decimal) — overall fit for THIS job
- "similarity": number from 0 to 1 (three decimals) — cosine-style semantic overlap (set ≈ match_percentage/100)
- "resume_summary": string, max 350 characters — neutral summary of what the resume emphasizes vs the job

Job title:
{jt}

Job description:
{jd}

Resume text:
{rt}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=settings.DEEPSEEK_JOB_MATCH_MAX_TOKENS,
        temperature=0.15,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    try:
        data = _extract_json_object(raw)
    except json.JSONDecodeError as e:
        logger.warning("Job match JSON parse error: %s snippet=%s", e, raw[:400])
        raise

    try:
        pct = float(data.get("match_percentage", 0))
    except (TypeError, ValueError):
        pct = 0.0
    pct = max(0.0, min(100.0, round(pct * 10) / 10))

    try:
        sim = float(data.get("similarity", pct / 100.0))
    except (TypeError, ValueError):
        sim = pct / 100.0
    sim = max(0.0, min(1.0, round(sim, 3)))

    summary = str(data.get("resume_summary") or "").strip()[:400]
    if not summary:
        summary = (resume_text or "")[:200] + ("..." if len(resume_text or "") > 200 else "")

    out = {
        "match_percentage": pct,
        "similarity": sim,
        "resume_summary": summary,
    }
    log_deepseek_exchange("job_match", completion, raw, out)
    return out
