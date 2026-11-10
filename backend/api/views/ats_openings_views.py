"""
Job openings from company ATS boards (Greenhouse, Lever, Ashby), ranked for a
resume. Free and unlimited (public APIs, cached): no SearchApi credits, no
per-user daily cap. Every result links to a fillable company application form.
"""
from bson import ObjectId
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import ats_openings
from ..job_suggestions import resume_search_defaults, resume_skills
from .resume_views import _mongo_db


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_openings(request):
    """
    GET /api/job-openings/?resume_id=<id>

    Openings from Greenhouse/Lever/Ashby boards that fit the resume's title and
    skills, each linking straight to the company's own application form.
    """
    db = _mongo_db()
    user_id = request.user.id

    resume_id = request.query_params.get("resume_id", "")
    try:
        resume = db.resumes.find_one({"_id": ObjectId(resume_id), "user_id": user_id})
    except Exception:
        resume = None
    if not resume:
        return Response({"error": "Resume not found"}, status=status.HTTP_404_NOT_FOUND)

    title_keywords, location = resume_search_defaults(resume)
    country = (request.query_params.get("country") or "").strip().lower()
    jobs, all_jobs, fetched_at, from_cache = ats_openings.openings_for_resume(
        db, title_keywords, resume_skills(resume), location, country=country
    )

    return Response({
        "jobs": jobs,
        "total_scanned": len(all_jobs),
        "fetched_at": fetched_at.isoformat() + "Z" if fetched_at else None,
        "from_cache": from_cache,
    })
