"""
Opt-in logging of DeepSeek / OpenAI-style completions (raw + parsed).

Enable with DEEPSEEK_LOG_AI_RESPONSES=1 in the environment. Logs may contain
PII when prompts/responses include resume or job text — use only in dev/staging
or short-lived production debugging.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


def ai_response_logging_enabled() -> bool:
    return bool(getattr(settings, "DEEPSEEK_LOG_AI_RESPONSES", False))


def _usage_str(completion: Any) -> str:
    try:
        u = getattr(completion, "usage", None)
        if u is None:
            return ""
        parts = []
        for label, attr in (
            ("prompt", "prompt_tokens"),
            ("completion", "completion_tokens"),
            ("total", "total_tokens"),
        ):
            v = getattr(u, attr, None)
            if v is not None:
                parts.append(f"{label}={v}")
        return " ".join(parts)
    except Exception:
        return ""


def log_deepseek_exchange(
    feature: str,
    completion: Any,
    raw_text: str,
    parsed_or_result: Any | None = None,
) -> None:
    """
    Emit one or two INFO lines: raw model text (truncated), then optional parsed/result JSON.
    """
    if not ai_response_logging_enabled():
        return
    max_raw = int(getattr(settings, "DEEPSEEK_LOG_MAX_CHARS", 12000))
    max_result = int(getattr(settings, "DEEPSEEK_LOG_RESULT_MAX_CHARS", 32000))
    model = getattr(completion, "model", None) or getattr(settings, "DEEPSEEK_MODEL", "")
    usage = _usage_str(completion)
    raw = raw_text or ""
    raw_snippet = raw[:max_raw]
    suffix = "…[truncated]" if len(raw) > max_raw else ""
    logger.info(
        "AI_RAW feature=%s model=%s %s raw_len=%s%s\n%s",
        feature,
        model,
        usage,
        len(raw),
        suffix,
        raw_snippet,
    )
    if parsed_or_result is None:
        return
    try:
        if isinstance(parsed_or_result, (dict, list)):
            dumped = json.dumps(parsed_or_result, ensure_ascii=False, default=str)
        else:
            dumped = str(parsed_or_result)
    except Exception as exc:
        dumped = f"<could not serialize: {exc}>"
    if len(dumped) > max_result:
        dumped = dumped[:max_result] + "…[truncated]"
    logger.info("AI_RESULT feature=%s parsed_len=%s\n%s", feature, len(dumped), dumped)
