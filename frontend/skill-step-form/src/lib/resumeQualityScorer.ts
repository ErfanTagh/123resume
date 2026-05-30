import { CVFormData } from "@/components/cv-form/types";

export interface QualityCategory {
  name: string;
  score: number;
  details: string;
}

export interface ResumeQuality {
  overallScore: number;
  completeness: number;
  clarity: number;
  formatting: number;
  impact: number;
  categories: QualityCategory[];
}

/**
 * Calculate comprehensive resume quality scores
 * Returns scores for: Completeness, Clarity, Formatting, and Impact
 */
export const calculateResumeQuality = (data: CVFormData): ResumeQuality => {
  const completeness = calculateCompleteness(data);
  const clarity = calculateClarity(data);
  const formatting = calculateFormatting(data);
  const impact = calculateImpact(data);

  const overallScore = Math.round((completeness + clarity + formatting + impact) / 4 * 10) / 10;

  return {
    overallScore,
    completeness,
    clarity,
    formatting,
    impact,
    categories: [
      {
        name: "Completeness",
        score: completeness,
        details: getCompletenessDetails(data),
      },
      {
        name: "Clarity",
        score: clarity,
        details: getClarityDetails(data),
      },
      {
        name: "Formatting",
        score: formatting,
        details: getFormattingDetails(data),
      },
      {
        name: "Impact",
        score: impact,
        details: getImpactDetails(data),
      },
    ],
  };
};

/**
 * COMPLETENESS: Measures how complete the resume is
 * - Are all sections filled?
 * - Is there enough content in each section?
 */
const calculateCompleteness = (data: CVFormData): number => {
  let score = 0;
  const maxScore = 10;

  // Personal Info (2 points)
  const hasBasicInfo = data.personalInfo.firstName && 
                       data.personalInfo.lastName && 
                       data.personalInfo.email && 
                       data.personalInfo.phone;
  const hasExtendedInfo = data.personalInfo.professionalTitle && 
                          data.personalInfo.summary &&
                          data.personalInfo.location;
  
  if (hasBasicInfo) score += 1;
  if (hasExtendedInfo) score += 1;

  // Work Experience (3 points)
  const workExp = data.workExperience || [];
  if (workExp.length >= 1) score += 1;
  if (workExp.length >= 2) score += 1;
  const hasDetailedWork = workExp.some(w => 
    w.position && w.company && w.description && w.description.length > 50
  );
  if (hasDetailedWork) score += 1;

  // Education (2 points)
  const education = data.education || [];
  if (education.length >= 1) score += 1;
  const hasDetailedEdu = education.some(e => 
    e.degree && e.institution && e.fieldOfStudy
  );
  if (hasDetailedEdu) score += 1;

  // Skills (1 point)
  const skills = data.skills || [];
  if (skills.filter(s => s.skill && s.skill.trim()).length >= 5) score += 1;

  // Languages (0.5 points)
  const languages = data.languages || [];
  if (languages.filter(l => l.language && l.proficiency).length >= 1) score += 0.5;

  // Projects/Certificates (1.5 points bonus)
  const projects = data.projects || [];
  const certificates = data.certificates || [];
  if (projects.length >= 1) score += 0.75;
  if (certificates.length >= 1) score += 0.75;

  return Math.min(Math.round(score * 10) / 10, maxScore);
};

/**
 * CLARITY: Measures how clear and readable the content is
 * - Is the information well-organized?
 * - Are descriptions concise and clear?
 * - Is the professional title clear?
 */
const calculateClarity = (data: CVFormData): number => {
  let score = 0;
  const maxScore = 10;

  // Clear professional identity (2 points)
  if (data.personalInfo.professionalTitle && data.personalInfo.professionalTitle.length > 3) {
    score += 1;
  }
  if (data.personalInfo.summary && data.personalInfo.summary.length >= 50 && data.personalInfo.summary.length <= 300) {
    score += 1;
  }

  // Work experience clarity (3 points)
  const workExp = data.workExperience || [];
  const clearWorkEntries = workExp.filter(w => {
    const hasTitle = w.position && w.position.length >= 3;
    const hasCompany = w.company && w.company.length >= 2;
    const hasDescription = w.description && w.description.length >= 30 && w.description.length <= 500;
    const hasDates = w.startDate && w.endDate;
    return hasTitle && hasCompany && hasDescription && hasDates;
  }).length;
  
  if (clearWorkEntries >= 1) score += 1.5;
  if (clearWorkEntries >= 2) score += 1.5;

  // Education clarity (2 points)
  const education = data.education || [];
  const clearEduEntries = education.filter(e => {
    return e.degree && e.institution && e.fieldOfStudy && (e.startDate || e.endDate);
  }).length;
  
  if (clearEduEntries >= 1) score += 2;

  // Skills organization (1.5 points)
  const skills = data.skills || [];
  const validSkills = skills.filter(s => 
    s.skill && s.skill.trim().length >= 2 && s.skill.trim().length <= 50
  ).length;
  
  if (validSkills >= 3) score += 0.75;
  if (validSkills >= 6) score += 0.75;

  // Section order defined (1.5 points)
  if (data.sectionOrder && data.sectionOrder.length > 0) score += 1.5;

  return Math.min(Math.round(score * 10) / 10, maxScore);
};

/**
 * FORMATTING: Measures the visual appeal and structure
 * - Is a template selected?
 * - Are sections properly ordered?
 * - Is there consistent formatting?
 */
const calculateFormatting = (data: CVFormData): number => {
  let score = 5; // Base score for having any content
  const maxScore = 10;

  // Template selection (2 points)
  if (
    data.template &&
    ["modern", "classic", "minimal", "creative", "latex", "starRover", "slateCopper"].includes(data.template)
  ) {
    score += 2;
  }

  // Section ordering (2 points)
  if (data.sectionOrder && data.sectionOrder.length >= 4) {
    score += 2;
  }

  // Consistent date formatting in work experience (1 point)
  const workExp = data.workExperience || [];
  const hasConsistentDates = workExp.every(w => 
    (w.startDate && w.endDate) || w.currentlyWorking
  );
  if (workExp.length > 0 && hasConsistentDates) score += 1;

  return Math.min(Math.round(score * 10) / 10, maxScore);
};

/**
 * IMPACT: Measures how impressive and effective the resume is
 * - Does it showcase achievements?
 * - Are there quantifiable results?
 * - Does it demonstrate skills and expertise?
 */
const calculateImpact = (data: CVFormData): number => {
  let score = 0;
  const maxScore = 10;

  // Strong professional summary (2 points)
  const summary = data.personalInfo.summary || "";
  if (summary.length >= 100) score += 1;
  if (summary.length >= 150) score += 1;

  // Impactful work descriptions (4 points)
  const workExp = data.workExperience || [];
  const impactfulWork = workExp.filter(w => {
    const desc = w.description || "";
    // Check for action words
    const hasActionWords = /\b(led|managed|developed|created|improved|increased|reduced|achieved|implemented|designed|built|launched)\b/i.test(desc);
    // Check for numbers/metrics
    const hasNumbers = /\d+/.test(desc);
    // Check for sufficient detail
    const hasDetail = desc.length >= 80;
    
    return (hasActionWords ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasDetail ? 1 : 0) >= 2;
  }).length;

  if (impactfulWork >= 1) score += 2;
  if (impactfulWork >= 2) score += 2;

  // Skills showcase (2 points)
  const skills = data.skills || [];
  if (skills.length >= 5) score += 1;
  if (skills.length >= 8) score += 1;

  // Additional credentials (2 points)
  const projects = data.projects || [];
  const certificates = data.certificates || [];
  const languages = data.languages || [];
  
  const hasProjects = projects.filter(p => p.name && p.description).length >= 1;
  const hasCertificates = certificates.filter(c => c.name && c.organization).length >= 1;
  const hasLanguages = languages.filter(l => l.language && l.proficiency).length >= 2;
  
  if (hasProjects) score += 0.75;
  if (hasCertificates) score += 0.75;
  if (hasLanguages) score += 0.5;

  return Math.min(Math.round(score * 10) / 10, maxScore);
};

// Details functions for each category
const getCompletenessDetails = (data: CVFormData): string => {
  const sections = [];
  if (data.personalInfo.firstName) sections.push("Personal Info");
  if ((data.workExperience || []).length > 0) sections.push("Work Experience");
  if ((data.education || []).length > 0) sections.push("Education");
  if ((data.skills || []).length > 0) sections.push("Skills");
  if ((data.projects || []).length > 0) sections.push("Projects");
  if ((data.certificates || []).length > 0) sections.push("Certificates");
  
  return `${sections.length} of 6 sections completed`;
};

const getClarityDetails = (data: CVFormData): string => {
  const hasTitle = !!data.personalInfo.professionalTitle;
  const hasSummary = data.personalInfo.summary && data.personalInfo.summary.length >= 50;
  const hasDetails = (data.workExperience || []).some(w => w.description && w.description.length >= 30);
  
  if (hasTitle && hasSummary && hasDetails) return "Clear and well-structured";
  if (hasTitle && (hasSummary || hasDetails)) return "Good clarity, could improve";
  return "Needs more detailed descriptions";
};

const getFormattingDetails = (data: CVFormData): string => {
  const template = data.template || "modern";
  const hasOrder = data.sectionOrder && data.sectionOrder.length > 0;
  
  if (hasOrder) return `${template} template with custom order`;
  return `${template} template with default order`;
};

const getImpactDetails = (data: CVFormData): string => {
  const workExp = data.workExperience || [];
  const hasMetrics = workExp.some(w => /\d+/.test(w.description || ""));
  const hasActionWords = workExp.some(w => 
    /\b(led|managed|developed|created|improved|increased|reduced|achieved)\b/i.test(w.description || "")
  );
  
  if (hasMetrics && hasActionWords) return "Strong impact with achievements";
  if (hasMetrics || hasActionWords) return "Good, add more achievements";
  return "Add metrics and achievements";
};

