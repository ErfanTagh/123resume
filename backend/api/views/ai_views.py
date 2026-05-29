"""
AI-assisted features (authenticated). Backed by DeepSeek's OpenAI-compatible API.
"""
import copy
import json
import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import deepseek_chat
from .. import resume_ai_scoring

logger = logging.getLogger(__name__)

MAX_MESSAGE_CHARS = 8000
MAX_RESUME_JSON_CHARS = 320_000


def _resume_without_profile_images(resume: dict) -> dict:
    """Drop photo fields before DeepSeek — images are not used by the rubric and waste context."""
    out = copy.deepcopy(resume)
    for block_key in ("personalInfo", "personal_info"):
        pi = out.get(block_key)
        if isinstance(pi, dict):
            pi.pop("profileImage", None)
            pi.pop("profile_image", None)
    return out


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_assistant_chat(request):
    """
    One-shot resume helper chat for logged-in users.

    Body JSON:
      - message (required): user question or text to improve

    Response:
      - reply: assistant message text
    """
    data = request.data or {}
    message = (data.get("message") or "").strip()

    if not message:
        return Response(
            {"error": "message is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(message) > MAX_MESSAGE_CHARS:
        return Response(
            {"error": f"message must be at most {MAX_MESSAGE_CHARS} characters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not settings.DEEPSEEK_API_KEY:
        return Response(
            {
                "error": "AI assistant is not configured. Set DEEPSEEK_API_KEY on the server.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        reply = deepseek_chat.resume_assistant_reply(message)
        return Response({"reply": reply}, status=status.HTTP_200_OK)
    except RuntimeError as e:
        logger.error("Resume assistant configuration error: %s", e)
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("DeepSeek resume assistant failed")
        return Response(
            {"error": "Could not get a response from the AI service. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def resume_score(request):
    """
    AI resume score for logged-in users (DeepSeek).

    Body JSON:
      - resume (required): CV JSON object
      - output_language or outputLanguage (optional): "en" | "de" — language for all prose fields
        (category feedback, suggestions, overall_feedback). Defaults to "en".
    """
    data = request.data or {}
    resume = data.get("resume")

    if not isinstance(resume, dict):
        return Response(
            {"error": "resume must be a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resume = _resume_without_profile_images(resume)

    try:
        raw_len = len(json.dumps(resume, default=str))
    except Exception:
        raw_len = MAX_RESUME_JSON_CHARS + 1

    if raw_len > MAX_RESUME_JSON_CHARS:
        return Response(
            {"error": "resume payload is too large"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not settings.DEEPSEEK_API_KEY:
        return Response(
            {"error": "AI assistant is not configured. Set DEEPSEEK_API_KEY on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    out_lang = resume_ai_scoring.normalize_output_language(
        (data.get("output_language") or data.get("outputLanguage") or "en"),
    )
    payload_summary = resume_ai_scoring.summarize_resume_payload_for_log(resume)
    logger.info(
        "resume_score start user_id=%s email=%s payload_chars=%s output_lang=%s summary=%s",
        getattr(request.user, "pk", None),
        getattr(request.user, "email", None),
        raw_len,
        out_lang,
        payload_summary,
    )

    try:
        result = resume_ai_scoring.score_resume_with_deepseek(resume, out_lang)
        logger.info(
            "resume_score ok user_id=%s overall=%s categories=%s",
            getattr(request.user, "pk", None),
            result.get("overall_score"),
            len(result.get("categories") or []),
        )
        return Response(result, status=status.HTTP_200_OK)
    except RuntimeError as e:
        logger.error("Resume score configuration error: %s", e)
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("DeepSeek resume scoring failed")
        return Response(
            {"error": "Could not score this resume with AI. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
