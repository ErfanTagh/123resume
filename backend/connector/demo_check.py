"""
End-to-end check of the connector over real MCP (Streamable HTTP), as Claude would call it.

    docker exec resume_connector python -m connector.demo_check <username>

Uses a personal access token (123r_...), not the browser OAuth flow. For OAuth,
add the custom connector URL …/mcp in Claude and sign in at /connector/login
(password or Google/LinkedIn/GitHub).

Mints a token for the user, then reads, edits and undoes an edit on their newest
resume, and checks the refusals. The resume ends up exactly as it started.
"""
import asyncio
import json
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User  # noqa: E402
from mcp import ClientSession  # noqa: E402
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client  # noqa: E402

from connector import store  # noqa: E402

URL = "http://localhost:8100/mcp"


def ok(label, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + label + (f"   [{detail}]" if detail else ""))
    return bool(cond)


def payload(result):
    if getattr(result, "structured_content", None):
        sc = result.structured_content
        return sc.get("result", sc) if isinstance(sc, dict) else sc
    text = "".join(getattr(c, "text", "") for c in result.content)
    try:
        return json.loads(text)
    except ValueError:
        return text


async def main(user, token):
    results = []

    async with create_mcp_http_client(headers={"Authorization": f"Bearer {token}"}) as http:
        async with streamable_http_client(URL, http_client=http) as streams:
            read, write = streams[0], streams[1]
            async with ClientSession(read, write) as s:
                await s.initialize()
                tools = sorted(t.name for t in (await s.list_tools()).tools)
                results.append(ok("tools listed", len(tools) == 10, ", ".join(tools)))

                resumes = payload(await s.call_tool("list_resumes", {}))
                results.append(ok("list_resumes", isinstance(resumes, list) and resumes, f"{len(resumes)} resumes"))
                rid = resumes[0]["id"]

                before = payload(await s.call_tool("get_resume", {"resume_id": rid}))
                n_bullets = len(before["work_experience"][0].get("responsibilities") or [])
                results.append(ok("get_resume", "personal_info" in before, f"{before.get('name')!r}, {n_bullets} bullets in job 1"))

                edit = payload(await s.call_tool("edit_resume", {
                    "resume_id": rid,
                    "note": "demo: new summary and one bullet",
                    "edits": [
                        {"op": "set", "path": "personal_info.summary", "value": "DEMO SUMMARY written through the connector."},
                        {"op": "append", "path": "work_experience.0.responsibilities",
                         "value": {"responsibility": "DEMO bullet added through the connector."}},
                    ],
                }))
                results.append(ok("edit_resume saved", "undo_version_id" in edit, ", ".join(edit.get("applied", []))))

                after = payload(await s.call_tool("get_resume", {"resume_id": rid}))
                results.append(ok("edit visible",
                                  after["personal_info"]["summary"].startswith("DEMO")
                                  and len(after["work_experience"][0]["responsibilities"]) == n_bullets + 1))

                versions = payload(await s.call_tool("list_versions", {"resume_id": rid}))
                results.append(ok("list_versions", versions and versions[0]["version_id"] == edit["undo_version_id"]))

                await s.call_tool("restore_version", {"resume_id": rid, "version_id": edit["undo_version_id"]})
                restored = payload(await s.call_tool("get_resume", {"resume_id": rid}))
                results.append(ok("undo restores the original",
                                  restored["personal_info"].get("summary") == before["personal_info"].get("summary")
                                  and len(restored["work_experience"][0].get("responsibilities") or []) == n_bullets))

                bad = await s.call_tool("edit_resume", {"resume_id": rid, "edits": [
                    {"op": "set", "path": "user_id", "value": 1}]})
                results.append(ok("refuses non-content fields", bad.is_error, payload(bad)[:90] if isinstance(payload(bad), str) else ""))

                other = store._db().resumes.find_one({"user_id": {"$ne": user.id}}, {"_id": 1})
                if other:
                    foreign = await s.call_tool("get_resume", {"resume_id": str(other["_id"])})
                    results.append(ok("refuses another user's resume", foreign.is_error))

    try:
        async with create_mcp_http_client(headers={"Authorization": "Bearer 123r_wrong"}) as http:
            async with streamable_http_client(URL, http_client=http) as streams:
                async with ClientSession(streams[0], streams[1]) as s:
                    await s.initialize()
        results.append(ok("rejects a wrong token", False))
    except BaseException as e:  # the transport raises on 401
        results.append(ok("rejects a wrong token", True, type(e).__name__))

    store._db().connector_tokens.delete_one({"token_sha256": store._hash(token)})
    print(f"\n{sum(results)}/{len(results)} passed")


if __name__ == "__main__":
    # Django's ORM refuses to run inside async code, so look the user up first.
    demo_user = User.objects.get(username=sys.argv[1])
    asyncio.run(main(demo_user, store.create_token(demo_user.id, "demo check")))
