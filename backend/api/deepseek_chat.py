"""
Chat completions for every AI feature: DeepSeek or Claude, picked by AI_PROVIDER.

DeepSeek goes through the official OpenAI Python client (OpenAI-compatible API).
Claude goes through the official Anthropic SDK, wrapped in a small adapter that
takes and returns the same chat-completion shape, so the feature modules
(scoring, parsing, improve, ...) don't care which provider answers.
"""
import logging
from types import SimpleNamespace

import anthropic
from django.conf import settings
from openai import OpenAI

from .ai_response_log import log_deepseek_exchange

logger = logging.getLogger(__name__)

RESUME_ASSISTANT_SYSTEM_PROMPT = """You are a helpful assistant for 123Resume, a resume builder application.
You help users improve resume wording, bullet points, summaries, and job-search presentation.
Be concise and practical. Do not invent employers, dates, or credentials—if details are missing, say what you need.
Use the same language as the user when they write in a non-English language."""

# Claude stop reasons, in the chat-completion vocabulary the callers log.
_FINISH_REASONS = {"end_turn": "stop", "stop_sequence": "stop", "max_tokens": "length"}


class _ClaudeCompletions:
    """`client.chat.completions.create(...)` answered by Claude."""

    def __init__(self, client: anthropic.Anthropic):
        self._client = client

    def create(self, *, model, messages, max_tokens, **_openai_only):
        # temperature: Sonnet 5.5 rejects anything but the default.
        # response_format / extra_body: DeepSeek switches with no Claude
        # equivalent needed; every prompt already asks for bare JSON and every
        # caller tolerates a ```json fence.
        system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
        turns = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
            if m["role"] != "system"
        ]
        params = {
            "model": model,
            "max_tokens": max_tokens,
            "messages": turns,
            # The lowest thinking setting on Sonnet 5.5 (`disabled` is a 400).
            # Users wait on these calls, so no extended thinking.
            "thinking": {"type": "between_tools"},
            "output_config": {"effort": settings.ANTHROPIC_EFFORT},
        }
        if system:
            params["system"] = system

        if settings.ANTHROPIC_FALLBACKS:
            response = self._client.beta.messages.create(
                **params,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        else:
            response = self._client.messages.create(**params)

        if response.stop_reason == "refusal":
            # Partial output from a declined request is not a usable answer.
            # Callers treat empty content as a failed call.
            logger.warning(
                "Claude declined the request (category=%s)",
                getattr(response.stop_details, "category", None),
            )
            text = ""
        else:
            text = "".join(b.text for b in response.content if b.type == "text")

        usage = response.usage
        return SimpleNamespace(
            model=response.model,
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(role="assistant", content=text),
                    finish_reason=_FINISH_REASONS.get(response.stop_reason, response.stop_reason),
                )
            ],
            usage=SimpleNamespace(
                prompt_tokens=usage.input_tokens,
                completion_tokens=usage.output_tokens,
                total_tokens=usage.input_tokens + usage.output_tokens,
            ),
        )


class _ClaudeChatClient:
    def __init__(self, client: anthropic.Anthropic):
        self.chat = SimpleNamespace(completions=_ClaudeCompletions(client))


def _claude_client() -> _ClaudeChatClient:
    if not settings.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")
    headers = {}
    if settings.ANTHROPIC_WORKSPACE_ID:
        headers["anthropic-workspace-id"] = settings.ANTHROPIC_WORKSPACE_ID
    return _ClaudeChatClient(
        anthropic.Anthropic(
            api_key=settings.ANTHROPIC_API_KEY,
            default_headers=headers or None,
            # Same budget as DeepSeek: two attempts must fit in gunicorn's 60s.
            timeout=settings.DEEPSEEK_TIMEOUT_SECONDS,
            max_retries=1,
        )
    )


def get_deepseek_client():
    """Client for the configured AI provider (OpenAI-style chat interface)."""
    if settings.USE_CLAUDE:
        return _claude_client()
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
    if settings.USE_CLAUDE:
        return {"model": settings.ANTHROPIC_MODEL}
    options = {"model": settings.DEEPSEEK_MODEL}
    if not settings.DEEPSEEK_THINKING:
        # Not a named SDK argument, so it has to travel in the raw request body
        options["extra_body"] = {"thinking": {"type": "disabled"}}
    return options


def deepseek_max_tokens(answer_tokens: int) -> int:
    """
    Token limit for a request whose visible answer needs `answer_tokens`.

    DeepSeek counts reasoning against max_tokens too, so a cap sized for the
    answer alone gets eaten by thinking and returns a truncated or empty reply.
    """
    if settings.DEEPSEEK_THINKING and not settings.USE_CLAUDE:
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
        logger.warning("AI returned empty content")
    log_deepseek_exchange("resume_assistant", completion, choice.content or "", text)
    return text
