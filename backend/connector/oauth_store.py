"""
Mongo persistence for connector OAuth (DCR clients, codes, tokens, login state).

Access and refresh tokens are stored hashed. Client secrets are stored as issued
so the MCP SDK can compare them on /token. No raw tokens are logged.
"""
from __future__ import annotations

import hashlib
import secrets
import time
from datetime import datetime
from typing import Any

from api.views.match_views import _get_mongo_db

ACCESS_TTL_SEC = 3600
REFRESH_TTL_SEC = 60 * 60 * 24 * 30
CODE_TTL_SEC = 300
LOGIN_STATE_TTL_SEC = 600

ACCESS_PREFIX = "mcp_at_"
REFRESH_PREFIX = "mcp_rt_"
CODE_PREFIX = "mcp_ac_"


def _db():
    return _get_mongo_db()


def _hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _now() -> float:
    return time.time()


# --------------------------------------------------------------------------
# DCR clients
# --------------------------------------------------------------------------

def save_client(client: dict[str, Any]) -> None:
    client_id = client.get("client_id")
    if not client_id:
        raise ValueError("client_id required")
    doc = {**client, "updated_at": datetime.utcnow()}
    _db().connector_oauth_clients.replace_one({"client_id": client_id}, doc, upsert=True)


def get_client(client_id: str) -> dict[str, Any] | None:
    row = _db().connector_oauth_clients.find_one({"client_id": client_id}, {"_id": 0})
    return row


# --------------------------------------------------------------------------
# Pending login (authorize → /login → password or social)
# --------------------------------------------------------------------------

def save_login_state(payload: dict[str, Any]) -> str:
    state = secrets.token_urlsafe(24)
    _db().connector_oauth_login_states.insert_one(
        {
            "state": state,
            "payload": payload,
            "expires_at": _now() + LOGIN_STATE_TTL_SEC,
            "created_at": datetime.utcnow(),
        }
    )
    return state


def pop_login_state(state: str) -> dict[str, Any] | None:
    row = _db().connector_oauth_login_states.find_one_and_delete({"state": state})
    if not row:
        return None
    if row.get("expires_at", 0) < _now():
        return None
    return row.get("payload")


# --------------------------------------------------------------------------
# Authorization codes
# --------------------------------------------------------------------------

def save_authorization_code(code_doc: dict[str, Any]) -> str:
    code = CODE_PREFIX + secrets.token_urlsafe(32)
    _db().connector_oauth_codes.insert_one(
        {
            "code_sha256": _hash(code),
            "doc": code_doc,
            "expires_at": code_doc.get("expires_at", _now() + CODE_TTL_SEC),
            "created_at": datetime.utcnow(),
        }
    )
    return code


def get_authorization_code(code: str) -> dict[str, Any] | None:
    if not code or not code.startswith(CODE_PREFIX):
        return None
    row = _db().connector_oauth_codes.find_one({"code_sha256": _hash(code)})
    if not row:
        return None
    if row.get("expires_at", 0) < _now():
        _db().connector_oauth_codes.delete_one({"code_sha256": _hash(code)})
        return None
    return row.get("doc")


def delete_authorization_code(code: str) -> None:
    if not code:
        return
    _db().connector_oauth_codes.delete_one({"code_sha256": _hash(code)})


# --------------------------------------------------------------------------
# Access + refresh tokens
# --------------------------------------------------------------------------

def issue_tokens(
    *,
    client_id: str,
    scopes: list[str],
    subject: str,
    resource: str | None,
) -> tuple[str, str, int]:
    access = ACCESS_PREFIX + secrets.token_urlsafe(32)
    refresh = REFRESH_PREFIX + secrets.token_urlsafe(32)
    access_exp = int(_now() + ACCESS_TTL_SEC)
    refresh_exp = int(_now() + REFRESH_TTL_SEC)
    family = secrets.token_hex(16)
    common = {
        "client_id": client_id,
        "scopes": scopes,
        "subject": subject,
        "resource": resource,
        "family": family,
        "created_at": datetime.utcnow(),
    }
    _db().connector_oauth_tokens.insert_one(
        {
            **common,
            "kind": "access",
            "token_sha256": _hash(access),
            "expires_at": access_exp,
        }
    )
    _db().connector_oauth_tokens.insert_one(
        {
            **common,
            "kind": "refresh",
            "token_sha256": _hash(refresh),
            "expires_at": refresh_exp,
        }
    )
    return access, refresh, ACCESS_TTL_SEC


def load_access_token(token: str) -> dict[str, Any] | None:
    if not token or not token.startswith(ACCESS_PREFIX):
        return None
    row = _db().connector_oauth_tokens.find_one(
        {"token_sha256": _hash(token), "kind": "access"},
        {"_id": 0},
    )
    if not row:
        return None
    if row.get("expires_at", 0) < _now():
        return None
    return row


def load_refresh_token(token: str) -> dict[str, Any] | None:
    if not token or not token.startswith(REFRESH_PREFIX):
        return None
    row = _db().connector_oauth_tokens.find_one(
        {"token_sha256": _hash(token), "kind": "refresh"},
        {"_id": 0},
    )
    if not row:
        return None
    if row.get("expires_at", 0) < _now():
        return None
    return row


def revoke_by_token(token: str) -> None:
    if not token:
        return
    row = _db().connector_oauth_tokens.find_one({"token_sha256": _hash(token)})
    if not row:
        return
    family = row.get("family")
    if family:
        _db().connector_oauth_tokens.delete_many({"family": family})
    else:
        _db().connector_oauth_tokens.delete_one({"token_sha256": _hash(token)})


def rotate_refresh(old_refresh: str) -> tuple[str, str, int] | None:
    row = load_refresh_token(old_refresh)
    if not row:
        return None
    revoke_by_token(old_refresh)
    return issue_tokens(
        client_id=row["client_id"],
        scopes=list(row.get("scopes") or []),
        subject=str(row["subject"]),
        resource=row.get("resource"),
    )
