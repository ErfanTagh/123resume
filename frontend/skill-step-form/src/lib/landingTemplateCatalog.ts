import type { CVTemplate } from "@/components/cv-form/types";

export type TemplateBadgeId = "recommended" | "ats" | "new" | "european";

export interface LandingTemplateCatalogItem {
  key: CVTemplate;
  nameKey: string;
  badges: TemplateBadgeId[];
}

/** Display order for landing / templates pages (matches marketing priority). */
export const LANDING_TEMPLATE_CATALOG: LandingTemplateCatalogItem[] = [
  { key: "prism", nameKey: "templatePrism", badges: ["new"] },
  { key: "slateCopper", nameKey: "templateSlateCopper", badges: ["recommended"] },
  { key: "modern", nameKey: "templateModern", badges: ["ats"] },
  { key: "classic", nameKey: "templateClassic", badges: ["ats"] },
  { key: "starRover", nameKey: "templateStarRover", badges: ["ats"] },
  { key: "minimal", nameKey: "templateMinimal", badges: ["ats"] },
  { key: "creative", nameKey: "templateCreative", badges: ["new"] },
  { key: "latex", nameKey: "templateLatex", badges: ["european"] },
];

/** i18n key under `landing.*` for template description (e.g. templateModernDesc). */
export function landingTemplateDescKey(nameKey: string): string {
  return `${nameKey}Desc`;
}
