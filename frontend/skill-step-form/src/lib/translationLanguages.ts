// Languages the AI resume translator supports. Keep in sync with the backend
// SUPPORTED_TRANSLATION_LANGUAGES in api/resume_ai_translate.py.

export type TranslationLanguageCode = "en" | "de" | "es" | "fr" | "it" | "pt" | "tr";

export interface TranslationLanguage {
  code: TranslationLanguageCode;
  /** English name (for menus in an English UI). */
  label: string;
  /** Endonym shown next to the label and used in generated resume names. */
  native: string;
}

export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: "en", label: "English", native: "English" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
];

/** Native/endonym label for a code, falling back to the uppercased code. */
export const translationLanguageNative = (code?: string | null): string => {
  if (!code) return "";
  return TRANSLATION_LANGUAGES.find((l) => l.code === code)?.native ?? code.toUpperCase();
};
