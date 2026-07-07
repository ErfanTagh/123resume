"""
Translate a whole resume into a target language via DeepSeek.

The user keeps their original resume; the caller saves the returned data as a
NEW resume (or applies it in place in the editor). We translate EVERY
human-readable field: professional/job/project titles, degrees, organizations,
locations, skills, technologies, competencies, courses, certificate names,
language names, and all prose (summaries, descriptions, bullets, highlights).

We deliberately DO NOT translate structural or identifier fields: the person's
name, email, phone, links/URLs, dates, credential IDs, the language proficiency
key (a canonical value rendered via i18n), section order, template, and styling.

The caller passes an explicit `target_language`; the model translates every
collected field into that language regardless of the source language. Well-known
brand/technology names (React, AWS, …) are kept verbatim by the model.
"""
from __future__ import annotations

import copy
import json
import logging
import re
from typing import Any, Callable, Dict, List, Optional

from django.conf import settings

from .ai_response_log import log_deepseek_exchange
from .deepseek_chat import get_deepseek_client

logger = logging.getLogger(__name__)

# Languages the resume translator supports. Keyed by ISO code; `native` is shown
# in the UI, `english` + `tone` steer the model. Keep in sync with the frontend
# list in src/lib/translationLanguages.ts.
SUPPORTED_TRANSLATION_LANGUAGES: Dict[str, Dict[str, str]] = {
    "en": {"english": "English", "native": "English", "tone": "professional US-style resume tone"},
    "de": {"english": "German", "native": "Deutsch", "tone": "professional Hochdeutsch, formal Sie register"},
    "es": {"english": "Spanish", "native": "Español", "tone": "professional, neutral Spanish suitable for a CV"},
    "fr": {"english": "French", "native": "Français", "tone": "professional French, formal register"},
    "it": {"english": "Italian", "native": "Italiano", "tone": "professional Italian suitable for a CV"},
    "pt": {"english": "Portuguese", "native": "Português", "tone": "professional Portuguese suitable for a CV"},
    "tr": {"english": "Turkish", "native": "Türkçe", "tone": "professional Turkish suitable for a CV"},
}

# Accept ISO codes, English names, and native names (accent-insensitive-ish).
_TRANSLATION_LANGUAGE_ALIASES: Dict[str, str] = {
    "en": "en", "english": "en",
    "de": "de", "german": "de", "deutsch": "de",
    "es": "es", "spanish": "es", "espanol": "es", "español": "es",
    "fr": "fr", "french": "fr", "francais": "fr", "français": "fr",
    "it": "it", "italian": "it", "italiano": "it",
    "pt": "pt", "portuguese": "pt", "portugues": "pt", "português": "pt",
    "tr": "tr", "turkish": "tr", "turkce": "tr", "türkçe": "tr",
}


def normalize_translation_language(raw: Any) -> Optional[str]:
    """Map a user-supplied language to a supported ISO code, or None if unsupported."""
    if not isinstance(raw, str):
        return None
    return _TRANSLATION_LANGUAGE_ALIASES.get(raw.strip().lower())


# User-selectable categories of content to translate. Each maps to one or more
# internal slot "kinds" (see _collect_slots). Keep in sync with the frontend list
# in src/lib/translationCategories.ts.
TRANSLATION_CATEGORIES: List[str] = [
    "summary",
    "titles",
    "work",
    "skills",
    "education",
    "projects",
    "certificates",
    "organizations",
    "locations",
    "languages",
    "interests",
]

_KIND_TO_CATEGORY: Dict[str, str] = {
    "professional_summary": "summary",
    "title": "titles",
    "work_description": "work",
    "work_bullet": "work",
    "skill": "skills",
    "skill_group": "skills",
    "field": "education",
    "education_description": "education",
    "project_description": "projects",
    "project_highlight": "projects",
    "certificate_name": "certificates",
    "organization": "organizations",
    "location": "locations",
    "language_name": "languages",
    "interest": "interests",
}


def normalize_categories(raw: Any) -> Optional[set]:
    """
    Return the set of selected category codes, or None to mean "translate all".

    None is returned only when the caller omits the field entirely. An explicit
    list is filtered to known categories (an empty/garbage list → empty set,
    which translates nothing — the frontend prevents that case).
    """
    if raw is None:
        return None
    if not isinstance(raw, (list, tuple, set)):
        return None
    known = set(TRANSLATION_CATEGORIES)
    return {c for c in raw if isinstance(c, str) and c in known}


# Safety caps so one call can't blow up the prompt / completion. Higher than the
# prose-only improve flow because "translate everything" also collects every
# skill, technology, and short title.
MAX_ITEMS = 400
MAX_ITEM_CHARS = 2000


def _norm(text: Any) -> str:
    return str(text or "").strip()


def _get_block(resume: Dict[str, Any], camel: str, snake: str) -> Any:
    val = resume.get(camel)
    if val is None:
        val = resume.get(snake)
    return val


class _Slot:
    """A single translatable text with a closure that writes the result back."""

    __slots__ = ("id", "kind", "text", "apply")

    def __init__(self, sid: str, kind: str, text: str, apply: Callable[[str], None]):
        self.id = sid
        self.kind = kind
        self.text = text
        self.apply = apply


def _collect_slots(resume: Dict[str, Any]) -> List[_Slot]:
    """
    Walk the resume and return every human-readable field to translate, each
    carrying a setter that writes the translation back into `resume` (mutated in
    place by the caller on a deep copy). Order is stable so ids line up with the
    model's response even if the model drops some.

    Structural/identifier fields (name, email, phone, links, dates, credential
    ids, proficiency key, template, styling, section order) are intentionally
    skipped.
    """
    slots: List[_Slot] = []
    # Sentinel raised internally once the cap is hit, to unwind the whole walk.
    full = False

    def add(kind: str, text: str, apply: Callable[[str], None]) -> None:
        """Append a slot when there is text and we are under the cap."""
        nonlocal full
        if full or len(slots) >= MAX_ITEMS:
            full = True
            return
        clean = _norm(text)
        if not clean:
            return
        slots.append(_Slot(f"t{len(slots)}", kind, clean[:MAX_ITEM_CHARS], apply))
        if len(slots) >= MAX_ITEMS:
            full = True

    def add_field(container: Any, key: str, kind: str) -> None:
        """Translate a string field on a dict."""
        if isinstance(container, dict):
            add(kind, container.get(key), lambda t, c=container, k=key: c.__setitem__(k, t))

    def add_list(lst: Any, key: str, kind: str) -> None:
        """Translate each entry of a list of strings or {key: text} dicts."""
        if not isinstance(lst, list):
            return
        for i in range(len(lst)):
            if full:
                return
            entry = lst[i]
            if isinstance(entry, str):
                add(kind, entry, lambda t, l=lst, idx=i: l.__setitem__(idx, t))
            elif isinstance(entry, dict):
                add(kind, entry.get(key), lambda t, e=entry, k=key: e.__setitem__(k, t))

    # Personal info: title, location, summary, interests (keep name/email/phone/links)
    pi = _get_block(resume, "personalInfo", "personal_info")
    if isinstance(pi, dict):
        add_field(pi, "professionalTitle", "title")
        add_field(pi, "professional_title", "title")
        add_field(pi, "location", "location")
        add_field(pi, "summary", "professional_summary")
        add_list(pi.get("interests"), "interest", "interest")

    # Work experience
    work = _get_block(resume, "workExperience", "work_experience")
    if isinstance(work, list):
        for exp in work:
            if full:
                break
            if not isinstance(exp, dict):
                continue
            add_field(exp, "position", "title")
            add_field(exp, "company", "organization")
            add_field(exp, "location", "location")
            add_field(exp, "description", "work_description")
            add_list(exp.get("responsibilities"), "responsibility", "work_bullet")
            add_list(exp.get("technologies"), "technology", "skill")
            add_list(exp.get("competencies"), "competency", "skill")

    # Education
    education = resume.get("education")
    if isinstance(education, list):
        for edu in education:
            if full:
                break
            if not isinstance(edu, dict):
                continue
            add_field(edu, "degree", "title")
            add_field(edu, "institution", "organization")
            add_field(edu, "location", "location")
            add_field(edu, "field", "field")
            add_list(edu.get("keyCourses"), "course", "skill")
            add_list(edu.get("descriptions"), "description", "education_description")

    # Projects
    projects = resume.get("projects")
    if isinstance(projects, list):
        for proj in projects:
            if full:
                break
            if not isinstance(proj, dict):
                continue
            add_field(proj, "name", "title")
            add_field(proj, "description", "project_description")
            add_list(proj.get("highlights"), "highlight", "project_highlight")
            add_list(proj.get("technologies"), "technology", "skill")

    # Certificates
    certificates = resume.get("certificates")
    if isinstance(certificates, list):
        for cert in certificates:
            if full:
                break
            if not isinstance(cert, dict):
                continue
            add_field(cert, "name", "certificate_name")
            add_field(cert, "organization", "organization")

    # Languages: translate the language NAME; keep the proficiency key untouched
    languages = resume.get("languages")
    if isinstance(languages, list):
        for lang in languages:
            if full:
                break
            if isinstance(lang, dict):
                add_field(lang, "language", "language_name")

    # Skills
    add_list(resume.get("skills"), "skill", "skill")

    # Skill groups: group name + each skill
    skill_groups = _get_block(resume, "skillGroups", "skill_groups")
    if isinstance(skill_groups, list):
        for grp in skill_groups:
            if full:
                break
            if not isinstance(grp, dict):
                continue
            add_field(grp, "name", "skill_group")
            add_list(grp.get("skills"), "skill", "skill")

    return slots


def _extract_json_object(text: str) -> Dict[str, Any]:
    text = (text or "").strip()
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end > start:
            text = text[start : end + 1]
    return json.loads(text)


def translate_resume(
    resume: Dict[str, Any],
    target_language: str,
    categories: Optional[set] = None,
) -> Dict[str, Any]:
    """
    Translate the resume into `target_language` (an ISO code from
    SUPPORTED_TRANSLATION_LANGUAGES).

    `categories` optionally restricts WHAT is translated (a set of codes from
    TRANSLATION_CATEGORIES); None translates everything.

    Returns {"target_language": <code>, "resume": <translated copy>}.
    The input `resume` is not mutated. Raises ValueError for an unsupported
    target. If there is nothing translatable, the resume is returned unchanged.
    """
    if not settings.DEEPSEEK_API_KEY:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured")

    target = normalize_translation_language(target_language)
    if target is None:
        raise ValueError(f"unsupported target_language: {target_language!r}")

    out = copy.deepcopy(resume)

    # Tag the resume with its new content language so templates can render section
    # headings in that language (stored in styling to round-trip without extra
    # backend plumbing). camelCase to match the frontend styling shape.
    styling = out.get("styling")
    if not isinstance(styling, dict):
        styling = {}
    styling["resumeLanguage"] = target
    out["styling"] = styling

    slots = _collect_slots(out)

    # Restrict to the selected categories, if any. Slot ids stay stable, so the
    # model response still lines up on apply.
    if categories is not None:
        slots = [s for s in slots if _KIND_TO_CATEGORY.get(s.kind) in categories]

    if not slots:
        # Nothing translatable (or nothing selected) — return the copy unchanged.
        return {"target_language": target, "resume": out}

    model_items = [{"id": s.id, "kind": s.kind, "text": s.text} for s in slots]

    info = SUPPORTED_TRANSLATION_LANGUAGES[target]
    direction = (
        f"Translate EVERY field into {info['native']} ({info['english']}). "
        f"Use {info['tone']}. The source text may be in any language — always output {info['native']}."
    )

    system = (
        "You are a professional resume translator. "
        "Reply with a single JSON object only (no markdown fences). "
        "Translate EVERY field faithfully into the target language: keep the same meaning; "
        "do NOT invent, add, or drop facts. Translate job titles, degrees, skills, and section content into "
        "their natural equivalent terms. Keep verbatim (do NOT translate): email addresses, URLs, phone "
        "numbers, numbers/metrics, and well-known brand, product, or technology names that are normally left "
        "in their original form (e.g. React, Python, AWS, iOS, Google, Microsoft). Do not add leading '- ' "
        "to bullet points."
    )
    user = f"""
Translate each resume field below. {direction}

Each field has a "kind" — keep the same format:
- "professional_summary": keep as 2-4 sentences.
- "work_description" / "project_description" / "education_description": keep concise sentences.
- "work_bullet" / "project_highlight": ONE tight accomplishment line, no leading "- ".
- "title" (job/degree/project titles), "organization" (company/school), "location", "field",
  "skill", "skill_group", "course", "certificate_name", "language_name", "interest": short phrase —
  translate to the natural equivalent term, but keep well-known brand/technology names as-is.

Return JSON exactly as:
{{"items": [{{"id": "<id>", "translated": "<translated text>"}}, ...]}}
Include one object per input id, preserving ids.

Fields to translate (JSON):
{json.dumps(model_items, ensure_ascii=False)}
""".strip()

    client = get_deepseek_client()
    completion = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=getattr(settings, "DEEPSEEK_RESUME_TRANSLATE_MAX_TOKENS", 4096),
        temperature=0.2,
    )
    raw = (completion.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("empty model response")

    try:
        parsed = _extract_json_object(raw)
    except json.JSONDecodeError as e:
        logger.warning("resume_translate JSON parse error: %s | snippet=%s", e, raw[:300])
        raise

    translated_by_id: Dict[str, str] = {}
    for row in parsed.get("items") or []:
        if not isinstance(row, dict):
            continue
        rid = str(row.get("id") or "").strip()
        val = _norm(row.get("translated"))
        if rid and val:
            translated_by_id[rid] = val[:MAX_ITEM_CHARS]

    applied = 0
    for s in slots:
        val = translated_by_id.get(s.id)
        if val:
            s.apply(val)
            applied += 1

    logger.info(
        "resume_translate model_ok target=%s slots=%d applied=%d",
        target,
        len(slots),
        applied,
    )
    log_deepseek_exchange(
        "resume_translate",
        completion,
        raw,
        {"target_language": target, "applied": applied, "slots": len(slots)},
    )

    return {"target_language": target, "resume": out}
