"""
Job suggestions for a resume: free openings from company ATS boards
(Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee) plus the Arbeitnow
board, ranked against the resume. No API key, no SearchApi credits, no
per-user daily limit; every result links to the company's own application form.
"""
from datetime import datetime

from bson import ObjectId
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import ats_openings
from ..job_suggestions import (
    clean_text,
    experience_years,
    job_level,
    normalize_location,
    resume_search_defaults,
    resume_skills,
    user_level,
)
from .resume_views import _mongo_db


def _posted_at(date_str):
    """A short English 'posted' label from a YYYY-MM-DD date (the app localizes
    it for German from the raw date)."""
    try:
        days = (datetime.utcnow().date() - datetime.strptime(date_str, "%Y-%m-%d").date()).days
    except (ValueError, TypeError):
        return ""
    if days <= 0:
        return "Today"
    if days == 1:
        return "Yesterday"
    if days < 7:
        return f"{days} days ago"
    if days < 14:
        return "1 week ago"
    if days < 31:
        return f"{days // 7} weeks ago"
    return f"{days // 30} month{'s' if days >= 60 else ''} ago"


def _to_suggested(job):
    """Shape an ATS opening like the app's SuggestedJob (snake_case; the client
    converts to camelCase)."""
    return {
        "job_id": job.get("url") or "",
        "title": job.get("title") or "",
        "company": job.get("company") or "",
        "location": job.get("location") or ("Remote" if job.get("remote") else ""),
        "posted_at": _posted_at(job.get("date")),
        "date": job.get("date") or "",
        "link": job.get("url") or "",
        "company_logo": "",
        "note": "",
        "matched_skills": job.get("matched_skills") or [],
        "level": job_level(job.get("title") or ""),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def job_suggestions(request):
    """
    GET /api/job-suggestions/?resume_id=<id>[&q=<keywords>&location=<place>&country=<c>]

    Openings from company ATS boards that fit the resume, best match first.
    Without q/location, the resume's own title and city are used. `country=germany`
    keeps only German and Europe-remote roles.
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
    country = (request.query_params.get("country") or "").strip().lower()
    query = {"q": keywords, "location": location, "default_q": default_keywords, "default_location": default_location}

    if not keywords:
        return Response(
            {"error": "no_keywords", "query": query, "searches_left": 0},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Same shared path as the browser extension, so both always agree.
    ranked, all_jobs, fetched_at, from_cache = ats_openings.openings_for_resume(
        db, keywords, resume_skills(resume), location, country=country
    )

    years = experience_years(resume)
    return Response({
        "query": query,
        "profile": {"experience_years": years, "level": user_level(years)},
        "jobs": [_to_suggested(j) for j in ranked],
        "fetched_at": (fetched_at.isoformat() + "Z") if fetched_at else None,
        "from_cache": from_cache,
        "total_scanned": len(all_jobs),
        # Free and unlimited now; kept for the client's existing field.
        "searches_left": 999,
    })
