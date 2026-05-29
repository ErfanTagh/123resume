import type { CVFormData } from "@/components/cv-form/types";

function pickStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function countFilledWorkEntries(
  list: unknown,
): { total: number; withRole: number; withBullets: number } {
  if (!Array.isArray(list)) {
    return { total: 0, withRole: 0, withBullets: 0 };
  }
  let withRole = 0;
  let withBullets = 0;
  for (const raw of list) {
    const exp = raw as Record<string, unknown>;
    const position = pickStr(exp.position ?? exp.job_title);
    const company = pickStr(exp.company ?? exp.employer);
    if (position || company) withRole += 1;

    const responsibilities = exp.responsibilities;
    let bulletCount = 0;
    if (Array.isArray(responsibilities)) {
      for (const r of responsibilities) {
        if (typeof r === "string" && r.trim()) bulletCount += 1;
        else if (r && typeof r === "object") {
          const text = pickStr((r as { responsibility?: string }).responsibility);
          if (text) bulletCount += 1;
        }
      }
    }
    const descLines = pickStr(exp.description)
      .split("\n")
      .filter((l) => l.trim()).length;
    if (bulletCount > 0 || descLines > 0) withBullets += 1;
  }
  return { total: list.length, withRole, withBullets };
}

/**
 * Compact, PII-safe summary of what would be sent to POST /ai/resume-score/.
 * Use in browser console ([resume-score]) and when debugging empty-score reports.
 */
export function summarizeResumePayloadForScore(
  data: CVFormData | Record<string, unknown>,
): Record<string, unknown> {
  const d = data as Record<string, unknown>;
  const pi = (d.personalInfo ?? d.personal_info ?? {}) as Record<string, unknown>;
  const workRaw = d.workExperience ?? d.work_experience;
  const work = countFilledWorkEntries(workRaw);
  const skills = Array.isArray(d.skills)
    ? d.skills.filter((s) => {
        const sk = s as { skill?: string };
        return pickStr(sk?.skill);
      }).length
    : 0;
  const education = Array.isArray(d.education) ? d.education.length : 0;
  const projects = Array.isArray(d.projects) ? d.projects.length : 0;
  const summaryLen = pickStr(pi.summary ?? pi.Summary).length;

  return {
    template: d.template ?? "(none)",
    hasWorkExperienceKey: "workExperience" in d,
    hasWorkExperienceSnakeKey: "work_experience" in d,
    workExperienceCount: work.total,
    workEntriesWithPositionOrCompany: work.withRole,
    workEntriesWithBulletsOrDescription: work.withBullets,
    educationCount: education,
    projectsCount: projects,
    skillsCount: skills,
    summaryChars: summaryLen,
    firstNamePresent: !!pickStr(pi.firstName ?? pi.first_name),
    lastNamePresent: !!pickStr(pi.lastName ?? pi.last_name),
    emailPresent: !!pickStr(pi.email),
  };
}
