"""
Data access for the Claude connector (MCP server in connector/server.py).

Works on the same MongoDB documents as the website (snake_case, see
api/views/resume_views.py). Every write is validated with ResumeSerializer,
like a save from the builder, and the resume is snapshotted first so any
connector edit can be undone (restore_version).

All functions here are synchronous (pymongo, Django); the server runs them in
a worker thread.
"""
from __future__ import annotations

import copy
import hashlib
import os
import secrets
from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from api.serializers import JobApplicationSerializer, ResumeSerializer
from api.views.job_application_views import COLLECTION as APPLICATIONS
from api.views.match_views import _get_mongo_db

# Where the links Claude shares point (the local builder when run locally).
SITE_URL = os.getenv("CONNECTOR_SITE_URL", "https://123resume.de").rstrip("/")
TOKEN_PREFIX = "123r_"
MAX_VERSIONS_PER_RESUME = 50

# What the connector may read and change: the resume's content. Not ownership,
# scores, public-profile settings or styling.
CONTENT_FIELDS = (
    "name",
    "personal_info",
    "work_experience",
    "education",
    "projects",
    "certificates",
    "publications",
    "languages",
    "skills",
    "skill_groups",
    "section_order",
)


class ConnectorError(Exception):
    """A problem Claude should see and can fix (bad id, bad path, invalid value)."""


def _db():
    return _get_mongo_db()


# --------------------------------------------------------------------------
# Personal access tokens (demo / Claude Code fallback; OAuth is primary)
# --------------------------------------------------------------------------

def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_token(user_id: int, label: str = "Claude") -> str:
    """Mint a token for a user. Only its hash is stored; show the token once."""
    token = TOKEN_PREFIX + secrets.token_urlsafe(32)
    _db().connector_tokens.insert_one(
        {
            "token_sha256": _hash(token),
            "user_id": user_id,
            "label": label,
            "created_at": datetime.utcnow(),
            "last_used_at": None,
        }
    )
    return token


def user_for_token(token: str) -> int | None:
    if not token or not token.startswith(TOKEN_PREFIX):
        return None
    row = _db().connector_tokens.find_one_and_update(
        {"token_sha256": _hash(token)},
        {"$set": {"last_used_at": datetime.utcnow()}},
    )
    return row["user_id"] if row else None


# --------------------------------------------------------------------------
# Resumes
# --------------------------------------------------------------------------

def _oid(resume_id: str) -> ObjectId:
    try:
        return ObjectId(resume_id)
    except (InvalidId, TypeError):
        raise ConnectorError(f"'{resume_id}' is not a resume id. Use list_resumes to get the ids.")


def _own_resume(user_id: int, resume_id: str) -> dict:
    doc = _db().resumes.find_one({"_id": _oid(resume_id), "user_id": user_id})
    if not doc:
        raise ConnectorError(f"No resume {resume_id} in this account. Use list_resumes to get the ids.")
    return doc


def _links(resume_id: str) -> dict:
    return {
        # The resume page has the "Download PDF" button
        "view_url": f"{SITE_URL}/resume/{resume_id}",
        # Opens on the first step (Personal info), where the photo is uploaded
        "edit_url": f"{SITE_URL}/create?edit={resume_id}",
    }


TRACKER_URL = f"{SITE_URL}/resumes?tab=job-tracker"


def _display_name(doc: dict) -> str:
    """Mirror frontend generateDefaultResumeName (resumePdfUtils.ts). Display only; does not write to MongoDB."""
    personal = doc.get("personal_info") or {}
    parts: list[str] = []
    for key in ("first_name", "last_name", "professional_title"):
        value = personal.get(key)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())
    return "-".join(parts) if parts else "Untitled Resume"


def list_resumes(user_id: int) -> list[dict]:
    docs = _db().resumes.find(
        {"user_id": user_id},
        {
            "name": 1,
            "template": 1,
            "updated_at": 1,
            "overall_score": 1,
            "personal_info.first_name": 1,
            "personal_info.last_name": 1,
            "personal_info.professional_title": 1,
        },
    ).sort("updated_at", -1)
    out = []
    for d in docs:
        rid = str(d["_id"])
        out.append(
            {
                "id": rid,
                "name": d.get("name") or _display_name(d),
                "professional_title": (d.get("personal_info") or {}).get("professional_title") or "",
                "template": d.get("template", "modern"),
                "updated_at": d["updated_at"].isoformat() if isinstance(d.get("updated_at"), datetime) else None,
                "overall_score": d.get("overall_score"),
                **_links(rid),
            }
        )
    return out


def get_resume(user_id: int, resume_id: str) -> dict:
    doc = _own_resume(user_id, resume_id)
    content = {f: doc.get(f) for f in CONTENT_FIELDS if doc.get(f) is not None}
    personal = dict(content.get("personal_info") or {})
    photo = personal.pop("profile_image", None)  # base64 photo: large and not editable here
    content["personal_info"] = personal
    content["name"] = doc.get("name") or _display_name(doc)
    return {
        "id": resume_id,
        "template": doc.get("template", "modern"),
        "has_photo": bool(photo),
        **content,
        **_links(resume_id),
    }


# --------------------------------------------------------------------------
# Editing
# --------------------------------------------------------------------------

def _parse_path(path: str) -> list[Any]:
    parts: list[Any] = [int(p) if p.isdigit() else p for p in (path or "").strip(".").split(".") if p != ""]
    if not parts:
        raise ConnectorError("Empty path.")
    if parts[0] not in CONTENT_FIELDS:
        raise ConnectorError(
            f"'{parts[0]}' can't be edited. Editable top-level fields: {', '.join(CONTENT_FIELDS)}."
        )
    return parts


def _descend(doc: dict, parts: list[Any], path: str) -> Any:
    node: Any = doc
    for p in parts:
        try:
            node = node[p]
        except (KeyError, IndexError, TypeError):
            raise ConnectorError(f"'{path}' doesn't exist in this resume. Call get_resume to see its structure.")
    return node


def _apply(doc: dict, edit: dict) -> str:
    op = (edit.get("op") or "").lower()
    path = edit.get("path") or ""
    parts = _parse_path(path)
    value = edit.get("value")
    if "profile_image" in parts:
        # Claude only sees an attached photo, it can't pass the file on. Saving
        # also puts the stored photo back, so say so rather than appear to work.
        raise ConnectorError(
            "The photo can't be changed through Claude. The user adds or changes it on "
            "123resume.de: share edit_url (it opens on the Personal info step with the photo upload)."
        )

    if op == "set":
        parent = _descend(doc, parts[:-1], path) if len(parts) > 1 else doc
        key = parts[-1]
        if isinstance(parent, list):
            if not isinstance(key, int) or not 0 <= key < len(parent):
                raise ConnectorError(f"'{path}': index out of range.")
        elif not isinstance(parent, dict):
            raise ConnectorError(f"'{path}': can't set a field inside a {type(parent).__name__}.")
        parent[key] = value
        return f"set {path}"

    if op == "append":
        parent = _descend(doc, parts[:-1], path) if len(parts) > 1 else doc
        key = parts[-1]
        if isinstance(parent, dict) and parent.get(key) is None:
            parent[key] = []
        target = parent[key] if isinstance(parent, dict) else _descend(doc, parts, path)
        if not isinstance(target, list):
            raise ConnectorError(f"'{path}' is not a list, so you can't append to it.")
        target.append(value)
        return f"appended to {path}"

    if op == "remove":
        if len(parts) < 2:
            raise ConnectorError("Removing a whole section isn't allowed; remove items inside it.")
        parent = _descend(doc, parts[:-1], path)
        key = parts[-1]
        try:
            del parent[key]
        except (KeyError, IndexError, TypeError):
            raise ConnectorError(f"'{path}' doesn't exist in this resume.")
        return f"removed {path}"

    raise ConnectorError(f"Unknown op '{op}'. Use set, append or remove.")


def _snapshot(doc: dict, user_id: int, note: str) -> str:
    db = _db()
    version = {
        "resume_id": doc["_id"],
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "note": (note or "")[:300],
        "source": "claude-connector",
        "content": {f: copy.deepcopy(doc.get(f)) for f in CONTENT_FIELDS if f in doc},
    }
    vid = db.resume_versions.insert_one(version).inserted_id
    old = list(
        db.resume_versions.find({"resume_id": doc["_id"]}, {"_id": 1})
        .sort("created_at", -1)
        .skip(MAX_VERSIONS_PER_RESUME)
    )
    if old:
        db.resume_versions.delete_many({"_id": {"$in": [v["_id"] for v in old]}})
    return str(vid)


def _validated_content(doc: dict) -> dict:
    data = {f: doc.get(f) for f in CONTENT_FIELDS if doc.get(f) is not None}
    data.setdefault("personal_info", {})
    serializer = ResumeSerializer(data=data)
    if not serializer.is_valid():
        raise ConnectorError(f"The change would make the resume invalid: {serializer.errors}")
    return {f: serializer.validated_data[f] for f in CONTENT_FIELDS if f in serializer.validated_data}


def _save_content(user_id: int, doc: dict, content: dict) -> None:
    # Fields the serializer doesn't model (e.g. the profile photo) stay as they were.
    if "personal_info" in content and doc.get("personal_info", {}).get("profile_image"):
        content["personal_info"] = {**content["personal_info"], "profile_image": doc["personal_info"]["profile_image"]}
    _db().resumes.update_one(
        {"_id": doc["_id"], "user_id": user_id},
        {"$set": {**content, "updated_at": datetime.utcnow()}},
    )


def edit_resume(user_id: int, resume_id: str, edits: list[dict], note: str) -> dict:
    if not edits:
        raise ConnectorError("No edits given.")
    doc = _own_resume(user_id, resume_id)
    edited = copy.deepcopy(doc)
    done = [_apply(edited, e) for e in edits]  # all or nothing: nothing saved if one fails
    content = _validated_content(edited)
    version_id = _snapshot(doc, user_id, note or "; ".join(done))
    _save_content(user_id, doc, content)
    return {"applied": done, "undo_version_id": version_id, **_links(resume_id)}


def duplicate_resume(user_id: int, resume_id: str, new_name: str) -> dict:
    doc = _own_resume(user_id, resume_id)
    now = datetime.utcnow()
    copy_doc = {k: copy.deepcopy(v) for k, v in doc.items() if k != "_id"}
    copy_doc.update(
        {
            "name": (new_name or f"{doc.get('name') or 'Resume'} (copy)")[:200],
            "created_at": now,
            "updated_at": now,
            "public_profile_enabled": False,
        }
    )
    new_id = str(_db().resumes.insert_one(copy_doc).inserted_id)
    return {"id": new_id, "name": copy_doc["name"], **_links(new_id)}


def list_versions(user_id: int, resume_id: str) -> list[dict]:
    doc = _own_resume(user_id, resume_id)
    rows = _db().resume_versions.find(
        {"resume_id": doc["_id"], "user_id": user_id}, {"content": 0}
    ).sort("created_at", -1).limit(MAX_VERSIONS_PER_RESUME)
    return [
        {"version_id": str(r["_id"]), "saved_at": r["created_at"].isoformat(), "before_edit": r.get("note", "")}
        for r in rows
    ]


def restore_version(user_id: int, resume_id: str, version_id: str) -> dict:
    doc = _own_resume(user_id, resume_id)
    version = _db().resume_versions.find_one(
        {"_id": _oid(version_id), "resume_id": doc["_id"], "user_id": user_id}
    )
    if not version:
        raise ConnectorError(f"No version {version_id} for this resume. Use list_versions.")
    restored = copy.deepcopy(doc)
    restored.update(version["content"])
    content = _validated_content(restored)
    # The restore itself is undoable too.
    undo_id = _snapshot(doc, user_id, f"before restoring version {version_id}")
    _save_content(user_id, doc, content)
    return {"restored_version": version_id, "undo_version_id": undo_id, **_links(resume_id)}


def scoring_payload(user_id: int, resume_id: str) -> dict:
    """The resume in the camelCase shape the scoring prompt expects (as the builder sends it)."""
    doc = _own_resume(user_id, resume_id)
    content = {f: doc.get(f) for f in CONTENT_FIELDS if doc.get(f) is not None}
    if isinstance(content.get("personal_info"), dict):
        content["personal_info"] = {k: v for k, v in content["personal_info"].items() if k != "profile_image"}
    return _camel(content)


def _camel(value: Any) -> Any:
    if isinstance(value, dict):
        return {_camel_key(k): _camel(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_camel(v) for v in value]
    return value


def _camel_key(key: str) -> str:
    head, *rest = key.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest)


# --------------------------------------------------------------------------
# Job applications (the website's Job tracker / Bewerbungsübersicht)
# --------------------------------------------------------------------------

APPLICATION_STATUSES = ("saved", "applied", "interviewing", "offer", "rejected", "withdrawn")
# Long texts stay out of list_applications; only whether they exist is shown.
_LONG_APPLICATION_FIELDS = ("job_description", "cover_letter")


def _application_oid(application_id: str) -> ObjectId:
    try:
        return ObjectId(application_id)
    except (InvalidId, TypeError):
        raise ConnectorError(f"'{application_id}' is not an application id. Use list_applications to get the ids.")


def _application_out(doc: dict, full: bool = False) -> dict:
    out = {"id": str(doc["_id"])}
    for key, value in doc.items():
        if key in ("_id", "user_id"):
            continue
        if key in _LONG_APPLICATION_FIELDS and not full:
            out[f"has_{key}"] = bool(value)
            continue
        out[key] = value.isoformat() if isinstance(value, datetime) else value
    out["tracker_url"] = TRACKER_URL
    return out


def _check_resume(user_id: int, resume_id: str) -> None:
    if resume_id:
        _own_resume(user_id, resume_id)


def _validated_application(fields: dict, partial: bool) -> dict:
    data = dict(fields)
    # A plain date ("2026-10-28") is what people say; the serializer wants a datetime
    applied = data.get("applied_at")
    if isinstance(applied, str) and len(applied.strip()) == 10:
        data["applied_at"] = applied.strip() + "T00:00:00"
    serializer = JobApplicationSerializer(data=data, partial=partial)
    if not serializer.is_valid():
        raise ConnectorError(f"Invalid application: {serializer.errors}")
    return dict(serializer.validated_data)


def list_applications(user_id: int) -> list[dict]:
    docs = _db()[APPLICATIONS].find({"user_id": user_id}).sort("updated_at", -1)
    return [_application_out(d) for d in docs]


def add_application(user_id: int, fields: dict) -> dict:
    data = _validated_application(fields, partial=False)
    _check_resume(user_id, data.get("resume_id") or "")
    if data.get("status") == "applied" and not data.get("applied_at"):
        data["applied_at"] = datetime.utcnow()

    col = _db()[APPLICATIONS]
    same = col.find_one(
        {"user_id": user_id, "company": data["company"], "job_title": data["job_title"]},
        {"_id": 1},
    )
    now = datetime.utcnow()
    inserted = col.insert_one({"user_id": user_id, **data, "created_at": now, "updated_at": now})
    out = _application_out(col.find_one({"_id": inserted.inserted_id}))
    if same:
        out["note"] = (
            f"The tracker already had {data['job_title']} at {data['company']} "
            f"(id {same['_id']}). Tell the user, in case this one is a duplicate."
        )
    return out


def update_application(user_id: int, application_id: str, fields: dict) -> dict:
    if not fields:
        raise ConnectorError("No changes given.")
    oid = _application_oid(application_id)
    col = _db()[APPLICATIONS]
    if not col.find_one({"_id": oid, "user_id": user_id}, {"_id": 1}):
        raise ConnectorError(f"No application {application_id} in this account. Use list_applications to get the ids.")
    data = _validated_application(fields, partial=True)
    if "resume_id" in data:
        _check_resume(user_id, data["resume_id"] or "")
    data["updated_at"] = datetime.utcnow()
    col.update_one({"_id": oid, "user_id": user_id}, {"$set": data})
    return _application_out(col.find_one({"_id": oid}), full=True)
