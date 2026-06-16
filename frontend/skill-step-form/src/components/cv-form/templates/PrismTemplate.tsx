import { CVFormData } from "../types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Calendar, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDateRange } from "@/lib/dateFormatter";
import { formatProficiency } from "@/lib/languageProficiency";
import { hasWebLink, normalizeExternalUrl } from "@/lib/contactLinkUtils";
import { getRenderableSkillGroups } from "@/lib/skillGroups";
import { ProjectLinkedTitle } from "@/components/cv-form/ProjectLinkedTitle";
import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY } from "@/lib/resumeTemplatePalette";

interface PrismTemplateProps {
  data: CVFormData;
}

/** Sections that appear in the left sidebar */
const SIDEBAR_KEYS = new Set(["skills", "languages", "interests", "certificates"]);

export const PrismTemplate = ({ data }: PrismTemplateProps) => {
  const { t, language } = useLanguage();
  const { personalInfo, workExperience, education, projects, certificates, languages, skills, skillGroups, sectionOrder, styling } = data;

  const defaultOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const orderedSections = sectionOrder || defaultOrder;

  const sidebarSections = orderedSections.filter(k => SIDEBAR_KEYS.has(k));
  const mainSections    = orderedSections.filter(k => !SIDEBAR_KEYS.has(k) && k !== "summary");

  const fontFamily      = styling?.fontFamily || "Inter";
  const fontSizeInput   = styling?.fontSize || "medium";
  const fontSize: "small" | "medium" | "large" =
    fontSizeInput === "small" || fontSizeInput === "medium" || fontSizeInput === "large"
      ? fontSizeInput : "medium";

  const titleBold    = styling?.titleBold ?? true;
  const headingBold  = styling?.headingBold ?? true;
  const textColor    = styling?.textColor || RESUME_BODY_GRAY;
  const linkColor    = styling?.linkColor || RESUME_ACCENT_BLUE;
  const headingColor = styling?.headingColor || RESUME_ACCENT_BLUE;

  const darkBlock  = linkColor;
  const lightBlock = "#f1f5f9";
  const nameColor  = "#1e3a8a";

  const fontSizeMap = {
    small:  { xs: '0.625rem',  sm: '0.75rem',  base: '0.875rem', baseText: '0.6875rem', heading: '0.8125rem', name: '1.75rem',  pill: '0.6rem'    },
    medium: { xs: '0.75rem',   sm: '0.875rem', base: '1rem',     baseText: '0.8125rem', heading: '0.9375rem', name: '2.25rem',  pill: '0.6875rem' },
    large:  { xs: '0.875rem',  sm: '1rem',     base: '1.125rem', baseText: '0.9375rem', heading: '1.0625rem', name: '2.75rem',  pill: '0.75rem'   },
  };
  const sizes = fontSizeMap[fontSize];

  const getSectionStyling = (sectionName: string) => {
    const ss = styling?.sectionStyling?.[sectionName];
    return {
      titleColor: ss?.titleColor || headingColor,
      bodyColor:  ss?.bodyColor  || textColor,
      titleSize:  ss?.titleSize  || fontSize,
      bodySize:   ss?.bodySize   || fontSize,
    };
  };

  const groupedSkills = getRenderableSkillGroups(skillGroups, skills, t('resume.sections.skills'));

  const SectionHeading = ({ label, color }: { label: string; color: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', borderBottom: `1px solid ${color}30`, paddingBottom: '4px' }}>
      <h2 style={{ fontSize: sizes.heading, fontWeight: headingBold ? '700' : '600', color, letterSpacing: '0.04em', margin: 0 }}>
        {label}
      </h2>
    </div>
  );

  const renderSidebarSection = (sectionKey: string) => {
    const ss = getSectionStyling(sectionKey);
    const bodySizes = fontSizeMap[ss.bodySize];

    switch (sectionKey) {
      case "skills":
        return groupedSkills.length > 0 ? (
          <div key="skills" data-resume-section="true">
            <SectionHeading label={t('resume.sections.skills')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {groupedSkills.map((group, gi) => (
                <div key={gi}>
                  {group.name && (
                    <span style={{ fontSize: bodySizes.xs, fontWeight: 600, color: ss.bodyColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{group.name}</span>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: group.name ? '3px' : 0 }}>
                    {group.skills.map((s, si) => s && (
                      <span key={si} style={{ fontSize: bodySizes.xs, background: `${darkBlock}14`, color: darkBlock, border: `1px solid ${darkBlock}28`, borderRadius: '3px', padding: '1px 6px' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "languages":
        return languages && languages.length > 0 && languages.some(l => l.language) ? (
          <div key="languages" data-resume-section="true">
            <SectionHeading label={t('resume.sections.languages')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {languages.filter(l => l.language).map((lang, i) => (
                <span key={i} style={{ fontSize: bodySizes.sm, color: ss.bodyColor }}>
                  <strong>{lang.language}</strong>
                  {lang.proficiency && <span style={{ opacity: 0.7 }}> — {formatProficiency(t, lang.proficiency)}</span>}
                </span>
              ))}
            </div>
          </div>
        ) : null;

      case "interests":
        return personalInfo.interests && personalInfo.interests.some(i => i.interest) ? (
          <div key="interests" data-resume-section="true">
            <SectionHeading label={t('resume.sections.interests')} color={ss.titleColor} />
            <p style={{ fontSize: sizes.baseText, color: textColor, margin: 0, lineHeight: '1.6' }}>
              {personalInfo.interests.filter(i => i.interest).map(i => i.interest).join(' · ')}
            </p>
          </div>
        ) : null;

      case "certificates":
        return certificates && certificates.length > 0 && certificates.some(c => c.name) ? (
          <div key="certificates" data-resume-section="true">
            <SectionHeading label={t('resume.sections.certifications')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {certificates.map((cert, i) => cert.name && (
                <div key={i}>
                  <span style={{ fontSize: bodySizes.xs, fontWeight: 600, color: ss.bodyColor }}>{cert.name}</span>
                  {cert.organization && <p style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.7, margin: '1px 0 0' }}>{cert.organization}</p>}
                  {cert.issueDate && <p style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.55, margin: '1px 0 0', fontStyle: 'italic' }}>{cert.issueDate}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const renderMainSection = (sectionKey: string) => {
    const ss = getSectionStyling(sectionKey);
    const bodySizes = fontSizeMap[ss.bodySize];

    switch (sectionKey) {
      case "summary":
        return personalInfo.summary?.trim() ? (
          <div key="summary" data-resume-section="true">
            <SectionHeading label={t('resume.sections.professionalSummary')} color={ss.titleColor} />
            <p style={{ color: ss.bodyColor, fontSize: sizes.baseText, lineHeight: '1.65', margin: 0 }}>
              {personalInfo.summary.trim()}
            </p>
          </div>
        ) : null;

      case "workExperience":
        return workExperience?.some(e => e.position || e.company) ? (
          <div key="workExperience" data-resume-section="true">
            <SectionHeading label={t('resume.sections.experience')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {workExperience.map((exp, i) => (exp.position || exp.company) && (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 700, fontSize: bodySizes.base, color: ss.bodyColor, margin: 0 }}>{exp.position}</h3>
                      <p style={{ fontSize: bodySizes.sm, color: ss.bodyColor, opacity: 0.8, fontStyle: 'italic', margin: 0 }}>
                        <ProjectLinkedTitle name={exp.company || ""} link={exp.link} className="italic" anchorStyle={{ color: ss.bodyColor }} inheritColor />
                        {exp.location && ` • ${exp.location}`}
                      </p>
                    </div>
                    {(exp.startDate || exp.endDate) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.65, fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <Calendar style={{ width: '10px', height: '10px' }} />
                        <span>{formatDateRange(exp.startDate, exp.endDate, t('resume.fields.present'), language)}</span>
                      </div>
                    )}
                  </div>
                  {exp.description && <p style={{ color: ss.bodyColor, fontSize: bodySizes.sm, lineHeight: '1.6', marginTop: '4px' }}>{exp.description}</p>}
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul style={{ fontSize: bodySizes.sm, color: ss.bodyColor, lineHeight: '1.6', marginTop: '4px', paddingLeft: 0, listStyle: 'none' }}>
                      {exp.responsibilities.map((r, ri) => r.responsibility && (
                        <li key={ri} style={{ display: 'flex', gap: '8px' }}><span style={{ opacity: 0.4 }}>•</span>{r.responsibility}</li>
                      ))}
                    </ul>
                  )}
                  {exp.technologies && exp.technologies.some(t => t.technology) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                      {exp.technologies.filter(t => t.technology).map((tech, ti) => (
                        <span key={ti} style={{ fontSize: bodySizes.xs, background: `${darkBlock}14`, color: darkBlock, border: `1px solid ${darkBlock}28`, borderRadius: '3px', padding: '1px 6px' }}>
                          {tech.technology}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "education":
        return education?.some(e => e.degree || e.institution) ? (
          <div key="education" data-resume-section="true">
            <SectionHeading label={t('resume.sections.education')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {education.map((edu, i) => (edu.degree || edu.institution) && (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 700, fontSize: bodySizes.base, color: ss.bodyColor, margin: 0 }}>{edu.degree}</h3>
                      <p style={{ fontSize: bodySizes.sm, color: ss.bodyColor, opacity: 0.8, margin: 0 }}>
                        {edu.institution}{edu.location && ` • ${edu.location}`}
                      </p>
                    </div>
                    {(edu.startDate || edu.endDate) && (
                      <span style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.6, fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatDateRange(edu.startDate, edu.endDate, t('resume.fields.present'), language)}
                      </span>
                    )}
                  </div>
                  {edu.field && <p style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.65, margin: '2px 0 0' }}>{edu.field}</p>}
                  {edu.keyCourses && edu.keyCourses.length > 0 && (
                    <p style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.8, margin: '3px 0 0' }}>
                      <span style={{ fontWeight: 600 }}>{t('resume.labels.keyCourses')}:</span>{' '}
                      {edu.keyCourses.map(c => typeof c === 'string' ? c : c.course).filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {edu.descriptions && edu.descriptions.length > 0 && (
                    <ul style={{ fontSize: bodySizes.sm, color: ss.bodyColor, lineHeight: '1.6', marginTop: '4px', paddingLeft: 0, listStyle: 'none' }}>
                      {edu.descriptions.filter(d => d?.description?.trim()).map((d, di) => (
                        <li key={di} style={{ display: 'flex', gap: '8px' }}>
                          <span style={{ opacity: 0.4 }}>•</span>
                          <span>{d.description!.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      case "projects":
        return projects && projects.length > 0 && projects.some(p => p.name) ? (
          <div key="projects" data-resume-section="true">
            <SectionHeading label={t('resume.sections.projects')} color={ss.titleColor} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {projects.map((proj, i) => proj.name && (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                    <h3 style={{ fontWeight: 700, fontSize: bodySizes.base, color: ss.bodyColor, margin: 0 }}>
                      <ProjectLinkedTitle name={proj.name} link={proj.link} anchorStyle={{ color: linkColor }} />
                    </h3>
                    {(proj.startDate || proj.endDate) && (
                      <span style={{ fontSize: bodySizes.xs, color: ss.bodyColor, opacity: 0.6, fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatDateRange(proj.startDate, proj.endDate, t('resume.fields.present'), language)}
                      </span>
                    )}
                  </div>
                  {proj.description && <p style={{ fontSize: bodySizes.sm, color: ss.bodyColor, lineHeight: '1.6', margin: '3px 0 0' }}>{proj.description}</p>}
                  {proj.technologies && proj.technologies.some(t => t.technology) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                      {proj.technologies.filter(t => t.technology).map((tech, ti) => (
                        <span key={ti} style={{ fontSize: bodySizes.xs, background: `${darkBlock}14`, color: darkBlock, border: `1px solid ${darkBlock}28`, borderRadius: '3px', padding: '1px 6px' }}>
                          {tech.technology}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  const hasProfileImage = !!personalInfo.profileImage?.trim();
  const hasContacts = personalInfo.email || personalInfo.phone || personalInfo.location ||
    personalInfo.linkedin || personalInfo.github || (personalInfo.website && hasWebLink(personalInfo.website));

  return (
    <div
      className="resume-page-container"
      style={{ fontFamily, background: '#ffffff', minHeight: '297mm', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* ── Geometric header ── */}
      <div style={{ position: 'relative', height: '200px', flexShrink: 0 }}>
        {/* Background panels — clipped inside overflow:hidden */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {/* Blue fills entire header */}
          <div style={{ position: 'absolute', inset: 0, background: darkBlock }} />
          {/* White panel clipped to the left side — diagonal runs from ~62% at top to ~44% at bottom */}
          <div style={{ position: 'absolute', inset: 0, background: '#ffffff', clipPath: 'polygon(0 0, 62% 0, 44% 100%, 0 100%)' }} />
          {/* Subtle prism stripe at the boundary for the geometric overlap effect */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.13)', clipPath: 'polygon(60% 0, 67% 0, 49% 100%, 42% 100%)' }} />
        </div>

        {/* Name + professional title + CV badge — left side, over the white panel */}
        <div style={{ position: 'absolute', left: '28px', top: '50%', transform: 'translateY(-50%)', zIndex: 2, maxWidth: hasProfileImage ? '48%' : '72%' }}>
          <h1 style={{ color: '#1f2937', fontWeight: titleBold ? '800' : '600', fontSize: sizes.name, lineHeight: '1.1', letterSpacing: '-0.02em', margin: 0 }}>
            {personalInfo.firstName} {personalInfo.lastName}
          </h1>
          {personalInfo.professionalTitle?.trim() && (
            <p style={{ color: '#6b7280', fontSize: sizes.sm, margin: '4px 0 0', lineHeight: 1.3 }}>
              {personalInfo.professionalTitle.trim()}
            </p>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', marginTop: '8px', background: nameColor, color: '#ffffff', fontSize: sizes.pill, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 13px', borderRadius: '20px', textTransform: 'uppercase' }}>
            CV
          </div>
        </div>

        {/* Circular profile photo — right side, in the blue panel */}
        {hasProfileImage && (
          <div style={{ position: 'absolute', left: '76%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 3 }}>
            <div style={{ width: '170px', height: '170px', borderRadius: '50%', border: '4px solid #ffffff', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
              <img
                src={personalInfo.profileImage}
                alt={`${personalInfo.firstName} ${personalInfo.lastName}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 20%' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column body ── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Left sidebar */}
        <div style={{ width: '35%', flexShrink: 0, background: `${darkBlock}07`, borderRight: `1px solid ${darkBlock}18`, padding: '20px 18px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* About me (summary) */}
          {personalInfo.summary?.trim() && (
            <div data-resume-section="true">
              <SectionHeading label={t('resume.sections.aboutMe')} color={headingColor} />
              <p style={{ fontSize: sizes.baseText, color: textColor, lineHeight: '1.65', margin: 0 }}>
                {personalInfo.summary.trim()}
              </p>
            </div>
          )}

          {/* Personal details (contacts) */}
          {hasContacts && (
            <div data-resume-section="true">
              <SectionHeading label={t('resume.sections.contact')} color={headingColor} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {personalInfo.location && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: sizes.xs, color: textColor }}>
                    <Home style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0, marginTop: '1px' }} />
                    <span>{personalInfo.location}</span>
                  </div>
                )}
                {personalInfo.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: sizes.xs, color: textColor }}>
                    <Phone style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0 }} />
                    <span>{personalInfo.phone}</span>
                  </div>
                )}
                {personalInfo.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: sizes.xs, color: textColor }}>
                    <Mail style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0 }} />
                    <span style={{ wordBreak: 'break-all' }}>{personalInfo.email}</span>
                  </div>
                )}
                {personalInfo.linkedin && (
                  <a href={normalizeExternalUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: sizes.xs, color: textColor, textDecoration: 'none' }}>
                    <Linkedin style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0 }} />
                    <span>{t('resume.contactLinkShort.linkedin')}</span>
                  </a>
                )}
                {personalInfo.github && (
                  <a href={normalizeExternalUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: sizes.xs, color: textColor, textDecoration: 'none' }}>
                    <Github style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0 }} />
                    <span>{t('resume.contactLinkShort.github')}</span>
                  </a>
                )}
                {personalInfo.website && hasWebLink(personalInfo.website) && (
                  <a href={normalizeExternalUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: sizes.xs, color: textColor, textDecoration: 'none' }}>
                    <Globe style={{ width: '11px', height: '11px', color: darkBlock, flexShrink: 0 }} />
                    <span>{t('resume.contactLinkShort.website')}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Skills, languages, interests, certificates */}
          {sidebarSections.map(section => renderSidebarSection(section))}
        </div>

        {/* Right main column */}
        <div style={{ flex: 1, minWidth: 0, padding: '20px 24px 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mainSections.map(section => renderMainSection(section))}
        </div>
      </div>

      {/* Page-fill spacer */}
      <div aria-hidden="true" className="resume-spacer" style={{ flex: '1 1 auto', minHeight: 0 }} />

      <style>{`
        @media print {
          @page { margin-bottom: 20mm; margin-top: 10mm; }
          .resume-spacer { display: none !important; }
        }
      `}</style>
    </div>
  );
};
