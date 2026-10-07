"""
Which language AI prose is written in.

Every AI feature writes in the language the resume itself is written in: a
Turkish resume gets Turkish tips, a French one French rewrites. The model
detects that from the text. The language the app sends (`output_language`) is
only a fallback for when there is too little text to tell, such as a new role
with nothing but a job title.
"""
import re
from typing import Any

_LANGUAGE_NAMES = {
    "en": "English", "de": "German", "tr": "Turkish", "fr": "French", "es": "Spanish",
    "it": "Italian", "pt": "Portuguese", "nl": "Dutch", "pl": "Polish", "ru": "Russian",
    "uk": "Ukrainian", "ar": "Arabic", "fa": "Persian", "zh": "Chinese", "ja": "Japanese",
    "ko": "Korean", "hi": "Hindi", "sv": "Swedish", "da": "Danish", "no": "Norwegian",
    "fi": "Finnish", "cs": "Czech", "ro": "Romanian", "hu": "Hungarian", "el": "Greek",
}
_NAME_TO_CODE = {name.lower(): code for code, name in _LANGUAGE_NAMES.items()}
_NAME_TO_CODE.update({"deutsch": "de", "türkçe": "tr", "turkce": "tr"})


def normalize_output_language(raw: Any) -> str:
    """Fallback language code from the request ('en' when missing or unknown)."""
    if not isinstance(raw, str):
        return "en"
    v = raw.strip().lower()
    if v in _NAME_TO_CODE:
        return _NAME_TO_CODE[v]
    v = v.split("-")[0].split("_")[0]
    return v if re.fullmatch(r"[a-z]{2}", v) else "en"


def language_name(code: str) -> str:
    return _LANGUAGE_NAMES.get(code, code)


def output_language_rule(fallback: str, writes: str, source: str = "the resume") -> str:
    """
    Prompt block telling the model to write `writes` in the language of `source`.

    `writes` names the prose ("every feedback and suggestion string"),
    `source` names the text whose language decides ("the resume", "the original text").
    """
    return f"""
OUTPUT LANGUAGE (critical)
- Write {writes} in the language {source} is written in. Detect it from the prose itself
  (summary, descriptions, bullet points), not from names, company names, tools or skills,
  which are often English in any resume.
- Turkish text gets Turkish output, French gets French, Spanish gets Spanish, and so on for any language.
- Only if there is too little prose to tell, write in {language_name(fallback)}.
- Use the professional resume register native speakers use: professional Hochdeutsch for German,
  a professional US-style tone for English. Where a language has a formal "you" (German Sie,
  Turkish siz, French vous), use it when addressing the candidate.
""".strip()
