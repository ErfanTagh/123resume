import type { CVTemplate } from "@/components/cv-form/types";

export type TemplateBadgeId = "recommended" | "ats" | "new" | "european";

export interface LandingTemplateCatalogItem {
  key: CVTemplate;
  nameKey: string;
  badges: TemplateBadgeId[];
}

/** Display order for landing / templates pages (matches marketing priority). */
export const LANDING_TEMPLATE_CATALOG: LandingTemplateCatalogItem[] = [
  { key: "modern", nameKey: "templateModern", badges: ["recommended", "ats"] },
  { key: "classic", nameKey: "templateClassic", badges: ["ats"] },
  { key: "starRover", nameKey: "templateStarRover", badges: ["ats", "new"] },
  { key: "minimal", nameKey: "templateMinimal", badges: ["ats"] },
  { key: "creative", nameKey: "templateCreative", badges: ["new"] },
  { key: "latex", nameKey: "templateLatex", badges: ["european"] },
  { key: "slateCopper", nameKey: "templateSlateCopper", badges: ["ats"] },
];
