/**
 * Which language should AI prose (score feedback, improvements, bullet
 * suggestions, tailoring) be written in?
 *
 * The answer is the language the RESUME is written in, not the language of the
 * site UI. Asking for UI-language prose made "Improve my resume" rewrite German
 * resumes into English whenever the site was set to English, and gave German
 * resumes English advice.
 *
 * Order of evidence:
 *   1. styling.resumeLanguage — set by the translator, so it is authoritative
 *   2. the resume's own text — a cheap stopword count, German vs English
 *   3. the UI language — only when the text is too short or too mixed to tell
 *
 * The AI endpoints only write prose in English or German, so resumes in other
 * languages fall through to the UI language as before.
 */

export type ResumeProseLanguage = "en" | "de";

// Function words and very common resume words that are unambiguous between the
// two languages. Words shared by both ("in", "an", "war") are left out.
const DE_WORDS = new Set([
  "und", "der", "die", "das", "mit", "für", "von", "im", "den", "dem", "des",
  "ist", "auf", "zu", "als", "bei", "eine", "einer", "ein", "einen", "sowie",
  "durch", "über", "nach", "wurde", "habe", "aus", "um", "zur", "zum", "nicht",
  "sich", "auch", "oder", "wie", "neue", "neuen", "jahre", "jahren", "erfahrung",
  "kunden", "mitarbeiter", "zuständig", "verantwortlich", "betreuung", "leitung",
]);
const EN_WORDS = new Set([
  "and", "the", "with", "for", "of", "to", "on", "at", "as", "by", "from", "is",
  "was", "were", "have", "has", "led", "managed", "developed", "responsible",
  "team", "years", "experience", "customers", "using", "across", "into", "over",
]);

// Fewer hits than this and the text is too short to call either way. Low enough
// that a single bullet plus its job title is usually decidable.
const MIN_SIGNAL = 4;
// The winning language needs this much of a lead.
const DOMINANCE = 1.5;

export function detectTextLanguage(text: string): ResumeProseLanguage | null {
  const tokens = (text || "").toLowerCase().match(/\p{L}+/gu) || [];
  let de = 0;
  let en = 0;
  for (const tok of tokens) {
    if (DE_WORDS.has(tok)) de += 1;
    else if (EN_WORDS.has(tok)) en += 1;
    if (/[äöüß]/.test(tok)) de += 1;
  }
  if (de + en < MIN_SIGNAL) return null;
  if (de >= en * DOMINANCE) return "de";
  if (en >= de * DOMINANCE) return "en";
  return null;
}

type Loose = Record<string, unknown> | null | undefined;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : []);
// API responses can arrive camelCase or snake_case.
const pick = (o: Loose, camel: string, snake: string): unknown =>
  o ? (o[camel] ?? o[snake]) : undefined;

/** Concatenate the prose parts of a resume (form data or an API resume). */
export function collectResumeText(data: unknown): string {
  const d = (data || {}) as Record<string, unknown>;
  const parts: string[] = [];
  const pi = pick(d, "personalInfo", "personal_info") as Loose;
  parts.push(str(pi?.summary), str(pick(pi, "professionalTitle", "professional_title")));
  for (const w of arr(pick(d, "workExperience", "work_experience"))) {
    parts.push(str(w?.position), str(w?.description));
    for (const r of arr(w?.responsibilities)) parts.push(str(r?.responsibility));
  }
  for (const p of arr(d.projects)) {
    parts.push(str(p?.description));
    for (const h of arr(p?.highlights)) parts.push(str(h?.highlight));
  }
  for (const e of arr(d.education)) parts.push(str(e?.degree), str(e?.field));
  return parts.filter(Boolean).join(" ");
}

const asProse = (v: unknown): ResumeProseLanguage | null =>
  v === "de" || v === "en" ? v : null;

const fromUi = (uiLanguage?: string): ResumeProseLanguage =>
  uiLanguage === "de" ? "de" : "en";

/** Language for AI prose about a whole resume. */
export function resumeProseLanguage(data: unknown, uiLanguage?: string): ResumeProseLanguage {
  const styling = ((data || {}) as Record<string, unknown>).styling as Loose;
  const declared = asProse(pick(styling, "resumeLanguage", "resume_language"));
  if (declared) return declared;
  return detectTextLanguage(collectResumeText(data)) ?? fromUi(uiLanguage);
}

/** Language for AI prose about a single field, given whatever text is at hand. */
export function textProseLanguage(texts: string[], uiLanguage?: string): ResumeProseLanguage {
  return detectTextLanguage(texts.filter(Boolean).join(" ")) ?? fromUi(uiLanguage);
}
