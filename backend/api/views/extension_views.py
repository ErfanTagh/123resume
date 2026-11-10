"""
Browser-extension endpoints. `save_job` takes the visible text of a job page,
has Claude turn it into a clean record, and stores it in the user's job tracker.
"""
from datetime import datetime

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .. import extension_save_job
from .job_application_views import COLLECTION, _format_doc
from .resume_views import _mongo_db

_ALLOWED_STATUS = {"saved", "applied"}


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def save_job(request):
    """
    POST /api/extension/save-job/
    Body: { page_text, url?, title?, status? ("saved" | "applied") }

    Parses the job page with Claude and saves it to the tracker. Returns the
    created application and the tracker URL.
    """
    data = request.data or {}
    page_text = (data.get("page_text") or "").strip()
    if not page_text:
        return Response({"error": "no_text"}, status=status.HTTP_400_BAD_REQUEST)

    url = (data.get("url") or "").strip()[:2000]
    title = (data.get("title") or "").strip()[:300]
    job_status = data.get("status") if data.get("status") in _ALLOWED_STATUS else "saved"

    try:
        parsed = extension_save_job.parse_job_posting(page_text, url=url, page_title=title)
    except Exception as e:  # not configured, model error, bad JSON
        return Response({"error": "parse_failed", "detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    now = datetime.utcnow()
    doc = {
        "user_id": request.user.id,
        "job_title": parsed["job_title"],
        "company": parsed["company"],
        "job_link": url,
        "job_description": parsed["job_description"],
        "status": job_status,
        "source": "extension",
        "location": parsed.get("location", ""),
        "employment_type": parsed.get("employment_type", ""),
        "salary": parsed.get("salary", ""),
        "skills": parsed.get("skills", []),
        "created_at": now,
        "updated_at": now,
    }
    if job_status == "applied":
        doc["applied_at"] = now

    db = _mongo_db()
    result = db[COLLECTION].insert_one(doc)
    created = db[COLLECTION].find_one({"_id": result.inserted_id})

    return Response(
        {
            "ok": True,
            "application": _format_doc(created),
            "tracker_url": "https://123resume.de/resumes?tab=job-tracker",
        },
        status=status.HTTP_201_CREATED,
    )
