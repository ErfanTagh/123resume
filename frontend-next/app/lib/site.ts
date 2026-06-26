/**
 * Central site configuration for SEO + navigation.
 * Single source of truth for canonical URL, brand, nav links, and OG image.
 */
export const SITE = {
  name: "123Resume",
  /** Canonical apex origin (www redirects here in nginx). */
  url: "https://123resume.de",
  tagline: "Professional CV & Resume Builder",
  description:
    "Build a professional, ATS-friendly CV in minutes. Pick a template, fill in your details, and download a polished resume as PDF — free.",
  /** 1200x630 social image. Replace the SVG with a real PNG/JPG (see MIGRATION_PLAN.md). */
  ogImage: "https://123resume.de/og-image.png",
  twitter: "@123resume",
  locale: "en_US",
} as const;

/** Public marketing routes shown in the header/footer and sitemap. */
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Where the React builder SPA lives (kept as-is; nginx routes these paths to it). */
export const APP_LINKS = {
  start: "/create/start",
  login: "/login",
} as const;
