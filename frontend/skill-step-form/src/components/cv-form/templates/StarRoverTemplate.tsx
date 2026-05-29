import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";
import { formatMonthYear } from "@/lib/dateFormatter";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { getWorkExperienceBullets } from "@/lib/workExperienceBullets";

interface StarRoverTemplateProps {
  data: CVFormData;
}

export const StarRoverTemplate = ({ data }: StarRoverTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "education", "workExperience", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with defaults
  const fontFamily = styling?.fontFamily || "'IBM Plex Mono', 'Fira Mono', 'Cascadia Code', monospace";
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
  const sectionHeadingColor = headingColor;

  const fontSizeMap = {
    small: {
      xs: '0.625rem',
      sm: '0.6875rem',
      base: '0.75rem',
      baseText: '0.6875rem',
      heading: '0.625rem',
      name: '1.6rem',
      title: '0.7rem',
    },
    medium: {
      xs: '0.6875rem',
      sm: '0.75rem',
      base: '0.875rem',
      baseText: '0.75rem',
      heading: '0.6875rem',
      name: '1.9rem',
      title: '0.8rem',
    },
    large: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      baseText: '0.875rem',
      heading: '0.75rem',
      name: '2.2rem',
      title: '0.9rem',
    },
  };

  const sizes = fontSizeMap[fontSize];

  const getSectionStyling = (sectionName: string) => {
    const sectionStyling = styling?.sectionStyling?.[sectionName];
    return {
      titleColor: sectionStyling?.titleColor ?? sectionHeadingColor,
      titleSize: sectionStyling?.titleSize || fontSize,
      bodyColor: sectionStyling?.bodyColor || textColor,
      bodySize: sectionStyling?.bodySize || fontSize,
    };
  };

  const personalInfoSectionStyling = styling?.sectionStyling?.personalInfo;
  const personalInfoTitleColor = personalInfoSectionStyling?.titleColor ?? sectionHeadingColor;
  const personalInfoTitleSize = personalInfoSectionStyling?.titleSize || fontSize;
  const personalInfoBodyColor = personalInfoSectionStyling?.bodyColor || textColor;
  const personalInfoBodySize = personalInfoSectionStyling?.bodySize || fontSize;

  const workExperienceStyling = getSectionStyling('workExperience');
  const projectsStyling = getSectionStyling('projects');
  const educationStyling = getSectionStyling('education');
  const certificatesStyling = getSectionStyling('certificates');
  const skillsStyling = getSectionStyling('skills');
  const languagesStyling = getSectionStyling('languages');

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

  const formatDateRangeStar = (startDate: string | undefined, endDate: string | undefined): string => {
    if (!startDate && !endDate) return '';
    const start = formatMonthYear(startDate, language);
    const end = endDate ? formatMonthYear(endDate, language) : t('resume.fields.present');
    if (!start && !end) return '';
    if (!start) return end;
    return `${start} – ${end}`;
  };

  // ── Contact chip ───────────────────────────────────────────────────────
  const renderContactIcon = (
    Icon: any,
    text: string | undefined,
    url?: string,
    linkLabel?: string,
  ) => {
    if (!text) return null;

    let href: string | undefined;
    if (url && url !== '#') {
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        href = url;
      } else {
        href = normalizeExternalUrl(url);
      }
    }

    const displayText =
      linkLabel ??
      (text.startsWith('http')
        ? text.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').split('/')[0]
        : text);

    const inner = (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: sizes.sm,
        color: sectionHeadingColor,
        opacity: 0.8,
        letterSpacing: '0.01em',
      }}>
        <Icon style={{ width: '10px', height: '10px', flexShrink: 0 }} />
        <span>{displayText}</span>
      </span>
    );

    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
          {inner}
        </a>
      );
    }
    return inner;
  };

  // ── Section heading: centered between two rules ───────────────────────
  const SectionHeading = ({
    label,
    color,
    sizePx,
  }: {
    label: string;
    color: string;
    sizePx: string;
  }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px',
    }}>
      <div style={{ flex: 1, height: '1px', backgroundColor: color, opacity: 0.25 }} />
      <span style={{
        fontSize: sizePx,
        fontWeight: 700,
        letterSpacing: '0.18em',
        color: color,
        textTransform: 'uppercase',
        flexShrink: 0,
        lineHeight: 1,
        padding: '0 4px',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: color, opacity: 0.25 }} />
    </div>
  );

  // ── Inline date badge ─────────────────────────────────────────────────
  const DateBadge = ({ text, color }: { text: string; color: string }) => (
    <span style={{
      fontSize: sizes.xs,
      color: color,
      opacity: 0.55,
      fontStyle: 'italic',
      letterSpacing: '0.02em',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );

  // ── Bullet list ───────────────────────────────────────────────────────
  const BulletList = ({ items, color, sizePx }: { items: string[]; color: string; sizePx: string }) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0' }}>
      {items.map((item, i) => (
        <li key={i} style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '3px',
          fontSize: sizePx,
          color,
          lineHeight: 1.6,
        }}>
          <span style={{ color: sectionHeadingColor, opacity: 0.5, flexShrink: 0 }}>–</span>
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{item}</span>
        </li>
      ))}
    </ul>
  );

  // ── Render sections ───────────────────────────────────────────────────
  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
        return personalInfo.summary && personalInfo.summary.trim() ? (
          <div key="summary">
            <SectionHeading label={t('resume.sections.summary').toUpperCase()} color={sectionHeadingColor} sizePx={personalInfoTitleSizes.heading} />
            <p style={{
              fontSize: personalInfoBodySizes.baseText,
              color: personalInfoBodyColor,
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}>
              {personalInfo.summary.trim()}
            </p>
          </div>
        ) : null;

      case "education":
        return education && education.length > 0 && education.some(e => e.degree || e.institution) ? (
          <div key="education">
            <SectionHeading label={t('resume.sections.education').toUpperCase()} color={sectionHeadingColor} sizePx={educationTitleSizes.heading} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {education.map((edu, index) => {
                if (!edu.degree && !edu.institution) return null;
                const dateRange = formatDateRangeStar(edu.startDate, edu.endDate);
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: educationBodySizes.baseText, fontWeight: 700, color: educationStyling.bodyColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {edu.institution ? (
                          <>
                            <ProjectLinkedTitle
                              name={edu.institution}
                              link={edu.link}
                              anchorStyle={{
                                fontSize: educationBodySizes.baseText,
                                fontWeight: 700,
                                color: educationStyling.bodyColor,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                              }}
                              inheritColor
                            />
                            {edu.degree && (
                              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontStyle: 'italic' }}>
                                {' | '}{edu.degree}
                              </span>
                            )}
                          </>
                        ) : (
                          edu.degree
                        )}
                      </span>
                      {dateRange && <DateBadge text={dateRange} color={educationStyling.bodyColor} />}
                    </div>
                    {edu.location && (
                      <span style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor, opacity: 0.6 }}>
                        {edu.location}
                      </span>
                    )}
                    {edu.field && (
                      <p style={{ fontSize: educationBodySizes.baseText, color: educationStyling.bodyColor, margin: '2px 0 0 0', lineHeight: 1.5 }}>
                        {edu.field}
                      </p>
                    )}
                    {edu.keyCourses && edu.keyCourses.length > 0 && (
                      <p style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor, opacity: 0.7, marginTop: '3px' }}>
                        <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCourses')}:</span>{' '}
                        {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {edu.descriptions && edu.descriptions.length > 0 && (
                      <BulletList
                        items={edu.descriptions.filter(d => d?.description?.trim()).map(d => d!.description!.trim())}
                        color={educationStyling.bodyColor}
                        sizePx={educationBodySizes.sm}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "workExperience":
        return workExperience && workExperience.length > 0 && workExperience.some(e => e.position || e.company) ? (
          <div key="workExperience">
            <SectionHeading label={t('resume.sections.experience').toUpperCase()} color={sectionHeadingColor} sizePx={workExperienceTitleSizes.heading} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {workExperience.map((exp, index) => {
                if (!exp.position && !exp.company) return null;
                const dateRange = formatDateRangeStar(exp.startDate, exp.endDate);
                const responsibilities = getWorkExperienceBullets(exp);
                return (
                  <div key={index}>
                    {/* Company line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '1px' }}>
                      <span style={{ fontSize: workExperienceBodySizes.baseText, fontWeight: 700, color: workExperienceStyling.bodyColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        {exp.company ? (
                          <ProjectLinkedTitle
                            name={exp.company}
                            link={exp.link}
                            anchorStyle={{
                              fontSize: workExperienceBodySizes.baseText,
                              fontWeight: 700,
                              color: workExperienceStyling.bodyColor,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                            }}
                            inheritColor
                          />
                        ) : (
                          exp.position
                        )}
                      </span>
                      {exp.location && (
                        <span style={{ fontSize: workExperienceBodySizes.xs, color: workExperienceStyling.bodyColor, opacity: 0.6, flexShrink: 0 }}>
                          {exp.location}
                        </span>
                      )}
                    </div>
                    {/* Position + date line */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: workExperienceBodySizes.baseText, fontStyle: 'italic', color: workExperienceStyling.bodyColor, opacity: 0.8 }}>
                        {exp.position || exp.company}
                      </span>
                      {dateRange && <DateBadge text={dateRange} color={workExperienceStyling.bodyColor} />}
                    </div>
                    {responsibilities.length > 0 && (
                      <BulletList items={responsibilities} color={workExperienceStyling.bodyColor} sizePx={workExperienceBodySizes.sm} />
                    )}
                    {exp.competencies && exp.competencies.length > 0 && (
                      <p style={{ fontSize: workExperienceBodySizes.xs, color: workExperienceStyling.bodyColor, opacity: 0.7, marginTop: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCompetencies')}:</span>{' '}
                        {exp.competencies.map(c => typeof c === 'string' ? c : c.competency).filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "projects":
        return projects && projects.length > 0 && projects.some(p => p.name) ? (
          <div key="projects">
            <SectionHeading label={t('resume.sections.projects').toUpperCase()} color={sectionHeadingColor} sizePx={projectsTitleSizes.heading} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((proj, index) => {
                if (!proj.name) return null;
                const dateRange = formatDateRangeStar(proj.startDate, proj.endDate);
                const technologies = proj.technologies
                  ? proj.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean)
                  : [];
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: projectsBodySizes.baseText, fontWeight: 700, color: projectsStyling.bodyColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        <ProjectLinkedTitle
                          name={proj.name}
                          link={proj.link}
                          anchorStyle={{ textUnderlineOffset: '2px' }}
                        />
                      </span>
                      {dateRange && <DateBadge text={dateRange} color={projectsStyling.bodyColor} />}
                    </div>
                    {proj.description && (
                      <p style={{ fontSize: projectsBodySizes.baseText, color: projectsStyling.bodyColor, lineHeight: 1.6, margin: '2px 0', wordBreak: 'break-word' }}>
                        {proj.description}
                      </p>
                    )}
                    {proj.highlights && proj.highlights.length > 0 && (
                      <BulletList
                        items={proj.highlights.filter(h => h.highlight).map(h => h.highlight!)}
                        color={projectsStyling.bodyColor}
                        sizePx={projectsBodySizes.baseText}
                      />
                    )}
                    {technologies.length > 0 && (
                      <p style={{ fontSize: projectsBodySizes.xs, color: sectionHeadingColor, opacity: 0.65, marginTop: '4px', letterSpacing: '0.03em' }}>
                        {technologies.join(' · ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "certificates":
        return certificates && certificates.length > 0 && certificates.some(c => c.name) ? (
          <div key="certificates">
            <SectionHeading label={t('resume.sections.certifications').toUpperCase()} color={sectionHeadingColor} sizePx={certificatesTitleSizes.heading} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {certificates.map((cert, index) => {
                if (!cert.name) return null;
                const dateRange = formatDateRangeStar(cert.issueDate, cert.expirationDate);
                return (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: certificatesBodySizes.baseText, color: certificatesStyling.bodyColor, fontWeight: 600 }}>
                        {hasWebLink(cert.url) ? (
                          <a
                            href={normalizeExternalUrl(cert.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                          >
                            {cert.name}
                          </a>
                        ) : (
                          cert.name
                        )}
                      </span>
                      {cert.organization && (
                        <span style={{ fontSize: certificatesBodySizes.xs, color: certificatesStyling.bodyColor, opacity: 0.7 }}>{', '}{cert.organization}</span>
                      )}
                      {cert.credentialId && (
                        <span style={{ fontSize: certificatesBodySizes.xs, color: certificatesStyling.bodyColor, opacity: 0.55, marginLeft: '6px' }}>
                          #{cert.credentialId}
                        </span>
                      )}
                    </div>
                    {(dateRange || cert.issueDate) && (
                      <DateBadge text={dateRange || cert.issueDate || ''} color={certificatesStyling.bodyColor} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "skills":
        return skills && skills.length > 0 && skills.some(s => s.skill) ? (
          <div key="skills">
            <SectionHeading label={t('resume.sections.skills').toUpperCase()} color={sectionHeadingColor} sizePx={skillsTitleSizes.heading} />
            <p style={{ fontSize: skillsBodySizes.sm, color: skillsStyling.bodyColor, lineHeight: 1.8, margin: 0, wordBreak: 'break-word' }}>
              <span style={{ fontWeight: 700, marginRight: '6px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: skillsBodySizes.xs }}>
                {t('resume.sections.skills')}:
              </span>
              {skills.filter(s => s.skill).map((s, i, arr) => (
                <span key={i}>
                  {s.skill}
                  {i < arr.length - 1 && <span style={{ opacity: 0.35, margin: '0 5px' }}>·</span>}
                </span>
              ))}
            </p>
          </div>
        ) : null;

      case "languages":
        return languages && languages.length > 0 && languages.some(l => l.language) ? (
          <div key="languages">
            <SectionHeading label={t('resume.sections.languages').toUpperCase()} color={sectionHeadingColor} sizePx={languagesTitleSizes.heading} />
            <p style={{ fontSize: languagesBodySizes.sm, color: languagesStyling.bodyColor, lineHeight: 1.8, margin: 0, wordBreak: 'break-word' }}>
              <span style={{ fontWeight: 700, marginRight: '6px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: languagesBodySizes.xs }}>
                {t('resume.sections.languages')}:
              </span>
              {languages.filter(l => l.language).map((lang, index, arr) => (
                <span key={index}>
                  <span style={{ fontWeight: 600 }}>{lang.language}</span>
                  {lang.proficiency && (
                    <span style={{ opacity: 0.65, fontStyle: 'italic' }}> — {formatProficiency(t, lang.proficiency)}</span>
                  )}
                  {index < arr.length - 1 && <span style={{ opacity: 0.35, margin: '0 5px' }}>·</span>}
                </span>
              ))}
            </p>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests && personalInfo.interests.length > 0 && personalInfo.interests.some(i => i.interest) ? (
          <div key="interests">
            <SectionHeading label={t('resume.sections.interests').toUpperCase()} color={sectionHeadingColor} sizePx={personalInfoTitleSizes.heading} />
            <p style={{ fontSize: personalInfoBodySizes.sm, color: personalInfoBodyColor, lineHeight: 1.8, margin: 0, wordBreak: 'break-word' }}>
              <span style={{ fontWeight: 700, marginRight: '6px', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: personalInfoBodySizes.xs }}>
                {t('resume.sections.interests')}:
              </span>
              {personalInfo.interests.filter(i => i.interest).map(i => i.interest).join(' · ')}
            </p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim().toUpperCase();
  const professionalTitle = personalInfo.professionalTitle?.trim() || '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap');

        .resume-page-container {
          padding-top: 0 !important;
          padding-bottom: 32px !important;
        }

        @media print {
          .photo-placeholder { display: none !important; }
          @page {
            size: A4;
            margin: 0;
            background: white !important;
          }
          html, body { background: white !important; }
          .resume-page-container {
            background: white !important;
            width: 210mm;
            margin: 0 auto;
          }
          div[style*="margin-bottom"], div[style*="gap"] {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .resume-spacer {
            flex: 1 1 auto !important;
            min-height: 0 !important;
          }
        }
      `}</style>

      <div
        className="resume-page-container bg-background text-foreground mx-auto"
        style={{ fontFamily: fontFamily, fontSize: sizes.base, maxWidth: '820px', overflow: 'visible' }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{
          padding: '28px 32px 20px 32px',
          marginBottom: '24px',
          position: 'relative',
          borderBottom: `2px solid ${sectionHeadingColor}`,
        }}>
          {/* Top row: name block + photo */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name */}
              {fullName ? (
              <h1 style={{
                fontSize: sizes.name,
                fontWeight: titleBold ? 900 : 700,
                color: linkColor,
                letterSpacing: '0.06em',
                lineHeight: 1.05,
                margin: '0 0 6px 0',
                fontFamily: fontFamily,
              }}>
                {fullName}
              </h1>
              ) : null}
              {/* Professional title */}
              {professionalTitle && (
                <p style={{
                  fontSize: sizes.title,
                  color: titleColor,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  margin: 0,
                  opacity: 0.85,
                  fontStyle: 'italic',
                }}>
                  {professionalTitle}
                </p>
              )}
            </div>

            {/* Profile photo — only when set */}
            {personalInfo.profileImage?.trim() ? (
              <div style={{
                flexShrink: 0,
                width: '88px',
                height: '88px',
                overflow: 'hidden',
                border: `2px solid ${sectionHeadingColor}`,
              }}>
                <img
                  src={personalInfo.profileImage}
                  alt={`${personalInfo.firstName} ${personalInfo.lastName}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}
          </div>

          {/* Contact row — two balanced groups separated by a faint rule */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '6px 20px',
            paddingTop: '10px',
            borderTop: `0.5px solid ${sectionHeadingColor}25`,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
              {personalInfo.phone?.trim() && renderContactIcon(Phone, personalInfo.phone, `tel:${personalInfo.phone}`)}
              {personalInfo.email?.trim() && renderContactIcon(Mail, personalInfo.email, `mailto:${personalInfo.email}`)}
              {personalInfo.location?.trim() && renderContactIcon(MapPin, personalInfo.location)}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
              {personalInfo.linkedin?.trim() && renderContactIcon(Linkedin, personalInfo.linkedin, personalInfo.linkedin, t('resume.contactLinkShort.linkedin'))}
              {personalInfo.github?.trim() && renderContactIcon(Github, personalInfo.github, personalInfo.github, t('resume.contactLinkShort.github'))}
              {personalInfo.website?.trim() && renderContactIcon(Globe, personalInfo.website, personalInfo.website, t('resume.contactLinkShort.website'))}
            </div>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {orderedSections.map(section => renderSection(section))}
        </div>

        {/* Spacer */}
        <div aria-hidden="true" className="resume-spacer" style={{ flex: '1 1 auto', minHeight: 0 }} />

        {/* Print page numbers */}
        <style>{`
          .page-number-footer { display: none; }
          @media print {
            @page {
              margin-bottom: 18mm;
              @bottom-center {
                content: counter(page);
                font-size: 9px;
                color: #9ca3af;
              }
            }
            .page-number-footer { display: none !important; }
          }
        `}</style>
        <div className="page-number-footer" />
      </div>
    </>
  );
};