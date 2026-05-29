import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";

interface LatexTemplateProps {
  data: CVFormData;
}

export const LatexTemplate = ({ data }: LatexTemplateProps) => {
  const { t } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "skills", "projects", "education", "workExperience", "certificates", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  // Extract styling options with defaults
  const fontFamily = styling?.fontFamily || "'DM Sans', 'Segoe UI', sans-serif";
  const fontSizeInput = styling?.fontSize || "medium";
  const fontSize: "small" | "medium" | "large" =
    (fontSizeInput === "small" || fontSizeInput === "medium" || fontSizeInput === "large")
      ? fontSizeInput
      : "medium";
  const titleColor = styling?.titleColor || RESUME_TITLE_GRAY;
  const titleBold = styling?.titleBold ?? true;
  const headingColor = styling?.headingColor || RESUME_TITLE_GRAY;
  const headingBold = styling?.headingBold ?? true;
  const textColor = styling?.textColor || RESUME_BODY_GRAY;
  const linkColor = styling?.linkColor || RESUME_ACCENT_BLUE;
  const sectionHeadingColor = linkColor;

  const personalInfoSectionStyling = styling?.sectionStyling?.personalInfo;
  const personalInfoTitleColor = personalInfoSectionStyling?.titleColor ?? titleColor;
  const personalInfoTitleSize = personalInfoSectionStyling?.titleSize || fontSize;
  const personalInfoBodyColor = personalInfoSectionStyling?.bodyColor || textColor;
  const personalInfoBodySize = personalInfoSectionStyling?.bodySize || fontSize;

  const fontSizeMap = {
    small: {
      base: '11.5px',
      name: '22px',
      title: '12px',
      heading: '9.5px',
      body: '11px',
      small: '10px',
      xs: '9px',
    },
    medium: {
      base: '13px',
      name: '26px',
      title: '13.5px',
      heading: '10px',
      body: '12.5px',
      small: '11px',
      xs: '10px',
    },
    large: {
      base: '15px',
      name: '30px',
      title: '15.5px',
      heading: '11px',
      body: '14.5px',
      small: '13px',
      xs: '11.5px',
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

  const formatDateRangeLatex = (startDate: string | undefined, endDate: string | undefined): string => {
    if (!startDate && !endDate) return '';
    const formatDate = (dateStr: string | undefined): string => {
      if (!dateStr) return '';
      const match = dateStr.match(/^(\d{4})-(\d{2})$/);
      if (!match) return dateStr;
      const [, year, month] = match;
      return `${month}/${year}`;
    };
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : t('resume.fields.present');
    if (!start && !end) return '';
    if (!start) return end;
    return `${start} – ${end}`;
  };

  // ── Refined icon+text renderer ──────────────────────────────────────────
  const renderIconText = (Icon: any, text: string | undefined, url?: string, linkLabel?: string) => {
    if (!text) return null;

    let displayText = text;
    if (linkLabel) {
      displayText = linkLabel;
    } else if (url && url !== '#') {
      if (text.includes('linkedin.com')) {
        const match = text.match(/linkedin\.com\/in\/(.+)/i);
        displayText = match ? `linkedin.com/in/${match[1]}` : text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      } else if (text.startsWith('http')) {
        displayText = text.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
      }
    }

    let href: string | undefined;
    if (url && url !== '#') {
      if (url.startsWith('mailto:') || url.startsWith('tel:')) {
        href = url;
      } else {
        href = normalizeExternalUrl(url);
      }
    }

    const content = (
      <div className="flex items-center gap-1.5" style={{ marginBottom: '3px' }}>
        <Icon
          className="flex-shrink-0"
          style={{ width: '11px', height: '11px', color: sectionHeadingColor, opacity: 0.85 }}
        />
        <span style={{
          fontSize: personalInfoBodySizes.small,
          color: textColor,
          lineHeight: '1.35',
          letterSpacing: '0.01em',
        }}>
          {displayText}
        </span>
      </div>
    );

    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 block transition-opacity">
          {content}
        </a>
      );
    }
    return content;
  };

  // ── Section heading ─────────────────────────────────────────────────────
  const SectionHeading = ({ label, color, sizes: headingSizes }: { label: string; color: string; sizes: typeof fontSizeMap['medium'] }) => (
    <div className="flex items-center gap-2.5 mb-2" style={{ marginTop: '2px' }}>
      {/* Accent square */}
      <span style={{
        display: 'inline-block',
        width: '7px',
        height: '7px',
        backgroundColor: color,
        borderRadius: '1px',
        flexShrink: 0,
      }} />
      <h2 style={{
        fontSize: headingSizes.heading,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: color,
        textTransform: 'uppercase',
        flexShrink: 0,
        lineHeight: 1,
        margin: 0,
      }}>
        {label}
      </h2>
      <div style={{
        flex: 1,
        height: '0.5px',
        backgroundColor: color,
        opacity: 0.3,
        marginTop: '1px',
      }} />
    </div>
  );

  // ── Date column ─────────────────────────────────────────────────────────
  const DateCol = ({ text, color, sizePx }: { text: string; color: string; sizePx: string }) => (
    <div style={{
      width: '14%',
      flexShrink: 0,
      fontSize: sizePx,
      color: color,
      opacity: 0.65,
      lineHeight: 1.4,
      paddingTop: '1px',
      letterSpacing: '0.01em',
    }}>
      {text}
    </div>
  );

  // ── Bullet list ─────────────────────────────────────────────────────────
  const BulletList = ({ items, color, sizePx }: { items: string[]; color: string; sizePx: string }) => (
    <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 4px 0' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: '6px', marginBottom: '2px' }}>
          <span style={{ color: sectionHeadingColor, fontSize: sizePx, lineHeight: 1.55, flexShrink: 0 }}>▸</span>
          <span style={{ fontSize: sizePx, color: color, lineHeight: 1.55, flex: 1, wordBreak: 'break-word' }}>{item}</span>
        </li>
      ))}
    </ul>
  );

  // ── Tech tag ────────────────────────────────────────────────────────────
  const TechTag = ({ label }: { label: string }) => (
    <span style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: '3px',
      fontSize: sizes.xs,
      fontFamily: "'JetBrains Mono', 'Fira Mono', 'Cascadia Code', monospace",
      color: sectionHeadingColor,
      backgroundColor: `${sectionHeadingColor}12`,
      border: `0.5px solid ${sectionHeadingColor}30`,
      lineHeight: 1.6,
      letterSpacing: '0.02em',
    }}>
      {label}
    </span>
  );

  // ── Render sections ─────────────────────────────────────────────────────
  const renderSection = (sectionKey: string) => {
    switch (sectionKey) {
      case "summary":
      case "skills":
        return null;

      case "projects":
        return projects && projects.length > 0 && projects.some(p => p.name) ? (
          <div key="projects" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.projects').toUpperCase()} color={sectionHeadingColor} sizes={projectsTitleSizes} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {projects.map((proj, index) => {
                if (!proj.name) return null;
                const dateRange = formatDateRangeLatex(proj.startDate, proj.endDate);
                const technologies = proj.technologies
                  ? proj.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean)
                  : [];

                return (
                  <div key={index} style={{ display: 'flex', gap: '10px' }}>
                    <DateCol text={dateRange} color={projectsStyling.bodyColor} sizePx={projectsBodySizes.small} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: projectsBodySizes.body, fontWeight: 700, color: projectsStyling.bodyColor }}>
                          <ProjectLinkedTitle
                            name={proj.name}
                            link={proj.link}
                            anchorStyle={{ textUnderlineOffset: '2px' }}
                          />
                        </span>
                      </div>
                      {proj.description && (
                        <p style={{ fontSize: projectsBodySizes.body, color: projectsStyling.bodyColor, lineHeight: 1.55, marginBottom: '2px', wordBreak: 'break-word' }}>
                          {proj.description}
                        </p>
                      )}
                      {proj.highlights && proj.highlights.length > 0 && (
                        <BulletList
                          items={proj.highlights.filter(h => h.highlight).map(h => h.highlight!)}
                          color={projectsStyling.bodyColor}
                          sizePx={projectsBodySizes.body}
                        />
                      )}
                      {technologies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                          {technologies.map((tech, i) => <TechTag key={i} label={tech} />)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "education":
        return education && education.length > 0 && education.some(e => e.degree || e.institution) ? (
          <div key="education" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.education').toUpperCase()} color={sectionHeadingColor} sizes={educationTitleSizes} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {education.map((edu, index) => {
                if (!edu.degree && !edu.institution) return null;
                const dateRange = formatDateRangeLatex(edu.startDate, edu.endDate);
                return (
                  <div key={index} style={{ display: 'flex', gap: '10px' }}>
                    <DateCol text={dateRange} color={educationStyling.bodyColor} sizePx={educationBodySizes.small} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '1px' }}>
                        <span style={{ fontSize: educationBodySizes.body, fontWeight: 700, color: educationStyling.bodyColor }}>
                          {edu.degree || ''}
                        </span>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: educationBodySizes.body, fontWeight: 600, color: educationStyling.bodyColor }}>
                            <ProjectLinkedTitle
                              name={edu.institution || ''}
                              link={edu.link}
                              anchorStyle={{ fontSize: educationBodySizes.body, fontWeight: 600, color: educationStyling.bodyColor }}
                              inheritColor
                            />
                          </span>
                          {edu.location && (
                            <span style={{ display: 'block', fontSize: educationBodySizes.xs, color: educationStyling.bodyColor, opacity: 0.65 }}>
                              {edu.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {edu.field && (
                        <p style={{ fontSize: educationBodySizes.body, color: educationStyling.bodyColor, lineHeight: 1.5, marginBottom: '2px', fontStyle: 'italic', opacity: 0.85 }}>
                          {edu.field}
                        </p>
                      )}
                      {edu.keyCourses && edu.keyCourses.length > 0 && (
                        <p style={{ fontSize: educationBodySizes.xs, color: educationStyling.bodyColor, opacity: 0.75, marginTop: '3px' }}>
                          <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCourses')}:</span>{' '}
                          {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {edu.descriptions && edu.descriptions.length > 0 && (
                        <BulletList
                          items={edu.descriptions.filter(d => d?.description?.trim()).map(d => d!.description!.trim())}
                          color={educationStyling.bodyColor}
                          sizePx={educationBodySizes.body}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "workExperience":
        return workExperience && workExperience.length > 0 && workExperience.some(e => e.position || e.company) ? (
          <div key="workExperience" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.experience').toUpperCase()} color={sectionHeadingColor} sizes={workExperienceTitleSizes} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {workExperience.map((exp, index) => {
                if (!exp.position && !exp.company) return null;
                const dateRange = formatDateRangeLatex(exp.startDate, exp.endDate);
                const responsibilities = exp.responsibilities
                  ? exp.responsibilities.filter(r => r.responsibility).map(r => r.responsibility!)
                  : exp.description
                    ? exp.description.split('\n').filter(line => line.trim())
                    : [];
                const technologies = exp.technologies
                  ? exp.technologies.map(t => typeof t === 'string' ? t : t.technology).filter(Boolean)
                  : [];

                return (
                  <div key={index} style={{ display: 'flex', gap: '10px' }}>
                    <DateCol text={dateRange} color={workExperienceStyling.bodyColor} sizePx={workExperienceBodySizes.small} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: workExperienceBodySizes.body, fontWeight: 700, color: workExperienceStyling.bodyColor }}>
                          {exp.position || ''}
                        </span>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: workExperienceBodySizes.body, fontWeight: 600, color: workExperienceStyling.bodyColor }}>
                            <ProjectLinkedTitle
                              name={exp.company || ''}
                              link={exp.link}
                              anchorStyle={{ fontSize: workExperienceBodySizes.body, fontWeight: 600, color: workExperienceStyling.bodyColor }}
                              inheritColor
                            />
                          </span>
                          {exp.location && (
                            <span style={{ display: 'block', fontSize: workExperienceBodySizes.xs, color: workExperienceStyling.bodyColor, opacity: 0.65 }}>
                              {exp.location}
                            </span>
                          )}
                        </div>
                      </div>
                      {responsibilities.length > 0 && (
                        <BulletList items={responsibilities} color={workExperienceStyling.bodyColor} sizePx={workExperienceBodySizes.body} />
                      )}
                      {technologies.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '5px' }}>
                          {technologies.map((tech, i) => <TechTag key={i} label={tech} />)}
                        </div>
                      )}
                      {exp.competencies && exp.competencies.length > 0 && (
                        <p style={{ fontSize: sizes.xs, color: workExperienceStyling.bodyColor, opacity: 0.8, marginTop: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCompetencies')}:</span>{' '}
                          {exp.competencies.map(c => typeof c === 'string' ? c : c.competency).filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "certificates":
        return certificates && certificates.length > 0 && certificates.some(c => c.name) ? (
          <div key="certificates" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.certifications').toUpperCase()} color={sectionHeadingColor} sizes={certificatesTitleSizes} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {certificates.map((cert, index) => {
                if (!cert.name) return null;
                const dateRange = formatDateRangeLatex(cert.issueDate, cert.expirationDate);
                return (
                  <div key={index} style={{ display: 'flex', gap: '10px' }}>
                    <DateCol text={dateRange || cert.issueDate || ''} color={certificatesStyling.bodyColor} sizePx={certificatesBodySizes.small} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: certificatesBodySizes.body, fontWeight: 700, color: certificatesStyling.bodyColor }}>
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
                        <span style={{ fontSize: certificatesBodySizes.small, fontWeight: 600, color: certificatesStyling.bodyColor, flexShrink: 0 }}>{cert.organization || ''}</span>
                      </div>
                      {cert.credentialId && (
                        <p style={{ fontSize: certificatesBodySizes.xs, color: certificatesStyling.bodyColor, opacity: 0.65, marginTop: '1px' }}>
                          {t('resume.fields.credentialId')}: {cert.credentialId}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

      case "languages":
        return languages && languages.length > 0 && languages.some(l => l.language) ? (
          <div key="languages" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.languages').toUpperCase()} color={sectionHeadingColor} sizes={languagesTitleSizes} />
            <div style={{ paddingLeft: '14%', display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
              {languages.filter(l => l.language).map((lang, index) => (
                <span key={index} style={{ fontSize: languagesBodySizes.body, color: languagesStyling.bodyColor, lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 700 }}>{lang.language}</span>
                  {lang.proficiency && (
                    <span style={{ opacity: 0.65, fontStyle: 'italic' }}> — {formatProficiency(t, lang.proficiency)}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests && personalInfo.interests.length > 0 && personalInfo.interests.some(i => i.interest) ? (
          <div key="interests" style={{ marginBottom: '18px' }}>
            <SectionHeading label={t('resume.sections.interests').toUpperCase()} color={sectionHeadingColor} sizes={personalInfoTitleSizes} />
            <p style={{ paddingLeft: '14%', fontSize: personalInfoBodySizes.body, color: personalInfoBodyColor, lineHeight: 1.7, margin: 0 }}>
              {personalInfo.interests.filter(i => i.interest).map(i => i.interest).join(' · ')}
            </p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const fullName = `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim();
  const professionalTitle = personalInfo.professionalTitle?.trim() || '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@600;700&display=swap');

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
          html, body {
            background: white !important;
          }
          .resume-page-container {
            background: white !important;
            width: 210mm;
            margin: 0 auto;
          }
          div[style*="margin-bottom"] {
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
        style={{
          fontFamily: fontFamily,
          fontSize: sizes.base,
          maxWidth: '820px',
          overflow: 'visible',
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${sectionHeadingColor}0a 0%, ${sectionHeadingColor}05 100%)`,
          borderBottom: `2px solid ${sectionHeadingColor}`,
          padding: '28px 32px 22px 32px',
          marginBottom: '22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>

            {/* Profile image — only when set */}
            {personalInfo.profileImage?.trim() ? (
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: `2px solid ${sectionHeadingColor}30`,
                  boxShadow: `0 2px 12px ${sectionHeadingColor}20`,
                }}>
                  <img
                    src={personalInfo.profileImage}
                    alt={`${fullName}${personalInfo.professionalTitle ? `, ${personalInfo.professionalTitle}` : ''}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%' }}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            ) : null}

            {/* Name + title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {fullName ? (
              <h1 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: personalInfoTitleSizes.name,
                fontWeight: titleBold ? 700 : 600,
                color: linkColor,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                margin: '0 0 5px 0',
                textTransform: 'uppercase',
              }}>
                {fullName}
              </h1>
              ) : null}
              {professionalTitle ? (
              <p style={{
                fontSize: personalInfoBodySizes.title,
                color: titleColor,
                fontWeight: 500,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                margin: 0,
                opacity: 0.9,
              }}>
                {professionalTitle}
              </p>
              ) : null}
            </div>

            {/* Contact info — two column */}
            {(personalInfo.website?.trim() || personalInfo.phone?.trim() || personalInfo.location?.trim() || personalInfo.email?.trim() || personalInfo.github?.trim() || personalInfo.linkedin?.trim()) && (
            <div style={{
              flexShrink: 0,
              display: 'flex',
              gap: '18px',
              alignItems: 'flex-start',
              paddingTop: '4px',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {personalInfo.website?.trim() && renderIconText(Globe, personalInfo.website, personalInfo.website, t('resume.contactLinkShort.website'))}
                {personalInfo.phone?.trim() && renderIconText(Phone, personalInfo.phone)}
                {personalInfo.location?.trim() && renderIconText(MapPin, personalInfo.location)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {personalInfo.email?.trim() && renderIconText(Mail, personalInfo.email, `mailto:${personalInfo.email}`)}
                {personalInfo.github?.trim() && renderIconText(Github, personalInfo.github, personalInfo.github, t('resume.contactLinkShort.github'))}
                {personalInfo.linkedin?.trim() && renderIconText(Linkedin, personalInfo.linkedin, personalInfo.linkedin, t('resume.contactLinkShort.linkedin'))}
              </div>
            </div>
            )}
          </div>
        </div>

        {/* ── BODY ────────────────────────────────────────────────────── */}
        <div style={{ padding: '0 32px' }}>

          {/* Summary + Skills */}
          {(personalInfo.summary || (skills && skills.length > 0 && skills.some(s => s.skill))) && (
            <div style={{ marginBottom: '22px' }}>
              {personalInfo.summary && personalInfo.summary.trim() && (
                <div style={{ marginBottom: '14px' }}>
                  <SectionHeading label={t('resume.sections.summary').toUpperCase()} color={sectionHeadingColor} sizes={personalInfoTitleSizes} />
                  <p style={{
                    fontSize: personalInfoBodySizes.base,
                    color: personalInfoBodyColor,
                    lineHeight: 1.75,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    paddingLeft: '14%',
                    margin: 0,
                  }}>
                    {personalInfo.summary.trim()}
                  </p>
                </div>
              )}

              {skills && skills.length > 0 && skills.some(s => s.skill) && (
                <div>
                  <SectionHeading label={t('resume.sections.skills').toUpperCase()} color={sectionHeadingColor} sizes={skillsTitleSizes} />
                  <div style={{ paddingLeft: '14%', display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: skillsBodySizes.xs,
                      fontWeight: 700,
                      color: skillsStyling.bodyColor,
                      flexShrink: 0,
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      {t('resume.sections.skills')}:
                    </span>
                    <span style={{ fontSize: skillsBodySizes.xs, color: skillsStyling.bodyColor, lineHeight: 1.8 }}>
                      {skills.filter(s => s.skill).map((s, i, arr) => (
                        <span key={i}>
                          {s.skill}
                          {i < arr.length - 1 && (
                            <span style={{ color: sectionHeadingColor, padding: '0 5px', opacity: 0.5 }}>·</span>
                          )}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ordered sections */}
          <div>
            {orderedSections
              .filter(s => s !== 'summary' && s !== 'skills')
              .map(section => renderSection(section))}
          </div>
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