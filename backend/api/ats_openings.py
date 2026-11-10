"""
Job openings aggregated from company ATS boards (Greenhouse, Lever, Ashby).

These are free, public, per-company APIs (no global search, no API key, no
SearchApi credits). Every opening links straight to the company's own
application form, which the browser extension can autofill. The raw list is the
same for everyone, so it's fetched in parallel and cached in MongoDB for a few
hours; ranking against a resume happens per request.
"""
import concurrent.futures as cf
import logging
import re
from datetime import datetime, timedelta

import requests

logger = logging.getLogger(__name__)

CACHE_COLLECTION = "ats_openings_cache"
CACHE_HOURS = 6
MAX_RESULTS = 40
HTTP_TIMEOUT = 7

# Companies and the ATS each uses (auto-discovered from the public APIs). Grow
# this list over time; unknown or empty boards are skipped at fetch time.
COMPANIES = (
    [(c, "greenhouse") for c in (
        "databricks", "stripe", "cloudflare", "elastic", "datadog", "hellofresh", "mongodb",
        "coinbase", "brex", "gitlab", "celonis", "airbnb", "reddit", "robinhood", "figma",
        "twilio", "asana", "instacart", "vercel", "monzo", "n26", "dropbox", "contentful",
        "mirakl", "wise", "dataiku", "netlify",
    )]
    + [(c, "ashby") for c in (
        "openai", "doctolib", "notion", "plaid", "perplexity", "alan", "elevenlabs", "supabase",
        "docker", "qonto", "modal", "pleo", "hex", "snyk", "backmarket", "linear", "replit",
        "miro", "ledger", "posthog", "zapier", "sorare",
    )]
    + [(c, "lever") for c in ("blablacar",)]
    # SmartRecruiters: big employers with lots of German roles (filtered to DE).
    + [(c, "smartrecruiters") for c in (
        "DeliveryHero", "BoschGroup", "Continental", "Sixt", "Experian",
    )]
    + [(c, "recruitee") for c in ("bunq",)]
)

# Arbeitnow is a broad German/EU job board (not per-company); fetched once.
ARBEITNOW_PAGES = 3

# Nicer display names where capitalizing the slug isn't enough.
DISPLAY = {
    "openai": "OpenAI", "hellofresh": "HelloFresh", "gitlab": "GitLab", "mongodb": "MongoDB",
    "n26": "N26", "backmarket": "Back Market", "posthog": "PostHog", "blablacar": "BlaBlaCar",
    "doctolib": "Doctolib", "elevenlabs": "ElevenLabs",
}


def _display(token, fallback=""):
    if fallback:
        return fallback
    return DISPLAY.get(token, token[:1].upper() + token[1:])


def _get(url):
    try:
        resp = requests.get(url, timeout=HTTP_TIMEOUT, headers={"User-Agent": "123resume-openings/1.0"})
        if resp.status_code != 200:
            return None
        return resp.json()
    except (requests.RequestException, ValueError):
        return None


def _is_remote(text):
    return "remote" in (text or "").lower()


def _fetch_greenhouse(token):
    data = _get(f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs")
    out = []
    for j in (data or {}).get("jobs", []) if isinstance(data, dict) else []:
        loc = (j.get("location") or {}).get("name", "")
        out.append({
            "title": (j.get("title") or "").strip(),
            "company": _display(token, j.get("company_name", "")),
            "location": loc,
            "url": j.get("absolute_url") or "",
            "date": (j.get("updated_at") or "")[:10],
            "remote": _is_remote(loc),
            "source": "greenhouse",
        })
    return out


def _fetch_ashby(token):
    data = _get(f"https://api.ashbyhq.com/posting-api/job-board/{token}")
    out = []
    for j in (data or {}).get("jobs", []) if isinstance(data, dict) else []:
        if j.get("isListed") is False:
            continue
        out.append({
            "title": (j.get("title") or "").strip(),
            "company": _display(token),
            "location": j.get("location") or "",
            "url": j.get("applyUrl") or j.get("jobUrl") or "",
            "date": (j.get("publishedAt") or "")[:10],
            "remote": bool(j.get("isRemote")) or _is_remote(j.get("location")),
            "source": "ashby",
        })
    return out


def _fetch_lever(token):
    data = _get(f"https://api.lever.co/v0/postings/{token}?mode=json")
    out = []
    for j in data if isinstance(data, list) else []:
        cats = j.get("categories") or {}
        loc = cats.get("location") or ""
        ts = j.get("createdAt")
        date = datetime.utcfromtimestamp(ts / 1000).strftime("%Y-%m-%d") if isinstance(ts, (int, float)) else ""
        out.append({
            "title": (j.get("text") or "").strip(),
            "company": _display(token),
            "location": loc,
            "url": j.get("hostedUrl") or "",
            "date": date,
            "remote": _is_remote(loc) or (cats.get("commitment") == "Remote"),
            "source": "lever",
        })
    return out


def _fetch_smartrecruiters(token):
    # country=de keeps the list German-relevant (these boards hold thousands of
    # roles worldwide); SmartRecruiters returns a clean apply URL we can build.
    data = _get(f"https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=100&country=de")
    out = []
    for j in (data or {}).get("content", []) if isinstance(data, dict) else []:
        loc = j.get("location") or {}
        full = loc.get("fullLocation") or ", ".join(
            p for p in (loc.get("city"), (loc.get("country") or "").upper()) if p
        )
        company = j.get("company") or {}
        ident = company.get("identifier") or token
        out.append({
            "title": (j.get("name") or "").strip(),
            "company": company.get("name") or _display(token),
            "location": full,
            "url": f"https://jobs.smartrecruiters.com/{ident}/{j.get('id')}",
            "date": (j.get("releasedDate") or "")[:10],
            "remote": bool(loc.get("remote")),
            "source": "smartrecruiters",
        })
    return out


def _fetch_recruitee(token):
    data = _get(f"https://{token}.recruitee.com/api/offers/")
    out = []
    for j in (data or {}).get("offers", []) if isinstance(data, dict) else []:
        loc = ", ".join(p for p in (j.get("city"), j.get("country")) if p) or (j.get("location") or "")
        out.append({
            "title": (j.get("title") or "").strip(),
            "company": j.get("company_name") or _display(token),
            "location": loc,
            "url": j.get("careers_url") or "",
            "date": (j.get("published_at") or "")[:10],
            "remote": bool(j.get("remote")),
            "source": "recruitee",
        })
    return out


def _fetch_arbeitnow():
    """Broad German/EU board; paginate a few pages (no per-company token)."""
    out, url = [], "https://www.arbeitnow.com/api/job-board-api"
    for _ in range(ARBEITNOW_PAGES):
        data = _get(url)
        if not isinstance(data, dict):
            break
        for j in data.get("data", []):
            ts = j.get("created_at")
            date = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d") if isinstance(ts, (int, float)) else ""
            name = (j.get("company_name") or "").strip()
            out.append({
                "title": (j.get("title") or "").strip(),
                "company": name.title() if name and name.islower() and " " not in name else name,
                "location": j.get("location") or "",
                "url": j.get("url") or "",
                "date": date,
                "remote": bool(j.get("remote")),
                "source": "arbeitnow",
            })
        url = (data.get("links") or {}).get("next")
        if not url:
            break
    return out


_FETCHERS = {
    "greenhouse": _fetch_greenhouse, "ashby": _fetch_ashby, "lever": _fetch_lever,
    "smartrecruiters": _fetch_smartrecruiters, "recruitee": _fetch_recruitee,
}


def aggregate():
    """Fetch every company's board in parallel and return a flat, deduped list."""
    jobs = []
    with cf.ThreadPoolExecutor(max_workers=14) as ex:
        futures = [ex.submit(_FETCHERS[ats], token) for token, ats in COMPANIES]
        futures.append(ex.submit(_fetch_arbeitnow))  # broad board, one call
        for fut in cf.as_completed(futures):
            try:
                jobs.extend(fut.result() or [])
            except Exception as e:  # one slow/broken board must not sink the rest
                logger.warning("ATS fetch failed: %s", e)
    seen, deduped = set(), []
    for j in jobs:
        if not j["title"] or not j["url"] or j["url"] in seen:
            continue
        seen.add(j["url"])
        deduped.append(j)
    return deduped


def get_all(db):
    """Cached aggregated list (refreshed every CACHE_HOURS); serves stale on failure."""
    cache = db[CACHE_COLLECTION]
    doc = cache.find_one({"_id": "all"})
    fresh = doc and doc.get("fetched_at") and datetime.utcnow() - doc["fetched_at"] < timedelta(hours=CACHE_HOURS)
    if fresh:
        return doc.get("jobs") or [], doc["fetched_at"], True
    jobs = aggregate()
    if not jobs and doc:
        return doc.get("jobs") or [], doc.get("fetched_at"), True  # keep the old list
    now = datetime.utcnow()
    cache.replace_one({"_id": "all"}, {"_id": "all", "jobs": jobs, "fetched_at": now}, upsert=True)
    return jobs, now, False


# --- Ranking against a resume -------------------------------------------------

_STOP = {"and", "the", "for", "with", "senior", "junior", "lead", "staff", "principal", "m", "f", "d",
         "w", "x", "mwd", "mfd", "based", "remote", "fulltime", "full", "time"}

# Major German cities, so a location like "Berlin" or "Munich" (no country word)
# still counts as a German role.
GERMAN_CITIES = {
    "berlin", "munich", "münchen", "muenchen", "hamburg", "frankfurt", "cologne", "köln", "koeln",
    "stuttgart", "düsseldorf", "duesseldorf", "dusseldorf", "leipzig", "dortmund", "essen", "dresden",
    "hannover", "hanover", "nuremberg", "nürnberg", "nuernberg", "bremen", "mannheim", "kaiserslautern",
    "heidelberg", "bonn", "münster", "muenster", "aachen", "freiburg", "karlsruhe", "potsdam", "walldorf",
}


def germany_eligible(job):
    """A role in Germany, or a remote role open to Europe (so a Germany-based
    user can actually apply)."""
    loc = (job.get("location") or "").lower()
    if any(k in loc for k in ("germany", "deutschland", "dach")):
        return True
    if any(c in loc for c in GERMAN_CITIES):
        return True
    if job.get("remote"):
        if any(k in loc for k in ("europe", "emea")):
            return True
        if loc.strip() in ("remote", ""):
            return True
    return False


def location_eligible(job, location):
    """Match for a free-text location (e.g. "Kaiserslautern, Germany"): any part
    of it — a city OR the country — appears in the job's location, or the role is
    globally remote (no specific country pinned). Matching on the country token
    means a small home city still surfaces the whole country, while a role pinned
    to a far-away place ("Remote - Ireland") is left out."""
    if not location:
        return True
    parts = [p.strip().lower() for p in location.split(",") if len(p.strip()) >= 3]
    if not parts:
        return True
    loc = (job.get("location") or "").lower()
    if any(p in loc for p in parts):
        return True
    return bool(job.get("remote")) and loc.strip() in ("remote", "")


def _words(text):
    return {w for w in re.findall(r"[a-zA-Zäöü+#.]{3,}", (text or "").lower()) if w not in _STOP}


def _skill_in_title(skill, title):
    if len(skill) < 2:
        return False
    return re.search(rf"(?<![\w+#]){re.escape(skill.lower())}(?![\w+#])", title) is not None


def rank_for_resume(jobs, title_keywords, skills, location, country=None):
    """Rank openings by how well they fit the resume, best first. The signal is
    the resume's own data: how much of its target job title the opening's title
    shares, which of its skills the title names, plus location/remote fit and
    freshness. `country="germany"` restricts to German + Europe-remote roles."""
    if country in ("germany", "de"):
        jobs = [j for j in jobs if germany_eligible(j)]
    role_words = _words(title_keywords)
    title_l = (title_keywords or "").strip().lower()
    country_hints = {"germany", "deutschland", "europe", "emea", "eu"}
    city = (location or "").split(",")[0].strip().lower()
    if city:
        country_hints.add(city)
    if re.search(r"\bde\b", (location or "").lower()):
        country_hints.add("germany")

    today = datetime.utcnow().date()
    scored = []
    for j in jobs:
        job_title_l = j["title"].lower()
        matched = [s for s in skills if _skill_in_title(s, j["title"])]
        # Graded role fit: how many words of the resume's target title the
        # opening's title shares (so "DevOps Engineer" beats a lone "Engineer").
        role_overlap = len(role_words & _words(j["title"]))
        if not matched and role_overlap == 0:
            continue
        # The resume's whole title appearing in the opening is the strongest fit.
        title_exact = 3 if (title_l and title_l in job_title_l) else 0
        loc_l = (j["location"] or "").lower()
        loc_bonus = 2 if (j["remote"] or any(h in loc_l for h in country_hints)) else 0
        fresh = 0
        try:
            days = (today - datetime.strptime(j["date"], "%Y-%m-%d").date()).days
            fresh = 1.5 if days <= 7 else 0.75 if days <= 21 else 0
        except (ValueError, TypeError):
            pass
        score = len(matched) * 2.5 + role_overlap * 2.0 + title_exact + loc_bonus + fresh
        scored.append((score, {**j, "matched_skills": matched[:4]}))
    # Sort by score, then url, so the order is fully deterministic (never depends
    # on the order jobs were fetched in). Every surface then shows the same list.
    scored.sort(key=lambda s: (-s[0], s[1]["url"]))
    # Keep the list varied: at most a few roles per company.
    per_company, out = {}, []
    for _, j in scored:
        c = j["company"]
        if per_company.get(c, 0) >= 3:
            continue
        per_company[c] = per_company.get(c, 0) + 1
        out.append(j)
        if len(out) >= MAX_RESULTS:
            break
    return out


def openings_for_resume(db, title_keywords, skills, location, country=None):
    """The one path every surface uses (website, browser extension, MCP), so they
    always show the same ranked openings for the same inputs:

    - country="germany": Germany + Europe-remote roles (germany_eligible).
    - otherwise: filtered by the free-text `location` (city/country or globally
      remote), or everything when `location` is empty.

    Returns (ranked_jobs, all_jobs, fetched_at, from_cache)."""
    all_jobs, fetched_at, from_cache = get_all(db)
    country = (country or "").strip().lower()
    if country in ("germany", "de"):
        ranked = rank_for_resume(all_jobs, title_keywords, skills, location, country=country)
    else:
        pool = [j for j in all_jobs if location_eligible(j, location)]
        ranked = rank_for_resume(pool, title_keywords, skills, location)
    return ranked, all_jobs, fetched_at, from_cache
