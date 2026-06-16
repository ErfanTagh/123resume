import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateRange } from "@/lib/dateFormatter";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { getRenderableSkillGroups } from "@/lib/skillGroups";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";

interface ModernTemplateProps {
  data: CVFormData;
}

export const ModernTemplate = ({ data }: ModernTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, skillGroups, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with defaults
  const fontFamily = styling?.fontFamily || "Inter";
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

  // Extract section-specific styling for personalInfo
  const personalInfoSectionStyling = styling?.sectionStyling?.personalInfo;
  const personalInfoTitleColor = personalInfoSectionStyling?.titleColor || headingColor;
  const personalInfoTitleSize = personalInfoSectionStyling?.titleSize || fontSize;
  const personalInfoBodyColor = personalInfoSectionStyling?.bodyColor || textColor;
  const personalInfoBodySize = personalInfoSectionStyling?.bodySize || fontSize;

  // Enhanced font size mappings with better hierarchy
  const fontSizeMap = {
    small: {
      xs: '0.625rem',        // 10px - metadata
      sm: '0.75rem',         // 12px - body text
      base: '0.875rem',      // 14px - section items
      baseText: '0.6875rem', // 11px - paragraph text
      heading: '0.8125rem',  // 13px - section headings
      title: '1.25rem',      // 20px - legacy / fallback
      name: '1.75rem',       // 28px - header name
    },
    medium: {
      xs: '0.75rem',         // 12px - metadata
      sm: '0.875rem',        // 14px - body text
      base: '1rem',          // 16px - section items
      baseText: '0.8125rem', // 13px - paragraph text
      heading: '0.9375rem',  // 15px - section headings
      title: '1.625rem',     // 26px - legacy / fallback
      name: '2rem',          // 32px - header name
    },
    large: {
      xs: '0.875rem',        // 14px - metadata
      sm: '1rem',            // 16px - body text
      base: '1.125rem',      // 18px - section items
      baseText: '0.9375rem', // 15px - paragraph text
      heading: '1.0625rem',  // 17px - section headings
      title: '2rem',         // 32px - legacy / fallback
      name: '2.375rem',      // 38px - header name
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

  const getHeadingClassName = () => "mb-2 pb-1 border-b-2";

  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
        return personalInfo.summary && personalInfo.summary.trim() ? (
          <div key="summary" data-resume-section="true">
            <h2
              className={getHeadingClassName()}
              style={{
                color: personalInfoTitleColor,
                fontWeight: headingBold ? 'bold' : 'normal',
                borderColor: personalInfoTitleColor,
                fontSize: personalInfoTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.professionalSummary').toUpperCase()}
            </h2>
            <p 
              className="leading-relaxed whitespace-pre-wrap" 
              style={{ 
                color: personalInfoBodyColor, 
                fontSize: personalInfoBodySizes.baseText, 
                lineHeight: '1.65',
                marginTop: '0.5rem'
              }}
            >
              {personalInfo.summary.trim()}
            </p>
          </div>
        ) : null;

      case "workExperience":
        return workExperience.some(exp => exp.position || exp.company) ? (
          <div key="workExperience" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: workExperienceStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: workExperienceStyling.titleColor, 
                fontSize: workExperienceTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.experience').toUpperCase()}
            </h2>
            <div className="space-y-3">
              {workExperience.map((exp, index) => (
                (exp.position || exp.company) && (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-baseline gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-bold truncate"
                          style={{ 
                            fontSize: workExperienceBodySizes.base, 
                            color: workExperienceStyling.bodyColor,
                            letterSpacing: '0.01em'
                          }}
                        >
                          {exp.position}
                        </h3>
                        <p
                          className="italic text-sm"
                          style={{
                            fontSize: workExperienceBodySizes.sm,
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.8,
                          }}
                        >
                          <ProjectLinkedTitle
                            name={exp.company || ""}
                            link={exp.link}
                            className="italic text-sm"
                            anchorStyle={{
                              fontSize: workExperienceBodySizes.sm,
                              color: workExperienceStyling.bodyColor,
                              opacity: 0.8,
                            }}
                            inheritColor
                          />
                          {exp.location && ` • ${exp.location}`}
                        </p>
                      </div>
                      {(exp.startDate || exp.endDate) && (
                        <div 
                          className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0" 
                          style={{ 
                            fontSize: workExperienceBodySizes.xs, 
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          <Calendar className="h-3 w-3" style={{ opacity: 0.7 }} />
                          <span>{formatDateRange(exp.startDate, exp.endDate, t('resume.fields.present'), language)}</span>
                        </div>
                      )}
                    </div>
                    {exp.description && (
                      <p 
                        className="mt-1" 
                        style={{ 
                          color: workExperienceStyling.bodyColor, 
                          fontSize: workExperienceBodySizes.sm, 
                          lineHeight: '1.6' 
                        }}
                      >
                        {exp.description}
                      </p>
                    )}
                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                      <ul 
                        className="space-y-1 mt-1" 
                        style={{ 
                          fontSize: workExperienceBodySizes.sm, 
                          color: workExperienceStyling.bodyColor, 
                          lineHeight: '1.6' 
                        }}
                      >
                        {exp.responsibilities.map((resp, i) => (
                          resp.responsibility && (
                            <li key={i} className="flex gap-2.5">
                              <span style={{ color: workExperienceStyling.bodyColor, opacity: 0.5 }}>•</span>
                              <span className="flex-1">{resp.responsibility}</span>
                            </li>
                          )
                        ))}
                      </ul>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <p 
                        className="mt-1.5" 
                        style={{ 
                          fontSize: workExperienceBodySizes.xs, 
                          color: workExperienceStyling.bodyColor,
                          opacity: 0.85 
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.sections.technologies')}:</span>{' '}
                        {exp.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean).join(" • ")}
                      </p>
                    )}
                    {exp.competencies && exp.competencies.length > 0 && (
                      <p 
                        className="mt-1" 
                        style={{ 
                          fontSize: workExperienceBodySizes.xs, 
                          color: workExperienceStyling.bodyColor,
                          opacity: 0.85 
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
          <div key="education" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: educationStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: educationStyling.titleColor, 
                fontSize: educationTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.education').toUpperCase()}
            </h2>
            <div className="space-y-2.5">
              {education.map((edu, index) => (
                (edu.degree || edu.institution) && (
                  <div key={index}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 
                          className="font-bold" 
                          style={{ 
                            fontSize: educationBodySizes.base, 
                            color: educationStyling.bodyColor,
                            letterSpacing: '0.01em'
                          }}
                        >
                          {edu.degree}
                        </h3>
                        <p 
                          className="text-sm" 
                          style={{ 
                            fontSize: educationBodySizes.sm, 
                            color: educationStyling.bodyColor,
                            opacity: 0.85 
                          }}
                        >
                          <ProjectLinkedTitle
                            name={edu.institution || ""}
                            link={edu.link}
                            className="text-sm"
                            anchorStyle={{
                              fontSize: educationBodySizes.sm,
                              color: educationStyling.bodyColor,
                              opacity: 0.85,
                            }}
                            inheritColor
                          />
                          {edu.location && ` • ${edu.location}`}
                        </p>
                        {edu.field && (
                          <p 
                            className="italic mt-0.5" 
                            style={{ 
                              fontSize: educationBodySizes.sm, 
                              color: educationStyling.bodyColor,
                              opacity: 0.8
                            }}
                          >
                            {edu.field}
                          </p>
                        )}
                        {edu.keyCourses && edu.keyCourses.length > 0 && (
                          <p 
                            className="mt-1" 
                            style={{ 
                              fontSize: educationBodySizes.xs, 
                              color: educationStyling.bodyColor,
                              opacity: 0.85
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{t('resume.labels.keyCourses')}:</span>{' '}
                            {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(" • ")}
                          </p>
                        )}
                        {edu.descriptions && edu.descriptions.length > 0 && (
                          <ul className="space-y-1 mt-1.5" style={{ fontSize: educationBodySizes.sm, color: educationStyling.bodyColor, lineHeight: '1.6' }}>
                            {edu.descriptions.filter(d => d?.description?.trim()).map((d, i) => (
                              <li key={i} className="flex gap-2.5">
                                <span style={{ color: educationStyling.bodyColor, opacity: 0.5 }}>•</span>
                                <span className="flex-1">{d.description!.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {(edu.startDate || edu.endDate) && (
                        <span 
                          className="whitespace-nowrap flex-shrink-0" 
                          style={{ 
                            fontSize: educationBodySizes.xs, 
                            color: educationStyling.bodyColor,
                            opacity: 0.7,
                            fontStyle: 'italic'
                          }}
                        >
                          {formatDateRange(edu.startDate, edu.endDate, t('resume.fields.present'), language)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "projects":
        return projects.some(proj => proj.name) ? (
          <div key="projects" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: projectsStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: projectsStyling.titleColor, 
                fontSize: projectsTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.projects').toUpperCase()}
            </h2>
            <div className="space-y-2.5">
              {projects.map((proj, index) => (
                proj.name && (
                  <div key={index}>
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <h3 
                        className="font-bold flex-1" 
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
                          className="whitespace-nowrap flex-shrink-0" 
                          style={{ 
                            fontSize: projectsBodySizes.xs, 
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
                        style={{ 
                          fontSize: projectsBodySizes.sm, 
                          color: projectsStyling.bodyColor,
                          lineHeight: '1.6'
                        }}
                      >
                        {proj.description}
                      </p>
                    )}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <ul 
                        className="space-y-1 mt-1" 
                        style={{ 
                          fontSize: projectsBodySizes.sm, 
                          color: projectsStyling.bodyColor,
                          lineHeight: '1.6'
                        }}
                      >
                        {proj.highlights.map((highlight, i) => (
                          highlight.highlight && (
                            <li key={i} className="flex gap-2.5">
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
                          fontSize: projectsBodySizes.xs, 
                          color: projectsStyling.bodyColor,
                          opacity: 0.85
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t('resume.sections.technologies')}:</span>{' '}
                        {proj.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean).join(" • ")}
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
          <div key="certificates" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: certificatesStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: certificatesStyling.titleColor, 
                fontSize: certificatesTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.certifications').toUpperCase()}
            </h2>
            <div className="space-y-2">
              {certificates.map((cert, index) => (
                cert.name && (
                  <div key={index}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
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
                        <p 
                          style={{ 
                            fontSize: certificatesBodySizes.sm, 
                            color: certificatesStyling.bodyColor,
                            opacity: 0.85
                          }}
                        >
                          {cert.organization}
                        </p>
                        {(cert.issueDate || cert.expirationDate) && (
                          <p 
                            className="mt-0.5" 
                            style={{ 
                              fontSize: certificatesBodySizes.xs, 
                              color: certificatesStyling.bodyColor,
                              opacity: 0.7,
                              fontStyle: 'italic'
                            }}
                          >
                            {cert.issueDate} {cert.expirationDate && `- ${cert.expirationDate}`}
                          </p>
                        )}
                        {cert.credentialId && (
                          <p 
                            style={{ 
                              fontSize: certificatesBodySizes.xs, 
                              color: certificatesStyling.bodyColor,
                              opacity: 0.7
                            }}
                          >
                            ID: {cert.credentialId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null;

      case "skills":
        return groupedSkills.length > 0 ? (
          <div key="skills" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: skillsStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: skillsStyling.titleColor, 
                fontSize: skillsTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.skills').toUpperCase()}
            </h2>
            <div className="space-y-2 mt-2">
              {groupedSkills.map((group, index) => (
                <div key={`${group.name}-${index}`}>
                  <p
                    style={{
                      fontSize: "0.62rem",
                      color: titleColor,
                      fontWeight: 700,
                      opacity: 0.95,
                      marginBottom: "4px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.skills.map((item, itemIndex) => (
                      <span
                        key={`${group.name}-${itemIndex}`}
                        className="px-2.5 py-1 rounded-full font-medium"
                        style={{
                          fontSize: skillsBodySizes.xs,
                          color: skillsStyling.bodyColor,
                          backgroundColor: `${skillsStyling.bodyColor}15`,
                          letterSpacing: '0.01em'
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "languages":
        return languages.some(lang => lang.language) ? (
          <div key="languages" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: languagesStyling.titleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: languagesStyling.titleColor, 
                fontSize: languagesTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.languages').toUpperCase()}
            </h2>
            <div className="space-y-1.5 mt-2">
              {languages.map((lang, index) => (
                lang.language && (
                  <div 
                    key={index} 
                    className="flex justify-between items-center gap-4" 
                    style={{ 
                      fontSize: languagesBodySizes.sm, 
                      color: languagesStyling.bodyColor 
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{lang.language}</span>
                    {lang.proficiency && (
                      <span
                        className="whitespace-nowrap"
                        style={{ 
                          color: languagesStyling.bodyColor, 
                          opacity: 0.7,
                          fontStyle: 'italic',
                          fontSize: languagesBodySizes.xs
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
          <div key="interests" data-resume-section="true">
            <h2 
              className={getHeadingClassName()} 
              style={{ 
                color: personalInfoTitleColor, 
                fontWeight: headingBold ? 'bold' : 'normal', 
                borderColor: personalInfoTitleColor, 
                fontSize: personalInfoTitleSizes.heading,
                letterSpacing: '0.05em'
              }}
            >
              {t('resume.sections.interests').toUpperCase()}
            </h2>
            <p 
              className="mt-2" 
              style={{ 
                color: personalInfoBodyColor, 
                fontSize: personalInfoBodySizes.sm, 
                lineHeight: '1.65' 
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

  return (
    <>
      <style>{`
        .resume-page-container {
          padding-top: 24px !important;
          padding-bottom: 24px !important;
        }
        @media print {
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
          .resume-page-container > div[aria-hidden="true"],
          .resume-spacer {
            flex: 1 1 auto !important;
            min-height: 0 !important;
            background: var(--pdf-background, hsl(var(--background))) !important;
          }
          div[class*="mb-"] {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
      <div
        className="resume-page-container bg-background text-foreground p-8 max-w-4xl mx-auto"
        style={{ fontFamily: `"${fontFamily}", ui-sans-serif, system-ui, sans-serif` }}
      >
        {/* Compact header with colored accent */}
        <div className="-mx-8 -mt-8 px-8 py-5 mb-5 border-l-4" style={{ backgroundColor: `${linkColor}0D`, borderColor: linkColor }}>
          <div className="flex items-start gap-6">
            <div className="flex-1 min-w-0">
              <h1
                className="mb-1.5"
                style={{
                  color: linkColor,
                  fontWeight: titleBold ? '700' : '400',
                  fontSize: sizes.name,
                  lineHeight: '1.2',
                  letterSpacing: '0.01em',
                }}
              >
                {personalInfo.firstName} {personalInfo.lastName}
              </h1>
              {personalInfo.professionalTitle && personalInfo.professionalTitle.trim().length > 0 && (
                <p 
                  className="font-semibold mb-3" 
                  style={{ 
                    fontSize: sizes.base, 
                    color: titleColor,
                    opacity: 0.95
                  }}
                >
                  {personalInfo.professionalTitle.trim()}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5" style={{ fontSize: sizes.xs, color: textColor }}>
                {personalInfo.email && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{personalInfo.email}</span>
                  </div>
                )}
                {personalInfo.phone && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{personalInfo.phone}</span>
                  </div>
                )}
                {personalInfo.location && (
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{personalInfo.location}</span>
                  </div>
                )}
                {personalInfo.linkedin && (
                  <a
                    href={normalizeExternalUrl(personalInfo.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <Linkedin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{t('resume.contactLinkShort.linkedin')}</span>
                  </a>
                )}
                {personalInfo.github && (
                  <a
                    href={normalizeExternalUrl(personalInfo.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <Github className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{t('resume.contactLinkShort.github')}</span>
                  </a>
                )}
                {personalInfo.website && (
                  <a
                    href={normalizeExternalUrl(personalInfo.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 min-w-0 no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <Globe className="h-3.5 w-3.5 flex-shrink-0" style={{ color: linkColor }} />
                    <span className="truncate">{t('resume.contactLinkShort.website')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Compact profile image — only when set */}
            {personalInfo.profileImage?.trim() ? (
              <div className="flex-shrink-0">
                <div className="w-28 h-28 rounded-full border-2 overflow-hidden" style={{ borderColor: linkColor }}>
                  <img
                    src={personalInfo.profileImage}
                    alt={`Professional profile photo of ${personalInfo.firstName} ${personalInfo.lastName}${personalInfo.professionalTitle ? `, ${personalInfo.professionalTitle}` : ''}${personalInfo.location ? ` from ${personalInfo.location}` : ''}`}
                    className="h-full w-full object-cover"
                    style={{ objectPosition: '50% 40%' }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Compact section spacing - reduced from space-y-4 to space-y-3 */}
        <div className="space-y-3">
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
          .photo-placeholder {
            display: none !important;
          }
          @page {
            margin-bottom: 20mm;
            margin-top: 15mm;
            @bottom-center {
              content: counter(page);
              font-size: ${sizes.xs};
              color: ${textColor};
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