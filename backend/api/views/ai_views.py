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
from .. import resume_ai_improve
from .. import resume_ai_scoring
from .. import resume_ai_translate
from .. import resume_ai_work_bullet
from .. import resume_ai_work_description

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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def improve_resume(request):
    """
    One-click "Improve my resume" (DeepSeek). Rewrites only free-text fields the
    user can edit in the builder (professional summary, work-experience role
    summaries, project descriptions) and returns a per-field list of proposed
    changes so the UI can Accept/Reject each one.

    Body JSON:
      - resume (required): CV JSON object (camelCase, same shape as resume-score)
      - output_language / outputLanguage (optional): "en" | "de"

    Response:
      - changes: [{path, label, original, improved}, ...]  (may be empty)
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

    logger.info(
        "resume_improve start user_id=%s lang=%s payload_chars=%s",
        getattr(request.user, "pk", None),
        out_lang,
        raw_len,
    )

    try:
        changes = resume_ai_improve.improve_resume_fields(resume, out_lang)
        logger.info(
            "resume_improve ok user_id=%s changes=%d",
            getattr(request.user, "pk", None),
            len(changes),
        )
        return Response({"changes": changes}, status=status.HTTP_200_OK)
    except RuntimeError as e:
        logger.error("resume_improve configuration error: %s", e)
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("DeepSeek resume improve failed")
        return Response(
            {"error": "Could not generate improvements with AI. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def translate_resume(request):
    """
    Translate a whole resume between English and German (DeepSeek).

    Only free-text prose is translated (summary, interests, work descriptions and
    bullets, education field/descriptions, project descriptions/highlights). Skills,
    technologies, job titles, names, dates and links are left untouched. The caller
    saves the returned resume as a NEW resume; the original is unchanged.

    Body JSON:
      - resume (required): CV JSON object (camelCase, same shape as resume-score)
      - target_language / targetLanguage (required): ISO code of the language to
        translate INTO. One of: en, de, es, fr, it, pt, tr.
      - categories (optional): list of content categories to translate (from
        TRANSLATION_CATEGORIES). Omit to translate everything.

    Response:
      - target_language: ISO code (language translated INTO)
      - resume: translated CV JSON object
    """
    data = request.data or {}
    resume = data.get("resume")

    if not isinstance(resume, dict):
        return Response(
            {"error": "resume must be a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    raw_target = data.get("target_language") or data.get("targetLanguage")
    target = resume_ai_translate.normalize_translation_language(raw_target)
    if target is None:
        supported = ", ".join(sorted(resume_ai_translate.SUPPORTED_TRANSLATION_LANGUAGES))
        return Response(
            {"error": f"target_language is required and must be one of: {supported}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    categories = resume_ai_translate.normalize_categories(data.get("categories"))

    # Size check ignores the profile photo (base64) — it is never sent to the model.
    try:
        raw_len = len(json.dumps(_resume_without_profile_images(resume), default=str))
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

    logger.info(
        "resume_translate start user_id=%s target=%s categories=%s payload_chars=%s",
        getattr(request.user, "pk", None),
        target,
        "all" if categories is None else sorted(categories),
        raw_len,
    )

    try:
        result = resume_ai_translate.translate_resume(resume, target, categories)
        logger.info(
            "resume_translate ok user_id=%s target=%s",
            getattr(request.user, "pk", None),
            result.get("target_language"),
        )
        return Response(result, status=status.HTTP_200_OK)
    except RuntimeError as e:
        logger.error("resume_translate configuration error: %s", e)
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception("DeepSeek resume translate failed")
        return Response(
            {"error": "Could not translate this resume with AI. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def suggest_work_bullet(request):
    """
    Suggest one new work-experience bullet (DeepSeek).

    Body JSON:
      - position, company, description (optional strings)
      - existing_bullets / existingBullets (optional string array)
      - technologies (optional string array)
      - output_language / outputLanguage (optional): "en" | "de"
    """
    data = request.data or {}
    existing = data.get("existing_bullets")
    if existing is None:
        existing = data.get("existingBullets")
    if existing is not None and not isinstance(existing, list):
        return Response(
            {"error": "existing_bullets must be an array of strings"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    technologies = data.get("technologies")
    if technologies is not None and not isinstance(technologies, list):
        return Response(
            {"error": "technologies must be an array of strings"},
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

    position = str(data.get("position") or "")
    company = str(data.get("company") or "")
    description = str(data.get("description") or "")
    bullet_count = len(existing) if isinstance(existing, list) else 0

    logger.info(
        "work_bullet_suggest start user_id=%s lang=%s bullets=%d has_title=%s has_company=%s has_desc=%s",
        getattr(request.user, "pk", None),
        out_lang,
        bullet_count,
        bool(position.strip()),
        bool(company.strip()),
        bool(description.strip()),
    )

    try:
        bullet = resume_ai_work_bullet.suggest_work_experience_bullet(
            position=position,
            company=company,
            description=description,
            existing_bullets=existing or [],
            technologies=technologies or [],
            output_language=out_lang,
        )
        logger.info(
            "work_bullet_suggest ok user_id=%s bullet_chars=%d",
            getattr(request.user, "pk", None),
            len(bullet),
        )
        return Response({"bullet": bullet}, status=status.HTTP_200_OK)
    except ValueError as e:
        err = str(e)
        logger.warning(
            "work_bullet_suggest value_error user_id=%s err=%s",
            getattr(request.user, "pk", None),
            err,
        )
        if err == "insufficient context":
            return Response(
                {"error": "Add a job title, company, role summary, or at least one bullet first."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"error": "Could not generate a bullet. Try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except RuntimeError as e:
        logger.error("work_bullet_suggest config_error user_id=%s err=%s", getattr(request.user, "pk", None), e)
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception(
            "work_bullet_suggest failed user_id=%s",
            getattr(request.user, "pk", None),
        )
        return Response(
            {"error": "Could not generate a bullet with AI. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def improve_work_description(request):
    """
    Improve a work-experience role summary (DeepSeek).

    Body JSON:
      - description (optional string)
      - position, company (optional strings)
      - output_language / outputLanguage (optional): "en" | "de"
    """
    data = request.data or {}

    if not settings.DEEPSEEK_API_KEY:
        return Response(
            {"error": "AI assistant is not configured. Set DEEPSEEK_API_KEY on the server."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    out_lang = resume_ai_scoring.normalize_output_language(
        (data.get("output_language") or data.get("outputLanguage") or "en"),
    )

    description = str(data.get("description") or data.get("text") or "")
    position = str(data.get("position") or "")
    company = str(data.get("company") or "")
    professional_title = str(
        data.get("professional_title") or data.get("professionalTitle") or ""
    )
    project_name = str(data.get("project_name") or data.get("projectName") or "")
    field_type = str(data.get("field_type") or data.get("fieldType") or "work_description")

    logger.info(
        "text_improve start user_id=%s field=%s lang=%s in_chars=%d",
        getattr(request.user, "pk", None),
        field_type,
        out_lang,
        len(description.strip()),
    )

    try:
        improved = resume_ai_work_description.improve_resume_text(
            field_type=field_type,
            description=description,
            position=position,
            company=company,
            professional_title=professional_title,
            project_name=project_name,
            output_language=out_lang,
        )
        logger.info(
            "text_improve ok user_id=%s field=%s out_chars=%d",
            getattr(request.user, "pk", None),
            field_type,
            len(improved),
        )
        return Response({"description": improved}, status=status.HTTP_200_OK)
    except ValueError as e:
        err = str(e)
        logger.warning(
            "text_improve value_error user_id=%s field=%s err=%s",
            getattr(request.user, "pk", None),
            field_type,
            err,
        )
        if err == "insufficient context":
            return Response(
                {"error": "Add some text or related context before using AI."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if err == "unsupported field type":
            return Response(
                {"error": "Unsupported field type."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"error": "Could not improve this text. Try again."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except RuntimeError as e:
        logger.error(
            "text_improve config_error user_id=%s err=%s",
            getattr(request.user, "pk", None),
            e,
        )
        return Response(
            {"error": "AI assistant is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        logger.exception(
            "text_improve failed user_id=%s field=%s",
            getattr(request.user, "pk", None),
            field_type,
        )
        return Response(
            {"error": "Could not improve this text with AI. Try again later."},
            status=status.HTTP_502_BAD_GATEWAY,
        )
