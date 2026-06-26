/**
 * One-click accent color themes for the resume builder.
 *
 * Selecting a theme sets the resume's accent color (`headingColor` + `linkColor`),
 * which drives template top bars, section headings, and links. Title/body text
 * stay neutral for readability and can still be fine-tuned in the color pickers.
 */
import { RESUME_ACCENT_BLUE, RESUME_ACCENT_RED, RESUME_ACCENT_DEFAULT } from "@/lib/resumeTemplatePalette";

export interface ResumeColorTheme {
  id: string;
  /** i18n key suffix under resume.settings.colorThemes.* (falls back to `label`). */
  labelKey: string;
  label: string;
  /** Accent color applied to headingColor + linkColor. */
  accent: string;
}

export const RESUME_COLOR_THEMES: ResumeColorTheme[] = [
  { id: "red", labelKey: "red", label: "Red", accent: RESUME_ACCENT_RED }, // #dc2626 (default)
  { id: "blue", labelKey: "blue", label: "Blue", accent: RESUME_ACCENT_BLUE }, // #2563eb
  { id: "indigo", labelKey: "indigo", label: "Indigo", accent: "#4f46e5" },
  { id: "violet", labelKey: "violet", label: "Violet", accent: "#7c3aed" },
  { id: "teal", labelKey: "teal", label: "Teal", accent: "#0d9488" },
  { id: "emerald", labelKey: "emerald", label: "Emerald", accent: "#059669" },
  { id: "amber", labelKey: "amber", label: "Amber", accent: "#b45309" },
  { id: "rose", labelKey: "rose", label: "Rose", accent: "#e11d48" },
  { id: "slate", labelKey: "slate", label: "Slate", accent: "#334155" },
];

/** Normalize a hex color for comparison (lowercase, trimmed). */
const normalizeHex = (value: string | undefined | null): string =>
  (value ?? "").trim().toLowerCase();

/**
 * Returns the id of the theme whose accent matches the current headingColor,
 * or undefined if the resume uses a custom (non-preset) accent.
 */
export function getActiveResumeThemeId(
  headingColor: string | undefined | null,
): string | undefined {
  const current = normalizeHex(headingColor) || normalizeHex(RESUME_ACCENT_DEFAULT);
  return RESUME_COLOR_THEMES.find(
    (theme) => normalizeHex(theme.accent) === current,
  )?.id;
}

/** The default theme id (matches the default resume accent). */
export const DEFAULT_RESUME_THEME_ID = "red";

/**
 * Resolve a theme id (e.g. from a `?theme=` URL param) to its accent color.
 * Returns undefined for unknown ids so callers can fall back to defaults.
 */
export function getResumeThemeAccent(
  themeId: string | undefined | null,
): string | undefined {
  if (!themeId) return undefined;
  const id = themeId.trim().toLowerCase();
  return RESUME_COLOR_THEMES.find((theme) => theme.id === id)?.accent;
}
