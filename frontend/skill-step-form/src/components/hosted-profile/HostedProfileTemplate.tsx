import type { CSSProperties } from "react";
import { useMemo } from "react";
import type { CVFormData } from "@/components/cv-form/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { mergePublicProfileSections, type PublicProfileSections } from "@/lib/publicProfileSections";
import {
  HOSTED_PROFILE_THEME_COLORS,
  mergePublicProfileTheme,
} from "@/lib/publicProfileTheme";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";
import { Github, Globe, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import "./HostedProfileTemplate.css";

type Props = {
  data: CVFormData;
  /** Which blocks to render; defaults to all on. */
  visibility?: PublicProfileSections;
  /** Resume id for “Resume / Lebenslauf” hero button → `/resume/:id`. */
  resumeId?: string;
  /** Hosted page color scheme (stored on resume). */
  theme?: string;
};

type SocialEntry = {
  label: string;
  href: string;
  kind: "linkedin" | "github" | "website";
};

function SocialIcon({ kind }: { kind: SocialEntry["kind"] }) {
  const cls = "h-6 w-6";
  if (kind === "linkedin") return <Linkedin className={cls} aria-hidden />;
  if (kind === "github") return <Github className={cls} aria-hidden />;
  return <Globe className={cls} aria-hidden />;
}

/**
 * Portfolio-style page: hero (nav + hero-area: hero-text | socials), section-shot about,
 * projects, certificates, contact.
 */
export function HostedProfileTemplate({ data, visibility: visibilityProp, resumeId, theme: themeRaw }: Props) {
  const visibility = visibilityProp ?? mergePublicProfileSections(undefined);
  const { t } = useLanguage();
  const pi = data.personalInfo;
  const fullName = [pi.firstName, pi.lastName].filter(Boolean).join(" ").trim() || "—";
  const title = pi.professionalTitle?.trim();
  const themeId = mergePublicProfileTheme(themeRaw);
  const themeColors = HOSTED_PROFILE_THEME_COLORS[themeId];
  const dark = "#1c1d25";

  const { projects, certs } = useMemo(() => {
    const ordered = withResumeSectionsSortedForDisplay(data);
    return {
      projects: (ordered.projects || []).filter(
        (p) => !!(p.name?.trim() || p.description?.trim()),
      ),
      certs: (ordered.certificates || []).filter(
        (c) => !!(c.name?.trim() || c.organization?.trim() || (c.url && c.url.trim())),
      ),
    };
  }, [data]);

  const social = [
    pi.linkedin?.trim()
      ? {
          label: t("resume.contactLinkShort.linkedin"),
          href: normalizeExternalUrl(pi.linkedin),
          kind: "linkedin" as const,
        }
      : null,
    pi.github?.trim()
      ? {
          label: t("resume.contactLinkShort.github"),
          href: normalizeExternalUrl(pi.github),
          kind: "github" as const,
        }
      : null,
    pi.website?.trim()
      ? {
          label: t("resume.contactLinkShort.website"),
          href: normalizeExternalUrl(pi.website),
          kind: "website" as const,
        }
      : null,
  ].filter(Boolean) as SocialEntry[];

  const hasSummary = !!pi.summary?.trim();
  const hasEmail = !!pi.email?.trim();
  const hasProfileImage = !!pi.profileImage?.trim();

  const showPhoto = visibility.photo;
  const showSocials = visibility.socials && social.length > 0;
  const showAbout = visibility.about && hasSummary;
  const showProjects = visibility.projects && projects.length > 0;
  const showCertificates = visibility.certificates && certs.length > 0;
  const showContact = visibility.contact && hasEmail;

  /** Photo in hero only when About is off, there is an image, and photo block is enabled */
  const photoInHero = showPhoto && !showAbout && hasProfileImage;
  const showAboutHeadshot = showPhoto && showAbout && hasProfileImage;

  const navItems: { href: string; label: string }[] = [];
  if (showAbout) navItems.push({ href: "#about", label: t("pages.hostedProfile.navAbout") });
  if (showProjects) navItems.push({ href: "#projects", label: t("pages.hostedProfile.navProjects") });
  if (showCertificates) navItems.push({ href: "#certificates", label: t("pages.hostedProfile.navCertificates") });
  if (showContact) navItems.push({ href: "#contact", label: t("pages.hostedProfile.navContact") });

  const primaryCta =
    showAbout
      ? { href: "#about" as const, label: t("pages.hostedProfile.navAbout") }
      : navItems.length > 0
        ? { href: navItems[0].href, label: navItems[0].label }
        : null;

  const heroAreaNoSocials = !showSocials;

  return (
    <div
      className="hosted-profile min-h-screen bg-white text-gray-900"
      style={
        {
          "--hp-accent": themeColors.accent,
          "--hp-secondary": themeColors.secondary,
          "--hp-social": themeColors.social,
        } as CSSProperties
      }
    >
      <section className="hero">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-14 md:pt-10 md:pb-20">
          {navItems.length > 0 && (
            <nav
              className="hosted-profile-nav hosted-profile-nav--text mb-10 md:mb-14"
              aria-label="Page sections"
            >
              {navItems.map((item) => (
                <a key={item.href} href={item.href} className="hosted-profile-nav-link">
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          <div
            className={`hero-area ${heroAreaNoSocials ? "hero-area--no-socials" : ""}`.trim()}
          >
            <div className="hero-text">
              {photoInHero ? (
                <img src={pi.profileImage} alt="" className="hero-avatar" />
              ) : null}
              <h1>{fullName}</h1>
              {title ? <p className="hosted-tagline">{title}</p> : null}
              {(primaryCta || resumeId) && (
                <div className="hero-ctas">
                  {primaryCta ? (
                    <a href={primaryCta.href} className="hero-cta hero-cta--coral">
                      {primaryCta.label}
                    </a>
                  ) : null}
                  {resumeId ? (
                    <Link to={`/resume/${resumeId}`} className="hero-cta hero-cta--magenta">
                      {t("pages.hostedProfile.heroResumeCta")}
                    </Link>
                  ) : null}
                </div>
              )}
            </div>

            {showSocials ? (
              <div
                className="socials socials--cyan"
                aria-label={t("pages.hostedProfile.socialsLabel")}
              >
                {social.map((s) => (
                  <a
                    key={s.kind}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={s.label}
                    aria-label={s.label}
                  >
                    <SocialIcon kind={s.kind} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {showAbout && (
        <section id="about" className="px-6 pt-10 pb-4 md:pt-14 md:pb-5">
          <div
            className={`section-shot max-w-6xl mx-auto ${showAboutHeadshot ? "section-shot--with-photo" : ""}`.trim()}
          >
            <div className="section-shot-text w-full">
              <h2 className="pb-2 border-b-2" style={{ borderColor: themeColors.accent }}>
                {t("pages.hostedProfile.sectionAbout")}
              </h2>
              <p className="hosted-body text-gray-800 whitespace-pre-wrap">{pi.summary!.trim()}</p>
            </div>
            {showAboutHeadshot ? (
              <div className="section-shot-photo mx-auto md:mx-0">
                <img src={pi.profileImage} alt="" />
              </div>
            ) : null}
          </div>
        </section>
      )}

      {showProjects && (
        <section id="projects" className="bg-gray-50 pt-8 pb-4 md:pt-10 md:pb-5 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="pb-2 border-b-2 border-gray-200">
              {t("pages.hostedProfile.sectionProjects")}
            </h2>
            <div className="space-y-4 mt-4">
              {projects.map((p, i) => {
                const projectTitle = p.name?.trim() || t("pages.hostedProfile.untitledProject");
                return (
                  <article key={i} className="project-card border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <h3 className="mb-1.5">
                      {hasWebLink(p.link) ? (
                        <a
                          href={normalizeExternalUrl(p.link!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-2 underline-offset-2 hover:opacity-90"
                          style={{ color: themeColors.accent }}
                        >
                          {projectTitle}
                        </a>
                      ) : (
                        projectTitle
                      )}
                    </h3>
                    {p.description?.trim() ? (
                      <p className="subtext whitespace-pre-wrap">{p.description.trim()}</p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {showCertificates && (
        <section id="certificates" className="px-6 py-4 md:py-5">
          <div className="max-w-6xl mx-auto">
            <h2 className="pb-2 border-b-2" style={{ borderColor: themeColors.accent }}>
              {t("pages.hostedProfile.sectionCertificates")}
            </h2>
            <ul className="space-y-4 mt-4">
              {certs.map((c, i) => {
                const certTitle =
                  c.name?.trim() ||
                  c.organization?.trim() ||
                  t("pages.hostedProfile.untitledCertificate");
                return (
                  <li key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-0.5">{certTitle}</h3>
                    {c.name?.trim() && c.organization?.trim() ? (
                      <p className="text-sm text-gray-600 mb-2">{c.organization}</p>
                    ) : null}
                    {hasWebLink(c.url) ? (
                      <a
                        href={normalizeExternalUrl(c.url!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium underline underline-offset-2"
                        style={{ color: themeColors.accent }}
                      >
                        {t("pages.hostedProfile.viewCredential")}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {showContact && (
        <section id="contact" className="bg-gray-50 py-4 md:py-5 px-6">
          <div className="max-w-6xl mx-auto text-center md:text-left">
            <h2 className="pb-2 border-b-2 border-gray-200 mb-3">
              {t("pages.hostedProfile.sectionContact")}
            </h2>
            <p className="text-muted-foreground mb-4 text-sm md:text-base max-w-2xl mx-auto md:mx-0">
              {t("pages.hostedProfile.contactHint")}
            </p>
            <a
              href={`mailto:${pi.email}`}
              className="inline-flex items-center justify-center gap-2 text-lg font-medium underline underline-offset-4 decoration-2"
              style={{ color: themeColors.accent }}
            >
              <Mail className="h-5 w-5 shrink-0" aria-hidden />
              {pi.email}
            </a>
          </div>
        </section>
      )}

      <footer className="text-center py-10 px-6" style={{ backgroundColor: dark }}>
        <p className="text-sm text-white/70 font-sans">{t("pages.hostedProfile.footerBrand")}</p>
      </footer>
    </div>
  );
}
