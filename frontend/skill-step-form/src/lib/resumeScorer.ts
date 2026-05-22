import { CVFormData } from "@/components/cv-form/types";

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export interface ResumeScore {
  overallScore: number; // 0-10 scale
  categories: ScoreCategory[];
  suggestions: string[];
  /** Closing narrative from server-side AI (DeepSeek); empty for local heuristic. */
  overallFeedback?: string;
  /** When true, category feedback and suggestions are model-written — skip canned i18n string maps. */
  fromAi?: boolean;
}

/**
 * Strong action verbs that indicate impact (English)
 */
const STRONG_ACTION_VERBS_EN = [
  'led', 'managed', 'developed', 'implemented', 'optimized', 'designed',
  'created', 'built', 'launched', 'achieved', 'improved', 'increased',
  'reduced', 'established', 'delivered', 'transformed', 'streamlined',
  'executed', 'initiated', 'spearheaded', 'accelerated', 'enhanced',
  'pioneered', 'orchestrated', 'maximized', 'minimized', 'solved',
  'architected', 'scaled', 'modernized', 'revolutionized'
];

/**
 * Strong action verbs (German)
 */
const STRONG_ACTION_VERBS_DE = [
  'geleitet', 'gemanagt', 'entwickelt', 'implementiert', 'optimiert', 'designt',
  'erstellt', 'gebaut', 'gestartet', 'erreicht', 'verbessert', 'erhöht',
  'reduziert', 'etabliert', 'geliefert', 'transformiert', 'optimiert',
  'durchgeführt', 'initiiert', 'angeführt', 'beschleunigt', 'verbessert',
  'vorangetrieben', 'koordiniert', 'maximiert', 'minimiert', 'gelöst',
  'architekturiert', 'skaliert', 'modernisiert', 'revolutioniert',
  'umgesetzt', 'realisiert', 'gesteuert', 'überwacht', 'organisiert',
  'verwaltet', 'betreut', 'beraten', 'erfolgreich', 'verantwortlich'
];

/**
 * Weak verbs that should be avoided
 */
const WEAK_VERBS = [
  'responsible for', 'worked on', 'assisted with', 'helped with',
  'was involved in', 'participated in', 'took part in'
];

/**
 * Professional email patterns (to detect unprofessional emails)
 */
const UNPROFESSIONAL_EMAIL_PATTERNS = [
  /party/i, /drunk/i, /lazy/i, /cool/i, /sexy/i, /hot/i,
  /gamer/i, /ninja/i, /rockstar/i, /hacker/i, /\d{4,}/, // 4+ consecutive numbers
  /(.)\1{3,}/ // repeated characters like aaa@gmail.com
];

/**
 * Calculate comprehensive resume score (0-10 scale, converted to 0-100 for display)
 */
export const calculateResumeScore = (data: CVFormData): ResumeScore => {
  const categories: ScoreCategory[] = [];
  const suggestions: string[] = [];
  let totalScore = 0;
  let bonuses = 0;

  // Extract data sections early for use throughout
  const workExp = data.workExperience || [];
  const education = data.education || [];
  const summary = data.personalInfo.summary || '';
  const skills = (data.skills || []).map(s => s.skill?.toLowerCase() || '').filter(Boolean);
  const validSkills = (data.skills || []).filter(s => s.skill && s.skill.trim()).length;

  // Language-agnostic metrics patterns (defined once, used throughout)
  const metricsPattern = /\b(\d+[%]|\$\d+[KM]?|€\d+[KM]?|\d+\s*[%]|\d+\s*(years?|months?|people|users|customers|clients|team members?|Jahre?|Monate?|Personen?|Mitarbeiter?|Kunden?|Menschen?))\b/i;
  const universalMetricsPattern = /\b\d+\s*(%|€|\$|Mio|Mio\.|Million|Millionen|Tausend|K|M|BN|Billion|Milliarden|Jahre|Monate|Personen|Mitarbeiter|Kunden|Menschen|users|people|years|months|customers|clients|team)\b/i;

  // Calculate text length metrics once - used in multiple sections
  const workDescriptions = workExp.map(exp => exp.description || '').filter(Boolean);
  const avgLength = workDescriptions.length > 0 
    ? workDescriptions.reduce((sum, d) => sum + d.length, 0) / workDescriptions.length
    : 0;
  const summaryLength = (data.personalInfo.summary || '').length;
  const projects = data.projects || [];
  const projectDescriptions = projects.map(p => (p.description || '').length);
  const avgProjectLength = projectDescriptions.length > 0
    ? projectDescriptions.reduce((sum, len) => sum + len, 0) / projectDescriptions.length
    : 0;

  // ============================================
  // 1. CONTENT QUALITY (3 points)
  // ============================================
  let contentScore = 0;
  
  // Strong action verbs (0.5 pts) - language-agnostic detection
  const allText = getAllTextContent(data);
  const hasStrongVerbsEN = STRONG_ACTION_VERBS_EN.some(verb => 
    new RegExp(`\\b${verb}\\w*\\b`, 'i').test(allText)
  );
  const hasStrongVerbsDE = STRONG_ACTION_VERBS_DE.some(verb => 
    new RegExp(`\\b${verb}\\w*\\b`, 'i').test(allText)
  );
  const hasStrongVerbs = hasStrongVerbsEN || hasStrongVerbsDE;
  if (hasStrongVerbs) contentScore += 0.5;
  else suggestions.push("Use strong action verbs like 'Led', 'Developed', 'Implemented' instead of 'Responsible for' or 'Worked on'");
  
  // Quantifiable achievements (1 pt) - language-agnostic (numbers/percentages work in all languages)
  const hasMetrics = metricsPattern.test(allText) || universalMetricsPattern.test(allText) || /\d+[%]/.test(allText);
  if (hasMetrics) contentScore += 1;
  else suggestions.push("Add specific numbers to showcase impact: revenue increased (%), team size managed, cost savings ($), users reached, etc.");
  
  // Relevance (0.5 pts) - check if skills match experience
  const workExpTextForRelevance = workExp.map(exp => 
    `${exp.position || ''} ${exp.description || ''}`.toLowerCase()
  ).join(' ');
  // Check if skills are mentioned in work experience or if there are enough skills
  const hasRelevance = skills.length > 0 && (
    skills.some(skill => workExpTextForRelevance.includes(skill)) || 
    skills.length >= 3
  );
  if (hasRelevance) contentScore += 0.5;
  else suggestions.push("Ensure your skills are relevant and match your work experience");
  
  // Impact-focused (1 pt) - descriptions focus on outcomes (language-agnostic)
  const impactFocusedCount = workExp.filter(exp => {
    const desc = exp.description || '';
    // Check for outcome indicators in both languages
    const outcomeEN = /\b(improved|increased|reduced|achieved|delivered|optimized|enhanced)\b/i.test(desc);
    const outcomeDE = /\b(verbessert|erhöht|reduziert|erreicht|geliefert|optimiert|gesteigert|verstärkt)\b/i.test(desc);
    const hasOutcome = outcomeEN || outcomeDE;
    const hasResult = metricsPattern.test(desc) || universalMetricsPattern.test(desc) || /\d+[%]/.test(desc);
    const hasActionEN = STRONG_ACTION_VERBS_EN.some(verb => new RegExp(`\\b${verb}\\w*\\b`, 'i').test(desc));
    const hasActionDE = STRONG_ACTION_VERBS_DE.some(verb => new RegExp(`\\b${verb}\\w*\\b`, 'i').test(desc));
    const hasAction = hasActionEN || hasActionDE;
    return (hasOutcome || hasResult) && hasAction;
  }).length;
  
  if (impactFocusedCount >= Math.min(workExp.length, 2)) contentScore += 1;
  // Removed duplicate suggestion - similar message is in Experience Section
  
  categories.push({
    name: "Content Quality",
    score: Math.round(contentScore * 10) / 10,
    maxScore: 3,
    feedback: contentScore >= 2.5 ? "Excellent use of action verbs and metrics" : 
              contentScore >= 2 ? "Good content, add more quantifiable achievements" :
              "Needs stronger action verbs and measurable results"
  });
  totalScore += contentScore;

  // Estimate length once for global red-flag checks (not tied to formatting criteria)
  const estimatedLength = estimateResumePages(data);

  // ============================================
  // 2. PROFESSIONAL SUMMARY (1 point)
  // ============================================
  let summaryScore = 0;
  
  // Compelling (0.5 pts) - not generic, has value proposition
  const genericPhrases = ['hard worker', 'team player', 'detail oriented', 'good communicator'];
  const isGeneric = genericPhrases.some(phrase => summary.toLowerCase().includes(phrase));
  const hasValueProp = summary.length >= 50 && !isGeneric && 
                      (summary.includes(data.personalInfo.professionalTitle || '') || 
                       summary.split(' ').length >= 15);
  if (hasValueProp) summaryScore += 0.5;
  else if (summary.length > 0) suggestions.push("Make your professional summary more specific and compelling - avoid generic phrases");
  else suggestions.push("Add a professional summary that highlights your value proposition");
  
  // Specific (0.5 pts) - mentions experience, skills, achievements
  const mentionsExperience = /\d+\s*(years?|months?)\s*(of\s*)?(experience|expertise)/i.test(summary);
  const mentionsSkills = skills.some(skill => summary.toLowerCase().includes(skill.toLowerCase()));
  const mentionsAchievement = metricsPattern.test(summary);
  const isSpecific = (mentionsExperience || mentionsSkills || mentionsAchievement) && summary.length >= 50;
  
  if (isSpecific) summaryScore += 0.5;
  else if (summary.length > 0) suggestions.push("Make your summary more specific - mention years of experience, key technologies, or achievements");
  
  categories.push({
    name: "Professional Summary",
    score: Math.round(summaryScore * 10) / 10,
    maxScore: 1,
    feedback: summaryScore >= 0.9 ? "Compelling and specific summary" :
              summaryScore >= 0.5 ? "Good summary, add more specifics" :
              "Add or improve your professional summary"
  });
  totalScore += summaryScore;

  // ============================================
  // 3. EXPERIENCE SECTION (2 points)
  // ============================================
  let experienceScore = 0;
  
  // Recent and relevant (0.5 pts) - most recent roles are detailed
  const recentWork = workExp.slice(0, 2);
  const recentWorkDetailed = recentWork.filter(exp => 
    exp.position && exp.company && exp.description && exp.description.length >= 50
  ).length;
  
  if (recentWorkDetailed >= Math.min(recentWork.length, 1)) {
    experienceScore += 0.5;
  } else if (workExp.length > 0) {
    // Give base points for having work experience entries, even if minimal
    const hasBasicWorkInfo = workExp.some(exp => exp.position && exp.company);
    if (hasBasicWorkInfo) experienceScore += 0.2; // Base points for having work experience structure
    suggestions.push("Provide detailed descriptions for your most recent roles");
  }
  
  // Achievement-oriented (1 pt) - focuses on accomplishments (language-agnostic)
  const achievementOrientedCount = workExp.filter(exp => {
    const desc = exp.description || '';
    const hasMetrics = metricsPattern.test(desc) || universalMetricsPattern.test(desc) || /\d+[%]/.test(desc);
    const hasActionEN = STRONG_ACTION_VERBS_EN.some(verb => 
      new RegExp(`\\b${verb}\\w*\\b`, 'i').test(desc)
    );
    const hasActionDE = STRONG_ACTION_VERBS_DE.some(verb => 
      new RegExp(`\\b${verb}\\w*\\b`, 'i').test(desc)
    );
    const hasAchievement = hasMetrics || hasActionEN || hasActionDE;
    return hasAchievement && desc.length >= 50;
  }).length;
  
  if (achievementOrientedCount >= Math.min(workExp.length, 2)) {
    experienceScore += 1;
  } else if (workExp.length > 0) {
    // Give base points for having work experience with descriptions, even if not achievement-focused yet
    const hasDescriptions = workExp.some(exp => exp.description && exp.description.length > 0);
    if (hasDescriptions) experienceScore += 0.3; // Base points for having descriptions
    suggestions.push("Focus on achievements and outcomes in your work experience, not just responsibilities");
  }
  // Don't suggest adding experience if it doesn't exist - that's optional
  
  // Context provided (0.5 pts) - company info, industry/role context mentioned
  const hasContext = workExp.some(exp => {
    const desc = (exp.description || '').toLowerCase();
    const hasCompanyInfo = exp.company && exp.company.length > 2;
    const hasLocation = exp.location && exp.location.length > 2;
    const hasDetailedDescription = desc.length >= 100;
    const mentionsIndustry = /\b(industry|sector|field|domain|area)\b/i.test(desc);
    return hasCompanyInfo && (hasLocation || mentionsIndustry || hasDetailedDescription);
  });
  
  if (hasContext) {
    experienceScore += 0.5;
  } else if (workExp.length > 0) {
    // Give base points for having company info, even if context is minimal
    const hasCompanyInfo = workExp.some(exp => exp.company && exp.company.length > 2);
    if (hasCompanyInfo) experienceScore += 0.2; // Base points for having company information
    suggestions.push("Add context like company size, industry, or technologies used in your experience");
  }
  // Don't penalize if no work experience - that's optional
  
  categories.push({
    name: "Experience Section",
    score: Math.round(experienceScore * 10) / 10,
    maxScore: 2,
    feedback: experienceScore >= 1.8 ? "Excellent achievement-focused experience" :
              experienceScore >= 1.5 ? "Good experience section, highlight more achievements" :
              "Add more detailed, achievement-oriented experience"
  });
  totalScore += experienceScore;

  // ============================================
  // 4. SKILLS & TECHNICAL PROFICIENCY (1 point)
  // ============================================
  let skillsScore = 0;
  
  // Organized (0.3 pts) - skills are present and not excessive
  if (validSkills >= 3 && validSkills <= 20) {
    skillsScore += 0.3;
  } else if (validSkills > 20) {
    suggestions.push("Consider reducing your skills list - focus on the most relevant ones");
  } else if (validSkills > 0) {
    // Give base points for having skills, even if minimal
    skillsScore += 0.1; // Base points for having at least some skills
    if (validSkills < 3) {
      suggestions.push(`Add more skills to showcase your expertise (currently ${validSkills}, aim for at least 3-5 for better scoring)`);
    } else {
    suggestions.push("Add more skills to showcase your expertise");
    }
  }
  
  // Relevant (0.4 pts) - skills match industry standards and experience
  const workExpTextForSkills = (data.workExperience || []).map(exp => 
    `${exp.position || ''} ${exp.description || ''}`.toLowerCase()
  ).join(' ');
  const skillsMatchExperience = skills.some(skill => workExpTextForSkills.includes(skill));
  const hasRelevantSkills = validSkills >= 5 && (
    skillsMatchExperience || 
    validSkills >= 8
  );
  if (hasRelevantSkills) {
    skillsScore += 0.4;
  } else if (validSkills >= 3) {
    // Give base points for having 3+ skills, even if not fully relevant
    skillsScore += 0.2;
    if (validSkills < 5) {
      suggestions.push(`Add more relevant skills that match industry standards and your experience (currently ${validSkills}, aim for 5+ for maximum scoring)`);
    } else {
    suggestions.push("Add more relevant skills that match industry standards and your experience");
    }
  } else if (validSkills > 0) {
    // Already got 0.1 from organized section, just suggest adding more
    suggestions.push(`Add more relevant skills that match industry standards and your experience (currently ${validSkills}, aim for 5+ for maximum scoring)`);
  }
  // Don't suggest if no skills - that's optional
  
  // Not oversaturated (0.3 pts) - focused list
  if (validSkills >= 5 && validSkills <= 15) skillsScore += 0.3;
  else if (validSkills > 15) suggestions.push("Your skills list may be too long - focus on the most relevant and important skills");
  
  categories.push({
    name: "Skills & Proficiency",
    score: Math.round(skillsScore * 10) / 10,
    maxScore: 1,
    feedback: skillsScore >= 0.9 ? "Well-organized and relevant skills" :
              skillsScore >= 0.6 ? "Good skills, ensure they're relevant" :
              "Add more relevant, organized skills"
  });
  totalScore += skillsScore;

  // ============================================
  // 5. EDUCATION & CERTIFICATIONS (0.5 points)
  // ============================================
  let educationScore = 0;
  
  // Complete (0.25 pts) - degree, institution, dates included
  const completeEdu = education.filter(edu => 
    edu.degree && edu.institution && (edu.startDate || edu.endDate)
  ).length;
  
  if (completeEdu >= 1) {
    educationScore += 0.25;
  } else if (education.length > 0) {
    // Give base points for having education entries, even if incomplete
    const hasBasicEduInfo = education.some(edu => edu.degree && edu.institution);
    if (hasBasicEduInfo) educationScore += 0.15; // Base points for having education structure
    suggestions.push("Complete your education entries with degree, institution, and dates");
  }
  
  // Relevant certs (0.25 pts) - industry-recognized certifications
  const certs = data.certificates || [];
  const validCerts = certs.filter(cert => cert.name && cert.organization).length;
  
  if (validCerts >= 1) educationScore += 0.25;
  else suggestions.push("Consider adding industry-recognized certifications to strengthen your resume");
  
  categories.push({
    name: "Education & Certifications",
    score: Math.round(educationScore * 10) / 10,
    maxScore: 0.5,
    feedback: educationScore >= 0.45 ? "Complete education and certifications" :
              educationScore >= 0.25 ? "Add more education or certification details" :
              "Add education and certification information"
  });
  totalScore += educationScore;

  // ============================================
  // 6. ATS OPTIMIZATION (0.5 points)
  // ============================================
  let atsScore = 0;
  
  // Keyword-rich (0.25 pts) - contains relevant industry keywords
  // Only give points if there's actual content, not just empty fields
  const hasKeywords = validSkills >= 5 || (summary.length >= 50 && summary.trim().length > 0) || (workExp.length > 0 && workExp.some(exp => exp.position && exp.company));
  if (hasKeywords) atsScore += 0.25;
  else if (validSkills > 0 || summary.length > 0 || workExp.length > 0) {
    suggestions.push("Add more industry keywords and relevant terms to improve ATS compatibility");
  }
  
  // Standard formatting (0.25 pts) - template-based (assumes templates are ATS-friendly)
  // Only give points if there's substantial resume content, not just minimal fields
  const hasSubstantialContentForATS = (workExp.length > 0 && workExp.some(exp => exp.position || exp.company)) ||
                                      (education.length > 0 && education.some(edu => edu.degree || edu.institution)) ||
                                      validSkills >= 3 ||
                                      (summary && summary.trim().length >= 50);
  if (data.template && hasSubstantialContentForATS) atsScore += 0.25;
  else if (!data.template) suggestions.push("Select a template - our templates are ATS-optimized");
  
  categories.push({
    name: "ATS Optimization",
    score: Math.round(atsScore * 10) / 10,
    maxScore: 0.5,
    feedback: atsScore >= 0.45 ? "Well-optimized for ATS systems" :
              "Add more keywords and ensure ATS-friendly section content"
  });
  totalScore += atsScore;

  // ============================================
  // BONUS POINTS (Max +1)
  // ============================================
  
  // Professional links/portfolio (website, LinkedIn, portfolio) - bonus only, no penalty
  if (data.personalInfo.website || data.personalInfo.linkedin) {
    bonuses += 0.3;
  }
  // Don't suggest adding these - they're optional
  
  // Metrics-rich resume bonus - reward quantified achievements
  // Count all metric occurrences in the text using comprehensive pattern matching
  const comprehensiveMetricsPattern = /\b\d+\s*(%|€|\$|Mio|Mio\.|Million|Millionen|Tausend|K|M|BN|Billion|Milliarden|Jahre|Monate|Personen|Mitarbeiter|Kunden|Menschen|users|people|years|months|customers|clients|team|members?)\b|\$\d+[KM]?|€\d+[KM]?|\d+[%]/gi;
  const allMetricsMatches = allText.match(comprehensiveMetricsPattern) || [];
  const metricsCount = allMetricsMatches.length;
  if (metricsCount >= 10) {
    bonuses += 0.5; // Additional bonus for highly quantified resume (10+ metrics)
  } else if (metricsCount >= 5) {
    bonuses += 0.3; // Bonus for metrics-rich resume (5+ quantified results)
  }
  
  // Additional credentials (projects, publications, volunteer work)
  const userProjects = data.projects || [];
  const hasProjects = userProjects.filter(p => p.name && p.description).length > 0;
  const mentionsProjects = /\b(project|portfolio|publication|published|article|blog|volunteer)\b/i.test(allText);
  if (hasProjects || mentionsProjects) bonuses += 0.3;
  
  // Professional achievements (awards, certifications, speaking engagements)
  const userCertificates = data.certificates || [];
  const hasCertificates = userCertificates.length > 0;
  const mentionsAchievements = /\b(award|certification|certified|speaking|conference|presentation|recognition)\b/i.test(allText);
  if (hasCertificates || mentionsAchievements) bonuses += 0.2;
  
  // Leadership/Mentoring/Management experience (universal for all professions)
  const mentionsLeadership = /\b(led|lead|managed|mentor|mentoring|team|supervised|directed|coordinated|organized)\b/i.test(allText);
  if (mentionsLeadership && workExp.length > 0) bonuses += 0.2;

  // ============================================
  // FINAL CALCULATION
  // ============================================
  
  // Check if resume is essentially empty - only contact info, no actual resume content
  // Resume is empty if it only has personal contact info but no work experience, education, skills, projects, certificates, languages, or summary
  const hasActualResumeContent = (
    (workExp.length > 0 && workExp.some(exp => (exp.position && exp.position.trim()) || (exp.company && exp.company.trim()))) ||
    (education.length > 0 && education.some(edu => (edu.degree && edu.degree.trim()) || (edu.institution && edu.institution.trim()))) ||
    validSkills > 0 ||
    (data.projects && data.projects.length > 0 && data.projects.some(p => p.name && p.name.trim())) ||
    (data.certificates && data.certificates.length > 0 && data.certificates.some(c => c.name && c.name.trim())) ||
    (data.languages && data.languages.length > 0 && data.languages.some(l => l.language && l.language.trim())) ||
    (summary && summary.trim().length > 0)
  );
  
  // If resume has no actual content (only contact info), score should be 0
  if (!hasActualResumeContent) {
    totalScore = 0;
  } else {
    // Structure/format criterion was removed. Normalize remaining base score (8 max) to 10.
    // Scoring is additive-only: no deductions are applied.
    const normalizedBaseScore = (totalScore / 8) * 10;
    totalScore = Math.max(0, Math.min(10, normalizedBaseScore + bonuses));
  }
  
  // Round to 1 decimal place for 0-10 scale
  const overallScore = Math.round(totalScore * 10) / 10;
  
  // Add overall suggestions based on score (0-10 scale)
  if (overallScore < 5) {
    suggestions.unshift("Your resume has good foundations. Consider adding more quantifiable achievements and strong action verbs to strengthen it further.");
  } else if (overallScore < 7) {
    suggestions.unshift("Your resume is solid! Adding more metrics and impact-focused descriptions would make it even stronger.");
  } else if (overallScore < 9) {
    suggestions.unshift("Great resume! A few more quantified achievements would make it exceptional.");
  } else if (overallScore >= 9) {
    suggestions.unshift("Excellent resume! You're well-positioned for job applications.");
  }

  return {
    overallScore,
    categories,
    suggestions: [...new Set(suggestions)].slice(0, 10), // Remove duplicates and limit to 10
    fromAi: false,
  };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all text content from resume for analysis
 */
function getAllTextContent(data: CVFormData): string {
  const parts: string[] = [];
  
  // Personal info
  parts.push(data.personalInfo.summary || '');
  parts.push(data.personalInfo.professionalTitle || '');
  
  // Work experience
  (data.workExperience || []).forEach(exp => {
    parts.push(exp.description || '');
    (exp.responsibilities || []).forEach(r => parts.push(r.responsibility || ''));
  });
  
  // Projects
  (data.projects || []).forEach(proj => {
    parts.push(proj.description || '');
    (proj.highlights || []).forEach(h => parts.push(h.highlight || ''));
  });
  
  return parts.join(' ').toLowerCase();
}

/**
 * Estimate resume length in pages (rough approximation, ~250 words per page).
 */
export function estimateResumePages(data: CVFormData): number {
  let wordCount = 0;
  
  // Personal info
  wordCount += (data.personalInfo.summary || '').split(/\s+/).length;
  wordCount += (data.personalInfo.professionalTitle || '').split(/\s+/).length;
  
  // Work experience (largest section)
  (data.workExperience || []).forEach(exp => {
    wordCount += (exp.description || '').split(/\s+/).length;
    wordCount += (exp.position || '').split(/\s+/).length;
    wordCount += (exp.company || '').split(/\s+/).length;
  });
  
  // Education
  (data.education || []).forEach(edu => {
    wordCount += (edu.degree || '').split(/\s+/).length;
    wordCount += (edu.field || '').split(/\s+/).length;
  });
  
  // Projects
  (data.projects || []).forEach(proj => {
    wordCount += (proj.description || '').split(/\s+/).length;
  });
  
  // Skills and other sections add minimal space
  wordCount += (data.skills || []).length * 0.5;
  
  // Rough estimate: ~250 words per page for resume format
  return wordCount / 250;
}

/**
 * Calculate years of experience from work history
 */
function calculateYearsOfExperience(data: CVFormData): number {
  const workExp = data.workExperience || [];
  if (workExp.length === 0) return 0;
  
  // Try to extract dates and calculate total
  let totalMonths = 0;
  workExp.forEach(exp => {
    if (exp.startDate) {
      const start = parseDate(exp.startDate);
      const end = exp.endDate ? parseDate(exp.endDate) : new Date(); // Current if no end date
      if (start && end) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                      (end.getMonth() - start.getMonth());
        totalMonths += Math.max(0, months);
      }
    }
  });
  
  return Math.round(totalMonths / 12);
}

/**
 * Parse date string (YYYY-MM format)
 */
function parseDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      if (!isNaN(year) && !isNaN(month)) {
        return new Date(year, month, 1);
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  return null;
}

/**
 * Check for common typo indicators
 */
function checkForCommonTypos(text: string): number {
  let typoCount = 0;
  
  // Check for common misspellings
  const commonTypos = [
    /\bteh\b/i, // "the"
    /\badn\b/i, // "and"
    /\byoru\b/i, // "your"
    /\byrou\b/i, // "your"
    /\baccross\b/i, // "across"
    /\bseperate\b/i, // "separate"
  ];
  
  typoCount += commonTypos.filter(pattern => pattern.test(text)).length;
  
  // Check for repeated words (common typo)
  const repeatedWordPattern = /\b(\w+)\s+\1\b/gi;
  const repeatedMatches = text.match(repeatedWordPattern);
  if (repeatedMatches) typoCount += repeatedMatches.length;
  
  return Math.min(typoCount, 3); // Cap at 3 for scoring
}

/**
 * Check for employment gaps
 */
function checkForEmploymentGaps(workExp: Array<{ startDate?: string; endDate?: string }>): boolean {
  if (workExp.length < 2) return false;
  
  // Sort by start date (most recent first, assuming they're already ordered)
  const sorted = [...workExp].filter(exp => exp.startDate && exp.endDate);
  if (sorted.length < 2) return false;
  
  // Check for gaps larger than 6 months
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = parseDate(sorted[i].endDate!);
    const nextStart = parseDate(sorted[i + 1].startDate!);
    
    if (currentEnd && nextStart) {
      const months = (currentEnd.getFullYear() - nextStart.getFullYear()) * 12 + 
                    (currentEnd.getMonth() - nextStart.getMonth());
      if (months > 6) {
        return true; // Gap larger than 6 months
      }
    }
  }
  
  return false;
}
