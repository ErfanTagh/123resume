import Link from "next/link";
import Image from "next/image";
import { NAV_LINKS, SITE, APP_LINKS } from "../lib/site";

/**
 * Server-rendered header matching the main app: sticky, blurred, real logo,
 * pink primary CTA. No client JS.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center" aria-label={`${SITE.name} home`}>
          <Image
            src="/logoo.png"
            alt={`${SITE.name} logo`}
            width={140}
            height={40}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.filter((l) => l.href !== "/").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={APP_LINKS.login}
            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block"
          >
            Log in
          </Link>
          <Link
            href={APP_LINKS.start}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:-translate-y-0.5"
          >
            Build my resume
          </Link>
        </div>
      </div>
    </header>
  );
}
