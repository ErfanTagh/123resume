import { Fragment, type ReactNode } from "react";
import { CVFormData } from "../types";
import { formatDateRange } from "@/lib/dateFormatter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { getWorkExperienceResponsibilityOnly } from "@/lib/workExperienceBullets";

interface MinimalTemplateProps {
  data: CVFormData;
}

// Enhanced section heading with refined decorative lines
const SectionHeading = ({ title, fontSize, color }: { title: string; fontSize: string; color: string }) => (
  <div className="flex items-center gap-4 mb-2.5">
    <div className="flex-1 border-t-2" style={{ borderColor: color, opacity: 0.2 }}></div>
    <h2 
      className="font-bold uppercase tracking-[0.25em] whitespace-nowrap" 
      style={{ fontSize, color, letterSpacing: '0.25em' }}
    >
      {title}
    </h2>
    <div className="flex-1 border-t-2" style={{ borderColor: color, opacity: 0.2 }}></div>
  </div>
);

export const MinimalTemplate = ({ data }: MinimalTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with defaults
  const fontFamily = styling?.fontFamily || "sans-serif";
  const fontSizeInput = styling?.fontSize || "medium";
  const fontSize: "small" | "medium" | "large" =
    (fontSizeInput === "small" || fontSizeInput === "medium" || fontSizeInput === "large")
      ? fontSizeInput
      : "medium";
  const titleColor = styling?.titleColor || RESUME_TITLE_GRAY;
  const titleBold = styling?.titleBold ?? true;
  const headingColor = styling?.headingColor || RESUME_ACCENT_BLUE;
  const headingBold = styling?.headingBold ?? true;
  const textColor = styling?.textColor || RESUME_BODY_GRAY;
  const linkColor = styling?.linkColor || RESUME_ACCENT_BLUE;

  // Enhanced font size mappings with better hierarchy
  const fontSizeMap = {
    small: {
      xs: '0.625rem',      // 10px - metadata
      sm: '0.75rem',       // 12px - body text
      base: '0.875rem',    // 14px - section items
      baseText: '0.6875rem', // 11px - paragraph text
      heading: '0.8125rem',  // 13px - section headings
      name: '2rem',        // 32px - name
    },
    medium: {
      xs: '0.75rem',       // 12px - metadata
      sm: '0.875rem',      // 14px - body text
      base: '1rem',        // 16px - section items
      baseText: '0.8125rem', // 13px - paragraph text
      heading: '0.9375rem',  // 15px - section headings
      name: '2.25rem',     // 36px - name
    },
    large: {
      xs: '0.875rem',      // 14px - metadata
      sm: '1rem',          // 16px - body text
      base: '1.125rem',    // 18px - section items
      baseText: '0.9375rem', // 15px - paragraph text
      heading: '1.0625rem',  // 17px - section headings
      name: '2.5rem',      // 40px - name
    },
  };

  const sizes = fontSizeMap[fontSize];

  // Helper function to get section-specific styling
  const getSectionStyling = (sectionName: string) => {
    const sectionStyling = styling?.sectionStyling?.[sectionName];
    return {
      titleColor: sectionStyling?.titleColor || headingColor,
      titleSize: sectionStyling?.titleSize || fontSize,
      bodyColor: sectionStyling?.bodyColor || textColor,
      bodySize: sectionStyling?.bodySize || fontSize,
    };
  };

  // Extract section-specific styling for personalInfo
  const personalInfoSectionStyling = styling?.sectionStyling?.personalInfo;
  const personalInfoTitleColor = personalInfoSectionStyling?.titleColor || headingColor;
  const personalInfoTitleSize = personalInfoSectionStyling?.titleSize || fontSize;
  const personalInfoBodyColor = personalInfoSectionStyling?.bodyColor || textColor;
  const personalInfoBodySize = personalInfoSectionStyling?.bodySize || fontSize;

  // Extract section-specific styling for all sections
  const workExperienceStyling = getSectionStyling('workExperience');
  const projectsStyling = getSectionStyling('projects');
  const educationStyling = getSectionStyling('education');
  const certificatesStyling = getSectionStyling('certificates');
  const skillsStyling = getSectionStyling('skills');
  const languagesStyling = getSectionStyling('languages');

  // Size mappings for personalInfo section-specific sizes
  const personalInfoTitleSizes = fontSizeMap[personalInfoTitleSize];
  const personalInfoBodySizes = fontSizeMap[personalInfoBodySize];

  // Create size mappings for each section
  const workExperienceTitleSizes = fontSizeMap[workExperienceStyling.titleSize];
  const workExperienceBodySizes = fontSizeMap[workExperienceStyling.bodySize];
  const projectsTitleSizes = fontSizeMap[projectsStyling.titleSize];
  const projectsBodySizes = fontSizeMap[projectsStyling.bodySize];
  const educationTitleSizes = fontSizeMap[educationStyling.titleSize];
  const educationBodySizes = fontSizeMap[educationStyling.bodySize];
  const certificatesTitleSizes = fontSizeMap[certificatesStyling.titleSize];
  const certificatesBodySizes = fontSizeMap[certificatesStyling.bodySize];
  const skillsTitleSizes = fontSizeMap[skillsStyling.titleSize];
  const skillsBodySizes = fontSizeMap[skillsStyling.bodySize];
  const languagesTitleSizes = fontSizeMap[languagesStyling.titleSize];
  const languagesBodySizes = fontSizeMap[languagesStyling.bodySize];

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
        return personalInfo.summary && personalInfo.summary.trim() ? (
          <div key="summary">
            <SectionHeading title={t('resume.sections.professionalSummary') || 'Summary'} fontSize={personalInfoTitleSizes.heading} color={personalInfoTitleColor} />
            <p 
              className="leading-relaxed whitespace-pre-wrap" 
              style={{ 
                fontSize: personalInfoBodySizes.baseText, 
                color: personalInfoBodyColor,
                lineHeight: '1.7'
              }}
            >
              {personalInfo.summary.trim()}
            </p>
          </div>
        ) : null;

      case "workExperience":
        return workExperience.some(exp => exp.position || exp.company) ? (
          <div key="workExperience">
            <SectionHeading title={t('resume.sections.experience') || 'Experience'} fontSize={workExperienceTitleSizes.heading} color={workExperienceStyling.titleColor} />
            <div className="space-y-3">
              {workExperience.map((exp, index) => (
                (exp.position || exp.company) && (
                  <div key={index} className="space-y-1.5">
                    {/* Position title */}
                    <h3 
                      className="font-semibold" 
                      style={{ 
                        fontSize: workExperienceBodySizes.base, 
                        color: workExperienceStyling.bodyColor,
                        letterSpacing: '0.01em'
                      }}
                    >
                      {exp.position}
                    </h3>
                    {/* Company/Location and Date */}
                    <div className="flex justify-between items-baseline gap-4">
                      <p style={{ fontSize: sizes.xs, color: workExperienceStyling.bodyColor, opacity: 0.8 }}>
                        <ProjectLinkedTitle
                          name={exp.company || ""}
                          link={exp.link}
                          anchorStyle={{
                            fontSize: sizes.xs,
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.8,
                          }}
                          inheritColor
                        />
                        {exp.location && ` • ${exp.location}`}
                      </p>
                      {(exp.startDate || exp.endDate) && (
                        <span 
                          className="whitespace-nowrap" 
                          style={{ 
                            fontSize: sizes.xs, 
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          {formatDateRange(exp.startDate, exp.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {exp.description?.trim() && (
                      <p
                        className="mt-1.5 whitespace-pre-wrap"
                        style={{
                          fontSize: sizes.sm,
                          color: workExperienceStyling.bodyColor,
                          lineHeight: '1.6',
                        }}
                      >
                        {exp.description}
                      </p>
                    )}
                    {getWorkExperienceResponsibilityOnly(exp).length > 0 && (
                      <ul
                        className="space-y-1 mt-1.5"
                        style={{
                          fontSize: sizes.sm,
                          color: workExperienceStyling.bodyColor,
                          lineHeight: '1.6',
                        }}
                      >
                        {getWorkExperienceResponsibilityOnly(exp).map((line, i) => (
                          <li key={i} className="flex gap-3">
                            <span style={{ color: workExperienceStyling.bodyColor, opacity: 0.5 }}>•</span>
                            <span className="flex-1">{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Technologies */}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <p 
                        className="mt-1.5" 
                        style={{ 
                          fontSize: sizes.xs, 
                          color: workExperienceStyling.bodyColor,
                          opacity: 0.8
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.sections.technologies')}:</span>{' '}
                        {exp.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {/* Competencies */}
                    {exp.competencies && exp.competencies.length > 0 && (
                      <p 
                        className="mt-1" 
                        style={{ 
                          fontSize: sizes.xs, 
                          color: workExperienceStyling.bodyColor,
                          opacity: 0.8
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.labels.keyCompetencies')}:</span>{' '}
                        {exp.competencies.map(c => typeof c === 'string' ? c : c.competency).filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "education":
        return education.some(edu => edu.degree || edu.institution) ? (
          <div key="education">
            <SectionHeading title={t('resume.sections.education') || 'Education'} fontSize={educationTitleSizes.heading} color={educationStyling.titleColor} />
            <div className="space-y-3">
              {education.map((edu, index) => (
                (edu.degree || edu.institution) && (
                  <div key={index} className="space-y-1.5">
                    <h3 
                      className="font-semibold" 
                      style={{ 
                        fontSize: educationBodySizes.base, 
                        color: educationStyling.bodyColor,
                        letterSpacing: '0.01em'
                      }}
                    >
                      {edu.degree}
                    </h3>
                    <div className="flex justify-between items-baseline gap-4">
                      <p style={{ fontSize: sizes.xs, color: educationStyling.bodyColor, opacity: 0.8 }}>
                        <ProjectLinkedTitle
                          name={edu.institution || ""}
                          link={edu.link}
                          anchorStyle={{
                            fontSize: sizes.xs,
                            color: educationStyling.bodyColor,
                            opacity: 0.8,
                          }}
                          inheritColor
                        />
                        {edu.location && ` • ${edu.location}`}
                      </p>
                      {(edu.startDate || edu.endDate) && (
                        <span 
                          className="whitespace-nowrap" 
                          style={{ 
                            fontSize: sizes.xs, 
                            color: educationStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          {formatDateRange(edu.startDate, edu.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {edu.field && (
                      <p style={{ fontSize: sizes.xs, color: educationStyling.bodyColor, opacity: 0.8 }}>
                        {edu.field}
                      </p>
                    )}
                    {edu.keyCourses && edu.keyCourses.length > 0 && (
                      <p 
                        className="mt-1.5" 
                        style={{ 
                          fontSize: sizes.xs, 
                          color: educationStyling.bodyColor,
                          opacity: 0.8
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.labels.keyCourses')}:</span>{' '}
                        {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {edu.descriptions && edu.descriptions.length > 0 && (
                      <ul className="space-y-1 mt-1.5" style={{ fontSize: educationBodySizes.sm, color: educationStyling.bodyColor, lineHeight: '1.6' }}>
                        {edu.descriptions.filter(d => d?.description?.trim()).map((d, i) => (
                          <li key={i} className="flex gap-3">
                            <span style={{ color: educationStyling.bodyColor, opacity: 0.5 }}>•</span>
                            <span className="flex-1">{d.description!.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "projects":
        return projects.some(proj => proj.name) ? (
          <div key="projects">
            <SectionHeading title={t('resume.sections.projects') || 'Projects'} fontSize={projectsTitleSizes.heading} color={projectsStyling.titleColor} />
            <div className="space-y-3">
              {projects.map((proj, index) => (
                proj.name && (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between items-start gap-4">
                      <h3 
                        className="font-semibold flex-1" 
                        style={{ 
                          fontSize: projectsBodySizes.base, 
                          color: projectsStyling.bodyColor,
                          letterSpacing: '0.01em'
                        }}
                      >
                        <ProjectLinkedTitle name={proj.name} link={proj.link} className="underline" />
                      </h3>
                      {(proj.startDate || proj.endDate) && (
                        <span 
                          className="whitespace-nowrap" 
                          style={{ 
                            fontSize: sizes.xs, 
                            color: projectsStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          {formatDateRange(proj.startDate, proj.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p 
                        className="mt-1" 
                        style={{ 
                          fontSize: sizes.sm, 
                          color: projectsStyling.bodyColor,
                          lineHeight: '1.6'
                        }}
                      >
                        {proj.description}
                      </p>
                    )}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <ul 
                        className="space-y-1 mt-1.5" 
                        style={{ 
                          fontSize: sizes.sm, 
                          color: projectsStyling.bodyColor,
                          lineHeight: '1.6'
                        }}
                      >
                        {proj.highlights.map((highlight, i) => (
                          highlight.highlight && (
                            <li key={i} className="flex gap-3">
                              <span style={{ color: projectsStyling.bodyColor, opacity: 0.5 }}>•</span>
                              <span className="flex-1">{highlight.highlight}</span>
                            </li>
                          )
                        ))}
                      </ul>
                    )}
                    {proj.technologies && proj.technologies.length > 0 && (
                      <p 
                        className="mt-1.5" 
                        style={{ 
                          fontSize: sizes.xs, 
                          color: projectsStyling.bodyColor,
                          opacity: 0.8
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.sections.technologies')}:</span>{' '}
                        {proj.technologies.map(techItem => techItem.technology).filter(Boolean).join(" • ")}
                      </p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "certificates":
        return certificates.some(cert => cert.name) ? (
          <div key="certificates">
            <SectionHeading title={t('resume.sections.certifications') || 'Certifications'} fontSize={certificatesTitleSizes.heading} color={certificatesStyling.titleColor} />
            <div className="space-y-2">
              {certificates.map((cert, index) => (
                cert.name && (
                  <div key={index}>
                    <h3 
                      className="font-semibold" 
                      style={{ 
                        fontSize: certificatesBodySizes.base, 
                        color: certificatesStyling.bodyColor,
                        letterSpacing: '0.01em'
                      }}
                    >
                      {hasWebLink(cert.url) ? (
                        <a
                          href={normalizeExternalUrl(cert.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                          style={{ color: 'inherit' }}
                        >
                          {cert.name}
                        </a>
                      ) : (
                        cert.name
                      )}
                    </h3>
                    <div className="flex justify-between items-baseline gap-4 mt-1">
                      <p style={{ fontSize: sizes.xs, color: certificatesStyling.bodyColor, opacity: 0.8 }}>
                        {cert.organization}
                      </p>
                      {(cert.issueDate || cert.expirationDate) && (
                        <span 
                          className="whitespace-nowrap" 
                          style={{ 
                            fontSize: sizes.xs, 
                            color: certificatesStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          {cert.issueDate} {cert.expirationDate && `- ${cert.expirationDate}`}
                        </span>
                      )}
                    </div>
                    {cert.credentialId && (
                      <p 
                        className="mt-1" 
                        style={{ 
                          fontSize: sizes.xs, 
                          color: certificatesStyling.bodyColor,
                          opacity: 0.7
                        }}
                      >
                        ID: {cert.credentialId}
                      </p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "skills":
        return skills.some(s => s.skill) ? (
          <div key="skills">
            <SectionHeading title={t('resume.sections.skills') || 'Skills'} fontSize={skillsTitleSizes.heading} color={skillsStyling.titleColor} />
            <p 
              className="leading-relaxed" 
              style={{ 
                fontSize: sizes.sm, 
                color: skillsStyling.bodyColor,
                lineHeight: '1.7'
              }}
            >
              {skills.filter(s => s.skill).map(s => s.skill).join(" • ")}
            </p>
          </div>
        ) : null;

      case "languages":
        return languages.some(lang => lang.language) ? (
          <div key="languages">
            <SectionHeading title={t('resume.sections.languages') || 'Languages'} fontSize={languagesTitleSizes.heading} color={languagesStyling.titleColor} />
            <div className="space-y-1.5">
              {languages.map((lang, index) => (
                lang.language && (
                  <div 
                    key={index} 
                    className="flex justify-between items-center gap-4" 
                    style={{ 
                      fontSize: sizes.sm, 
                      color: languagesStyling.bodyColor 
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{lang.language}</span>
                    {lang.proficiency && (
                      <span 
                        className="whitespace-nowrap" 
                        style={{ 
                          opacity: 0.7,
                          fontStyle: 'italic',
                          fontSize: sizes.xs
                        }}
                      >
                        {formatProficiency(t, lang.proficiency)}
                      </span>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests && personalInfo.interests.length > 0 && personalInfo.interests.some(i => i.interest) ? (
          <div key="interests">
            <SectionHeading title={t('resume.sections.interests') || 'Interests'} fontSize={personalInfoTitleSizes.heading} color={personalInfoTitleColor} />
            <p 
              className="leading-relaxed" 
              style={{ 
                fontSize: personalInfoBodySizes.sm, 
                color: personalInfoBodyColor,
                lineHeight: '1.7'
              }}
            >
              {personalInfo.interests.map(i => i.interest).filter(Boolean).join(" • ")}
            </p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  // Contact line: plain text for email/phone/location; short labels as links for social/web
  const contactLineParts: ReactNode[] = [];
  if (personalInfo.email) contactLineParts.push(<span key="email">{personalInfo.email}</span>);
  if (personalInfo.phone) contactLineParts.push(<span key="phone">{personalInfo.phone}</span>);
  if (personalInfo.location) contactLineParts.push(<span key="loc">{personalInfo.location}</span>);
  if (personalInfo.linkedin) {
    contactLineParts.push(
      <a
        key="linkedin"
        href={normalizeExternalUrl(personalInfo.linkedin)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {t('resume.contactLinkShort.linkedin')}
      </a>
    );
  }
  if (personalInfo.github) {
    contactLineParts.push(
      <a
        key="github"
        href={normalizeExternalUrl(personalInfo.github)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {t('resume.contactLinkShort.github')}
      </a>
    );
  }
  if (personalInfo.website) {
    contactLineParts.push(
      <a
        key="website"
        href={normalizeExternalUrl(personalInfo.website)}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'inherit', textDecoration: 'underline' }}
      >
        {t('resume.contactLinkShort.website')}
      </a>
    );
  }

  return (
    <>
      <style>{`
        /* Apply padding for both screen (preview) and print */
        .resume-page-container {
          padding-top: 24px !important;
          padding-bottom: 24px !important;
        }
        @media print {
          /* Hide photo placeholders in print/PDF */
          .photo-placeholder {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 15mm 0 0 0;
            background: var(--pdf-background, hsl(var(--background))) !important;
          }
          @page :first {
            margin-top: 0;
          }
          html, body {
            background: var(--pdf-background, hsl(var(--background))) !important;
            min-height: 100%;
            height: 100%;
          }
          .resume-page-container {
            min-height: 0 !important;
            background: var(--pdf-background, hsl(var(--background))) !important;
            width: 210mm;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
          }
          .resume-page-container > div:not([aria-hidden="true"]) {
            flex: 0 0 auto;
          }
          /* Spacer fills remaining page space; max-height set dynamically by JS */
          .resume-page-container > div[aria-hidden="true"],
          .resume-spacer {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            background: var(--pdf-background, hsl(var(--background))) !important;
          }
          /* Prevent sections from breaking awkwardly */
          div[class*="mb-"] {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      <div className="resume-page-container bg-background text-foreground p-5 max-w-3xl mx-auto font-minimal" style={{ fontFamily: `"${fontFamily}", sans-serif` }}>
        {/* Header with elegant name presentation */}
        <div className="mb-5">
          <div className="flex items-start gap-5 mb-4">
            <div className="flex-1">
              <h1 
                className="mb-2" 
                style={{ 
                  fontSize: sizes.name, 
                  letterSpacing: '0.15em', 
                  fontWeight: titleBold ? '700' : '400', 
                  color: linkColor,
                  lineHeight: '1.2'
                }}
              >
                {personalInfo.firstName.toUpperCase()} {personalInfo.lastName.toUpperCase()}
              </h1>
              {personalInfo.professionalTitle && personalInfo.professionalTitle.trim().length > 0 && (
                <p 
                  className="mb-3" 
                  style={{ 
                    fontSize: sizes.sm, 
                    color: titleColor,
                    opacity: 0.95,
                    letterSpacing: '0.02em'
                  }}
                >
                  {personalInfo.professionalTitle.trim()}
                </p>
              )}

              {/* Contact info with subtle separators */}
              {contactLineParts.length > 0 && (
                <p 
                  style={{ 
                    fontSize: sizes.xs,
                    color: textColor, 
                    opacity: 0.7,
                    letterSpacing: '0.01em'
                  }}
                >
                  {contactLineParts.map((node, i) => (
                    <Fragment key={i}>
                      {i > 0 ? '  •  ' : null}
                      {node}
                    </Fragment>
                  ))}
                </p>
              )}
            </div>

            {/* Profile image with subtle border — only when set */}
            {personalInfo.profileImage?.trim() ? (
              <div className="flex-shrink-0">
                <div
                  className="w-24 h-24 md:w-28 md:h-28 rounded overflow-hidden border-2"
                  style={{
                    borderColor: headingColor,
                  }}
                >
                  <img
                    src={personalInfo.profileImage}
                    alt={`Professional profile photo of ${personalInfo.firstName} ${personalInfo.lastName}${personalInfo.professionalTitle ? `, ${personalInfo.professionalTitle}` : ''}${personalInfo.location ? ` from ${personalInfo.location}` : ''}`}
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: '50% 40%',
                      /* Crisp scaling on HiDPI / zoom (opacity on parent was fading the whole photo) */
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                    }}
                    sizes="(min-width: 768px) 112px, 96px"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sections — vertical rhythm between blocks */}
        <div className="space-y-4">
          {orderedSections.map(section => renderSection(section))}
        </div>

        {/* Spacer for page filling */}
        <div aria-hidden="true" className="resume-spacer" style={{ flex: '1 1 auto', minHeight: 0 }}></div>

        {/* Page Number Footer */}
        <style>{`
        .page-number-footer {
          display: none;
        }
        @media print {
          @page {
            margin-bottom: 20mm;
            margin-top: 15mm;
            @bottom-center {
              content: counter(page);
              font-size: 10px;
              color: #6b7280;
              opacity: 0.6;
            }
          }
          @page :first {
            margin-top: 0;
          }
          .page-number-footer {
            display: none !important;
          }
        }
      `}</style>
        <div className="page-number-footer"></div>
      </div>
    </>
  );
};
