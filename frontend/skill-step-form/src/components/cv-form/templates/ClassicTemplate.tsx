import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar } from "lucide-react";
import { formatDateRange } from "@/lib/dateFormatter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { getRenderableSkillGroups } from "@/lib/skillGroups";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { getWorkExperienceResponsibilityOnly } from "@/lib/workExperienceBullets";

interface ClassicTemplateProps {
  data: CVFormData;
}

export const ClassicTemplate = ({ data }: ClassicTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, skillGroups, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with defaults
  const fontFamily = styling?.fontFamily || "serif";
  const fontSizeInput = styling?.fontSize || "medium";
  // Ensure fontSize is valid to prevent crashes
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
      xs: '0.625rem',        // 10px - metadata
      sm: '0.75rem',         // 12px - body text
      base: '0.875rem',      // 14px - section items
      baseText: '0.6875rem', // 11px - paragraph text
      heading: '0.8125rem',  // 13px - section headings
      body: '0.6875rem',     // 11px - legacy
      name: '1.5rem',        // 24px - header name
    },
    medium: {
      xs: '0.75rem',         // 12px - metadata
      sm: '0.875rem',        // 14px - body text
      base: '1rem',          // 16px - section items
      baseText: '0.8125rem', // 13px - paragraph text
      heading: '0.9375rem',  // 15px - section headings
      body: '0.8125rem',     // 13px - legacy
      name: '1.75rem',       // 28px - header name
    },
    large: {
      xs: '0.875rem',        // 14px - metadata
      sm: '1rem',            // 16px - body text
      base: '1.125rem',      // 18px - section items
      baseText: '0.9375rem', // 15px - paragraph text
      heading: '1.0625rem',  // 17px - section headings
      body: '0.9375rem',     // 15px - legacy
      name: '2rem',          // 32px - header name
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
  // Use headingColor as fallback (blue) instead of titleColor (black) to match template defaults
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
  const groupedSkills = getRenderableSkillGroups(skillGroups, skills, t('resume.sections.skills'));

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
        return personalInfo.summary && personalInfo.summary.trim() ? (
          <div key="summary">
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: personalInfoTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: personalInfoTitleColor }}>{t('resume.sections.summary').toUpperCase()}</h2>
            <p className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: personalInfoBodySizes.baseText, color: personalInfoBodyColor, lineHeight: '1.7' }}>{personalInfo.summary.trim()}</p>
          </div>
        ) : null;

      case "workExperience":
        return workExperience.some(exp => exp.position || exp.company) ? (
          <div key="workExperience">
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: workExperienceTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: workExperienceStyling.titleColor }}>{t('resume.sections.workExperience').toUpperCase()}</h2>
            <div className="space-y-3">
              {workExperience.map((exp, index) => (
                (exp.position || exp.company) && (
                  <div key={index} className="space-y-1.5">
                    <h3 className="font-semibold" style={{ fontSize: workExperienceBodySizes.base, color: workExperienceStyling.bodyColor, letterSpacing: '0.01em' }}>{exp.position}</h3>
                    <div className="flex justify-between items-baseline" style={{ fontSize: workExperienceBodySizes.xs, color: workExperienceStyling.bodyColor }}>
                      <div>
                        <span className="italic" style={{ opacity: 0.9 }}>
                          <ProjectLinkedTitle
                            name={exp.company || ""}
                            link={exp.link}
                            className="italic"
                            anchorStyle={{ opacity: 0.9 }}
                            inheritColor
                          />
                        </span>
                        {exp.location && <span className="ml-2">• {exp.location}</span>}
                      </div>
                      {(exp.startDate || exp.endDate) && (
                        <span style={{ opacity: 0.7, fontStyle: 'italic' }}>
                          {formatDateRange(exp.startDate, exp.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {exp.description?.trim() && (
                      <p
                        className="mt-1.5 whitespace-pre-wrap"
                        style={{ fontSize: workExperienceBodySizes.sm, color: workExperienceStyling.bodyColor, lineHeight: '1.6' }}
                      >
                        {exp.description}
                      </p>
                    )}
                    {getWorkExperienceResponsibilityOnly(exp).length > 0 && (
                      <ul className="space-y-1 mt-1.5" style={{ fontSize: workExperienceBodySizes.sm, color: workExperienceStyling.bodyColor, lineHeight: '1.6' }}>
                        {getWorkExperienceResponsibilityOnly(exp).map((line, i) => (
                          <li key={i} className="flex gap-3">
                            <span style={{ color: workExperienceStyling.bodyColor, opacity: 0.5 }}>•</span>
                            <span className="flex-1">{line}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <p className="mt-1" style={{ fontSize: sizes.xs, color: workExperienceStyling.bodyColor }}>
                        {t('resume.sections.technologies')}: {exp.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean).join(", ")}
                      </p>
                    )}
                    {exp.competencies && exp.competencies.length > 0 && (
                      <p className="mt-1" style={{ fontSize: sizes.xs, color: workExperienceStyling.bodyColor }}>
                        {t('resume.labels.keyCompetencies')}: {exp.competencies.map(c => typeof c === 'string' ? c : c.competency).filter(Boolean).join(", ")}
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
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: educationTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: educationStyling.titleColor }}>{t('resume.sections.education').toUpperCase()}</h2>
            <div className="space-y-3">
              {education.map((edu, index) => (
                (edu.degree || edu.institution) && (
                  <div key={index}>
                    <h3 className="font-semibold" style={{ color: educationStyling.bodyColor }}>{edu.degree}</h3>
                    <div className="flex justify-between items-center text-sm" style={{ color: educationStyling.bodyColor }}>
                      <div>
                        <span className="italic" style={{ color: educationStyling.bodyColor }}>
                          <ProjectLinkedTitle
                            name={edu.institution || ""}
                            link={edu.link}
                            className="italic"
                            anchorStyle={{ color: educationStyling.bodyColor }}
                            inheritColor
                          />
                        </span>
                        {edu.location && <span className="ml-2" style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor }}>• {edu.location}</span>}
                      </div>
                      {(edu.startDate || edu.endDate) && (
                        <span style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor, opacity: 0.7, fontStyle: 'italic' }}>
                          {formatDateRange(edu.startDate, edu.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {edu.field && <p style={{ fontSize: educationBodySizes.baseText, color: educationStyling.bodyColor }}>{edu.field}</p>}
                    {edu.keyCourses && edu.keyCourses.length > 0 && (
                      <p className="mt-1" style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor }}>
                        {t('resume.labels.keyCourses')}: {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(", ")}
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
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: projectsTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: projectsStyling.titleColor }}>{t('resume.sections.projects').toUpperCase()}</h2>
            <div className="space-y-3">
              {projects.map((proj, index) => (
                proj.name && (
                  <div key={index}>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold" style={{ color: projectsStyling.bodyColor }}>
                        <ProjectLinkedTitle name={proj.name} link={proj.link} className="underline" />
                      </h3>
                        {(proj.startDate || proj.endDate) && (
                        <span style={{ fontSize: projectsBodySizes.xs, color: projectsStyling.bodyColor, opacity: 0.7, fontStyle: 'italic' }}>
                          {formatDateRange(proj.startDate, proj.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                    {proj.description && (
                      <p className="mt-1" style={{ fontSize: projectsBodySizes.baseText, color: projectsStyling.bodyColor }}>{proj.description}</p>
                    )}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <ul className="space-y-1 mt-1" style={{ fontSize: projectsBodySizes.baseText, color: projectsStyling.bodyColor }}>
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
                      <p className="mt-1" style={{ fontSize: sizes.xs, color: projectsStyling.bodyColor }}>
                        {t('resume.sections.technologies')}: {proj.technologies.map(techItem => techItem.technology).filter(Boolean).join(", ")}
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
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: certificatesTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: certificatesStyling.titleColor }}>{t('resume.sections.certifications').toUpperCase()}</h2>
            <div className="space-y-2">
              {certificates.map((cert, index) => (
                cert.name && (
                  <div key={index}>
                    <h3 className="font-semibold" style={{ color: certificatesStyling.bodyColor }}>
                      {hasWebLink(cert.url) ? (
                        <a href={normalizeExternalUrl(cert.url)} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'inherit' }}>
                          {cert.name}
                        </a>
                      ) : (
                        cert.name
                      )}
                    </h3>
                    <p className="text-muted-foreground" style={{ fontSize: certificatesBodySizes.baseText, color: certificatesStyling.bodyColor }}>{cert.organization}</p>
                    {(cert.issueDate || cert.expirationDate) && (
                      <p className="text-muted-foreground mt-1" style={{ fontSize: certificatesBodySizes.xs, color: certificatesStyling.bodyColor }}>
                        {cert.issueDate} {cert.expirationDate && `- ${cert.expirationDate}`}
                      </p>
                    )}
                    {cert.credentialId && (
                      <p className="text-muted-foreground" style={{ fontSize: certificatesBodySizes.xs, color: certificatesStyling.bodyColor }}>ID: {cert.credentialId}</p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "skills":
        return groupedSkills.length > 0 ? (
          <div key="skills">
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: skillsTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: skillsStyling.titleColor }}>{t('resume.sections.skills').toUpperCase()}</h2>
            <div className="space-y-1">
              {groupedSkills.map((group, index) => (
                <p key={`${group.name}-${index}`} style={{ fontSize: skillsBodySizes.sm, color: skillsStyling.bodyColor, lineHeight: '1.7' }}>
                  <span style={{ fontWeight: 700, fontSize: skillsBodySizes.xs, color: titleColor, opacity: 0.95 }}>{group.name}: </span>
                  {group.skills.join(" • ")}
                </p>
              ))}
            </div>
          </div>
        ) : null;

      case "languages":
        return languages.some(lang => lang.language) ? (
          <div key="languages">
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: languagesTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: languagesStyling.titleColor }}>{t('resume.sections.languages').toUpperCase()}</h2>
            <div className="space-y-1.5">
              {languages.map((lang, index) => (
                lang.language && (
                  <div key={index} className="flex justify-between items-center gap-4" style={{ fontSize: languagesBodySizes.sm, color: languagesStyling.bodyColor }}>
                    <span style={{ fontWeight: 500 }}>{lang.language}</span>
                    {lang.proficiency && (
                      <span className="whitespace-nowrap" style={{ opacity: 0.7, fontStyle: 'italic', fontSize: languagesBodySizes.xs }}>
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
            <h2 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: personalInfoTitleSizes.heading, fontWeight: headingBold ? 'bold' : 'normal', color: personalInfoTitleColor }}>{t('resume.sections.interests').toUpperCase()}</h2>
            <p style={{ fontSize: personalInfoBodySizes.sm, color: personalInfoBodyColor, lineHeight: '1.7' }}>{personalInfo.interests.map(i => i.interest).filter(Boolean).join(" • ")}</p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

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
      <div className="resume-page-container bg-background text-foreground p-8 max-w-3xl mx-auto font-classic" style={{ fontFamily: `"${fontFamily}", serif` }}>
        {/* Header - centered and traditional */}
        <div className="text-center mb-6 pb-4 border-b-2 border-foreground">
          {/* Profile image — only when user uploaded one (no placeholder on later steps) */}
          {personalInfo.profileImage?.trim() ? (
            <div className="flex justify-center mb-4">
              <div className="w-28 h-28 rounded-full border-2 border-foreground overflow-hidden flex-shrink-0">
                <img
                  src={personalInfo.profileImage}
                  alt={`Professional profile photo of ${personalInfo.firstName} ${personalInfo.lastName}${personalInfo.professionalTitle ? `, ${personalInfo.professionalTitle}` : ''}${personalInfo.location ? ` from ${personalInfo.location}` : ''}`}
                  className="h-full w-full object-cover"
                  style={{ objectPosition: '50% 40%', WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                  sizes="(min-width: 768px) 112px, 96px"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          ) : null}

          <h1 className="font-bold mb-1 uppercase tracking-wide" style={{ fontSize: sizes.name, fontWeight: titleBold ? '700' : '400', color: linkColor, letterSpacing: '0.02em' }}>
            {personalInfo.firstName} {personalInfo.lastName}
          </h1>
          {personalInfo.professionalTitle && personalInfo.professionalTitle.trim().length > 0 && (
            <p className="font-normal mb-3 italic" style={{ fontSize: sizes.base, color: titleColor, opacity: 0.95 }}>{personalInfo.professionalTitle.trim()}</p>
          )}

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-muted-foreground" style={{ fontSize: sizes.xs }}>
            {personalInfo.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.linkedin && (
              <a
                href={normalizeExternalUrl(personalInfo.linkedin)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-w-0 no-underline"
                style={{ color: 'inherit' }}
              >
                <Linkedin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('resume.contactLinkShort.linkedin')}</span>
              </a>
            )}
            {personalInfo.github && (
              <a
                href={normalizeExternalUrl(personalInfo.github)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-w-0 no-underline"
                style={{ color: 'inherit' }}
              >
                <Github className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('resume.contactLinkShort.github')}</span>
              </a>
            )}
            {personalInfo.website && (
              <a
                href={normalizeExternalUrl(personalInfo.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 min-w-0 no-underline"
                style={{ color: 'inherit' }}
              >
                <Globe className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{t('resume.contactLinkShort.website')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Sections - traditional single column */}
        <div className="space-y-3">
          {orderedSections.map(section => renderSection(section))}
        </div>

        {/* Capped spacer - fills partial pages, won't create extra pages */}
        <div aria-hidden="true" className="resume-spacer" style={{ flex: '1 1 auto', minHeight: 0 }}></div>

        {/* Page Number Footer */}
        <style>{`
        /* Hide page numbers in preview (screen) */
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
          /* Ensure our footer is hidden in print */
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
