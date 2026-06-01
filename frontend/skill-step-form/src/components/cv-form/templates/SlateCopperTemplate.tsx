import type { CSSProperties, ReactNode } from "react";
import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateRange } from "@/lib/dateFormatter";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasMeaningfulProfileLink, hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { getRenderableSkillGroups } from "@/lib/skillGroups";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { getWorkExperienceResponsibilityOnly } from "@/lib/workExperienceBullets";

/** Light rail — same family as Tailwind slate-100; keeps sidebar readable with schema text colors */
const SIDEBAR_BG = "#f1f5f9";
const MAIN_PAPER = "#ffffff";
/** Meta / dates — gray-500, works on white and on SIDEBAR_BG */
const META_GRAY = "#6b7280";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6 || Number.isNaN(parseInt(h, 16))) {
    return `rgba(37, 99, 235, ${alpha})`;
  }
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

const SIDEBAR_SECTION_KEYS = new Set(["skills", "languages", "certificates", "interests"]);

interface SlateCopperTemplateProps {
  data: CVFormData;
}

export const SlateCopperTemplate = ({ data }: SlateCopperTemplateProps) => {
  const { t, language } = useLanguage();
  const {
    personalInfo,
    workExperience,
    education,
    projects,
    certificates,
    languages,
    skills,
    skillGroups,
    sectionOrder,
    styling,
  } = data;

  const defaultOrder = [
    "summary",
    "workExperience",
    "education",
    "projects",
    "certificates",
    "skills",
    "languages",
    "interests",
  ];
  const orderedSections = sectionOrder || defaultOrder;
  const sidebarOrdered = orderedSections.filter((k) => SIDEBAR_SECTION_KEYS.has(k));
  const mainOrdered = orderedSections.filter((k) => !SIDEBAR_SECTION_KEYS.has(k));

  const fontFamily = styling?.fontFamily || "Inter";
  const fontSizeInput = styling?.fontSize || "medium";
  const fontSize: "small" | "medium" | "large" =
    fontSizeInput === "small" || fontSizeInput === "medium" || fontSizeInput === "large"
      ? fontSizeInput
      : "medium";

  const titleColor = styling?.titleColor || RESUME_TITLE_GRAY;
  const titleBold = styling?.titleBold ?? true;
  const headingColor = styling?.headingColor || RESUME_ACCENT_BLUE;
  const headingBold = styling?.headingBold ?? true;
  const textColor = styling?.textColor || RESUME_BODY_GRAY;
  const linkColor = styling?.linkColor || RESUME_ACCENT_BLUE;

  const rootCssVars = {
    "--sc-link": linkColor,
    "--sc-heading": headingColor,
  } as CSSProperties;

  const getSectionStyling = (sectionName: string) => {
    const sectionStyling = styling?.sectionStyling?.[sectionName];
    return {
      titleColor: sectionStyling?.titleColor || headingColor,
      titleSize: sectionStyling?.titleSize || fontSize,
      bodyColor: sectionStyling?.bodyColor || textColor,
      bodySize: sectionStyling?.bodySize || fontSize,
    };
  };

  const personalInfoSectionStyling = styling?.sectionStyling?.personalInfo;
  const personalInfoTitleColor = personalInfoSectionStyling?.titleColor || headingColor;
  const personalInfoTitleSize = personalInfoSectionStyling?.titleSize || fontSize;
  const personalInfoBodyColor = personalInfoSectionStyling?.bodyColor || textColor;
  const personalInfoBodySize = personalInfoSectionStyling?.bodySize || fontSize;

  const workExperienceStyling = getSectionStyling("workExperience");
  const projectsStyling = getSectionStyling("projects");
  const educationStyling = getSectionStyling("education");
  const certificatesStyling = getSectionStyling("certificates");
  const skillsStyling = getSectionStyling("skills");
  const languagesStyling = getSectionStyling("languages");

  const fontSizeMap = {
    small: {
      name: "18px",
      title: "12px",
      heading: "10px",
      entry: "12px",
      org: "11px",
      date: "11px",
      body: "11px",
      contactLabel: "10px",
    },
    medium: {
      name: "20px",
      title: "13px",
      heading: "11px",
      entry: "13px",
      org: "12px",
      date: "12px",
      body: "12px",
      contactLabel: "11px",
    },
    large: {
      name: "24px",
      title: "14px",
      heading: "12px",
      entry: "14px",
      org: "13px",
      date: "12px",
      body: "13px",
      contactLabel: "11px",
    },
  };

  const fs = fontSizeMap[fontSize];
  const fsPIBody = fontSizeMap[personalInfoBodySize];
  const fsWE = fontSizeMap[workExperienceStyling.bodySize];
  const fsEd = fontSizeMap[educationStyling.bodySize];
  const fsPr = fontSizeMap[projectsStyling.bodySize];
  const fsSk = fontSizeMap[skillsStyling.bodySize];
  const fsLang = fontSizeMap[languagesStyling.bodySize];
  const fsCert = fontSizeMap[certificatesStyling.bodySize];
  const groupedSkills = getRenderableSkillGroups(skillGroups, skills, t("resume.sections.skills"));

  const mainSectionHeading = (label: string, color: string) => (
    <h2
      className="mb-2 border-t pb-1 pt-1 font-medium uppercase tracking-[0.08em]"
      style={{
        fontSize: fs.heading,
        fontWeight: headingBold ? 500 : 400,
        color,
        borderColor: hexToRgba(headingColor, 0.45),
        borderTopWidth: "0.5px",
      }}
    >
      {label}
    </h2>
  );

  const sidebarSectionHeading = (label: string, color: string) => (
    <h3
      className="mb-2 font-medium uppercase tracking-[0.06em]"
      style={{ fontSize: fs.contactLabel, color, letterSpacing: "0.06em" }}
    >
      {label}
    </h3>
  );

  const sidebarBlockStart = (showDivider: boolean) =>
    showDivider ? (
      <div
        className="mb-3 mt-3 border-t pt-2.5"
        style={{ borderColor: hexToRgba(linkColor, 0.35) }}
        aria-hidden
      />
    ) : null;

  const renderMainSection = (sectionKey: string): ReactNode => {
    switch (sectionKey) {
      case "summary":
        return personalInfo.summary?.trim() ? (
          <div key="summary" data-resume-section="true">
            {mainSectionHeading(t("resume.sections.professionalSummary"), personalInfoTitleColor)}
            <p
              className="whitespace-pre-wrap leading-relaxed"
              style={{
                color: personalInfoBodyColor,
                fontSize: fsPIBody.body,
                lineHeight: 1.65,
              }}
            >
              {personalInfo.summary.trim()}
            </p>
          </div>
        ) : null;

      case "workExperience":
        return workExperience.some((e) => e.position || e.company) ? (
          <div key="workExperience" data-resume-section="true">
            {mainSectionHeading(t("resume.sections.experience"), workExperienceStyling.titleColor)}
            <div className="space-y-4">
              {workExperience.map(
                (exp, index) =>
                  (exp.position || exp.company) && (
                    <div key={index} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3
                          className="font-medium"
                          style={{
                            fontSize: fsWE.entry,
                            color: titleColor,
                          }}
                        >
                          {exp.position}
                        </h3>
                        {(exp.startDate || exp.endDate) && (
                          <span
                            className="shrink-0 whitespace-nowrap"
                            style={{ fontSize: fs.date, color: META_GRAY }}
                          >
                            {formatDateRange(
                              exp.startDate,
                              exp.endDate,
                              t("resume.fields.present"),
                              language,
                            )}
                          </span>
                        )}
                      </div>
                      {(exp.company?.trim() || hasWebLink(exp.link) || exp.location) && (
                        <p style={{ fontSize: fsWE.org, color: textColor }}>
                          <ProjectLinkedTitle
                            name={exp.company?.trim() || t("resume.contactLinkShort.website")}
                            link={exp.link}
                            className="sc-entry-link"
                            inheritColor={false}
                            anchorStyle={{ fontSize: fsWE.org }}
                          />
                          {exp.location ? ` · ${exp.location}` : ""}
                        </p>
                      )}
                      {exp.description?.trim() && (
                        <p className="mt-1 whitespace-pre-wrap leading-snug" style={{ fontSize: fsWE.body, color: textColor }}>
                          {exp.description}
                        </p>
                      )}
                      {getWorkExperienceResponsibilityOnly(exp).length > 0 && (
                        <ul className="sc-two-col-bullets mt-1 space-y-1 pl-0">
                          {getWorkExperienceResponsibilityOnly(exp).map((line, i) => (
                            <li key={i} className="leading-snug" style={{ fontSize: fsWE.body, color: textColor }}>
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                      {exp.technologies && exp.technologies.length > 0 && (
                        <p className="mt-1" style={{ fontSize: fsWE.org, color: textColor, opacity: 0.9 }}>
                          <span style={{ fontWeight: 500 }}>{t("resume.sections.technologies")}:</span>{" "}
                          {exp.technologies
                            .map((tech) => (typeof tech === "string" ? tech : tech.technology))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {exp.competencies && exp.competencies.length > 0 && (
                        <p className="mt-1" style={{ fontSize: fsWE.org, color: textColor, opacity: 0.9 }}>
                          <span style={{ fontWeight: 500 }}>{t("resume.labels.keyCompetencies")}:</span>{" "}
                          {exp.competencies
                            .map((c) => (typeof c === "string" ? c : c.competency))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ),
              )}
            </div>
          </div>
        ) : null;

      case "education":
        return education.some((e) => e.degree || e.institution) ? (
          <div key="education" data-resume-section="true">
            {mainSectionHeading(t("resume.sections.education"), educationStyling.titleColor)}
            <div className="space-y-4">
              {education.map(
                (edu, index) =>
                  (edu.degree || edu.institution) && (
                    <div key={index} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium" style={{ fontSize: fsEd.entry, color: titleColor }}>
                          {edu.degree}
                        </h3>
                        {(edu.startDate || edu.endDate) && (
                          <span className="shrink-0 whitespace-nowrap" style={{ fontSize: fs.date, color: META_GRAY }}>
                            {formatDateRange(
                              edu.startDate,
                              edu.endDate,
                              t("resume.fields.present"),
                              language,
                            )}
                          </span>
                        )}
                      </div>
                      {(edu.institution?.trim() || hasWebLink(edu.link) || edu.location) && (
                        <p style={{ fontSize: fsEd.org, color: textColor }}>
                          <ProjectLinkedTitle
                            name={edu.institution?.trim() || t("resume.contactLinkShort.website")}
                            link={edu.link}
                            className="sc-entry-link"
                            inheritColor={false}
                            anchorStyle={{ fontSize: fsEd.org }}
                          />
                          {edu.location ? ` · ${edu.location}` : ""}
                        </p>
                      )}
                      {edu.field ? (
                        <p style={{ fontSize: fsEd.body, color: textColor }}>{edu.field}</p>
                      ) : null}
                      {edu.keyCourses && edu.keyCourses.length > 0 && (
                        <p className="mt-1" style={{ fontSize: fsEd.org, color: textColor, opacity: 0.9 }}>
                          <span style={{ fontWeight: 500 }}>{t("resume.labels.keyCourses")}:</span>{" "}
                          {edu.keyCourses
                            .map((c) => (typeof c === "string" ? c : c.course))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {edu.descriptions && edu.descriptions.length > 0 && (
                        <ul className="sc-two-col-bullets mt-1 space-y-1 pl-0">
                          {edu.descriptions
                            .filter((d) => d?.description?.trim())
                            .map((d, i) => (
                              <li
                                key={i}
                                className="leading-snug"
                                style={{ fontSize: fsEd.body, color: textColor }}
                              >
                                {d.description!.trim()}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ),
              )}
            </div>
          </div>
        ) : null;

      case "projects":
        return projects.some((p) => p.name) ? (
          <div key="projects" data-resume-section="true">
            {mainSectionHeading(t("resume.sections.projects"), projectsStyling.titleColor)}
            <div className="space-y-4">
              {projects.map(
                (proj, index) =>
                  proj.name && (
                    <div key={index} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium" style={{ fontSize: fsPr.entry, color: titleColor }}>
                          <ProjectLinkedTitle
                            name={proj.name}
                            link={proj.link}
                            className="sc-entry-link"
                            inheritColor={false}
                            anchorStyle={{ fontSize: fsPr.entry, fontWeight: 500 }}
                          />
                        </h3>
                        {(proj.startDate || proj.endDate) && (
                          <span className="shrink-0 whitespace-nowrap" style={{ fontSize: fs.date, color: META_GRAY }}>
                            {formatDateRange(
                              proj.startDate,
                              proj.endDate,
                              t("resume.fields.present"),
                              language,
                            )}
                          </span>
                        )}
                      </div>
                      {proj.description?.trim() ? (
                        <ul className="sc-two-col-bullets space-y-1">
                          {proj.description
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((line, i) => (
                              <li key={i} style={{ fontSize: fsPr.body, color: textColor }}>
                                {line}
                              </li>
                            ))}
                        </ul>
                      ) : null}
                      {proj.highlights && proj.highlights.length > 0 && (
                        <ul className="sc-two-col-bullets mt-1 space-y-1 pl-0">
                          {proj.highlights
                            .filter((h) => h?.highlight?.trim())
                            .map((h, i) => (
                              <li key={i} className="leading-snug" style={{ fontSize: fsPr.body, color: textColor }}>
                                {h.highlight!.trim()}
                              </li>
                            ))}
                        </ul>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <p className="mt-1" style={{ fontSize: fsPr.org, color: textColor, opacity: 0.9 }}>
                          <span style={{ fontWeight: 500 }}>{t("resume.sections.technologies")}:</span>{" "}
                          {proj.technologies
                            .map((tech) => (typeof tech === "string" ? tech : tech.technology))
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ),
              )}
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const renderSidebarSection = (sectionKey: string): ReactNode => {
    switch (sectionKey) {
      case "skills":
        return groupedSkills.length > 0 ? (
          <div key="skills" data-resume-section="true">
            {sidebarSectionHeading(t("resume.sections.skills"), headingColor)}
            <div className="space-y-1" style={{ fontSize: fsSk.body, color: skillsStyling.bodyColor }}>
              {groupedSkills.map((group, i) => (
                <div key={`${group.name}-${i}`}>
                  <p style={{ fontWeight: 700, color: titleColor, fontSize: fsSk.xs, lineHeight: 1.2, opacity: 0.95 }}>
                    {group.name}
                  </p>
                  <p style={{ color: skillsStyling.bodyColor, lineHeight: 1.35 }}>
                    {group.skills.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "languages":
        return languages.some((l) => l.language) ? (
          <div key="languages" data-resume-section="true">
            {sidebarSectionHeading(t("resume.sections.languages"), headingColor)}
            <ul className="space-y-1" style={{ fontSize: fsLang.body, color: languagesStyling.bodyColor }}>
              {languages.map(
                (lang, i) =>
                  lang.language && (
                    <li key={i}>
                      {lang.language}
                      {lang.proficiency ? ` · ${formatProficiency(lang.proficiency, language)}` : ""}
                    </li>
                  ),
              )}
            </ul>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests?.some((i) => i.interest?.trim()) ? (
          <div key="interests" data-resume-section="true">
            {sidebarSectionHeading(t("resume.sections.interests"), headingColor)}
            <p style={{ fontSize: fsPIBody.body, color: personalInfoBodyColor, lineHeight: 1.55 }}>
              {personalInfo.interests
                .map((i) => i.interest?.trim())
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : null;

      case "certificates":
        return certificates.some((c) => c.name) ? (
          <div key="certificates" data-resume-section="true">
            {sidebarSectionHeading(t("resume.sections.certifications"), headingColor)}
            <div className="space-y-3">
              {certificates.map(
                (c, i) =>
                  c.name && (
                    <div key={i}>
                      <p style={{ fontSize: fsCert.body, color: certificatesStyling.bodyColor, fontWeight: 500 }}>
                        {hasWebLink(c.url) ? (
                          <a
                            href={normalizeExternalUrl(c.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sc-entry-link no-underline"
                            style={{ color: linkColor, textDecoration: "underline" }}
                          >
                            {c.name}
                          </a>
                        ) : (
                          c.name
                        )}
                      </p>
                      {c.organization ? (
                        <p style={{ fontSize: fsCert.org, color: certificatesStyling.bodyColor, opacity: 0.88 }}>
                          {c.organization}
                        </p>
                      ) : null}
                      {(c.issueDate || c.expirationDate) && (
                        <p style={{ fontSize: fsCert.org, color: certificatesStyling.bodyColor, opacity: 0.75 }}>
                          {c.issueDate}
                          {c.expirationDate ? ` – ${c.expirationDate}` : ""}
                        </p>
                      )}
                      {c.credentialId ? (
                        <p style={{ fontSize: fsCert.org, color: certificatesStyling.bodyColor, opacity: 0.75 }}>
                          ID: {c.credentialId}
                        </p>
                      ) : null}
                    </div>
                  ),
              )}
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .sc-two-col-bullets { list-style: none; margin: 0; padding: 0; }
        .sc-two-col-bullets li {
          position: relative;
          padding-left: 1rem;
        }
        .sc-two-col-bullets li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: var(--sc-link);
          font-weight: 600;
        }
        .sc-two-col-root a.sc-resume-link:hover,
        .sc-two-col-root a.sc-resume-link:focus-visible {
          color: color-mix(in srgb, var(--sc-link) 78%, #0f172a) !important;
        }
        .sc-two-col-root .sc-entry-link {
          color: var(--sc-link);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        @media print {
          .sc-two-col-root .sc-entry-link {
            color: var(--sc-link) !important;
            text-decoration: underline !important;
          }
          .sc-two-col-root [data-resume-section="true"],
          .sc-two-col-root .sc-sidebar-contact,
          .sc-two-col-root .sc-sidebar-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            -webkit-column-break-inside: avoid !important;
          }
          .sc-two-col-root .sc-sidebar-contact h3,
          .sc-two-col-root .sc-sidebar-section h3 {
            page-break-after: avoid !important;
            break-after: avoid !important;
            -webkit-column-break-after: avoid !important;
          }
        }
        .resume-page-container.sc-two-col {
          padding-top: 24px !important;
          padding-bottom: 24px !important;
        }
        @media print {
          @page { size: A4; margin: 12mm 0 18mm 0; }
          .resume-page-container.sc-two-col {
            width: 210mm;
            margin: 0 auto;
            min-height: 0 !important;
          }
        }
      `}</style>
      <div
        className="sc-two-col-root resume-page-container sc-two-col mx-auto max-w-4xl bg-white text-foreground"
        data-font-size={fontSize}
        style={{
          fontFamily: `"${fontFamily}", ui-sans-serif, system-ui, sans-serif`,
          ...rootCssVars,
        }}
      >
        <div className="h-[5px] w-full shrink-0" style={{ backgroundColor: linkColor }} aria-hidden />

        <div className="flex min-h-0 flex-1">
          <aside
            className="flex min-w-0 flex-[0_0_30%] flex-col"
            style={{
              backgroundColor: SIDEBAR_BG,
              color: textColor,
              padding: "32px 20px 28px",
              borderRight: `1.5px solid ${hexToRgba(linkColor, 0.22)}`,
            }}
          >
            {personalInfo.profileImage?.trim() ? (
              <div
                className="mx-auto mb-4 h-28 w-24 overflow-hidden rounded-md border-2"
                style={{ borderColor: linkColor }}
              >
                <img
                  src={personalInfo.profileImage}
                  alt=""
                  className="block h-full w-full"
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 50%" }}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}

            <h1
              className="text-center leading-tight"
              style={{
                fontSize: fs.name,
                fontWeight: titleBold ? 500 : 400,
                color: titleColor,
              }}
            >
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            {personalInfo.professionalTitle?.trim() ? (
              <p
                className="mt-1 text-center"
                style={{ fontSize: fs.title, color: textColor, fontWeight: 400, opacity: 0.95 }}
              >
                {personalInfo.professionalTitle.trim()}
              </p>
            ) : null}

            {sidebarBlockStart(true)}
            <div className="sc-sidebar-contact" data-resume-section="true">
              {sidebarSectionHeading(t("resume.sections.contact"), headingColor)}
              <div className="space-y-2" style={{ fontSize: fs.body, color: textColor }}>
                {personalInfo.email ? (
                  <div className="flex min-w-0 items-start gap-2">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span className="min-w-0 break-words">{personalInfo.email}</span>
                  </div>
                ) : null}
                {personalInfo.phone ? (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span>{personalInfo.phone}</span>
                  </div>
                ) : null}
                {personalInfo.location ? (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span>{personalInfo.location}</span>
                  </div>
                ) : null}
                {hasMeaningfulProfileLink(personalInfo.linkedin) ? (
                  <a
                    href={normalizeExternalUrl(personalInfo.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-resume-link flex items-start gap-2 no-underline"
                    style={{ color: linkColor }}
                  >
                    <Linkedin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span className="break-all">{t("resume.contactLinkShort.linkedin")}</span>
                  </a>
                ) : null}
                {hasMeaningfulProfileLink(personalInfo.github) ? (
                  <a
                    href={normalizeExternalUrl(personalInfo.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-resume-link flex items-start gap-2 no-underline"
                    style={{ color: linkColor }}
                  >
                    <Github className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span className="break-all">{t("resume.contactLinkShort.github")}</span>
                  </a>
                ) : null}
                {hasMeaningfulProfileLink(personalInfo.website) ? (
                  <a
                    href={normalizeExternalUrl(personalInfo.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sc-resume-link flex items-start gap-2 no-underline"
                    style={{ color: linkColor }}
                  >
                    <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: linkColor }} />
                    <span className="break-all">{t("resume.contactLinkShort.website")}</span>
                  </a>
                ) : null}
              </div>
            </div>

            {sidebarOrdered.map((key) => {
              const node = renderSidebarSection(key);
              if (!node) return null;
              return (
                <div key={key} className="sc-sidebar-section" data-resume-section="true">
                  {sidebarBlockStart(true)}
                  {node}
                </div>
              );
            })}
          </aside>

          <main
            className="min-w-0 flex-[0_0_70%]"
            style={{
              backgroundColor: MAIN_PAPER,
              padding: "32px 28px 28px",
            }}
          >
            <div className="space-y-6">{mainOrdered.map((key) => renderMainSection(key))}</div>
          </main>
        </div>

        <div aria-hidden="true" className="resume-spacer" style={{ flex: "1 1 auto", minHeight: 0 }} />
      </div>
    </>
  );
};
