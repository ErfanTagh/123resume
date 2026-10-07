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
    `fallback` is the app's best guess. It is stated as the default because an
    open "detect the language" rule let unrelated details in the prompt (German
    style notes) pull English resumes into German.
    """
    name = language_name(fallback)
    rule = f"""
OUTPUT LANGUAGE (critical)
- Write {writes} in the language {source} is written in. The app's best guess is {name}: use {name}
  unless the prose itself (summary, descriptions, bullet points; not names, company names, tools or skills)
  is clearly in another language. Then use that language: Turkish prose gets Turkish, French gets French, and so on.
- Use the professional register native speakers use on resumes, and the formal "you" where the language has one."""
    if fallback == "de":
        rule += "\n- For German: professional Hochdeutsch, Sie-Form."
    return rule.strip()
