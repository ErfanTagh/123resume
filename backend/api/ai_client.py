"""
Chat completions for every AI feature, answered by Claude (Anthropic API).

The official Anthropic SDK is wrapped in a small adapter with a chat-completion
shape (`client.chat.completions.create(model=, messages=, max_tokens=)`), so the
feature modules (scoring, parsing, improve, ...) share one calling convention.
"""
import logging
import sys
import time
from types import SimpleNamespace

import anthropic
from django.conf import settings

from . import metrics
from .ai_response_log import log_ai_exchange

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

    def create(self, *, model, messages, max_tokens, timeout=None, **_ignored):
        # temperature: Sonnet 5.5 rejects anything but the default.
        # response_format: every prompt already asks for bare JSON and every
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

        client = self._client
        if timeout is not None:
            # A caller with its own time budget (long answers) gets one attempt
            # of that length instead of the default two shorter ones.
            client = client.with_options(timeout=timeout, max_retries=0)

        if settings.ANTHROPIC_FALLBACKS:
            response = client.beta.messages.create(
                **params,
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        else:
            response = client.messages.create(**params)

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
            # Two attempts must fit in gunicorn's 60s.
            timeout=settings.AI_TIMEOUT_SECONDS,
            max_retries=1,
        )
    )


class _MeteredCompletions:
    """Times every completion and records it for the admin dashboards.

    The feature label is the calling module (api.resume_ai_scoring -> "scoring"),
    so the ten call sites need no changes.
    """

    def __init__(self, inner):
        self._inner = inner

    def create(self, **kwargs):
        caller = sys._getframe(1).f_globals.get("__name__", "")
        feature = caller.rsplit(".", 1)[-1].replace("resume_ai_", "")
        if feature == "ai_client":
            feature = "assistant"
        model = str(kwargs.get("model") or "")
        started = time.monotonic()
        try:
            completion = self._inner.create(**kwargs)
        except Exception as e:
            metrics.observe_ai_call(feature, model, time.monotonic() - started, type(e).__name__)
            raise
        finish = getattr(completion.choices[0], "finish_reason", "") if completion.choices else ""
        outcome = {"refusal": "refusal", "length": "truncated"}.get(finish, "ok")
        metrics.observe_ai_call(
            feature, model, time.monotonic() - started, outcome, getattr(completion, "usage", None)
        )
        return completion


class _MeteredChatClient:
    def __init__(self, inner):
        self.chat = SimpleNamespace(completions=_MeteredCompletions(inner.chat.completions))


def get_ai_client():
    """Claude client with the chat-completion interface, metered for the dashboards."""
    return _MeteredChatClient(_claude_client())


def ai_request_options() -> dict:
    """
    Model options shared by every chat completion, spread into each call
    (`**ai_request_options()`) so the model is picked in one place.
    """
    return {"model": settings.ANTHROPIC_MODEL}


def resume_assistant_reply(user_message: str) -> str:
    """
    Send a single user turn with a fixed system prompt; return assistant plain text.
    """
    client = get_ai_client()
    completion = client.chat.completions.create(
        **ai_request_options(),
        messages=[
            {"role": "system", "content": RESUME_ASSISTANT_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        max_tokens=settings.AI_MAX_OUTPUT_TOKENS,
    )
    choice = completion.choices[0].message
    text = (choice.content or "").strip()
    if not text:
        logger.warning("AI returned empty content")
    log_ai_exchange("resume_assistant", completion, choice.content or "", text)
    return text
