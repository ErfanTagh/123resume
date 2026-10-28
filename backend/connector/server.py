"""
123Resume connector for Claude: an MCP server (Streamable HTTP) that lets a
signed-in user read and edit their own resumes from Claude.

    python -m connector.server                      # listens on :8100, path /mcp

Auth:
  - OAuth 2.1 (DCR): Claude redirects to /login (password or Google/LinkedIn/GitHub).
  - Personal access tokens: Authorization Bearer 123r_... (demo / Claude Code).

Tools run Django/pymongo code, which is synchronous, so each one runs in a
worker thread (connector/store.py has the logic).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Literal

import django

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

import anyio  # noqa: E402
from mcp.server import MCPServer  # noqa: E402
from mcp.server.auth.middleware.auth_context import get_access_token  # noqa: E402
from mcp.server.auth.provider import AccessToken  # noqa: E402
from mcp.server.auth.settings import (  # noqa: E402
    AuthSettings,
    ClientRegistrationOptions,
    RevocationOptions,
)
from mcp.server.mcpserver.exceptions import ToolError  # noqa: E402
from mcp.server.transport_security import TransportSecuritySettings  # noqa: E402
from mcp.types import ToolAnnotations  # noqa: E402
from pydantic import AnyHttpUrl, BaseModel, Field  # noqa: E402

from connector import login_pages  # noqa: E402
from connector import store  # noqa: E402
from connector.oauth_provider import ResumeOAuthProvider  # noqa: E402

PUBLIC_URL = os.getenv("CONNECTOR_PUBLIC_URL", "http://localhost:8100").rstrip("/")
SITE_URL = os.getenv("CONNECTOR_SITE_URL", PUBLIC_URL).rstrip("/")
SCOPE = "resumes"
RESOURCE = f"{PUBLIC_URL}/mcp"


class ResumeOAuthProviderWithPat(ResumeOAuthProvider):
    """OAuth tokens plus personal access tokens (123r_...). SDK allows only auth_server_provider."""

    async def load_access_token(self, token: str) -> AccessToken | None:
        access = await super().load_access_token(token)
        if access is not None:
            return access
        if not token or not token.startswith(store.TOKEN_PREFIX):
            return None
        user_id = await anyio.to_thread.run_sync(store.user_for_token, token)
        if user_id is None:
            return None
        return AccessToken(
            token=token,
            client_id="personal-token",
            scopes=[SCOPE],
            subject=str(user_id),
            resource=self.resource,
        )


oauth_provider = ResumeOAuthProviderWithPat(PUBLIC_URL, SCOPE)
login_pages.configure(public_url=PUBLIC_URL, site_url=SITE_URL, oauth_provider=oauth_provider)


INSTRUCTIONS = """
Tools for the signed-in user's resumes on 123Resume (https://123resume.de).

Workflow:
1. list_resumes, then get_resume to read the resume before changing anything.
2. Tell the user what you plan to change, then call edit_resume with all the
   changes in one call. Only change what the user asked for.
3. Never invent facts: employers, dates, numbers, metrics, degrees or tools the
   user didn't give you. Ask instead.
4. Every edit_resume call saves a version first. If the user doesn't like a
   change, list_versions and restore_version undo it.
5. Share view_url so the user can see the result on 123resume.de.

PDF: the tools can't make a PDF. For a PDF or to apply somewhere, share
view_url: that page has a "Download PDF" button.

Photo: the photo can't be added or changed through these tools (get_resume
shows has_photo). Share edit_url: it opens on the Personal info step, where
the user uploads the photo.

Job tracker (on the site: "Job tracker", German "Bewerbungen"):
- list_applications shows what the user applied to and each status.
- add_application when the user applied, or wants to save a job. Link the
  resume they used (resume_id), e.g. the copy you tailored for this job, and
  keep the job ad in job_description when they gave you one.
- update_application for news: an interview, an offer, a rejection, notes.
- Only record what the user told you. Share tracker_url afterwards.

Write in the resume's own language.
""".strip()

mcp = MCPServer(
    name="123Resume",
    title="123Resume",
    instructions=INSTRUCTIONS,
    website_url="https://123resume.de",
    auth_server_provider=oauth_provider,
    auth=AuthSettings(
        issuer_url=AnyHttpUrl(PUBLIC_URL),
        resource_server_url=AnyHttpUrl(RESOURCE),
        required_scopes=[SCOPE],
        validate_token_resource=True,
        client_registration_options=ClientRegistrationOptions(
            enabled=True,
            valid_scopes=[SCOPE],
            default_scopes=[SCOPE],
        ),
        revocation_options=RevocationOptions(enabled=True),
        service_documentation_url=AnyHttpUrl(f"{SITE_URL}/"),
    ),
)


def _user_id() -> int:
    token = get_access_token()
    if token is None or token.subject is None:
        raise store.ConnectorError("Not signed in.")
    return int(token.subject)


async def _run(fn, *args):
    # ConnectorError is a mistake Claude can fix (wrong id, bad path, invalid value),
    # so its message goes back as a ToolError; the SDK hides any other exception.
    try:
        user_id = _user_id()
        return await anyio.to_thread.run_sync(lambda: fn(user_id, *args))
    except store.ConnectorError as e:
        raise ToolError(str(e)) from e


READ = ToolAnnotations(read_only_hint=True, open_world_hint=False)
WRITE = ToolAnnotations(read_only_hint=False, destructive_hint=False, idempotent_hint=False, open_world_hint=False)


class Edit(BaseModel):
    op: Literal["set", "append", "remove"] = Field(
        description='"set" replaces the value at path, "append" adds value to the list at path, '
        '"remove" deletes the list item or field at path.'
    )
    path: str = Field(
        description="Dot path into the resume as returned by get_resume, with list indexes as numbers. "
        'Examples: "personal_info.summary", "personal_info.professional_title", '
        '"work_experience.0.description", "work_experience.0.responsibilities" (append), '
        '"work_experience.0.responsibilities.2.responsibility" (set), "skills" (append), '
        '"projects.1.highlights" (append).'
    )
    value: Any = Field(
        default=None,
        description='New value (not used for remove). List items are objects: responsibilities '
        '{"responsibility": "..."}, skills {"skill": "..."}, project highlights {"highlight": "..."}, '
        'technologies {"technology": "..."}.',
    )


@mcp.tool(annotations=READ)
async def list_resumes() -> list[dict]:
    """List the user's resumes (newest first) with their ids, titles, scores and links."""
    return await _run(store.list_resumes)


@mcp.tool(annotations=READ)
async def get_resume(resume_id: str) -> dict:
    """Get the full content of one resume: personal info and summary, work experience with
    bullets, education, projects, skills, languages, certificates and publications."""
    return await _run(store.get_resume, resume_id)


@mcp.tool(annotations=WRITE)
async def edit_resume(resume_id: str, edits: list[Edit], note: str = "") -> dict:
    """Change a resume. All edits are applied together, validated like a save from the
    website, and saved only if every one of them is valid. A version is saved first, so
    the change can be undone with restore_version. `note` briefly says what changed."""
    return await _run(store.edit_resume, resume_id, [e.model_dump() for e in edits], note)


@mcp.tool(annotations=WRITE)
async def duplicate_resume(resume_id: str, new_name: str = "") -> dict:
    """Copy a resume, e.g. to tailor a version for one job without touching the original."""
    return await _run(store.duplicate_resume, resume_id, new_name)


@mcp.tool(annotations=READ)
async def list_versions(resume_id: str) -> list[dict]:
    """Saved versions of a resume, newest first: one is saved before every edit_resume call."""
    return await _run(store.list_versions, resume_id)


@mcp.tool(annotations=WRITE)
async def restore_version(resume_id: str, version_id: str) -> dict:
    """Put a resume back to a saved version (undo). The current state is saved first."""
    return await _run(store.restore_version, resume_id, version_id)


ApplicationStatus = Literal["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"]


class ApplicationChanges(BaseModel):
    """Fields to change on an application; leave out what stays the same."""

    status: ApplicationStatus | None = None
    notes: str | None = Field(default=None, description="Replaces the notes; include the old ones to keep them.")
    applied_at: str | None = Field(default=None, description='Date applied, "YYYY-MM-DD".')
    job_title: str | None = None
    company: str | None = None
    job_link: str | None = None
    resume_id: str | None = Field(default=None, description="The resume used for this application.")
    contact_person: str | None = None
    contact_email: str | None = None
    cover_letter: str | None = None
    job_description: str | None = None


@mcp.tool(annotations=READ)
async def list_applications() -> list[dict]:
    """The user's job tracker: every job they saved or applied to, newest first, with
    company, title, status, date applied, notes and the linked resume_id."""
    return await _run(store.list_applications)


@mcp.tool(annotations=WRITE)
async def add_application(
    job_title: str,
    company: str,
    status: ApplicationStatus = "applied",
    resume_id: str = "",
    job_link: str = "",
    applied_at: str = "",
    job_description: str = "",
    cover_letter: str = "",
    contact_person: str = "",
    contact_email: str = "",
    notes: str = "",
) -> dict:
    """Add a job to the user's job tracker. status "saved" is a job they want to apply to
    later. resume_id links the resume they sent. applied_at is "YYYY-MM-DD" (today if
    left empty and status is "applied")."""
    fields = {
        "job_title": job_title,
        "company": company,
        "status": status,
        "resume_id": resume_id,
        "job_link": job_link,
        "job_description": job_description,
        "cover_letter": cover_letter,
        "contact_person": contact_person,
        "contact_email": contact_email,
        "notes": notes,
    }
    if applied_at:
        fields["applied_at"] = applied_at
    return await _run(store.add_application, fields)


@mcp.tool(annotations=WRITE)
async def update_application(application_id: str, changes: ApplicationChanges) -> dict:
    """Update one application in the job tracker, e.g. the status after an interview
    invite, an offer or a rejection, or new notes. Ids come from list_applications."""
    return await _run(store.update_application, application_id, changes.model_dump(exclude_none=True))


@mcp.tool(annotations=READ)
async def score_resume(resume_id: str) -> dict:
    """123Resume's AI review: an interview-chance score from 1 to 10 for the resume's target
    role, feedback per area and the top suggestions. Takes about 5-10 seconds."""
    from api.resume_ai_scoring import score_resume_with_deepseek

    payload = await _run(store.scoring_payload, resume_id)
    return await anyio.to_thread.run_sync(lambda: score_resume_with_deepseek(payload, "en"))


@mcp.custom_route("/connector/login", methods=["GET"])
async def route_login(request):
    return await login_pages.login_page(request)


@mcp.custom_route("/connector/login/callback", methods=["POST"])
async def route_login_callback(request):
    return await login_pages.login_callback(request)


@mcp.custom_route("/connector/login/social/{provider}", methods=["GET"])
async def route_login_social(request):
    return await login_pages.login_social_start(request)


@mcp.custom_route("/connector/oauth/done", methods=["GET"])
async def route_oauth_done(request):
    return await login_pages.oauth_done(request)


def app():
    allowed = [
        h.strip()
        for h in os.getenv("CONNECTOR_ALLOWED_HOSTS", "localhost:8100,127.0.0.1:8100").split(",")
        if h.strip()
    ]
    return mcp.streamable_http_app(
        transport_security=TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=allowed,
            allowed_origins=[f"https://{h}" for h in allowed] + [f"http://{h}" for h in allowed],
        ),
        host="0.0.0.0",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app(), host="0.0.0.0", port=int(os.getenv("CONNECTOR_PORT", "8100")), log_level="info")
