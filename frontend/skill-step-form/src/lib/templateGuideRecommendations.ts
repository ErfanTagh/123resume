import type { CVTemplate } from "@/components/cv-form/types";

export type ExperienceBand = "0-2" | "3-5" | "6-10" | "10+";
export type SeniorityLevel = "entry" | "mid" | "senior" | "lead";
export type JobSearchFocus = "ats" | "balanced" | "standout";
/** Where the user is applying — hiring conventions differ more than taste does */
export type ApplicationRegion = "us" | "uk" | "dach" | "eu";

/** Keys map to `resume.templateGuide.reasons.<key>` in i18n */
export type TemplateGuideReasonKey =
  | "reasonAtsDense"
  | "reasonAtsGeneral"
  | "reasonStandoutCreative"
  | "reasonEarlyModern"
  | "reasonMidBalanced"
  | "reasonSeniorClassic"
  | "reasonLeadershipDistinction"
  | "reasonRegionNoPhoto"
  | "reasonRegionPhoto";

/**
 * Templates built around a portrait or a heavy coloured sidebar. Expected on a
 * German Lebenslauf; in the US and UK a photo invites discrimination-screening
 * concerns and is routinely a reason to discard the application.
 */
const PHOTO_FORWARD: CVTemplate[] = ["slateCopper", "prism", "creative"];

/** Preference order per region, most conventional first. */
const REGION_PREFERENCE: Record<ApplicationRegion, CVTemplate[]> = {
  us: ["classic", "minimal", "latex", "modern"],
  uk: ["classic", "minimal", "modern", "latex"],
  dach: ["slateCopper", "modern", "prism", "classic"],
  eu: ["modern", "slateCopper", "minimal", "classic"],
};

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
  region?: ApplicationRegion,
): TemplateGuideResult {
  const base = getBaseRecommendation(years, seniority, focus);
  if (!region) return base;

  const preferred = REGION_PREFERENCE[region];
  const photoIsRisky = region === "us" || region === "uk";

  // US/UK: never send someone off with a portrait layout, whatever their
  // experience level said — that objection outranks style.
  if (photoIsRisky && PHOTO_FORWARD.includes(base.template)) {
    const primary = preferred.find((t) => !PHOTO_FORWARD.includes(t)) ?? "classic";
    return {
      template: primary,
      reasonKey: "reasonRegionNoPhoto",
      alternates: withoutPrimary(primary, preferred.filter((t) => !PHOTO_FORWARD.includes(t))),
    };
  }

  // German-speaking Europe: a photo is customary, so lead with a layout that
  // has a place for one — unless they asked for maximum ATS safety.
  if (!photoIsRisky && focus !== "ats" && !PHOTO_FORWARD.includes(base.template)) {
    const primary = preferred[0];
    if (primary !== base.template) {
      return {
        template: primary,
        reasonKey: "reasonRegionPhoto",
        alternates: withoutPrimary(primary, [base.template, ...preferred]),
      };
    }
  }

  // Region agrees with the pick; bias the alternates toward local norms. Filter
  // before trimming to two, so a US/UK applicant is never offered a portrait
  // layout as a runner-up either.
  const pool = [...base.alternates, ...preferred];
  return {
    ...base,
    alternates: withoutPrimary(
      base.template,
      photoIsRisky ? pool.filter((t) => !PHOTO_FORWARD.includes(t)) : pool,
    ),
  };
}

function getBaseRecommendation(
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
