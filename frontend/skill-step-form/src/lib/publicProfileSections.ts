/**
 * Which blocks appear on the public hosted profile (/p/:id). Stored on the resume; defaults all on.
 */
export const PUBLIC_PROFILE_SECTION_KEYS = [
  "photo",
  "socials",
  "about",
  "projects",
  "certificates",
  "publications",
  "contact",
] as const;

export type PublicProfileSectionKey = (typeof PUBLIC_PROFILE_SECTION_KEYS)[number];

export type PublicProfileSections = Record<PublicProfileSectionKey, boolean>;

const DEFAULT_SECTIONS: PublicProfileSections = {
  photo: true,
  socials: true,
  about: true,
  projects: true,
  certificates: true,
  publications: true,
  contact: true,
};

export function mergePublicProfileSections(raw: unknown): PublicProfileSections {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SECTIONS };
  }
  const o = raw as Record<string, unknown>;
  const out = { ...DEFAULT_SECTIONS };
  for (const k of PUBLIC_PROFILE_SECTION_KEYS) {
    if (k in o) out[k] = Boolean(o[k]);
  }
  return out;
}
