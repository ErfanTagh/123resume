import { resumeAPI, Resume } from './api';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { CVFormData } from '@/components/cv-form/types';
import { ModernTemplate } from '@/components/cv-form/templates/ModernTemplate';
import { ClassicTemplate } from '@/components/cv-form/templates/ClassicTemplate';
import { MinimalTemplate } from '@/components/cv-form/templates/MinimalTemplate';
import { CreativeTemplate } from '@/components/cv-form/templates/CreativeTemplate';
import { LatexTemplate } from '@/components/cv-form/templates/LatexTemplate';
import { StarRoverTemplate } from '@/components/cv-form/templates/StarRoverTemplate';
import { SlateCopperTemplate } from '@/components/cv-form/templates/SlateCopperTemplate';
import { PrismTemplate } from '@/components/cv-form/templates/PrismTemplate';
import { LanguageProvider } from '@/contexts/LanguageContext';
import i18n from '@/i18n/config';
import { formatProficiency as formatProficiencyShared } from '@/lib/languageProficiency';
import { formatDateRange, formatMonthYear } from '@/lib/dateFormatter';
import { hasWebLink, normalizeExternalUrl } from '@/lib/contactLinkUtils';
import { withResumeSectionsSortedForDisplay } from '@/lib/resumeDisplaySort';
import { SLATE_COPPER_PROFILE_OBJECT_POSITION } from '@/lib/slateCopperConstants';

/**
 * Sanitize filename for filesystem compatibility
 * Removes invalid characters, replaces spaces with dashes, and ensures .pdf extension
 */
function sanitizeFilename(name: string): string {
  // Remove invalid filename characters: < > : " / \ | ? *
  // Replace spaces and multiple dashes with single dash
  // Remove leading/trailing dashes and dots
  let sanitized = name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
    .trim();

  // If empty after sanitization, return default
  if (!sanitized) {
    return 'resume';
  }

  // Ensure it doesn't end with a dot (Windows issue)
  sanitized = sanitized.replace(/\.+$/, '');

  // Limit length to avoid filesystem issues (keep it reasonable)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

/**
 * Generate default resume name from personal info
 * Format: FirstName-LastName-ProfessionalTitle
 */
function generateDefaultResumeName(resume: Resume): string {
  const parts: string[] = [];

  // Only add non-empty strings
  if (resume.personalInfo?.firstName?.trim()) {
    parts.push(resume.personalInfo.firstName.trim());
  }
  if (resume.personalInfo?.lastName?.trim()) {
    parts.push(resume.personalInfo.lastName.trim());
  }
  if (resume.personalInfo?.professionalTitle?.trim()) {
    parts.push(resume.personalInfo.professionalTitle.trim());
  }

  // Return joined parts or fallback
  return parts.length > 0 ? parts.join('-') : 'Untitled Resume';
}

/**
 * CSS files needed for resume rendering
 */
const CSS_FILES = [
  '/resume-base.css',
  '/resume-header.css',
  '/resume-sections.css',
  '/resume-education.css',
  '/resume-experience.css',
  '/resume-projects.css',
  '/resume-skills.css',
  '/resume-languages.css',
  '/resume-certifications.css',
  '/resume-interests.css',
  '/resume-responsive.css',
  '/resume-print.css',
];

/**
 * Get all stylesheets from the current page (including Tailwind CSS)
 * This extracts CSS from all stylesheets available in the document
 */
function getAllStylesheets(): string {
  const stylesheets: string[] = [];

  // Get all stylesheet links from the head
  const styleLinks = Array.from(document.querySelectorAll('head > link[rel="stylesheet"]'));
  styleLinks.forEach((link) => {
    const href = (link as HTMLLinkElement).href;
    if (href && !href.includes('font')) {
      stylesheets.push(`<link rel="stylesheet" href="${href}">`);
    }
  });

  // Get all inline styles from style tags
  const styleTags = Array.from(document.querySelectorAll('head > style'));
  styleTags.forEach((style) => {
    const cssText = style.textContent || style.innerHTML;
    if (cssText) {
      stylesheets.push(`<style>${cssText}</style>`);
    }
  });

  // Also try to extract CSS rules from document.styleSheets (for dynamically loaded styles)
  try {
    Array.from(document.styleSheets).forEach((stylesheet) => {
      try {
        // Skip stylesheets that are already included as link tags
        if (stylesheet.href && styleLinks.some(link => (link as HTMLLinkElement).href === stylesheet.href)) {
          return;
        }

        // Try to get the CSS rules
        if (stylesheet.cssRules) {
          let cssText = '';
          for (let i = 0; i < stylesheet.cssRules.length; i++) {
            cssText += stylesheet.cssRules[i].cssText + '\n';
          }
          if (cssText && cssText.length > 100) { // Only include substantial stylesheets
            stylesheets.push(`<style>${cssText}</style>`);
          }
        }
      } catch (e) {
        // Cross-origin stylesheets will throw an error, skip them
        // Or try to use href instead
        if (stylesheet.href && !stylesheet.href.includes('font')) {
          stylesheets.push(`<link rel="stylesheet" href="${stylesheet.href}">`);
        }
      }
    });
  } catch (e) {
    // If there's an error accessing styleSheets, continue with what we have
    console.warn('Could not access all stylesheets:', e);
  }

  return stylesheets.join('\n');
}

/**
 * Fetch and inline all CSS files
 */
async function fetchCSSFiles(): Promise<string[]> {
  return Promise.all(
    CSS_FILES.map(async (href) => {
      try {
        const response = await fetch(href);
        const css = await response.text();
        return `<style>${css}</style>`;
      } catch {
        return `<link rel="stylesheet" href="${href}">`;
      }
    })
  );
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate resume HTML from resume data
 *
 * Note: This function is used for PDF generation and runs outside React.
 * We need to re-implement a *simplified* version of the font-size handling
 * that's used in the React templates so that the user's global font size
 * choice also affects the exported PDF (especially the summary text).
 */
function generateResumeHTML(resume: Resume): string {
  const personalInfo = resume.personalInfo;
  const sortedResume = withResumeSectionsSortedForDisplay(resume as CVFormData);
  const locale = (i18n.language || 'en').split('-')[0] as string;
  const presentText = i18n.t('resume.fields.present');

  // ============================================
  // Font sizing based on resume.styling font size
  // (support both camelCase and snake_case from backend)
  // ============================================
  const rawFontSize =
    // Frontend / CVFormData format
    (resume as any).styling?.fontSize ??
    // Backend / MongoDB format
    (resume as any).styling?.font_size;
  const fontSizeInput = rawFontSize || 'medium';
  const normalizedFontSize: 'small' | 'medium' | 'large' =
    fontSizeInput === 'small' || fontSizeInput === 'large' ? fontSizeInput : 'medium';

  // Keep this mapping simple and consistent with templates,
  // but we don't need the full matrix here – just a few base sizes.
  const pdfFontSizeMap: Record<'small' | 'medium' | 'large', {
    baseText: string;
    heading: string;
    contact: string;
  }> = {
    small: {
      baseText: '0.7rem',    // ~11px
      heading: '0.85rem',    // ~14px
      contact: '0.7rem',
    },
    medium: {
      baseText: '0.9rem',    // ~14px
      heading: '1.05rem',    // ~17px
      contact: '0.85rem',
    },
    large: {
      baseText: '1.05rem',   // ~17px
      heading: '1.25rem',    // ~20px
      contact: '1rem',
    },
  };

  const pdfSizes = pdfFontSizeMap[normalizedFontSize];

  const renderWorkExperience = () => {
    if (!sortedResume.workExperience?.length) return '';
    const validExps = sortedResume.workExperience.filter((exp: any) => exp.position || exp.company);
    if (!validExps.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.workExperience')}</h3>
        ${validExps.map((exp: any) => `
          <div class="experience-item">
            <div class="experience-header">
              <h4><strong>${escapeHtml(exp.position || '')}</strong></h4>
            </div>
            <div class="experience-place">
              <span class="company"><strong>${
                hasWebLink(exp.link)
                  ? `<a href="${escapeHtml(normalizeExternalUrl(exp.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(exp.company || '')}</a>`
                  : escapeHtml(exp.company || '')
              }</strong></span>
              ${exp.startDate || exp.endDate ? `
                <span class="period">
                  ${escapeHtml(formatDateRange(exp.startDate, exp.endDate, presentText, locale))}
                </span>
              ` : ''}
            </div>
            ${exp.location ? `<div class="experience-location"><span>${escapeHtml(exp.location)}</span></div>` : ''}
            ${exp.description ? `
              <ul class="experience-details">
                ${exp.description.split('\n').filter((line: string) => line.trim()).map((line: string) => `
                  <li>${escapeHtml(line.trim())}</li>
                `).join('')}
              </ul>
            ` : ''}
            ${exp.technologies?.length && exp.technologies.some((tech: any) => tech.technology?.trim()) ? `
              <div class="job-tech">
                ${exp.technologies.filter((tech: any) => tech.technology?.trim()).map((tech: any) => `
                  <span class="tech-tag">${escapeHtml(tech.technology)}</span>
                `).join('')}
              </div>
            ` : ''}
            ${exp.competencies?.length && exp.competencies.some((comp: any) => comp.competency?.trim()) ? `
              <div class="job-competencies">
                ${exp.competencies.filter((comp: any) => comp.competency?.trim()).map((comp: any) => `
                  <span class="competency-bubble">${escapeHtml(comp.competency)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderEducation = () => {
    if (!sortedResume.education?.length) return '';
    const validEdu = sortedResume.education.filter((edu: any) => edu.degree || edu.institution);
    if (!validEdu.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.education')}</h3>
        ${validEdu.map((edu: any) => `
          <div class="education-item">
            <h4><strong>${escapeHtml(edu.degree || '')}</strong></h4>
            <div class="education-header">
              <p class="institution"><strong>${
                hasWebLink(edu.link)
                  ? `<a href="${escapeHtml(normalizeExternalUrl(edu.link))}" target="_blank" rel="noopener noreferrer">${escapeHtml(edu.institution || '')}</a>`
                  : escapeHtml(edu.institution || '')
              }</strong></p>
              ${edu.startDate || edu.endDate ? `
                <p class="period">
                  ${escapeHtml(formatDateRange(edu.startDate, edu.endDate, presentText, locale))}
                </p>
              ` : ''}
            </div>
            ${edu.location ? `<p class="location">${escapeHtml(edu.location)}</p>` : ''}
            ${edu.keyCourses?.length && edu.keyCourses.some((course: any) => course.course?.trim()) ? `
              <div class="key-courses">
                ${edu.keyCourses.filter((course: any) => course.course?.trim()).map((course: any) => `
                  <span class="course-tag">${escapeHtml(course.course)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderProjects = () => {
    if (!sortedResume.projects?.length) return '';
    const validProjects = sortedResume.projects.filter((project: any) => project.name?.trim());
    if (!validProjects.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.projects')}</h3>
        ${validProjects.map((project: any) => `
          <div class="project-item">
            <div class="project-header">
              <h4><strong>${
                hasWebLink(project.link)
                  ? `<a href="${escapeHtml(normalizeExternalUrl(project.link))}" target="_blank" rel="noopener noreferrer" class="project-link">${escapeHtml(project.name)}</a>`
                  : escapeHtml(project.name)
              }</strong></h4>
            </div>
            ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}
            ${project.technologies?.length && project.technologies.some((tech: any) => tech.technology?.trim()) ? `
              <div class="project-tech">
                ${project.technologies.filter((tech: any) => tech.technology?.trim()).map((tech: any) => `
                  <span class="tech-tag">${escapeHtml(tech.technology)}</span>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderCertificates = () => {
    if (!sortedResume.certificates?.length) return '';
    const validCerts = sortedResume.certificates.filter((cert: any) => cert.name?.trim());
    if (!validCerts.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.certifications')}</h3>
        ${validCerts.map((cert: any) => `
          <div class="certification-item">
            <div class="certification-header">
              <h4><strong>${
                hasWebLink(cert.url)
                  ? `<a href="${escapeHtml(normalizeExternalUrl(cert.url))}" target="_blank" rel="noopener noreferrer" class="certification-link">${escapeHtml(cert.name)}</a>`
                  : escapeHtml(cert.name)
              }</strong></h4>
              ${cert.organization ? `<span class="certification-issuer">${escapeHtml(cert.organization)}</span>` : ''}
            </div>
            ${cert.issueDate ? `<p class="certification-date">${escapeHtml(formatMonthYear(cert.issueDate, locale) || cert.issueDate)}</p>` : ''}
          </div>
        `).join('')}
      </section>
    `;
  };

  const renderSkills = () => {
    if (!resume.skills?.length) return '';
    const validSkills = resume.skills.filter((skillObj: any) => skillObj.skill?.trim());
    if (!validSkills.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.skills')}</h3>
        <div class="skill-tags">
          ${validSkills.map((skillObj: any) => `
            <span class="skill-tag">${escapeHtml(skillObj.skill)}</span>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderLanguages = () => {
    if (!resume.languages?.length) return '';
    const validLangs = resume.languages.filter((lang: any) => lang.language?.trim());
    if (!validLangs.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.languages')}</h3>
        <div class="languages-list" style="width: 100%; overflow: visible; box-sizing: border-box;">
          ${validLangs.map((lang: any) => `
            <div class="language-item" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-right: 16px; width: 100%; box-sizing: border-box; overflow: visible;">
              <span class="language-name" style="flex: 1 1 auto; min-width: 0; overflow: visible;">${escapeHtml(lang.language)}</span>
              ${lang.proficiency ? `<span class="language-level" style="flex-shrink: 0; white-space: nowrap; overflow: visible; min-width: fit-content; text-align: right; padding-left: 8px;">${escapeHtml(formatProficiencyShared(i18n.t.bind(i18n), lang.proficiency))}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderInterests = () => {
    if (!personalInfo.interests?.length) return '';
    const validInterests = personalInfo.interests.filter((interest: any) => interest.interest?.trim());
    if (!validInterests.length) return '';

    return `
      <section class="resume-section">
        <h3 class="section-title">${i18n.t('resume.sections.interests')}</h3>
        <div class="interests-list">
          ${validInterests.map((interest: any) => `
            <span class="interest-tag">${escapeHtml(interest.interest)}</span>
          `).join('')}
        </div>
      </section>
    `;
  };

  return `
    <div class="resume-container" style="width: 100%; max-width: 100%; box-sizing: border-box; overflow: visible;">
      <header class="resume-header">
        <div class="header-content">
          <div class="profile-info">
            <h1 class="name"><strong>${escapeHtml(personalInfo.firstName || '')} ${escapeHtml(personalInfo.lastName || '')}</strong></h1>
            ${personalInfo.professionalTitle ? `<h2 class="title">${escapeHtml(personalInfo.professionalTitle)}</h2>` : ''}
          </div>
          ${personalInfo.profileImage ? `<img src="${escapeHtml(personalInfo.profileImage)}" alt="Professional profile photo of ${escapeHtml(personalInfo.firstName)} ${escapeHtml(personalInfo.lastName)}${personalInfo.professionalTitle ? `, ${escapeHtml(personalInfo.professionalTitle)}` : ''}${personalInfo.location ? ` from ${escapeHtml(personalInfo.location)}` : ''}" class="profile-image" />` : ''}
        </div>
      </header>
      <main class="resume-main" style="width: 100%; max-width: 100%; box-sizing: border-box; overflow: visible; font-size: ${pdfSizes.baseText};">
        ${personalInfo.summary?.trim() ? `
          <section class="resume-section">
            <h3 class="section-title" style="font-size: ${pdfSizes.heading};">${i18n.t('resume.sections.professionalSummary')}</h3>
            <p style="font-size: ${pdfSizes.baseText}; line-height: 1.5; color: #495057;">${escapeHtml(personalInfo.summary)}</p>
          </section>
        ` : ''}
        <section class="resume-section">
          <h3 class="section-title" style="font-size: ${pdfSizes.heading};">${i18n.t('resume.sections.contact')}</h3>
          <div class="contact-info" style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start; text-align: left; width: 100%;">
            ${personalInfo.phone ? `<div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><span>Phone: ${escapeHtml(personalInfo.phone)}</span></div>` : ''}
            <div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><span>Email: ${escapeHtml(personalInfo.email || '')}</span></div>
            ${personalInfo.location ? `<div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><span>Location: ${escapeHtml(personalInfo.location)}</span></div>` : ''}
            ${personalInfo.linkedin ? `<div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><a href="${escapeHtml(normalizeExternalUrl(personalInfo.linkedin))}" target="_blank" rel="noopener noreferrer" class="contact-link">${escapeHtml(i18n.t('resume.contactLinkShort.linkedin'))}</a></div>` : ''}
            ${personalInfo.website ? `<div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><a href="${escapeHtml(normalizeExternalUrl(personalInfo.website))}" target="_blank" rel="noopener noreferrer" class="contact-link">${escapeHtml(i18n.t('resume.contactLinkShort.website'))}</a></div>` : ''}
            ${personalInfo.github ? `<div class="contact-item" style="display: flex; align-items: center; gap: 8px; justify-content: flex-start; text-align: left; width: 100%; font-size: ${pdfSizes.contact};"><a href="${escapeHtml(normalizeExternalUrl(personalInfo.github))}" target="_blank" rel="noopener noreferrer" class="contact-link">${escapeHtml(i18n.t('resume.contactLinkShort.github'))}</a></div>` : ''}
          </div>
        </section>
        ${renderEducation()}
        ${renderWorkExperience()}
        ${renderProjects()}
        ${renderCertificates()}
        ${renderSkills()}
        ${renderLanguages()}
        ${renderInterests()}
      </main>
    </div>
  `;
}

/**
 * Detect if the current device is mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
}

/**
 * Get computed background color from CSS custom property
 * Returns resolved hsl() value or fallback color
 */
function getComputedBackgroundColor(): string {
  try {
    // Create a temporary element to compute the background color
    const tempDiv = document.createElement('div');
    tempDiv.className = 'bg-background';
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.pointerEvents = 'none';
    document.body.appendChild(tempDiv);

    // Get computed style
    const computedStyle = window.getComputedStyle(tempDiv);
    const backgroundColor = computedStyle.backgroundColor;

    // Clean up
    document.body.removeChild(tempDiv);

    // If we got a valid color (not transparent), return it
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
      return backgroundColor;
    }

    // Fallback: try to get from root CSS variable
    const rootStyle = getComputedStyle(document.documentElement);
    const bgVar = rootStyle.getPropertyValue('--background').trim();

    if (bgVar) {
      // If it's already an hsl() value, return it
      if (bgVar.startsWith('hsl(') || bgVar.startsWith('rgb(')) {
        return bgVar;
      }
      // If it's space-separated hsl values (e.g., "220 13% 91%"), convert to hsl()
      const hslMatch = bgVar.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?%)\s+(\d+(?:\.\d+)?%)/);
      if (hslMatch) {
        return `hsl(${hslMatch[1]}, ${hslMatch[2]}, ${hslMatch[3]})`;
      }
    }

    // Final fallback
    return '#f5f5f5';
  } catch (error) {
    console.warn('Failed to compute background color:', error);
    return '#f5f5f5';
  }
}

/** A4 height at 96dpi minus margins/padding (~1050px). Content under this fits on one page. */
const ONE_PAGE_HEIGHT_PX = 1050;

/** A4 page constants */
const A4_TOTAL_HEIGHT_MM = 297;
const A4_PAGE_BOTTOM_MARGIN_MM = 20; // matches @page margin-bottom in templates
const A4_USABLE_HEIGHT_MM = A4_TOTAL_HEIGHT_MM - A4_PAGE_BOTTOM_MARGIN_MM;
const MM_TO_PX = 96 / 25.4;
const A4_USABLE_HEIGHT_PX = A4_USABLE_HEIGHT_MM * MM_TO_PX;
const SPACER_SAFETY_MARGIN_MM = 7;

const OFFSCREEN_PRINT_CSS_ID = 'resume-pdf-offscreen-print-parity';

/**
 * Injects CSS so offscreen / preview DOM uses the same flex column layout as @media print.
 * Without this, templates only apply display:flex inside print media — measurement used screen
 * layout while Playwright renders PDF with print layout, so spacer math was wrong.
 */
function ensureOffscreenPrintParityStyles(): void {
  if (document.getElementById(OFFSCREEN_PRINT_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = OFFSCREEN_PRINT_CSS_ID;
  style.textContent = `
    .resume-pdf-offscreen .photo-placeholder {
      display: none !important;
    }
    .resume-pdf-offscreen .resume-page-container {
      min-height: 0 !important;
      width: 210mm !important;
      max-width: 210mm !important;
      margin-left: auto !important;
      margin-right: auto !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
    }
    .resume-pdf-offscreen .resume-page-container > div:not([aria-hidden="true"]) {
      flex: 0 0 auto !important;
    }
    .resume-pdf-offscreen .resume-page-container > div[aria-hidden="true"],
    .resume-pdf-offscreen .resume-spacer {
      flex: 1 1 auto !important;
      min-height: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

async function waitForFontsAndTwoFrames(): Promise<void> {
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Measures content height by temporarily removing min-height, then restores.
 * Returns the natural content height in pixels (used to detect single vs multi-page).
 */
function measureContentHeightForPDF(container: HTMLElement): number {
  const spacer = container.querySelector('[aria-hidden="true"]') as HTMLElement | null;
  const originalSpacerDisplay = spacer?.style.display;
  if (spacer) spacer.style.setProperty('display', 'none', 'important');

  const originalMinHeight = container.style.minHeight;
  container.style.setProperty('min-height', '0', 'important');
  const height = container.scrollHeight;
  container.style.minHeight = originalMinHeight;
  container.style.removeProperty('min-height');

  if (spacer) {
    spacer.style.removeProperty('display');
    if (originalSpacerDisplay) spacer.style.display = originalSpacerDisplay;
  }
  return height;
}

/**
 * Dynamically calculates and applies the optimal spacer max-height in the PDF export DOM.
 *
 * Requires an ancestor with class `resume-pdf-offscreen` so layout matches print (flex column).
 * Uses container scrollHeight with spacer hidden — aligned with measureContentHeightForPDF.
 *
 * @returns Cleanup to restore spacer inline styles (call after serializing HTML when the DOM
 *          stays on screen, e.g. ResumeView download).
 */
async function applyDynamicSpacerForPDF(container: HTMLElement): Promise<() => void> {
  const noop = () => {};
  ensureOffscreenPrintParityStyles();
  const spacer = container.querySelector('.resume-spacer') as HTMLElement | null;
  if (!spacer) {
    return noop;
  }

  await waitForFontsAndTwoFrames();

  const savedMaxHeight = spacer.style.maxHeight;
  const savedMinHeight = spacer.style.minHeight;
  const savedDisplay = spacer.style.display;

  spacer.style.setProperty('max-height', '0', 'important');
  spacer.style.setProperty('min-height', '0', 'important');
  spacer.style.setProperty('display', 'none', 'important');

  const originalContainerMinHeight = container.style.minHeight;
  container.style.setProperty('min-height', '0', 'important');
  void container.offsetHeight;

  const totalContentHeight = container.scrollHeight;

  container.style.minHeight = originalContainerMinHeight;
  if (!originalContainerMinHeight) {
    container.style.removeProperty('min-height');
  }

  const EPS = 2;
  const heightOnCurrentPage = totalContentHeight % A4_USABLE_HEIGHT_PX;
  const nearFullPage = heightOnCurrentPage > A4_USABLE_HEIGHT_PX - EPS;
  const nearZero = heightOnCurrentPage < EPS;
  // If content ends exactly on a page break, do not add a full-page spacer (would force page 2).
  const remainingOnCurrentPage =
    nearZero || nearFullPage ? 0 : A4_USABLE_HEIGHT_PX - heightOnCurrentPage;

  const safetyMarginPx = SPACER_SAFETY_MARGIN_MM * MM_TO_PX;
  const maxSafeSpacerPx = Math.max(0, remainingOnCurrentPage - safetyMarginPx);
  const maxSafeSpacerMm = Math.min(maxSafeSpacerPx / MM_TO_PX, 270);

  spacer.style.removeProperty('display');
  spacer.style.removeProperty('max-height');
  spacer.style.removeProperty('min-height');
  if (savedDisplay) spacer.style.display = savedDisplay;
  if (savedMinHeight) spacer.style.minHeight = savedMinHeight;

  const maxHeightApplied = maxSafeSpacerMm > 0 ? `${maxSafeSpacerMm}mm` : '0mm';
  spacer.style.setProperty('max-height', maxHeightApplied, 'important');

  return () => {
    spacer.style.removeProperty('max-height');
    if (savedMaxHeight) spacer.style.maxHeight = savedMaxHeight;
    if (!savedMaxHeight) spacer.style.removeProperty('max-height');
    if (savedMinHeight) spacer.style.minHeight = savedMinHeight;
    if (savedDisplay) spacer.style.display = savedDisplay;
  };
}

/**
 * Determines if resume content fits on a single PDF page.
 */
function isContentSinglePage(container: HTMLElement): boolean {
  return measureContentHeightForPDF(container) < ONE_PAGE_HEIGHT_PX;
}

/**
 * Adds resume-single-page class to .resume-page-container in HTML string.
 */
function addSinglePageClassToHTML(html: string): string {
  return html.replace(
    /class="resume-page-container\s/,
    'class="resume-page-container resume-single-page '
  ).replace(
    /class="resume-page-container"/,
    'class="resume-page-container resume-single-page"'
  );
}

/**
 * Download PDF from resume HTML (from DOM element)
 */
async function downloadPDFFromHTML(
  resumeId: string,
  resumeHTML: string,
  filename?: string,
  options?: { isSinglePage?: boolean }
): Promise<void> {
  // Get all stylesheets from the current page (includes Tailwind CSS)
  const pageStylesheets = getAllStylesheets();

  // Get font links
  const fontLinks = Array.from(document.querySelectorAll('head > link[rel*="font"], head > link[href*="font"], head > link[href*="fonts.googleapis"]'))
    .map(link => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`)
    .join('\n');

  // Also fetch old CSS files for backward compatibility
  const cssContents = await fetchCSSFiles();

  // Get computed background color for PDF
  const computedBackground = getComputedBackgroundColor();

  // Get computed styles for the resume container to ensure proper styling
  const fullHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  ${fontLinks}
  ${pageStylesheets}
  ${cssContents.join('\n')}
  <style>
    :root {
      --pdf-background: ${computedBackground};
    }
    /* Page margins for PDF - top margin on pages after first */
    @page {
      margin: 15mm 0 20mm 0 !important;
      padding: 0 !important;
      size: A4;
      background: var(--pdf-background) !important;
      /* Page numbers via @bottom-center if not already set by template */
      @bottom-center {
        content: counter(page);
        font-size: 10px;
        color: #6b7280;
        opacity: 0.6;
      }
    }
    @page :first {
      margin-top: 0 !important;
    }
    /* Ensure proper rendering */
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: 100% !important;
      min-height: 100% !important;
      background: var(--pdf-background) !important;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      width: 100%;
    }
    /* Resume container fills the page with internal padding */
    /* The container's background will fill the entire page */
    .resume-container,
    body > div:first-child {
      width: 100% !important;
      min-height: 100vh !important;
      margin: 0 !important;
      padding: 15mm !important;
      box-sizing: border-box;
    }
    /* Remove margins but keep internal padding for resume container */
    /* Templates use mx-auto and max-w-* which create side margins - force remove for PDF */
    body > div:first-child {
      margin: 0 !important;
      padding: 15mm !important;
      max-width: none !important;
      width: 100% !important;
      min-height: 100vh !important;
      box-sizing: border-box;
    }
    /* Resume container gets internal padding, background fills page */
    body > .resume-container {
      padding: 15mm !important;
      margin: 0 !important;
      min-height: 100vh !important;
      box-sizing: border-box;
    }
    /* Base: min-height controlled by smart single-page override (appended below) */
    /* In print, ensure container fills each page */
    @media print {
      @page {
        size: A4;
        background: var(--pdf-background) !important;
        /* Page numbers via @bottom-center if not already set by template */
        @bottom-center {
          content: counter(page);
          font-size: 10px;
          color: #6b7280;
          opacity: 0.6;
        }
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        height: 100% !important;
        min-height: 100% !important;
        background: var(--pdf-background) !important;
      }
      .resume-page-container {
        background: var(--pdf-background) !important;
        min-height: 0 !important;
        display: flex !important;
        flex-direction: column !important;
      }
      .resume-page-container > div:not([aria-hidden="true"]) {
        flex: 0 0 auto !important;
      }
      /* Spacer fills remaining page space; max-height set dynamically by JS */
      .resume-page-container > div[aria-hidden="true"],
      .resume-spacer {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        background: var(--pdf-background) !important;
      }
      /* Ensure gradient containers still have background */
      .resume-page-container.bg-gradient-to-br {
        background: var(--pdf-background) !important;
      }
    }
    /* Override ALL possible Tailwind classes that could add margins/width constraints */
    body > div[class*="mx-auto"],
    body > div[class*="mx-"],
    body > div[class*="max-w"],
    body > div[class*="w-"],
    body > div.bg-background,
    body > div.bg-gradient {
      margin: 0 !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      max-width: none !important;
      width: 100% !important;
    }
    /* Ensure images load correctly */
    img {
      max-width: 100%;
      height: auto;
    }
    /* Slate & Copper profile: must follow generic img rule — higher specificity + !important vs resume-print */
    .sc-two-col-root .sc-profile-photo img.sc-profile-photo-img {
      width: 96px !important;
      height: 96px !important;
      min-width: 96px !important;
      min-height: 96px !important;
      max-width: 96px !important;
      max-height: 96px !important;
      object-fit: cover !important;
      object-position: var(--sc-profile-object-position, ${SLATE_COPPER_PROFILE_OBJECT_POSITION}) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Slate & Copper: PDF HTML has mx-auto stripped — center avatar via scoped rule */
    .sc-two-col-root aside .sc-profile-photo {
      margin-left: auto !important;
      margin-right: auto !important;
      align-self: center !important;
    }
  </style>
</head>
<body>
  ${options?.isSinglePage ? addSinglePageClassToHTML(resumeHTML) : resumeHTML}
  <style id="pdf-single-page-override">
    /* Fill one sheet without exceeding the page content box: @page uses 20mm bottom (and 15mm top on
       continuation pages), so 297mm here overflows and Chromium adds a blank page. Use same usable
       height as spacer math (A4_USABLE_HEIGHT_MM). */
    @media print {
      .resume-page-container.resume-single-page {
        min-height: ${A4_USABLE_HEIGHT_MM}mm !important;
      }
      .resume-page-container:not(.resume-single-page) {
        min-height: auto !important;
      }
    }
    .resume-page-container.resume-single-page {
      min-height: ${A4_USABLE_HEIGHT_MM}mm !important;
    }
    .resume-page-container:not(.resume-single-page) {
      min-height: auto !important;
    }
  </style>
</body>
</html>`;

  const pdfBlob = await resumeAPI.generatePDF(resumeId, fullHTML);
  const blob = new Blob([pdfBlob], { type: 'application/pdf' });
  const finalFilename = filename || `resume_${resumeId}.pdf`;
  const isMobile = isMobileDevice();

  // Try File System Access API first (Chrome/Edge, including mobile Chrome on Android)
  // This provides the most reliable download experience
  // @ts-ignore - File System Access API types may not be available
  if ('showSaveFilePicker' in window) {
    try {
      // @ts-ignore
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: finalFilename,
        types: [{
          description: 'PDF files',
          accept: { 'application/pdf': ['.pdf'] }
        }]
      });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // Successfully saved via File System Access API
    } catch (error: any) {
      // User cancelled or error occurred, fall through to blob URL method
      if (error.name !== 'AbortError') {
        // Only log if it's not a user cancellation
      }
    }
  }

  // Standard blob URL download method (works on all browsers, but mobile may open in viewer)
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  a.style.display = 'none';
  a.setAttribute('download', finalFilename);

  document.body.appendChild(a);

  // On mobile, use requestAnimationFrame for better reliability
  if (isMobile) {
    requestAnimationFrame(() => {
      a.click();
      // Cleanup after a longer delay on mobile to ensure download starts
      setTimeout(() => {
        if (a.parentNode) {
          document.body.removeChild(a);
        }
        // Don't revoke URL immediately on mobile - give browser time to process download
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 2000);
      }, 300);
    });
  } else {
    a.click();
    setTimeout(() => {
      if (a.parentNode) {
        document.body.removeChild(a);
      }
      window.URL.revokeObjectURL(url);
    }, 100);
  }
}

/**
 * Convert Resume to CVFormData format for template rendering
 * Includes styling (fontSize, colors, etc.) so PDF matches Einstellungen
 */
function convertResumeToFormData(resume: Resume): CVFormData {
  const base: CVFormData = {
    template: resume.template || 'modern',
    personalInfo: resume.personalInfo,
    workExperience: resume.workExperience || [],
    education: resume.education || [],
    projects: resume.projects || [],
    certificates: resume.certificates || [],
    skills: resume.skills || [],
    languages: resume.languages || [],
    sectionOrder: resume.sectionOrder || [],
    styling: resume.styling || {}
  };
  return withResumeSectionsSortedForDisplay(base);
}

/**
 * Render React template component to HTML string
 */
function renderTemplateToHTML(resume: Resume): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const formData = convertResumeToFormData(resume);
      const template = resume.template || 'modern';

      // Create a temporary container with proper styling context
      const container = document.createElement('div');
      container.className = 'resume-container';
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.padding = '40px';
      container.style.backgroundColor = 'white';
      container.style.visibility = 'hidden';
      container.style.opacity = '0';
      // Ensure container has proper styling context by adding it to body
      document.body.appendChild(container);

      // Create a root for React rendering
      const root = ReactDOM.createRoot(container);

      // Render the appropriate template wrapped with LanguageProvider
      let templateComponent: React.ReactElement;
      switch (template) {
        case 'classic':
          templateComponent = React.createElement(ClassicTemplate, { data: formData });
          break;
        case 'minimal':
          templateComponent = React.createElement(MinimalTemplate, { data: formData });
          break;
        case 'creative':
          templateComponent = React.createElement(CreativeTemplate, { data: formData });
          break;
        case 'latex':
          templateComponent = React.createElement(LatexTemplate, { data: formData });
          break;
        case 'starRover':
          templateComponent = React.createElement(StarRoverTemplate, { data: formData });
          break;
        case 'slateCopper':
          templateComponent = React.createElement(SlateCopperTemplate, { data: formData });
          break;
        case 'prism':
          templateComponent = React.createElement(PrismTemplate, { data: formData });
          break;
        case 'modern':
        default:
          templateComponent = React.createElement(ModernTemplate, { data: formData });
          break;
      }

      // Wrap template with LanguageProvider to provide context
      const wrappedComponent = React.createElement(
        LanguageProvider,
        { children: templateComponent }
      );

      root.render(wrappedComponent);

      // Wait for React to render using both requestAnimationFrame and timeout
      // This ensures we wait long enough for React to fully render
      let frameCount = 0;
      const maxFrames = 30; // Increased to 30 frames (~500ms at 60fps)
      const maxWaitTime = 2000; // Maximum 2 seconds wait time
      const startTime = Date.now();
      let resolved = false;

      const checkRender = () => {
        if (resolved) return;

        frameCount++;
        const elapsed = Date.now() - startTime;
        const html = container.innerHTML;

        // Check if we have substantial content (more than just container/div tags)
        // Look for actual content like text nodes, not just empty divs
        const hasSubstantialContent = html.trim().length > 500 &&
          (html.includes('<h1') || html.includes('<h2') || html.includes('<h3') ||
            html.includes('class="name') || html.includes('class="title') ||
            html.includes('resume-header') || html.includes('resume-main'));

        const shouldResolve = hasSubstantialContent || frameCount >= maxFrames || elapsed >= maxWaitTime;

        if (shouldResolve) {
          try {
            const templateHtml = container.innerHTML;
            // More lenient check - just ensure we have some HTML content
            if (templateHtml.trim().length > 100) {
              resolved = true;
              // Cleanup
              root.unmount();
              document.body.removeChild(container);
              // Wrap the template HTML in a container div matching ResumeView structure
              // This ensures the same padding and styling as the individual resume page
              const finalHtml = `<div class="resume-container" style="max-width: 210mm; margin: 0 auto; background-color: white; padding: 40px; box-sizing: border-box;">${templateHtml}</div>`;
              resolve(finalHtml);
            } else if (elapsed >= maxWaitTime) {
              // If we've waited the max time and still no content, reject
              resolved = true;
              root.unmount();
              document.body.removeChild(container);
              reject(new Error('Template rendering failed - no content generated after waiting'));
            } else {
              // Continue waiting
              requestAnimationFrame(checkRender);
            }
          } catch (error) {
            // Cleanup on error
            resolved = true;
            try {
              root.unmount();
              document.body.removeChild(container);
            } catch { }
            reject(error);
          }
        } else {
          requestAnimationFrame(checkRender);
        }
      };

      // Start checking after a short delay to allow React to start rendering
      setTimeout(() => {
        requestAnimationFrame(checkRender);
      }, 50);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Download PDF from resume data
 * Uses the same approach as downloadResumePDFFromElement by temporarily rendering
 * the resume on the page to get identical HTML structure
 */
export async function downloadResumePDF(
  resume: Resume,
  filename?: string
): Promise<void> {
  // Create structure that matches ResumeView exactly:
  // Outer container (hidden, no padding) -> Inner wrapper (where template renders)
  // This matches: <div class="resume-container" style="padding: 40px"><template/></div>
  // But we extract innerHTML from the inner wrapper, not the outer container
  const outerContainer = document.createElement('div');
  outerContainer.style.position = 'fixed';
  outerContainer.style.left = '-9999px';
  outerContainer.style.top = '0';
  outerContainer.style.width = '210mm';
  outerContainer.style.margin = '0';
  outerContainer.style.padding = '0';
  outerContainer.style.backgroundColor = 'transparent';
  outerContainer.style.visibility = 'hidden';
  outerContainer.style.opacity = '0';
  outerContainer.style.zIndex = '-9999';
  outerContainer.classList.add('resume-pdf-offscreen');
  document.body.appendChild(outerContainer);

  // Create inner wrapper div where template will render (matches ResumeView structure)
  const innerWrapper = document.createElement('div');
  innerWrapper.style.width = '100%';
  innerWrapper.style.height = '100%';
  innerWrapper.style.padding = '0';
  innerWrapper.style.margin = '0';
  outerContainer.appendChild(innerWrapper);

  // Create a root for React rendering on the inner wrapper (declare outside try for cleanup)
  const root = ReactDOM.createRoot(innerWrapper);

  try {
    const formData = convertResumeToFormData(resume);
    const template = resume.template || 'modern';

    // Render the appropriate template wrapped with LanguageProvider
    let templateComponent: React.ReactElement;
    switch (template) {
      case 'classic':
        templateComponent = React.createElement(ClassicTemplate, { data: formData });
        break;
      case 'minimal':
        templateComponent = React.createElement(MinimalTemplate, { data: formData });
        break;
      case 'creative':
        templateComponent = React.createElement(CreativeTemplate, { data: formData });
        break;
      case 'latex':
        templateComponent = React.createElement(LatexTemplate, { data: formData });
        break;
      case 'starRover':
        templateComponent = React.createElement(StarRoverTemplate, { data: formData });
        break;
      case 'slateCopper':
        templateComponent = React.createElement(SlateCopperTemplate, { data: formData });
        break;
      case 'prism':
        templateComponent = React.createElement(PrismTemplate, { data: formData });
        break;
      case 'modern':
      default:
        templateComponent = React.createElement(ModernTemplate, { data: formData });
        break;
    }

    // Wrap template with LanguageProvider to provide context
    const wrappedComponent = React.createElement(
      LanguageProvider,
      { children: templateComponent }
    );

    root.render(wrappedComponent);

    // Wait for React to render - use a more reliable approach
    await new Promise<void>((resolve) => {
      let frameCount = 0;
      const maxFrames = 30;
      const maxWaitTime = 2000;
      const startTime = Date.now();
      let resolved = false;

      const checkRender = () => {
        if (resolved) return; // Prevent multiple resolves

        frameCount++;
        const elapsed = Date.now() - startTime;

        // Check if innerWrapper still exists in DOM
        if (!innerWrapper.parentNode) {
          resolved = true;
          resolve();
          return;
        }

        const html = innerWrapper.innerHTML;

        // Check if we have substantial content
        const hasSubstantialContent = html.trim().length > 500 &&
          (html.includes('<h1') || html.includes('<h2') || html.includes('<h3') ||
            html.includes('class="name') || html.includes('class="title') ||
            html.includes('resume-header') || html.includes('resume-main'));

        if (hasSubstantialContent || frameCount >= maxFrames || elapsed >= maxWaitTime) {
          resolved = true;
          resolve();
        } else {
          requestAnimationFrame(checkRender);
        }
      };

      setTimeout(() => {
        requestAnimationFrame(checkRender);
      }, 50);
    });

    // Dynamically calculate and apply spacer height before serializing HTML.
    // This runs in the same offscreen DOM that becomes the PDF, so measurement
    // and export share the exact same layout context.
    const resumeContainer = innerWrapper.querySelector('.resume-page-container') as HTMLElement | null;
    if (resumeContainer) {
      await applyDynamicSpacerForPDF(resumeContainer);
    }

    // Get the innerHTML exactly like downloadResumePDFFromElement does
    // Check if innerWrapper still exists before getting innerHTML
    let resumeHTML = innerWrapper.parentNode ? innerWrapper.innerHTML : '';

    // Measure content height to determine if single-page (for smart min-height)
    let isSinglePage = false;
    if (resumeContainer) {
      isSinglePage = isContentSinglePage(resumeContainer);
    }

    // Strip margin classes that create side margins (mx-auto, max-w-*, etc.)
    // Replace them to remove the margin/width constraints
    // Note: Slate & Copper profile photo is centered via .sc-two-col-root aside .sc-profile-photo
    // in template + resume-print + PDF shell CSS — do not rely on mx-auto surviving this pass.
    resumeHTML = resumeHTML.replace(/\s*mx-auto\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*max-w-[^\s"]+\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*mx-\d+\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*ml-auto\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*mr-auto\s*/g, ' ');

    // Generate filename - use resume name if available, otherwise fallback to personalInfo
    let finalFilename = filename;
    if (!finalFilename) {
      if (resume.name && resume.name.trim()) {
        // Use resume name, sanitize it, and add .pdf extension
        finalFilename = `${sanitizeFilename(resume.name)}.pdf`;
      } else {
        // Fallback to FirstName-LastName-ProfessionalTitle format
        const defaultName = generateDefaultResumeName(resume);
        finalFilename = `${sanitizeFilename(defaultName)}.pdf`;
      }
    }

    // Call downloadPDFFromHTML directly - same as downloadResumePDFFromElement does
    await downloadPDFFromHTML(resume.id, resumeHTML, finalFilename, { isSinglePage });
  } finally {
    // Cleanup - ensure everything is always removed
    try {
      root.unmount();
    } catch (e) {
      // Ignore unmount errors
    }
    try {
      if (outerContainer.parentNode) {
        document.body.removeChild(outerContainer);
      }
    } catch (e) {
      // Ignore removal errors
    }
  }
}

/**
 * Download PDF from HTML element (for ResumeView page)
 * If resume is provided, filename will be auto-generated from personalInfo
 */
export async function downloadResumePDFFromElement(
  resumeId: string,
  htmlElement: HTMLElement,
  resumeOrFilename?: Resume | string,
  filename?: string
): Promise<void> {
  const resumeContainer = htmlElement.querySelector('.resume-page-container') as HTMLElement | null;
  let restoreSpacerStyles: (() => void) | undefined;

  htmlElement.classList.add('resume-pdf-offscreen');
  try {
    if (resumeContainer) {
      restoreSpacerStyles = await applyDynamicSpacerForPDF(resumeContainer);
    }

    let isSinglePage = false;
    if (resumeContainer) {
      isSinglePage = isContentSinglePage(resumeContainer);
    }

    let resumeHTML = htmlElement.innerHTML;

    // Same mx-auto strip as downloadResumePDF — Slate profile centers via scoped CSS, not mx-auto.
    resumeHTML = resumeHTML.replace(/\s*mx-auto\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*max-w-[^\s"]+\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*mx-\d+\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*ml-auto\s*/g, ' ');
    resumeHTML = resumeHTML.replace(/\s*mr-auto\s*/g, ' ');

    let finalFilename = filename;
    let resume: Resume | undefined;

    if (resumeOrFilename) {
      if (typeof resumeOrFilename === 'string') {
        finalFilename = resumeOrFilename;
      } else {
        resume = resumeOrFilename;
      }
    }

    if (!finalFilename && resume) {
      if (resume.name && resume.name.trim()) {
        finalFilename = `${sanitizeFilename(resume.name)}.pdf`;
      } else {
        const defaultName = generateDefaultResumeName(resume);
        finalFilename = `${sanitizeFilename(defaultName)}.pdf`;
      }
    }
    if (!finalFilename) {
      finalFilename = `resume_${resumeId}.pdf`;
    }

    await downloadPDFFromHTML(resumeId, resumeHTML, finalFilename, { isSinglePage });
  } finally {
    htmlElement.classList.remove('resume-pdf-offscreen');
    restoreSpacerStyles?.();
  }
}

