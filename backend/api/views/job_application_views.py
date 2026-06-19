"""
Job application tracker (MongoDB).
"""
from datetime import datetime

from bson import ObjectId
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..serializers import JobApplicationSerializer
from .resume_views import _mongo_db

COLLECTION = "job_applications"


def _format_doc(doc):
    if not doc:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out["_id"])
        del out["_id"]
    for key in ("created_at", "updated_at", "applied_at"):
        val = out.get(key)
        if val and hasattr(val, "isoformat"):
            out[key] = val.isoformat()
    return out


def _parse_object_id(pk):
    try:
        return ObjectId(pk)
    except Exception:
        return None


def _resume_owned(db, user_id, resume_id):
    if not resume_id or not str(resume_id).strip():
        return True
    oid = _parse_object_id(resume_id)
    if oid is None:
        return False
    return db.resumes.find_one({"_id": oid, "user_id": user_id}) is not None


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def job_application_list(request):
    """List or create job applications for the authenticated user."""
    db = _mongo_db()
    col = db[COLLECTION]
    user_id = request.user.id

    if request.method == "GET":
        docs = list(col.find({"user_id": user_id}).sort("updated_at", -1))
        return Response([_format_doc(d) for d in docs])

    serializer = JobApplicationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = dict(serializer.validated_data)
    resume_id = data.get("resume_id") or ""
    if resume_id and not _resume_owned(db, user_id, resume_id):
        return Response({"error": "Resume not found"}, status=status.HTTP_400_BAD_REQUEST)

    now = datetime.utcnow()
    doc = {
        "user_id": user_id,
        **data,
        "created_at": now,
        "updated_at": now,
    }
    result = col.insert_one(doc)
    created = col.find_one({"_id": result.inserted_id})
    return Response(_format_doc(created), status=status.HTTP_201_CREATED)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def job_application_detail(request, pk):
    """Get, update, or delete a single job application."""
    oid = _parse_object_id(pk)
    if oid is None:
        return Response({"error": "Invalid application ID"}, status=status.HTTP_400_BAD_REQUEST)

    db = _mongo_db()
    col = db[COLLECTION]
    user_id = request.user.id

    if request.method == "GET":
        doc = col.find_one({"_id": oid, "user_id": user_id})
        if not doc:
            return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_format_doc(doc))

    if request.method == "DELETE":
        result = col.delete_one({"_id": oid, "user_id": user_id})
        if result.deleted_count == 0:
            return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    existing = col.find_one({"_id": oid, "user_id": user_id})
    if not existing:
        return Response({"error": "Application not found"}, status=status.HTTP_404_NOT_FOUND)

    serializer = JobApplicationSerializer(data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = dict(serializer.validated_data)
    resume_id = data.get("resume_id", existing.get("resume_id", ""))
    if resume_id and not _resume_owned(db, user_id, resume_id):
        return Response({"error": "Resume not found"}, status=status.HTTP_400_BAD_REQUEST)

    data["updated_at"] = datetime.utcnow()
    col.update_one({"_id": oid, "user_id": user_id}, {"$set": data})
    updated = col.find_one({"_id": oid})
    return Response(_format_doc(updated))
