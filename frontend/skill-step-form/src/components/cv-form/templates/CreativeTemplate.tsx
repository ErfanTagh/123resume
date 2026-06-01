import React from "react";
import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase, GraduationCap, Code, Award, Languages, Heart, User } from "lucide-react";
import { formatDateRange } from "@/lib/dateFormatter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { getRenderableSkillGroups } from "@/lib/skillGroups";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { getWorkExperienceResponsibilityOnly } from "@/lib/workExperienceBullets";

interface CreativeTemplateProps {
  data: CVFormData;
}

export const CreativeTemplate = ({ data }: CreativeTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, skillGroups, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with vibrant defaults
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

  // Subtle accent color - one primary color for elegance
  const accentColor = headingColor;

  // Font size mappings - compact for resume
  const fontSizeMap = {
    small: {
      heading: '0.875rem',     // 14px
      base: '0.6875rem',       // 11px
      sm: '0.625rem',          // 10px
      xs: '0.5625rem',         // 9px
      sectionHeading: '0.9375rem', // 15px
      lg: '0.8125rem',         // 13px
      baseText: '0.625rem',    // 10px
      name: '1.5rem',          // 24px
    },
    medium: {
      heading: '1rem',         // 16px
      base: '0.8125rem',       // 13px
      sm: '0.75rem',           // 12px
      xs: '0.6875rem',         // 11px
      sectionHeading: '1.125rem', // 18px
      lg: '0.9375rem',         // 15px
      baseText: '0.75rem',     // 12px
      name: '1.875rem',        // 30px
    },
    large: {
      heading: '1.125rem',     // 18px
      base: '0.9375rem',       // 15px
      sm: '0.875rem',          // 14px
      xs: '0.8125rem',         // 13px
      sectionHeading: '1.25rem', // 20px
      lg: '1.0625rem',         // 17px
      baseText: '0.875rem',    // 14px
      name: '2.125rem',        // 34px
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

  // Size mappings
  const personalInfoTitleSizes = fontSizeMap[personalInfoTitleSize];
  const personalInfoBodySizes = fontSizeMap[personalInfoBodySize];
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

  // Section icon mapping
  const sectionIcons = {
    summary: User, // User icon for about me/summary
    workExperience: Briefcase,
    education: GraduationCap,
    projects: Code,
    certificates: Award,
    skills: Code,
    languages: Languages,
    interests: Heart,
  };

  const renderSection = (sectionKey: string) => {
    const Icon = sectionIcons[sectionKey as keyof typeof sectionIcons];

    switch (sectionKey) {
      case "summary":
        return personalInfo.summary && personalInfo.summary.trim() ? (
          <div key="summary">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                {Icon && <Icon className="h-4 w-4" style={{ color: personalInfoTitleColor }} />}
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: personalInfoTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: personalInfoTitleColor 
                  }}
                >
                  {t('resume.sections.aboutMe')}
                </h2>
              </div>
              <p 
                className="leading-relaxed whitespace-pre-wrap" 
                style={{ 
                  fontSize: personalInfoBodySizes.baseText, 
                  color: personalInfoBodyColor, 
                  lineHeight: '1.7',
                  opacity: 0.95
                }}
              >
                {personalInfo.summary.trim()}
              </p>
            </div>
          </div>
        ) : null;

      case "workExperience":
        return workExperience.some(exp => exp.position || exp.company) ? (
          <div key="workExperience">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Briefcase className="h-4 w-4" style={{ color: workExperienceStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: workExperienceTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: workExperienceStyling.titleColor 
                  }}
                >
                  {t('resume.sections.experience')}
                </h2>
              </div>
              <div className="space-y-3">
                {workExperience.map((exp, index) => (
                  (exp.position || exp.company) && (
                    <div key={index} className="relative">
                      <div 
                        className="absolute -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-background" 
                        style={{ backgroundColor: accentColor }}
                      />
                      <h3 
                        className="font-bold mb-0.5" 
                        style={{ 
                          fontSize: workExperienceBodySizes.base, 
                          color: workExperienceStyling.bodyColor,
                          letterSpacing: '0.01em'
                        }}
                      >
                        {exp.position}
                      </h3>
                      <div className="flex justify-between items-center gap-4 mb-1">
                        <p 
                          className="font-medium" 
                          style={{ 
                            fontSize: workExperienceBodySizes.sm, 
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.85
                          }}
                        >
                          <ProjectLinkedTitle
                            name={exp.company || ""}
                            link={exp.link}
                            className="font-medium"
                            anchorStyle={{
                              fontSize: workExperienceBodySizes.sm,
                              color: workExperienceStyling.bodyColor,
                              opacity: 0.85,
                            }}
                            inheritColor
                          />
                          {exp.location && ` • ${exp.location}`}
                        </p>
                        {(exp.startDate || exp.endDate) && (
                          <span 
                            className="whitespace-nowrap italic" 
                            style={{ 
                              fontSize: workExperienceBodySizes.xs, 
                              color: workExperienceStyling.bodyColor, 
                              opacity: 0.7 
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
                            fontSize: workExperienceBodySizes.sm,
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
                            fontSize: workExperienceBodySizes.sm,
                            color: workExperienceStyling.bodyColor,
                            lineHeight: '1.6',
                          }}
                        >
                          {getWorkExperienceResponsibilityOnly(exp).map((line, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span style={{ color: accentColor }}>▸</span>
                              <span className="flex-1" style={{ opacity: 0.9 }}>
                                {line}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {exp.technologies && exp.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {exp.technologies.map((tech, i) => (
                            tech.technology && (
                              <span 
                                key={i} 
                                className="px-2 py-0.5 rounded-md text-xs font-medium" 
                                style={{ 
                                  color: accentColor, 
                                  backgroundColor: `${accentColor}15`,
                                  fontSize: sizes.xs
                                }}
                              >
                                {typeof tech === 'string' ? tech : tech.technology}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                      {exp.competencies && exp.competencies.length > 0 && (
                        <p 
                          className="mt-1.5" 
                          style={{ 
                            fontSize: sizes.xs, 
                            color: workExperienceStyling.bodyColor,
                            opacity: 0.85
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCompetencies')}:</span>{' '}
                          {exp.competencies.map(c => typeof c === 'string' ? c : c.competency).filter(Boolean).join(" • ")}
                        </p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        ) : null;

      case "education":
        return education.some(edu => edu.degree || edu.institution) ? (
          <div key="education">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <GraduationCap className="h-4 w-4" style={{ color: educationStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: educationTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: educationStyling.titleColor 
                  }}
                >
                  {t('resume.sections.education')}
                </h2>
              </div>
              <div className="space-y-2.5">
                {education.map((edu, index) => (
                  (edu.degree || edu.institution) && (
                    <div key={index} className="relative">
                      <div 
                        className="absolute -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-background" 
                        style={{ backgroundColor: accentColor }}
                      />
                      <h3 
                        className="font-bold mb-0.5" 
                        style={{ 
                          fontSize: educationBodySizes.base, 
                          color: educationStyling.bodyColor,
                          letterSpacing: '0.01em'
                        }}
                      >
                        {edu.degree}
                      </h3>
                      <div className="flex justify-between items-center gap-4 mb-0.5">
                        <p 
                          style={{ 
                            fontSize: educationBodySizes.sm, 
                            color: educationStyling.bodyColor,
                            opacity: 0.85
                          }}
                        >
                          <ProjectLinkedTitle
                            name={edu.institution || ""}
                            link={edu.link}
                            anchorStyle={{
                              fontSize: educationBodySizes.sm,
                              color: educationStyling.bodyColor,
                              opacity: 0.85,
                            }}
                            inheritColor
                          />
                          {edu.location && ` • ${edu.location}`}
                        </p>
                        {(edu.startDate || edu.endDate) && (
                          <span 
                            className="whitespace-nowrap italic" 
                            style={{ 
                              fontSize: educationBodySizes.xs, 
                              color: educationStyling.bodyColor, 
                              opacity: 0.7 
                            }}
                          >
                            {formatDateRange(edu.startDate, edu.endDate, t('resume.fields.present'), language)}
                          </span>
                        )}
                      </div>
                      {edu.field && (
                        <p 
                          className="italic" 
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
                            fontSize: sizes.xs, 
                            color: educationStyling.bodyColor,
                            opacity: 0.85
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCourses')}:</span>{' '}
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
                  )
                ))}
              </div>
            </div>
          </div>
        ) : null;

      case "projects":
        return projects.some(proj => proj.name) ? (
          <div key="projects">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Code className="h-4 w-4" style={{ color: projectsStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: projectsTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: projectsStyling.titleColor 
                  }}
                >
                  {t('resume.sections.projects')}
                </h2>
              </div>
              <div className="space-y-2.5">
                {projects.map((proj, index) => (
                  proj.name && (
                    <div key={index} className="relative">
                      <div 
                        className="absolute -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-background" 
                        style={{ backgroundColor: accentColor }}
                      />
                      <div className="flex justify-between items-start gap-4 mb-0.5">
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
                            className="whitespace-nowrap italic" 
                            style={{ 
                              fontSize: projectsBodySizes.xs, 
                              color: projectsStyling.bodyColor, 
                              opacity: 0.7 
                            }}
                          >
                            {formatDateRange(proj.startDate, proj.endDate, t('resume.fields.present'), language)}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p 
                          className="mt-0.5" 
                          style={{ 
                            fontSize: projectsBodySizes.sm, 
                            color: projectsStyling.bodyColor,
                            lineHeight: '1.6',
                            opacity: 0.9
                          }}
                        >
                          {proj.description}
                        </p>
                      )}
                      {proj.highlights && proj.highlights.length > 0 && (
                        <ul 
                          className="space-y-0.5 mt-1" 
                          style={{ 
                            fontSize: projectsBodySizes.sm, 
                            color: projectsStyling.bodyColor,
                            lineHeight: '1.6'
                          }}
                        >
                          {proj.highlights.map((highlight, i) => (
                            highlight.highlight && (
                              <li key={i} className="flex gap-2.5">
                                <span style={{ color: accentColor }}>▸</span>
                                <span className="flex-1" style={{ opacity: 0.9 }}>{highlight.highlight}</span>
                              </li>
                            )
                          ))}
                        </ul>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {proj.technologies.map((tech, i) => (
                            tech.technology && (
                              <span 
                                key={i} 
                                className="px-2 py-0.5 rounded-md text-xs font-medium" 
                                style={{ 
                                  color: accentColor, 
                                  backgroundColor: `${accentColor}15`,
                                  fontSize: sizes.xs
                                }}
                              >
                                {tech.technology}
                              </span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        ) : null;

      case "certificates":
        return certificates.some(cert => cert.name) ? (
          <div key="certificates">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Award className="h-4 w-4" style={{ color: certificatesStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: certificatesTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: certificatesStyling.titleColor 
                  }}
                >
                  {t('resume.sections.certifications')}
                </h2>
              </div>
              <div className="space-y-2">
                {certificates.map((cert, index) => (
                  cert.name && (
                    <div key={index} className="relative">
                      <div 
                        className="absolute -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-background" 
                        style={{ backgroundColor: accentColor }}
                      />
                      <h3 
                        className="font-bold mb-0.5" 
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
                      <div className="flex justify-between items-center gap-4">
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
                          <span 
                            className="whitespace-nowrap italic" 
                            style={{ 
                              fontSize: sizes.xs, 
                              color: certificatesStyling.bodyColor, 
                              opacity: 0.7 
                            }}
                          >
                            {cert.issueDate} {cert.expirationDate && `- ${cert.expirationDate}`}
                          </span>
                        )}
                      </div>
                      {cert.credentialId && (
                        <p 
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
          </div>
        ) : null;

      case "skills":
        return groupedSkills.length > 0 ? (
          <div key="skills">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Code className="h-4 w-4" style={{ color: skillsStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: skillsTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: skillsStyling.titleColor 
                  }}
                >
                  {t('resume.sections.skills')}
                </h2>
              </div>
              <div className="space-y-2">
                {groupedSkills.map((group, index) => (
                  <div key={`${group.name}-${index}`}>
                    <p
                      style={{
                        fontSize: skillsBodySizes.xs,
                        color: skillsStyling.bodyColor,
                        fontWeight: 700,
                        marginBottom: "4px",
                        opacity: 0.85,
                      }}
                    >
                      {group.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.skills.map((item, itemIndex) => (
                        <span
                          key={`${group.name}-${itemIndex}`}
                          className="px-2.5 py-1 rounded-lg font-semibold"
                          style={{
                            fontSize: skillsBodySizes.xs,
                            color: skillsStyling.bodyColor,
                            backgroundColor: `${skillsStyling.bodyColor}12`,
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
          </div>
        ) : null;

      case "languages":
        return languages.some(lang => lang.language) ? (
          <div key="languages">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Languages className="h-4 w-4" style={{ color: languagesStyling.titleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: languagesTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: languagesStyling.titleColor 
                  }}
                >
                  {t('resume.sections.languages')}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang, index) => (
                  lang.language && (
                    <div 
                      key={index} 
                      className="p-2 rounded-lg" 
                      style={{ backgroundColor: `${languagesStyling.bodyColor}10` }}
                    >
                      <p 
                        className="font-semibold" 
                        style={{ 
                          color: languagesStyling.bodyColor,
                          fontSize: languagesBodySizes.sm
                        }}
                      >
                        {lang.language}
                      </p>
                      {lang.proficiency && (
                        <p 
                          className="italic" 
                          style={{ 
                            fontSize: languagesBodySizes.xs, 
                            color: languagesStyling.bodyColor, 
                            opacity: 0.75 
                          }}
                        >
                          {formatProficiency(t, lang.proficiency)}
                        </p>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests && personalInfo.interests.length > 0 && personalInfo.interests.some(i => i.interest) ? (
          <div key="interests">
            <div className="relative pl-5 border-l-[3px]" style={{ borderColor: accentColor }}>
              <div className="flex items-center gap-2 mb-2.5">
                <Heart className="h-4 w-4" style={{ color: personalInfoTitleColor }} />
                <h2 
                  className="font-black italic uppercase tracking-wide" 
                  style={{ 
                    fontSize: personalInfoTitleSizes.sectionHeading, 
                    fontWeight: headingBold ? '900' : 'bold', 
                    color: personalInfoTitleColor 
                  }}
                >
                  {t('resume.sections.interests')}
                </h2>
              </div>
              <p 
                style={{ 
                  fontSize: personalInfoBodySizes.sm, 
                  color: personalInfoBodyColor, 
                  lineHeight: '1.7',
                  opacity: 0.9
                }}
              >
                {personalInfo.interests.map(i => i.interest).filter(Boolean).join(" • ")}
              </p>
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
        .resume-page-container {
          padding-top: 24px !important;
          padding-bottom: 24px !important;
          min-height: 0;
          display: flex;
          flex-direction: column;
        }
        .resume-page-container > div[aria-hidden="true"],
        .resume-spacer {
          flex: 1 1 0;
          min-height: 0;
          overflow: hidden;
        }
        @media print {
          .photo-placeholder {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
            background: var(--pdf-background, hsl(var(--background))) !important;
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
        }
      `}</style>
      <div 
        className="resume-page-container bg-gradient-to-br from-background to-primary/5 text-foreground p-6 max-w-4xl mx-auto" 
        style={{ fontFamily: `"${fontFamily}", ui-sans-serif, system-ui, sans-serif` }}
      >
        {/* Elegant header with single accent color */}
        <div className="mb-4 relative">
          <div 
            className="absolute top-0 left-0 h-full rounded-r-full" 
            style={{ width: '3px', backgroundColor: accentColor }}
          />
          <div className="flex items-start gap-6 mb-3 pl-4">
            <div className="flex-1">
              <div className="mb-2">
                <h1 
                  className="font-black italic tracking-tight leading-none" 
                  style={{ 
                    fontSize: sizes.name, 
                    fontWeight: titleBold ? '900' : 'bold', 
                    color: linkColor,
                    lineHeight: '1.1'
                  }}
                >
                  {personalInfo.firstName}
                </h1>
                <h1 
                  className="font-black italic tracking-tight leading-none" 
                  style={{ 
                    fontSize: sizes.name, 
                    fontWeight: titleBold ? '900' : 'bold', 
                    color: linkColor,
                    lineHeight: '1.1'
                  }}
                >
                  {personalInfo.lastName}
                </h1>
              </div>
              {personalInfo.professionalTitle && personalInfo.professionalTitle.trim().length > 0 && (
                <p 
                  className="font-bold italic mb-2" 
                  style={{ 
                    fontSize: sizes.base, 
                    color: titleColor,
                    letterSpacing: '0.02em'
                  }}
                >
                  {personalInfo.professionalTitle.trim()}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2.5" style={{ fontSize: sizes.xs }}>
                {personalInfo.email && (
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" 
                    style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                  >
                    <Mail className="h-3 w-3" style={{ color: accentColor }} />
                    <span style={{ color: textColor }}>{personalInfo.email}</span>
                  </div>
                )}
                {personalInfo.phone && (
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" 
                    style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                  >
                    <Phone className="h-3 w-3" style={{ color: accentColor }} />
                    <span style={{ color: textColor }}>{personalInfo.phone}</span>
                  </div>
                )}
                {personalInfo.location && (
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" 
                    style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                  >
                    <MapPin className="h-3 w-3" style={{ color: accentColor }} />
                    <span style={{ color: textColor }}>{personalInfo.location}</span>
                  </div>
                )}
                {personalInfo.linkedin && (
                  <a
                    href={normalizeExternalUrl(personalInfo.linkedin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <div 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full min-w-0" 
                      style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                    >
                      <Linkedin className="h-3 w-3 flex-shrink-0" style={{ color: accentColor }} />
                      <span className="truncate" style={{ color: textColor }}>
                        {t('resume.contactLinkShort.linkedin')}
                      </span>
                    </div>
                  </a>
                )}
                {personalInfo.github && (
                  <a
                    href={normalizeExternalUrl(personalInfo.github)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <div 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full min-w-0" 
                      style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                    >
                      <Github className="h-3 w-3 flex-shrink-0" style={{ color: accentColor }} />
                      <span className="truncate" style={{ color: textColor }}>
                        {t('resume.contactLinkShort.github')}
                      </span>
                    </div>
                  </a>
                )}
                {personalInfo.website && (
                  <a
                    href={normalizeExternalUrl(personalInfo.website)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline"
                    style={{ color: 'inherit' }}
                  >
                    <div 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full min-w-0" 
                      style={{ backgroundColor: 'hsl(var(--muted))', opacity: 0.8 }}
                    >
                      <Globe className="h-3 w-3 flex-shrink-0" style={{ color: accentColor }} />
                      <span className="truncate" style={{ color: textColor }}>
                        {t('resume.contactLinkShort.website')}
                      </span>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Profile image with subtle border — only when set */}
            {personalInfo.profileImage?.trim() ? (
              <div className="flex-shrink-0">
                <div 
                  className="w-20 h-20 rounded-xl overflow-hidden shadow-lg border-[3px]" 
                  style={{ borderColor: accentColor }}
                >
                  <img
                    src={personalInfo.profileImage}
                    alt={`Professional profile photo of ${personalInfo.firstName} ${personalInfo.lastName}${personalInfo.professionalTitle ? `, ${personalInfo.professionalTitle}` : ''}${personalInfo.location ? ` from ${personalInfo.location}` : ''}`}
                    className="h-full w-full object-cover"
                    style={{ 
                      objectPosition: '50% 40%', 
                      WebkitBackfaceVisibility: 'hidden', 
                      backfaceVisibility: 'hidden' 
                    }}
                    sizes="80px"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Sections — compact spacing */}
        <div className="space-y-3">
          {orderedSections.map(section => renderSection(section))}
        </div>

        {/* Spacer */}
        <div aria-hidden="true" className="resume-spacer" style={{ flex: '1 1 auto', minHeight: 0 }}></div>

        {/* Page Footer */}
        <style>{`
        .page-number-footer { display: none; }
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
          @page :first { margin-top: 0; }
          .page-number-footer { display: none !important; }
        }
      `}</style>
        <div className="page-number-footer"></div>
      </div>
    </>
  );
};