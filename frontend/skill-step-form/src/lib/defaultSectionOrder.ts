/** Canonical resume section order. Keep in sync across form defaults and templates. */
export const DEFAULT_SECTION_ORDER = [
  "summary",
  "workExperience",
  "education",
  "projects",
  "certificates",
  "publications",
  "skills",
  "languages",
  "interests",
] as const;

export type DefaultSectionKey = (typeof DEFAULT_SECTION_ORDER)[number];

/**
 * Ensure older resumes (saved before publications existed) still list the section
 * so templates and the section-order UI can show it.
 */
export function ensurePublicationsInSectionOrder(
  sectionOrder: string[] | undefined | null,
): string[] {
  const order = Array.isArray(sectionOrder) && sectionOrder.length > 0
    ? [...sectionOrder]
    : [...DEFAULT_SECTION_ORDER];
  if (order.includes("publications")) return order;
  const certIdx = order.indexOf("certificates");
  if (certIdx >= 0) {
    order.splice(certIdx + 1, 0, "publications");
    return order;
  }
  order.push("publications");
  return order;
}
