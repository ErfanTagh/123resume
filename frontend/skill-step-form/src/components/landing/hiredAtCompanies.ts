/**
 * Employers shown in the landing “hired at” band.
 *
 * **Local logos (recommended):** add `{id}.png`, `{id}.svg`, or `{id}.webp` under `public/logos/hired-at/`
 * (see `public/logos/hired-at/README.md`). Those load first so all marks share one consistent frame.
 *
 * **Remote fallbacks** when no local file exists:
 * - Simple Icons CDN: https://github.com/simple-icons/simple-icons
 * - Favicons: DuckDuckGo + Google s2.
 */
export type HiredAtEmployer = {
  id: string;
  name: string;
  /** Remote URL fallbacks after local `/logos/hired-at/{id}.(png|svg|webp)` attempts. */
  logoSrc: readonly string[];
};

/** Tried in order before `logoSrc` remotes. */
export function hiredAtLocalLogoUrls(id: string): readonly string[] {
  return [
    `/logos/hired-at/${id}.png`,
    `/logos/hired-at/${id}.svg`,
    `/logos/hired-at/${id}.webp`,
  ] as const;
}

const si = (slug: string, color?: string) =>
  color
    ? `https://cdn.simpleicons.org/${slug}/${color}`
    : `https://cdn.simpleicons.org/${slug}`;

/** DuckDuckGo favicon by registrable domain */
const ico = (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`;

/** Google favicon service (fallback if DDG fails or returns generic globe) */
const gico = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

const favChain = (...domains: string[]) =>
  domains.flatMap((d) => [ico(d), gico(d)] as const);

export const HIRED_AT_EMPLOYERS: readonly HiredAtEmployer[] = [
  {
    id: "rptu",
    name: "RPTU Kaiserslautern",
    logoSrc: favChain("rptu.de", "uni-kl.de"),
  },
  {
    id: "dfki",
    name: "DFKI",
    logoSrc: favChain("dfki.de"),
  },
  {
    id: "sap",
    name: "SAP",
    logoSrc: [si("sap", "0FAAFF"), ...favChain("sap.com")],
  },
  {
    id: "fraunhofer",
    name: "Fraunhofer",
    logoSrc: [si("fraunhofergesellschaft", "179C7D"), ...favChain("fraunhofer.de")],
  },
  {
    id: "mcdonalds",
    name: "McDonald's",
    logoSrc: [si("mcdonalds", "FBC817"), ...favChain("mcdonalds.com")],
  },
  {
    id: "amazon",
    name: "Amazon",
    logoSrc: [si("amazon", "FF9900"), ...favChain("amazon.com")],
  },
  {
    id: "corning",
    name: "Corning",
    logoSrc: [si("corning", "2792C8"), ...favChain("corning.com")],
  },
] as const;
