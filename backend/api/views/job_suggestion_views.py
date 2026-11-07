"""
Job suggestions for a resume (LinkedIn jobs through SearchApi.io).
"""
from bson import ObjectId
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..job_suggestions import (
    JobSearchError,
    annotate_jobs,
    clean_text,
    experience_years,
    find_jobs,
    normalize_location,
    resume_search_defaults,
    resume_skills,
    searches_left_today,
    user_level,
)
from .resume_views import _mongo_db

_ERROR_STATUS = {
    "not_configured": status.HTTP_503_SERVICE_UNAVAILABLE,
    "limit_user": status.HTTP_429_TOO_MANY_REQUESTS,
    "limit_total": status.HTTP_429_TOO_MANY_REQUESTS,
    "upstream": status.HTTP_502_BAD_GATEWAY,
    "no_keywords": status.HTTP_400_BAD_REQUEST,
}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_suggestions(request):
    """
    GET /api/job-suggestions/?resume_id=<id>[&q=<keywords>&location=<place>]

    Without q/location, the resume's title and city are used. Each job says
    which of the resume's skills its title names (matched_skills).
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

    default_keywords, default_location = resume_search_defaults(resume)
    keywords = clean_text(request.query_params.get("q"), 100) or default_keywords
    location = (
        normalize_location(request.query_params["location"])
        if "location" in request.query_params
        else default_location
    )
    query = {"q": keywords, "location": location, "default_q": default_keywords, "default_location": default_location}

    if not keywords:
        return Response(
            {"error": "no_keywords", "query": query, "searches_left": searches_left_today(db, user_id)},
            status=_ERROR_STATUS["no_keywords"],
        )

    try:
        jobs, fetched_at, from_cache = find_jobs(db, user_id, keywords, location)
    except JobSearchError as e:
        return Response(
            {"error": e.code, "query": query, "searches_left": searches_left_today(db, user_id)},
            status=_ERROR_STATUS.get(e.code, status.HTTP_502_BAD_GATEWAY),
        )

    years = experience_years(resume)
    return Response({
        "query": query,
        "profile": {"experience_years": years, "level": user_level(years)},
        "jobs": annotate_jobs(jobs, resume_skills(resume)),
        "fetched_at": fetched_at.isoformat() + "Z",
        "from_cache": from_cache,
        "searches_left": searches_left_today(db, user_id),
    })
