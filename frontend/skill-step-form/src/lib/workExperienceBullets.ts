/** Work experience bullet from form state or API. */
type ResponsibilityEntry =
  | string
  | { responsibility?: string | null }
  | null
  | undefined;

type WorkExperienceLike = {
  description?: string | null;
  responsibilities?: ResponsibilityEntry[] | null;
};

/**
 * Responsibility bullets only — ignores `description`.
 * Use with a separate `description` paragraph (Modern-style) so role summary + bullets both show.
 */
export function getWorkExperienceResponsibilityOnly(exp: WorkExperienceLike): string[] {
  return (
    exp.responsibilities
      ?.map((entry) => {
        if (typeof entry === "string") {
          return entry.trim();
        }
        if (entry && typeof entry === "object" && entry.responsibility) {
          return entry.responsibility.trim();
        }
        return "";
      })
      .filter(Boolean) ?? []
  );
}

/**
 * Normalize work experience bullets for resume templates.
 * Handles form shape `{ responsibility: "..." }` and legacy/parser shape `["bullet", ...]`.
 */
export function getWorkExperienceBullets(exp: WorkExperienceLike): string[] {
  const fromResponsibilities = getWorkExperienceResponsibilityOnly(exp);
  if (fromResponsibilities.length > 0) {
    return fromResponsibilities;
  }

  if (exp.description?.trim()) {
    return exp.description
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}
