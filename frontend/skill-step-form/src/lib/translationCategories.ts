// Content categories the user can choose to translate. Keep in sync with the
// backend TRANSLATION_CATEGORIES in api/resume_ai_translate.py.

export type TranslationCategory =
  | "summary"
  | "titles"
  | "work"
  | "skills"
  | "education"
  | "projects"
  | "certificates"
  | "organizations"
  | "locations"
  | "languages"
  | "interests";

export interface TranslationCategoryDef {
  code: TranslationCategory;
  /** i18n key for the human label. */
  labelKey: string;
}

export const TRANSLATION_CATEGORIES: TranslationCategoryDef[] = [
  { code: "summary", labelKey: "resume.translate.categories.summary" },
  { code: "titles", labelKey: "resume.translate.categories.titles" },
  { code: "work", labelKey: "resume.translate.categories.work" },
  { code: "skills", labelKey: "resume.translate.categories.skills" },
  { code: "education", labelKey: "resume.translate.categories.education" },
  { code: "projects", labelKey: "resume.translate.categories.projects" },
  { code: "certificates", labelKey: "resume.translate.categories.certificates" },
  { code: "organizations", labelKey: "resume.translate.categories.organizations" },
  { code: "locations", labelKey: "resume.translate.categories.locations" },
  { code: "languages", labelKey: "resume.translate.categories.languages" },
  { code: "interests", labelKey: "resume.translate.categories.interests" },
];

export const ALL_TRANSLATION_CATEGORY_CODES: TranslationCategory[] =
  TRANSLATION_CATEGORIES.map((c) => c.code);
