import type { CVFormData } from "@/components/cv-form/types";
import type { Resume } from "@/lib/api";

function pickStr(v: unknown): string {
  if (v == null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Merge personal_info / personalInfo and nested snake_case so hosted profile and
 * templates always receive consistent fields (public API + older Mongo shapes).
 */
export function normalizePersonalInfoFromResume(resume: Resume | Record<string, unknown>): CVFormData["personalInfo"] {
  const r = resume as Record<string, unknown>;
  const pi = (r.personalInfo ?? r.personal_info ?? {}) as Record<string, unknown>;
  return {
    firstName: pickStr(pi.firstName ?? pi.first_name),
    lastName: pickStr(pi.lastName ?? pi.last_name),
    professionalTitle: pickStr(pi.professionalTitle ?? pi.professional_title) || undefined,
    profileImage: pickStr(pi.profileImage ?? pi.profile_image) || undefined,
    email: pickStr(pi.email) || "",
    phone: pickStr(pi.phone) || undefined,
    location: pickStr(pi.location) || undefined,
    linkedin: pickStr(pi.linkedin) || undefined,
    github: pickStr(pi.github) || undefined,
    website: pickStr(pi.website) || undefined,
    summary: pickStr(pi.summary) || undefined,
    interests: Array.isArray(pi.interests) ? (pi.interests as CVFormData["personalInfo"]["interests"]) : undefined,
  };
}

function normalizeProjectsFromResume(resume: Resume | Record<string, unknown>): NonNullable<CVFormData["projects"]> {
  const r = resume as Record<string, unknown>;
  const raw = r.projects ?? r.project;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((item) => {
    const p = item as Record<string, unknown>;
    return {
      name: pickStr(p.name ?? p.title ?? p.project_name) || undefined,
      description: pickStr(p.description) || undefined,
      highlights: Array.isArray(p.highlights) ? (p.highlights as NonNullable<CVFormData["projects"]>[0]["highlights"]) : undefined,
      technologies: Array.isArray(p.technologies)
        ? (p.technologies as NonNullable<CVFormData["projects"]>[0]["technologies"])
        : undefined,
      startDate: pickStr(p.startDate ?? p.start_date) || undefined,
      endDate: pickStr(p.endDate ?? p.end_date) || undefined,
      link: pickStr(p.link ?? p.url ?? p.project_url) || undefined,
    };
  });
}

function normalizeCertificatesFromResume(resume: Resume | Record<string, unknown>): NonNullable<CVFormData["certificates"]> {
  const r = resume as Record<string, unknown>;
  const raw = r.certificates ?? r.certificate;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((item) => {
    const c = item as Record<string, unknown>;
    return {
      name: pickStr(c.name ?? c.title ?? c.certificate_name) || undefined,
      organization: pickStr(c.organization ?? c.issuer ?? c.issuing_organization) || undefined,
      issueDate: pickStr(c.issueDate ?? c.issue_date) || undefined,
      expirationDate: pickStr(c.expirationDate ?? c.expiration_date) || undefined,
      credentialId: pickStr(c.credentialId ?? c.credential_id) || undefined,
      url: pickStr(c.url ?? c.link ?? c.credential_url) || undefined,
    };
  });
}

function normalizeSkillGroupsFromResume(
  resume: Resume | Record<string, unknown>,
): NonNullable<CVFormData["skillGroups"]> {
  const r = resume as Record<string, unknown>;
  const raw = r.skillGroups ?? r.skill_groups;
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map((group) => {
    const g = group as Record<string, unknown>;
    const groupSkillsRaw = g.skills;
    const groupSkills = Array.isArray(groupSkillsRaw)
      ? groupSkillsRaw.map((skillRow) => {
          const row = skillRow as Record<string, unknown>;
          return { skill: pickStr(row.skill) || undefined };
        })
      : [];
    return {
      name: pickStr(g.name) || undefined,
      skills: groupSkills,
    };
  });
}

/**
 * Convert backend Resume (styling snake_case or camelCase) to CVFormData for templates.
 */
export function convertStyling(styling: any | undefined): CVFormData["styling"] {
  if (!styling) {
    return {};
  }

  const fontFamily = styling.fontFamily ?? styling.font_family;
  const fontSize = styling.fontSize ?? styling.font_size;
  const titleColor = styling.titleColor ?? styling.title_color;
  const titleBold = styling.titleBold ?? styling.title_bold;
  const headingColor = styling.headingColor ?? styling.heading_color;
  const headingBold = styling.headingBold ?? styling.heading_bold;
  const textColor = styling.textColor ?? styling.text_color;
  const linkColor = styling.linkColor ?? styling.link_color;

  let sectionStyling: CVFormData["styling"] extends { sectionStyling?: infer T } ? T : any =
    undefined;

  const rawSectionStyling = styling.sectionStyling ?? styling.section_styling;
  if (rawSectionStyling && typeof rawSectionStyling === "object") {
    sectionStyling = {};
    Object.keys(rawSectionStyling).forEach((key) => {
      const section = rawSectionStyling[key] || {};
      if (key === "personalInfo") {
        sectionStyling![key] = {
          titleColor: section.titleColor ?? section.title_color,
          bodyColor: section.bodyColor ?? section.body_color,
        };
      } else {
        sectionStyling![key] = {
          titleColor: section.titleColor ?? section.title_color,
          titleSize: section.titleSize ?? section.title_size,
          bodyColor: section.bodyColor ?? section.body_color,
          bodySize: section.bodySize ?? section.body_size,
        };
      }
    });
  }

  return {
    // Content language set by the AI translator (drives section-heading language).
    resumeLanguage: styling.resumeLanguage ?? styling.resume_language,
    fontFamily,
    fontSize,
    titleColor,
    titleBold,
    headingColor,
    headingBold,
    textColor,
    linkColor,
    sectionStyling,
  };
}

function normalizeWorkExperienceFromResume(
  resume: Resume | Record<string, unknown>,
): NonNullable<CVFormData["workExperience"]> {
  const r = resume as Record<string, unknown>;
  const raw =
    r.workExperience ??
    r.work_experience ??
    (r as { WorkExperience?: unknown }).WorkExperience;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const exp = item as Record<string, unknown>;
    const responsibilitiesRaw = exp.responsibilities;
    let responsibilities: NonNullable<CVFormData["workExperience"]>[0]["responsibilities"];
    if (Array.isArray(responsibilitiesRaw)) {
      responsibilities = responsibilitiesRaw.map((entry) => {
        if (typeof entry === "string") {
          return { responsibility: entry.trim() || undefined };
        }
        const row = entry as { responsibility?: string };
        return { responsibility: pickStr(row.responsibility) || undefined };
      });
    }
    return {
      position: pickStr(exp.position ?? exp.job_title ?? exp.title) || undefined,
      company: pickStr(exp.company ?? exp.employer ?? exp.organization) || undefined,
      location: pickStr(exp.location) || undefined,
      startDate: pickStr(exp.startDate ?? exp.start_date) || undefined,
      endDate: pickStr(exp.endDate ?? exp.end_date) || undefined,
      description: pickStr(exp.description) || undefined,
      responsibilities,
      technologies: Array.isArray(exp.technologies)
        ? (exp.technologies as NonNullable<CVFormData["workExperience"]>[0]["technologies"])
        : undefined,
      competencies: Array.isArray(exp.competencies)
        ? (exp.competencies as NonNullable<CVFormData["workExperience"]>[0]["competencies"])
        : undefined,
      link: pickStr(exp.link ?? exp.url) || undefined,
    };
  });
}

export function resumeToCvFormData(resume: Resume): CVFormData {
  const r = resume as Record<string, unknown>;
  const workExperience = normalizeWorkExperienceFromResume(resume);
  return {
    template: resume.template || "modern",
    personalInfo: normalizePersonalInfoFromResume(resume),
    workExperience,
    education: resume.education || [],
    projects: normalizeProjectsFromResume(resume),
    certificates: normalizeCertificatesFromResume(resume),
    skills: resume.skills || [],
    skillGroups: normalizeSkillGroupsFromResume(resume),
    languages: resume.languages || [],
    sectionOrder:
      ((resume.sectionOrder as string[] | undefined) ?? (r.section_order as string[] | undefined)) || [],
    styling: convertStyling((resume as { styling?: unknown }).styling),
  };
}

