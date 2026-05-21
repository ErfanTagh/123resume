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
    )


def resume_assistant_reply(user_message: str) -> str:
    """
    Send a single user turn with a fixed system prompt; return assistant plain text.
    """
    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": RESUME_ASSISTANT_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=settings.DEEPSEEK_MAX_OUTPUT_TOKENS,
    )
    choice = completion.choices[0].message
    text = (choice.content or "").strip()
    if not text:
        logger.warning("DeepSeek returned empty content")
    log_deepseek_exchange("resume_assistant", completion, choice.content or "", text)
    return text
