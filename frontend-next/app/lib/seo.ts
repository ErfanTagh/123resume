import type { Metadata } from "next";
import { SITE } from "./site";

interface PageSeoInput {
  title: string;
  description?: string;
  /** Path beginning with "/" — used for canonical + OG url. */
  path: string;
  /** Set true for pages that should not be indexed. */
  noindex?: boolean;
}

/**
 * Build per-page Metadata with canonical URL, Open Graph, Twitter, and hreflang.
 * Next renders all of this into the initial HTML (server-side) — the core fix
 * for the old client-only meta tags that crawlers couldn't see.
 */
export function pageMetadata({
  title,
  description = SITE.description,
  path,
  noindex = false,
}: PageSeoInput): Metadata {
  const url = `${SITE.url}${path === "/" ? "" : path}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        de: url,
        "x-default": url,
      },
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title,
      description,
      url,
      locale: SITE.locale,
      images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE.ogImage],
    },
  };
}

/** Organization + WebSite + SoftwareApplication JSON-LD for the homepage. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        url: SITE.url,
        logo: { "@type": "ImageObject", url: `${SITE.url}/resume-icon.svg` },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: `${SITE.name} - ${SITE.tagline}`,
        description: SITE.description,
        publisher: { "@id": `${SITE.url}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE.name,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        description: SITE.description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}

/** FAQPage JSON-LD helper for rich results. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
