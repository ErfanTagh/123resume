// Shared helpers for handling language proficiency levels (Native, Fluent, etc.)
// in a canonical, translation-friendly way across the app.

export const KNOWN_PROFICIENCY_KEYS = [
  "native",
  "fluent",
  "advanced",
  "intermediate",
  "basic",
] as const;

export type ProficiencyKey = (typeof KNOWN_PROFICIENCY_KEYS)[number];

const aliases = (key: ProficiencyKey, labels: string[]) =>
  Object.fromEntries(labels.map((label) => [label, key])) as Record<string, ProficiencyKey>;

/**
 * Free-text levels older resumes hold ("Fließend", "Muttersprache", ...) mapped to
 * their key, so they render in the resume's language like any other level.
 * Keep in sync with PROFICIENCY_ALIASES in backend/api/resume_ai_translate.py.
 */
export const PROFICIENCY_ALIASES: Record<string, ProficiencyKey> = {
  ...aliases("native", [
    "native speaker", "mother tongue", "muttersprache", "muttersprachlich", "muttersprachler",
    "muttersprachlerin", "nativo", "nativa", "lengua materna", "langue maternelle", "madrelingua",
    "lingua madre", "língua materna", "ana dil", "anadil",
  ]),
  ...aliases("fluent", [
    "business fluent", "fließend", "fliessend", "verhandlungssicher", "fluido", "fluida", "courant",
    "couramment", "fluente", "akıcı", "akici",
  ]),
  ...aliases("advanced", [
    "fortgeschritten", "sehr gut", "sehr gute kenntnisse", "avanzado", "avanzada", "avancé", "avancée",
    "avanzato", "avançado", "ileri", "ileri düzey",
  ]),
  ...aliases("intermediate", [
    "mittelstufe", "gut", "gute kenntnisse", "intermedio", "intermedia", "intermédiaire", "intermediário",
    "intermediario", "orta", "orta düzey",
  ]),
  ...aliases("basic", [
    "beginner", "elementary", "grundkenntnisse", "grundlagen", "anfänger", "básico", "basico", "básica",
    "débutant", "notions", "notions de base", "base", "di base", "temel", "başlangıç",
  ]),
};

const toKey = (lower: string): ProficiencyKey | undefined =>
  KNOWN_PROFICIENCY_KEYS.includes(lower as ProficiencyKey)
    ? (lower as ProficiencyKey)
    : PROFICIENCY_ALIASES[lower];

/**
 * Normalize any stored proficiency value to a canonical key when possible.
 * - A known key or a known label in any supported language (case-insensitive) returns the key.
 * - Otherwise, returns the original value so we don't lose custom text (e.g. "C1").
 */
export const normalizeProficiencyKey = (
  value?: unknown,
): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const str = String(value);
  // Keep the original string for custom labels
  return toKey(str.toLowerCase().trim()) ?? str;
};

/**
 * Format a stored proficiency value using the current translation function.
 * Works for both canonical keys and legacy free-text labels.
 */
export const formatProficiency = (
  t: (key: string) => string,
  value?: unknown,
): string => {
  if (value === undefined || value === null) return "";
  const str = String(value);
  const key = toKey(str.toLowerCase().trim());

  if (key) {
    const translationKey = `resume.proficiency.${key}`;
    const translated = t(translationKey);
    if (translated && translated !== translationKey) {
      return translated;
    }
    return str;
  }

  // Fallback for arbitrary/legacy strings
  return str;
};

