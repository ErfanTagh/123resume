"""
Resume-Job Matching: DeepSeek (default when configured) with embedding fallback.
"""
import logging
import os
import traceback

from bson import ObjectId
from django.conf import settings
from pymongo import MongoClient
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def get_resume_text(resume_doc):
    """Convert resume document to text for matching"""
    text_parts = []

    # Personal info
    personal_info = resume_doc.get("personal_info", {})
    if personal_info.get("first_name"):
        text_parts.append(
            f"{personal_info.get('first_name', '')} {personal_info.get('last_name', '')}"
        )
    if personal_info.get("professional_title"):
        text_parts.append(personal_info.get("professional_title"))
    if personal_info.get("summary"):
        text_parts.append(personal_info.get("summary"))

    # Work experience
    work_experience = resume_doc.get("work_experience", [])
    for exp in work_experience:
        exp_parts = []
        if exp.get("position"):
            exp_parts.append(exp.get("position"))
        if exp.get("company"):
            exp_parts.append(f"at {exp.get('company')}")
        if exp.get("start_date") or exp.get("end_date"):
            dates = f"{exp.get('start_date', '')} - {exp.get('end_date', 'Present')}"
            exp_parts.append(dates)
        if exp.get("description"):
            exp_parts.append(exp.get("description"))
        for resp in exp.get("responsibilities") or []:
            if isinstance(resp, dict) and resp.get("responsibility"):
                exp_parts.append(resp.get("responsibility"))
            elif isinstance(resp, str) and resp.strip():
                exp_parts.append(resp.strip())
        if exp_parts:
            text_parts.append(". ".join(exp_parts))

    # Education
    education = resume_doc.get("education", [])
    for edu in education:
        edu_parts = []
        if edu.get("degree"):
            edu_parts.append(edu.get("degree"))
        if edu.get("institution"):
            edu_parts.append(f"from {edu.get('institution')}")
        if edu_parts:
            text_parts.append(", ".join(edu_parts))

    # Skills
    skills = resume_doc.get("skills", [])
    if skills:
        skill_list = [s.get("skill", "") for s in skills if s.get("skill")]
        if skill_list:
            text_parts.append(f"Skills: {', '.join(skill_list)}")

    return " ".join(text_parts)


def _get_mongo_db():
    connection_string = os.getenv("MONGODB_CONNECTION_STRING")
    if connection_string:
        try:
            client = MongoClient(connection_string)
            client.admin.command("ping")
        except Exception:
            connection_string = None

    if not connection_string:
        mongo_host = os.getenv("MONGODB_HOST", "mongodb")
        mongo_port = int(os.getenv("MONGODB_PORT", 27017))
        mongo_username = os.getenv("MONGODB_USERNAME", "")
        mongo_password = os.getenv("MONGODB_PASSWORD", "")

        if mongo_username and mongo_password:
            client = MongoClient(
                mongo_host,
                mongo_port,
                username=mongo_username,
                password=mongo_password,
                authSource="admin",
                authMechanism="SCRAM-SHA-1",
            )
        else:
            client = MongoClient(mongo_host, mongo_port)

    mongo_db_name = os.getenv("MONGODB_NAME", "resume_db")
    return client[mongo_db_name]


def _load_user_resume_doc(db, user_id, resume_id):
    try:
        resume_object_id = ObjectId(resume_id)
    except Exception:
        return None, Response(
            {"error": "Invalid resume ID format"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resume_doc = db.resumes.find_one({"_id": resume_object_id, "user_id": user_id})
    if not resume_doc:
        return None, Response(
            {"error": "Resume not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return resume_doc, None


def _match_with_embeddings(resume_text, job_title, job_description, resume_id):
    """Legacy sentence-transformers cosine similarity."""
    from sentence_transformers import SentenceTransformer
    import numpy as np

    model = SentenceTransformer("anass1209/resume-job-matcher-all-MiniLM-L6-v2")
    texts = [resume_text, job_description]
    embeddings = model.encode(texts, show_progress_bar=False)
    resume_embedding = embeddings[0]
    job_embedding = embeddings[1]
    similarity = float(
        np.dot(resume_embedding, job_embedding)
        / (np.linalg.norm(resume_embedding) * np.linalg.norm(job_embedding))
    )
    match_percentage = round(similarity * 100, 1)
    summary = resume_text[:200] + "..." if len(resume_text) > 200 else resume_text

    return Response(
        {
            "resume_id": resume_id,
            "job_title": job_title,
            "job_description": job_description,
            "similarity": round(similarity, 3),
            "match_percentage": match_percentage,
            "resume_summary": summary,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def match_resume_to_job(request, resume_id):
    """
    Match a saved resume to a job description.

    POST body: { "title": optional, "description": required }

    Query:
    - matcher=auto (default): DeepSeek when DEEPSEEK_API_KEY is set; else embeddings;
      on AI failure in auto mode, falls back to embeddings.
    - matcher=ai: DeepSeek only (502 on failure).
    - matcher=embeddings: sentence-transformers only.

    Returns: resume_id, job_title, job_description, similarity (0–1),
    match_percentage (0–100), resume_summary
    """
    try:
        db = _get_mongo_db()

        resume_doc, err = _load_user_resume_doc(db, request.user.id, resume_id)
        if err is not None:
            return err

        job_title = request.data.get("title", "Job Description")
        job_description = request.data.get("description", "")

        if not str(job_description).strip():
            return Response(
                {"error": "Please provide a job description"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = get_resume_text(resume_doc)
        if not resume_text.strip():
            return Response(
                {"error": "Resume is empty or has no content"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matcher = (request.query_params.get("matcher") or "auto").lower()
        if matcher == "ai" and not settings.DEEPSEEK_API_KEY:
            return Response(
                {"error": "AI job matching requires DEEPSEEK_API_KEY on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        use_ai = matcher == "ai" or (
            matcher == "auto" and bool(settings.DEEPSEEK_API_KEY)
        )

        if use_ai and matcher != "embeddings":
            try:
                from ..resume_ai_job_match import match_job_with_deepseek

                ai = match_job_with_deepseek(resume_text, job_title, job_description)
                logger.info(
                    "Job match via DeepSeek resume=%s match_pct=%s",
                    resume_id,
                    ai.get("match_percentage"),
                )
                return Response(
                    {
                        "resume_id": resume_id,
                        "job_title": job_title,
                        "job_description": job_description,
                        "similarity": ai["similarity"],
                        "match_percentage": ai["match_percentage"],
                        "resume_summary": ai["resume_summary"],
                    }
                )
            except Exception as e:
                logger.warning("DeepSeek job match failed: %s", e)
                if matcher == "ai":
                    return Response(
                        {
                            "error": "AI job match failed. Try again or use matcher=embeddings.",
                        },
                        status=status.HTTP_502_BAD_GATEWAY,
                    )

        try:
            return _match_with_embeddings(
                resume_text, job_title, job_description, resume_id
            )
        except ImportError:
            return Response(
                {
                    "error": "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    except Exception as e:
        return Response(
            {
                "error": f"Failed to match resume: {str(e)}",
                "detail": str(traceback.format_exc()),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_resume_cover_letter(request, resume_id):
    """
    Generate a tailored cover letter (DeepSeek) from a saved resume and job posting.

    POST body:
      - title (optional)
      - description (required)
      - output_language / outputLanguage (optional): en | de
    """
    try:
        if not settings.DEEPSEEK_API_KEY:
            return Response(
                {"error": "AI cover letters require DEEPSEEK_API_KEY on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        db = _get_mongo_db()
        resume_doc, err = _load_user_resume_doc(db, request.user.id, resume_id)
        if err is not None:
            return err

        job_title = request.data.get("title", "Job Description")
        job_description = request.data.get("description", "")

        if not str(job_description).strip():
            return Response(
                {"error": "Please provide a job description"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resume_text = get_resume_text(resume_doc)
        if not resume_text.strip():
            return Response(
                {"error": "Resume is empty or has no content"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from ..resume_ai_scoring import normalize_output_language
        from ..resume_ai_cover_letter import generate_cover_letter_with_deepseek

        out_lang = normalize_output_language(
            (request.data.get("output_language") or request.data.get("outputLanguage") or "en"),
        )

        logger.info(
            "cover_letter start user_id=%s resume=%s lang=%s",
            getattr(request.user, "pk", None),
            resume_id,
            out_lang,
        )

        try:
            letter = generate_cover_letter_with_deepseek(
                resume_text,
                str(job_title or ""),
                str(job_description or ""),
                out_lang,
            )
        except ValueError as e:
            err_msg = str(e)
            if err_msg in ("insufficient resume content", "insufficient job description"):
                return Response(
                    {"error": "Add resume content and a job description first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "Could not generate a cover letter. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError:
            return Response(
                {"error": "AI assistant is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.info(
            "cover_letter ok user_id=%s resume=%s chars=%d",
            getattr(request.user, "pk", None),
            resume_id,
            len(letter),
        )
        return Response(
            {
                "resume_id": resume_id,
                "job_title": job_title,
                "cover_letter": letter,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("Cover letter generation failed resume=%s", resume_id)
        return Response(
            {
                "error": f"Failed to generate cover letter: {str(e)}",
                "detail": str(traceback.format_exc()),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tailor_resume_suggestions(request, resume_id):
    """
    Incremental resume tailoring suggestions for a job (~20% match boost per round).

    POST body:
      - title (optional)
      - description (required)
      - round / roundNumber (optional, 1-5)
      - current_match_percentage / currentMatchPercentage (optional)
      - skip_ids / skipIds (optional): suggestion ids already shown or applied
      - output_language / outputLanguage (optional): en | de
    """
    try:
        if not settings.DEEPSEEK_API_KEY:
            return Response(
                {"error": "AI tailoring requires DEEPSEEK_API_KEY on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        db = _get_mongo_db()
        resume_doc, err = _load_user_resume_doc(db, request.user.id, resume_id)
        if err is not None:
            return err

        job_title = request.data.get("title", "Job Description")
        job_description = request.data.get("description", "")

        if not str(job_description).strip():
            return Response(
                {"error": "Please provide a job description"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from ..resume_ai_scoring import normalize_output_language
        from ..resume_ai_tailor import generate_tailor_suggestions

        out_lang = normalize_output_language(
            (request.data.get("output_language") or request.data.get("outputLanguage") or "en"),
        )

        try:
            round_number = int(request.data.get("round") or request.data.get("roundNumber") or 1)
        except (TypeError, ValueError):
            round_number = 1

        try:
            current_match = float(
                request.data.get("current_match_percentage")
                or request.data.get("currentMatchPercentage")
                or 0
            )
        except (TypeError, ValueError):
            current_match = 0.0

        skip_ids = request.data.get("skip_ids") or request.data.get("skipIds") or []
        if not isinstance(skip_ids, list):
            skip_ids = []

        logger.info(
            "tailor_suggestions start user_id=%s resume=%s round=%s",
            getattr(request.user, "pk", None),
            resume_id,
            round_number,
        )

        try:
            result = generate_tailor_suggestions(
                resume_doc,
                str(job_title or ""),
                str(job_description or ""),
                round_number=round_number,
                current_match_percentage=current_match,
                skip_ids=[str(x) for x in skip_ids if x],
                output_language=out_lang,
            )
        except ValueError as e:
            err_msg = str(e)
            if err_msg == "insufficient job description":
                return Response(
                    {"error": "Please provide a job description"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": "Could not generate suggestions. Try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError:
            return Response(
                {"error": "AI assistant is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.info(
            "tailor_suggestions ok user_id=%s resume=%s count=%d round=%d",
            getattr(request.user, "pk", None),
            resume_id,
            len(result.get("suggestions") or []),
            result.get("round"),
        )
        return Response({"resume_id": resume_id, **result}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.exception("Tailor suggestions failed resume=%s", resume_id)
        return Response(
            {
                "error": f"Failed to generate tailoring suggestions: {str(e)}",
                "detail": str(traceback.format_exc()),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
