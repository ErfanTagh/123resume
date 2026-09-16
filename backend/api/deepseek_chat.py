"""
DeepSeek chat completions (OpenAI-compatible API).

Uses the official OpenAI Python client with DeepSeek's base URL so we avoid
vendor-specific SDK churn. Pricing is typically lower than OpenAI for
similar quality; model is configurable via DEEPSEEK_MODEL.
"""
import logging

from django.conf import settings
from openai import OpenAI

from .ai_response_log import log_deepseek_exchange

logger = logging.getLogger(__name__)

RESUME_ASSISTANT_SYSTEM_PROMPT = """You are a helpful assistant for 123Resume, a resume builder application.
You help users improve resume wording, bullet points, summaries, and job-search presentation.
Be concise and practical. Do not invent employers, dates, or credentials—if details are missing, say what you need.
Use the same language as the user when they write in a non-English language."""


def get_deepseek_client() -> OpenAI:
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")
    return OpenAI(
        api_key=settings.DEEPSEEK_API_KEY,
        base_url=settings.DEEPSEEK_BASE_URL,
        # The SDK default (600s, 2 retries) outlives the web worker; a request
        # that runs past gunicorn's timeout is killed with no error to the user.
        timeout=settings.DEEPSEEK_TIMEOUT_SECONDS,
        max_retries=1,
    )


def deepseek_request_options() -> dict:
    """
    Model and request options shared by every chat completion.

    Spread into each call (`**deepseek_request_options()`) so the model and the
    thinking switch are decided in one place rather than at ten call sites.
    """
    options = {"model": settings.DEEPSEEK_MODEL}
    if not settings.DEEPSEEK_THINKING:
        # Not a named SDK argument, so it has to travel in the raw request body
        options["extra_body"] = {"thinking": {"type": "disabled"}}
    return options


def deepseek_max_tokens(answer_tokens: int) -> int:
    """
    Token limit for a request whose visible answer needs `answer_tokens`.

    Reasoning is counted against max_tokens too, so a cap sized for the answer
    alone gets eaten by thinking and returns a truncated or empty reply.
    """
    if settings.DEEPSEEK_THINKING:
        return answer_tokens + settings.DEEPSEEK_REASONING_TOKEN_BUDGET
    return answer_tokens


def resume_assistant_reply(user_message: str) -> str:
    """
    Send a single user turn with a fixed system prompt; return assistant plain text.
    """
    client = get_deepseek_client()
    completion = client.chat.completions.create(
        **deepseek_request_options(),
        messages=[
            {"role": "system", "content": RESUME_ASSISTANT_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=deepseek_max_tokens(settings.DEEPSEEK_MAX_OUTPUT_TOKENS),
    )
    choice = completion.choices[0].message
    text = (choice.content or "").strip()
    if not text:
        logger.warning("DeepSeek returned empty content")
    log_deepseek_exchange("resume_assistant", completion, choice.content or "", text)
    return text
