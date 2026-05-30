import type { CVTemplate } from "@/components/cv-form/types";

export type ExperienceBand = "0-2" | "3-5" | "6-10" | "10+";
export type SeniorityLevel = "entry" | "mid" | "senior" | "lead";
export type JobSearchFocus = "ats" | "balanced" | "standout";

/** Keys map to `resume.templateGuide.reasons.<key>` in i18n */
export type TemplateGuideReasonKey =
  | "reasonAtsDense"
  | "reasonAtsGeneral"
  | "reasonStandoutCreative"
  | "reasonEarlyModern"
  | "reasonMidBalanced"
  | "reasonSeniorClassic"
  | "reasonLeadershipDistinction";

export interface TemplateGuideResult {
  template: CVTemplate;
  reasonKey: TemplateGuideReasonKey;
  alternates: CVTemplate[];
}

const uniq = (ids: CVTemplate[]): CVTemplate[] => [...new Set(ids)];

function withoutPrimary(primary: CVTemplate, list: CVTemplate[]): CVTemplate[] {
  return uniq(list.filter((t) => t !== primary)).slice(0, 2);
}

/**
 * Heuristic mapping: ATS-heavy and senior profiles favor structured templates;
 * early career favors readable two-column / minimal layouts; "stand out" nudges creative or distinctive options.
 */
export function getTemplateRecommendation(
  years: ExperienceBand,
  seniority: SeniorityLevel,
  focus: JobSearchFocus,
): TemplateGuideResult {
  const isEarly = years === "0-2" || seniority === "entry";
  const isMid = years === "3-5" || seniority === "mid";
  const isSeniorBand = years === "6-10" || seniority === "senior";
  const isVerySenior = years === "10+" || seniority === "lead";

  if (focus === "standout") {
    if (isEarly) {
      return {
        template: "modern",
        reasonKey: "reasonEarlyModern",
        alternates: withoutPrimary("modern", ["creative", "minimal", "classic"]),
      };
    }
    if (isVerySenior) {
      return {
        template: "starRover",
        reasonKey: "reasonLeadershipDistinction",
        alternates: withoutPrimary("starRover", ["creative", "modern", "latex"]),
      };
    }
    return {
      template: "creative",
      reasonKey: "reasonStandoutCreative",
      alternates: withoutPrimary("creative", ["modern", "starRover", "minimal"]),
    };
  }

  if (focus === "ats") {
    if (isVerySenior) {
      return {
        template: "latex",
        reasonKey: "reasonAtsDense",
        alternates: withoutPrimary("latex", ["classic", "modern", "minimal"]),
      };
    }
    if (isSeniorBand) {
      return {
        template: "classic",
        reasonKey: "reasonSeniorClassic",
        alternates: withoutPrimary("classic", ["latex", "modern", "minimal"]),
      };
    }
    return {
      template: "classic",
      reasonKey: "reasonAtsGeneral",
      alternates: withoutPrimary("classic", ["modern", "minimal", "slateCopper"]),
    };
  }

  // balanced
  if (isEarly) {
    return {
      template: "modern",
      reasonKey: "reasonEarlyModern",
      alternates: withoutPrimary("modern", ["minimal", "classic", "creative"]),
    };
  }
  if (isMid) {
    return {
      template: "modern",
      reasonKey: "reasonMidBalanced",
      alternates: withoutPrimary("modern", ["classic", "minimal", "slateCopper"]),
    };
  }
  if (isVerySenior) {
    return {
      template: "classic",
      reasonKey: "reasonSeniorClassic",
      alternates: withoutPrimary("classic", ["latex", "starRover", "modern"]),
    };
  }
  return {
    template: "classic",
    reasonKey: "reasonMidBalanced",
    alternates: withoutPrimary("classic", ["modern", "latex", "minimal"]),
  };
}
