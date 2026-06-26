import type { Resume, ResumeData } from "@/lib/api";

export type TailorApplyPayload = {
  section:
    | "professional_summary"
    | "professional_title"
    | "location"
    | "skills"
    | "work_experience"
    | "projects";
  summary?: string;
  title?: string;
  location?: string;
  skills?: Array<{ skill: string }>;
  workIndex?: number;
  projectIndex?: number;
  field?: "description" | "responsibilities";
  description?: string;
  responsibilities?: Array<{ responsibility: string }>;
};

export type TailorSuggestion = {
  id: string;
  section: string;
  label: string;
  before: string;
  after: string;
  apply: TailorApplyPayload;
};

const clip = (text: string, max: number): string => {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
};

/** Normalize apply payload from API (supports camelCase and snake_case keys). */
export function normalizeApplyPayload(raw: Record<string, unknown>): TailorApplyPayload {
  const workRaw = raw.workIndex ?? raw.work_index;
  const projectRaw = raw.projectIndex ?? raw.project_index;
  const workIndex =
    workRaw !== undefined && workRaw !== null && workRaw !== "" ? Number(workRaw) : undefined;
  const projectIndex =
    projectRaw !== undefined && projectRaw !== null && projectRaw !== ""
      ? Number(projectRaw)
      : undefined;

  const responsibilities = Array.isArray(raw.responsibilities)
    ? (raw.responsibilities as Array<{ responsibility?: string } | string>).map((item) => ({
        responsibility: clip(
          typeof item === "string" ? item : String(item?.responsibility || ""),
          500,
        ),
      }))
    : undefined;

  const skills = Array.isArray(raw.skills)
    ? (raw.skills as Array<{ skill?: string } | string>).map((item) => ({
        skill: clip(typeof item === "string" ? item : String(item?.skill || ""), 100),
      }))
    : undefined;

  return {
    section: String(raw.section || "") as TailorApplyPayload["section"],
    summary:
      raw.summary !== undefined && raw.summary !== null
        ? String(raw.summary)
        : undefined,
    title:
      raw.title !== undefined && raw.title !== null ? String(raw.title) : undefined,
    location:
      raw.location !== undefined && raw.location !== null ? String(raw.location) : undefined,
    skills,
    workIndex: Number.isFinite(workIndex) ? workIndex : undefined,
    projectIndex: Number.isFinite(projectIndex) ? projectIndex : undefined,
    field: (raw.field as TailorApplyPayload["field"]) || "description",
    description:
      raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : undefined,
    responsibilities,
  };
}

/** Build a PUT-safe resume body (matches other update flows in the app). */
export function toResumeUpdatePayload(resume: Resume): ResumeData {
  return {
    name: resume.name ?? "",
    personalInfo: resume.personalInfo,
    workExperience: resume.workExperience,
    education: resume.education,
    projects: resume.projects,
    certificates: resume.certificates,
    languages: resume.languages,
    skills: resume.skills,
    skillGroups: resume.skillGroups,
    template: resume.template,
    sectionOrder: resume.sectionOrder,
    styling: resume.styling,
    completenessScore: resume.completenessScore ?? 0,
    clarityScore: resume.clarityScore ?? 0,
    formattingScore: resume.formattingScore ?? 0,
    impactScore: resume.impactScore ?? 0,
    overallScore: resume.overallScore ?? 0,
  };
}

export function applyTailorSuggestion(resume: ResumeData, apply: TailorApplyPayload): ResumeData {
  const next: ResumeData = JSON.parse(JSON.stringify(resume));

  if (apply.section === "professional_summary" && apply.summary !== undefined) {
    next.personalInfo = {
      ...next.personalInfo,
      firstName: next.personalInfo?.firstName ?? "",
      lastName: next.personalInfo?.lastName ?? "",
      email: next.personalInfo?.email ?? "",
      summary: apply.summary,
    };
    return next;
  }

  if (apply.section === "professional_title" && apply.title !== undefined) {
    next.personalInfo = {
      ...next.personalInfo,
      firstName: next.personalInfo?.firstName ?? "",
      lastName: next.personalInfo?.lastName ?? "",
      email: next.personalInfo?.email ?? "",
      professionalTitle: apply.title,
    };
    return next;
  }

  if (apply.section === "location" && apply.location !== undefined) {
    next.personalInfo = {
      ...next.personalInfo,
      firstName: next.personalInfo?.firstName ?? "",
      lastName: next.personalInfo?.lastName ?? "",
      email: next.personalInfo?.email ?? "",
      location: apply.location,
    };
    return next;
  }

  if (apply.section === "skills" && apply.skills) {
    const seen = new Set<string>();
    const merged: Array<{ skill: string }> = [];
    for (const s of apply.skills) {
      const key = (s.skill || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push({ skill: s.skill.trim() });
      }
    }
    for (const s of next.skills || []) {
      const key = (s.skill || "").trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push({ skill: s.skill!.trim() });
      }
    }
    next.skills = merged;
    return next;
  }

  if (apply.section === "work_experience" && apply.workIndex !== undefined && apply.workIndex >= 0) {
    const work = [...(next.workExperience || [])];
    if (apply.workIndex >= work.length) return next;
    const entry = { ...work[apply.workIndex] };
    if (apply.field === "responsibilities" && apply.responsibilities) {
      entry.responsibilities = apply.responsibilities.map((r) => ({
        responsibility: clip(r.responsibility, 500),
      }));
    } else if (apply.description !== undefined) {
      entry.description = apply.description;
    }
    work[apply.workIndex] = entry;
    next.workExperience = work;
    return next;
  }

  if (
    apply.section === "projects" &&
    apply.projectIndex !== undefined &&
    apply.projectIndex >= 0 &&
    apply.description !== undefined
  ) {
    const projects = [...(next.projects || [])];
    if (apply.projectIndex >= projects.length) return next;
    projects[apply.projectIndex] = {
      ...projects[apply.projectIndex],
      description: apply.description,
    };
    next.projects = projects;
    return next;
  }

  return next;
}

export function tailorDownloadFilename(resume: Resume, companyName?: string): string {
  const base =
    resume.name?.trim() ||
    [resume.personalInfo?.firstName, resume.personalInfo?.lastName].filter(Boolean).join("-") ||
    "Resume";
  const safe = (value: string) =>
    value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 50);
  const company = safe(companyName || "");
  return company ? `${safe(base)}_${company}` : safe(base);
}
