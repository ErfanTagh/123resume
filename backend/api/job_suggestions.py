"""
Job suggestions: LinkedIn jobs that fit a resume, found through SearchApi.io.

Every uncached search costs one SearchApi credit, so results are cached in
MongoDB per (keywords, location) and shared between users, and uncached
searches are capped per user and in total per day. The cache and the counters
live in MongoDB so a deploy (new container) doesn't reset them.
"""
import hashlib
import logging
import re
from datetime import datetime, timedelta

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SEARCH_URL = "https://www.searchapi.io/api/v1/search"
TIME_PERIOD = "last_week"  # fresh postings have fewer applicants
MAX_JOBS = 30

CACHE_COLLECTION = "job_search_cache"
USAGE_COLLECTION = "job_search_usage"

# "Kaiserslautern, DE" reads better to LinkedIn as "Kaiserslautern, Germany"
_COUNTRY_CODES = {
    "DE": "Germany", "AT": "Austria", "CH": "Switzerland", "NL": "Netherlands",
    "BE": "Belgium", "LU": "Luxembourg", "FR": "France", "IT": "Italy", "ES": "Spain",
    "PT": "Portugal", "PL": "Poland", "CZ": "Czechia", "DK": "Denmark", "SE": "Sweden",
    "NO": "Norway", "FI": "Finland", "IE": "Ireland", "GB": "United Kingdom",
    "UK": "United Kingdom", "US": "United States", "CA": "Canada", "AU": "Australia",
    "IN": "India", "IR": "Iran", "TR": "Turkey", "AE": "United Arab Emirates",
}


class JobSearchError(Exception):
    """Raised with a short, user-facing code: not_configured, limit_user,
    limit_total, upstream."""

    def __init__(self, code, message=""):
        super().__init__(message or code)
        self.code = code


def clean_text(value, limit):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def normalize_location(location):
    location = clean_text(location, 200)
    parts = [p.strip() for p in location.split(",") if p.strip()]
    if len(parts) >= 2 and parts[-1].upper() in _COUNTRY_CODES:
        parts[-1] = _COUNTRY_CODES[parts[-1].upper()]
    return ", ".join(parts)


def resume_search_defaults(resume):
    """Keywords and location for a resume: its title (or latest position) and city."""
    info = resume.get("personal_info") or {}
    keywords = clean_text(info.get("professional_title"), 100)
    if not keywords:
        for job in resume.get("work_experience") or []:
            keywords = clean_text(job.get("position"), 100)
            if keywords:
                break
    return keywords, normalize_location(info.get("location"))


def resume_skills(resume):
    """Every skill named on the resume (flat list and groups), deduplicated."""
    names = [s.get("skill") for s in resume.get("skills") or [] if isinstance(s, dict)]
    for group in resume.get("skill_groups") or []:
        names += [s.get("skill") for s in (group or {}).get("skills") or [] if isinstance(s, dict)]
    seen, out = set(), []
    for name in names:
        name = clean_text(name, 60)
        if name and name.lower() not in seen:
            seen.add(name.lower())
            out.append(name)
    return out


def _skill_in_title(skill, title):
    # Whole-word match, so "Go" doesn't match "Google" and "C" doesn't match everything
    if len(skill) < 2:
        return False
    return re.search(rf"(?<![\w+#]){re.escape(skill.lower())}(?![\w+#])", title) is not None


_WORD_START = r"(?<![a-zäöüß])"
_WORD_END = r"(?![a-zäöüß])"
_ENTRY_TITLE = re.compile(
    _WORD_START
    + r"(intern|internship|praktikum|praktikant|werkstudent|working student|trainee|ausbildung|azubi"
    r"|duales studium|student|graduate|junior|jr\.?|entry[- ]level|berufseinsteiger|einsteiger)"
    + _WORD_END
)
_SENIOR_TITLE = re.compile(
    _WORD_START
    + r"(senior|sr\.?|lead|principal|staff|head of|director|chief|vp|architect|teamleiter|team lead"
    r"|teamleitung|leitung|leiter)"
    + _WORD_END
)


def job_level(title):
    """'entry', 'senior' or 'mid' (no level word, or both) from a job title."""
    title = (title or "").lower()
    entry = bool(_ENTRY_TITLE.search(title))
    senior = bool(_SENIOR_TITLE.search(title))
    if entry and not senior:
        return "entry"
    if senior and not entry:
        return "senior"
    return "mid"


def _month(value):
    match = re.match(r"^(\d{4})-(\d{1,2})", str(value or "").strip())
    if not match:
        return None
    year, month = int(match.group(1)), int(match.group(2))
    return year * 12 + month - 1 if 1 <= month <= 12 else None


def experience_years(resume, today=None):
    """Years of work experience: the jobs' date ranges merged, so overlaps count once.
    An empty end date means the job is ongoing; future ends count up to today."""
    today = today or datetime.utcnow()
    now = today.year * 12 + today.month - 1
    spans = []
    for job in resume.get("work_experience") or []:
        start = _month(job.get("start_date"))
        if start is None or start > now:
            continue
        end = _month(job.get("end_date"))
        end = now if end is None else min(end, now)
        if end >= start:
            spans.append((start, end + 1))
    months, last_end = 0, None
    for start, end in sorted(spans):
        if last_end is not None and start < last_end:
            start = last_end
        if end > start:
            months += end - start
        last_end = end if last_end is None else max(last_end, end)
    return round(months / 12, 1)


def user_level(years):
    """'entry' under 2 years, 'mid' under 5, else 'senior'. None without dated jobs."""
    if not years:
        return None
    return "entry" if years < 2 else "mid" if years < 5 else "senior"


def level_fit(job, user):
    """How a job's level compares to the user's: 'fit', 'neutral', 'below' or 'above'.
    Mirrors levelFit in the app (lib/jobSuggestionRanking.ts)."""
    if not user:
        return "neutral"
    if job == user:
        return "fit"
    if user == "entry":
        return "above" if job == "senior" else "neutral"
    return "below" if job == "entry" else "neutral"


def job_key(link):
    """LinkedIn's job id from a posting link (or the link itself), to spot a job already in the tracker."""
    match = re.search(r"(\d{6,})/?(?:[?#]|$)", link or "")
    return match.group(1) if match else (link or "")


def annotate_jobs(jobs, skills):
    """Add the resume skills each title names and the job's level. The order
    stays LinkedIn's relevance order; sorting and filters happen in the app."""
    out = []
    for job in jobs:
        title = (job.get("title") or "").lower()
        matched = [s for s in skills if _skill_in_title(s, title)]
        out.append({**job, "matched_skills": matched[:4], "level": job_level(title)})
    return out


def _cache_key(keywords, location):
    raw = f"{keywords.lower()}|{location.lower()}|{TIME_PERIOD}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _slim_job(job):
    return {
        "job_id": str(job.get("job_id") or ""),
        "title": clean_text(job.get("title"), 200),
        "company": clean_text(job.get("company_name"), 120),
        "location": clean_text(job.get("location"), 120),
        "posted_at": clean_text(job.get("posted_at"), 40),
        "date": clean_text(job.get("date"), 20),
        "link": job.get("link") or "",
        "company_logo": job.get("thumbnail") or "",
        "note": clean_text(job.get("benefits"), 80),
    }


def _today():
    return datetime.utcnow().strftime("%Y-%m-%d")


def searches_left_today(db, user_id):
    """Uncached searches this user can still run today (also capped by the total)."""
    day = _today()
    usage = db[USAGE_COLLECTION]
    mine = (usage.find_one({"_id": f"{day}:user:{user_id}"}) or {}).get("count", 0)
    total = (usage.find_one({"_id": f"{day}:total"}) or {}).get("count", 0)
    return max(0, min(
        settings.JOB_SUGGESTIONS_USER_DAILY_LIMIT - mine,
        settings.JOB_SUGGESTIONS_TOTAL_DAILY_LIMIT - total,
    ))


def _count_search(db, user_id):
    day = _today()
    usage = db[USAGE_COLLECTION]
    for doc_id in (f"{day}:user:{user_id}", f"{day}:total"):
        usage.update_one({"_id": doc_id}, {"$inc": {"count": 1}, "$set": {"day": day}}, upsert=True)


def _fetch_from_searchapi(keywords, location):
    params = {"engine": "linkedin_jobs", "q": keywords, "time_period": TIME_PERIOD}
    if location:
        params["location"] = location
    try:
        resp = requests.get(
            SEARCH_URL,
            params=params,
            headers={"Authorization": f"Bearer {settings.SEARCHAPI_API_KEY}"},
            timeout=25,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as e:
        logger.warning("SearchApi request failed: %s", e)
        raise JobSearchError("upstream")
    if resp.status_code != 200 or data.get("error"):
        logger.warning("SearchApi error %s: %s", resp.status_code, str(data.get("error"))[:200])
        raise JobSearchError("upstream")
    return [_slim_job(j) for j in (data.get("jobs") or [])[:MAX_JOBS]]


def find_jobs(db, user_id, keywords, location):
    """
    Jobs for (keywords, location), from the cache when it's fresh.

    Returns (jobs, fetched_at, from_cache). Raises JobSearchError when the
    search can't run.
    """
    if not settings.SEARCHAPI_API_KEY:
        raise JobSearchError("not_configured")

    key = _cache_key(keywords, location)
    cache = db[CACHE_COLLECTION]
    cached = cache.find_one({"_id": key})
    max_age = timedelta(hours=settings.JOB_SUGGESTIONS_CACHE_HOURS)
    if cached and cached.get("fetched_at") and datetime.utcnow() - cached["fetched_at"] < max_age:
        return cached.get("jobs") or [], cached["fetched_at"], True

    day = _today()
    usage = db[USAGE_COLLECTION]
    mine = (usage.find_one({"_id": f"{day}:user:{user_id}"}) or {}).get("count", 0)
    if mine >= settings.JOB_SUGGESTIONS_USER_DAILY_LIMIT:
        raise JobSearchError("limit_user")
    total = (usage.find_one({"_id": f"{day}:total"}) or {}).get("count", 0)
    if total >= settings.JOB_SUGGESTIONS_TOTAL_DAILY_LIMIT:
        raise JobSearchError("limit_total")

    jobs = _fetch_from_searchapi(keywords, location)
    _count_search(db, user_id)
    fetched_at = datetime.utcnow()
    cache.replace_one(
        {"_id": key},
        {"_id": key, "keywords": keywords, "location": location, "jobs": jobs, "fetched_at": fetched_at},
        upsert=True,
    )
    return jobs, fetched_at, False
