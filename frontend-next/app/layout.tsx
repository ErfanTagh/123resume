import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "./lib/site";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";

/**
 * Root metadata. `metadataBase` makes all relative OG/canonical URLs absolute.
 * `title.template` appends the brand to every page title.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline} | Create Your Resume Online`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "CV builder",
    "resume builder",
    "Lebenslauf erstellen",
    "ATS resume",
    "CV templates",
    "online CV maker",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/resume-icon.svg", type: "image/svg+xml" },
    ],
    apple: "/resume-icon.svg",
  },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#ed2c5f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&family=Roboto:wght@300;400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
