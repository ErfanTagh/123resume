import { CVFormData } from "@/components/cv-form/types";
import enTranslations from "@/i18n/locales/en.json";
import deTranslations from "@/i18n/locales/de.json";
import type { ResumeProseLanguage } from "@/lib/resumeContentLanguage";

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
  /** True when the feedback text was written by the AI rather than taken from the canned messages below. */
  fromAi?: boolean;
}

// ============================================
// MESSAGES
// ============================================

// Canned feedback lives in the locale files (resume.score.feedback / .categoryFeedback)
// so it is translated once. Looked up in the resume's language, English as fallback.
const SCORE_TEXT: Record<ResumeProseLanguage, unknown> = {
  en: enTranslations.resume.score,
  de: deTranslations.resume.score,
};

function lookup(root: unknown, path: string): string | undefined {
  let node: unknown = root;
  for (const key of path.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" ? node : undefined;
}

function message(lang: ResumeProseLanguage, path: string): string {
  return lookup(SCORE_TEXT[lang], path) ?? lookup(SCORE_TEXT.en, path) ?? path;
}

// ============================================
// VOCABULARY
// ============================================

/**
 * Strong action verbs, matched as whole words. Prefix matching used to count
 * "customers" as a form of "cut" and "ledger" as "led".
 */
const STRONG_ACTION_VERBS_EN = [
  'led', 'managed', 'developed', 'implemented', 'optimized', 'optimised', 'designed',
  'created', 'built', 'launched', 'achieved', 'improved', 'increased',
  'reduced', 'established', 'delivered', 'transformed', 'streamlined',
  'executed', 'initiated', 'spearheaded', 'accelerated', 'enhanced',
  'pioneered', 'orchestrated', 'maximized', 'minimized', 'solved',
  'architected', 'scaled', 'modernized', 'revolutionized', 'trained', 'coached',
  'mentored', 'negotiated', 'resolved', 'won', 'grew', 'drove', 'owned',
  'shipped', 'automated', 'migrated', 'coordinated', 'analyzed', 'analysed',
  'cut', 'saved', 'exceeded',
];

/**
 * German resumes use both the past participle ("entwickelt") and the simple past
 * ("entwickelte"), so both are listed. "verantwortlich" and "erfolgreich" are
 * deliberately absent: "verantwortlich für" is the German "responsible for",
 * the weak phrasing this check exists to discourage.
 */
const STRONG_ACTION_VERBS_DE = [
  'geleitet', 'gemanagt', 'entwickelt', 'implementiert', 'optimiert', 'designt',
  'erstellt', 'gebaut', 'gestartet', 'erreicht', 'verbessert', 'erhöht',
  'reduziert', 'etabliert', 'geliefert', 'transformiert', 'durchgeführt',
  'initiiert', 'angeführt', 'beschleunigt', 'vorangetrieben', 'koordiniert',
  'maximiert', 'minimiert', 'gelöst', 'skaliert', 'modernisiert',
  'umgesetzt', 'realisiert', 'gesteuert', 'überwacht', 'organisiert',
  'verwaltet', 'betreut', 'beraten', 'eingearbeitet', 'geschult', 'aufgebaut',
  'eingeführt', 'konzipiert', 'gesteigert', 'gesenkt', 'verkürzt', 'übertroffen',
  'ausgebaut', 'verhandelt', 'automatisiert', 'analysiert', 'gewonnen', 'eingespart',
  'leitete', 'entwickelte', 'implementierte', 'optimierte', 'steigerte', 'reduzierte',
  'senkte', 'verkürzte', 'betreute', 'koordinierte', 'organisierte', 'führte',
  'baute', 'schulte', 'gewann', 'übertraf', 'erzielte', 'realisierte',
  'etablierte', 'verantwortete', 'konzipierte', 'plante', 'analysierte',
  'automatisierte', 'beriet', 'löste', 'verhandelte', 'steuerte', 'verbesserte',
  'erhöhte',
];

/** Words that state a result. */
const OUTCOME_WORDS = [
  'improved', 'increased', 'reduced', 'cut', 'grew', 'boosted', 'saved', 'achieved',
  'delivered', 'exceeded', 'accelerated', 'lowered', 'raised', 'doubled', 'tripled', 'won',
  'verbessert', 'erhöht', 'reduziert', 'gesenkt', 'gesteigert', 'verkürzt', 'übertroffen',
  'erreicht', 'eingespart', 'beschleunigt', 'verdoppelt', 'gewonnen', 'optimiert', 'verstärkt',
  'verbesserte', 'erhöhte', 'reduzierte', 'senkte', 'steigerte', 'verkürzte', 'übertraf',
  'erreichte', 'sparte', 'beschleunigte', 'verdoppelte', 'gewann', 'optimierte',
];

const GENERIC_SUMMARY_PHRASES = [
  'hard worker', 'hard-working', 'team player', 'detail oriented', 'detail-oriented',
  'good communicator', 'teamplayer', 'teamfähig', 'belastbar', 'motiviert', 'zuverlässig',
];

// \b is ASCII-only in JS regexes, so it never matched next to umlauts
// ("überwacht" could not be found). Use Unicode letter boundaries instead.
const wordListPattern = (words: string[]) =>
  new RegExp(`(?:^|[^\\p{L}])(?:${words.join("|")})(?=$|[^\\p{L}])`, "iu");

const STRONG_VERB_RE = wordListPattern([...STRONG_ACTION_VERBS_EN, ...STRONG_ACTION_VERBS_DE]);
const OUTCOME_RE = wordListPattern(OUTCOME_WORDS);
const YEARS_OF_EXPERIENCE_RE = /\d+\s*\+?\s*(?:years?|yrs?|jahre?n?)(?![\p{L}])/iu;
const COMPREHENSIVE_METRICS_RE = /\b\d+\s*(%|€|\$|Mio|Mio\.|Million|Millionen|Tausend|K|M|BN|Billion|Milliarden|Jahre|Monate|Personen|Mitarbeiter|Kunden|Menschen|users|people|years|months|customers|clients|team|members?)\b|\$\d+[KM]?|€\d+[KM]?|\d+[%]/gi;

/** Numbers other than bare years ("2021" dates a role; "30 %" measures one). */
function quantities(text: string): number {
  return (text.match(/\d+(?:[.,]\d+)*/g) || []).filter((n) => !/^(19|20)\d{2}$/.test(n)).length;
}

const hasQuantity = (text: string): boolean => /[%€$£]/.test(text) || quantities(text) > 0;
const isStrong = (text: string): boolean => STRONG_VERB_RE.test(text);
const showsResult = (text: string): boolean => hasQuantity(text) || OUTCOME_RE.test(text);

type WorkEntry = NonNullable<CVFormData["workExperience"]>[number];

/** Each bullet or role description is one "unit" of evidence a recruiter reads. */
function roleUnits(exp: WorkEntry): string[] {
  const units: string[] = [];
  const desc = (exp.description || '').trim();
  if (desc.length >= 3) units.push(desc);
  for (const r of exp.responsibilities || []) {
    const text = (r.responsibility || '').trim();
    if (text.length >= 3) units.push(text);
  }
  return units;
}

const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (x: number): number => Math.round(x * 10) / 10;

/**
 * Score a resume 0-10.
 *
 * Deterministic on purpose: the same resume always gets the same score, which
 * is why the displayed number comes from here and not from the AI. Every
 * criterion is proportional rather than pass/fail, so each bullet that gains a
 * strong verb or a number moves the score, and weakening one lowers it. The old
 * pass/fail version stopped responding once a resume cleared each threshold.
 *
 * `lang` selects the language of the canned feedback and suggestions.
 */
export const calculateResumeScore = (
  data: CVFormData,
  lang: ResumeProseLanguage = "en",
): ResumeScore => {
  const categories: ScoreCategory[] = [];
  const suggestions: string[] = [];
  const t = (path: string) => message(lang, path);
  let totalScore = 0;
  let bonuses = 0;

  const workExp = data.workExperience || [];
  const roles = workExp.filter((e) => (e.position || '').trim() || (e.company || '').trim());
  const education = data.education || [];
  const summary = (data.personalInfo.summary || '').trim();
  const summaryLower = summary.toLowerCase();
  const skills = (data.skills || []).map((s) => (s.skill || '').trim().toLowerCase()).filter((s) => s.length >= 2);
  const validSkills = (data.skills || []).filter((s) => s.skill && s.skill.trim()).length;

  const projectUnits = (data.projects || []).flatMap((p) =>
    (p.highlights || []).map((h) => (h.highlight || '').trim()).filter((h) => h.length >= 3),
  );
  const units = [...workExp.flatMap(roleUnits), ...projectUnits];
  const workText = [...roles.map((e) => e.position || ''), ...units].join(' ').toLowerCase();
  const matchedSkills = skills.filter((s) => workText.includes(s)).length;

  // ============================================
  // 1. CONTENT QUALITY (3 points)
  // ============================================
  // Shares of bullets, not "does at least one exist". Every listed role owes at
  // least two pieces of evidence and the floor is 3, so emptying a role or
  // deleting everything but one strong bullet can't raise the shares.
  const denom = Math.max(units.length, 2 * roles.length, 3);
  const verbShare = units.filter(isStrong).length / denom;
  const metricShare = units.filter(hasQuantity).length / denom;
  const impactShare = units.filter((u) => isStrong(u) && showsResult(u)).length / denom;
  const relevance = skills.length ? Math.min(1, matchedSkills / Math.min(3, skills.length)) : 0;
  const contentScore = 0.8 * verbShare + 1.2 * metricShare + 0.6 * impactShare + 0.4 * relevance;

  if (units.length && verbShare < 0.5) suggestions.push(t('feedback.actionVerbs'));
  if (units.length && metricShare < 0.4) suggestions.push(t('feedback.addSpecificNumbers'));
  if (skills.length && relevance < 0.5) suggestions.push(t('feedback.skillsRelevant'));

  categories.push({
    name: "Content Quality",
    score: round1(contentScore),
    maxScore: 3,
    feedback: t(`categoryFeedback.contentQuality.${contentScore >= 2.5 ? 'excellent' : contentScore >= 2 ? 'good' : 'needsImprovement'}`),
  });
  totalScore += contentScore;

  // ============================================
  // 2. PROFESSIONAL SUMMARY (1 point)
  // ============================================
  let summaryScore = 0;
  if (!summary) {
    suggestions.push(t('feedback.summaryMissing'));
  } else {
    const isGeneric = GENERIC_SUMMARY_PHRASES.some((p) => summaryLower.includes(p));
    const mentionsYears = YEARS_OF_EXPERIENCE_RE.test(summary);
    const skillMentions = skills.filter((s) => summaryLower.includes(s)).length;
    const numbers = quantities(summary);
    const titleWord = (data.personalInfo.professionalTitle || '').trim().toLowerCase().split(/\s+/)[0] || '';
    const mentionsRole = titleWord.length >= 3 && summaryLower.includes(titleWord);

    summaryScore =
      (summary.length > 700 ? 0.2 : Math.min(summary.length / 160, 1) * 0.3) +
      (isGeneric ? 0 : 0.1) +
      (mentionsYears ? 0.15 : 0) +
      Math.min(skillMentions, 2) * 0.075 +
      Math.min(numbers, 2) * 0.075 +
      (mentionsRole ? 0.1 : 0) +
      (isStrong(summary) || OUTCOME_RE.test(summary) ? 0.05 : 0);

    if (isGeneric || summary.length < 80) suggestions.push(t('feedback.summaryGeneric'));
    if (!mentionsYears && skillMentions === 0 && numbers === 0) suggestions.push(t('feedback.summarySpecific'));
  }

  categories.push({
    name: "Professional Summary",
    score: round1(summaryScore),
    maxScore: 1,
    feedback: t(`categoryFeedback.summary.${summaryScore >= 0.9 ? 'excellent' : summaryScore >= 0.5 ? 'good' : 'needsImprovement'}`),
  });
  totalScore += summaryScore;

  // ============================================
  // 3. EXPERIENCE SECTION (2 points)
  // ============================================
  // No penalty or suggestion when there is no work experience — it's optional.
  let experienceScore = 0;
  if (roles.length) {
    const textLength = (e: WorkEntry) => roleUnits(e).reduce((n, u) => n + u.length, 0);
    const scored = roles.slice(0, 4);
    // Detail of the two most recent roles; ~240 characters saturates.
    const detailPart = avg(roles.slice(0, 2).map((e) => Math.min(1, textLength(e) / 240))) * 0.6;
    // Two result-bearing bullets per role saturates.
    const achievementPart = avg(scored.map((e) => Math.min(roleUnits(e).filter(showsResult).length / 2, 1))) * 1.0;
    const contextPart = avg(scored.map((e) =>
      ((e.company || '').trim().length > 2 ? 0.5 : 0) +
      ((e.location || '').trim() ? 0.2 : 0) +
      ((e.startDate || '').trim() ? 0.3 : 0),
    )) * 0.4;
    experienceScore = detailPart + achievementPart + contextPart;

    if (detailPart < 0.4) suggestions.push(t('feedback.detailedDescriptions'));
    if (achievementPart < 0.6) suggestions.push(t('feedback.achievements'));
    if (contextPart < 0.3) suggestions.push(t('feedback.context'));
  }

  categories.push({
    name: "Experience Section",
    score: round1(experienceScore),
    maxScore: 2,
    feedback: t(`categoryFeedback.experience.${experienceScore >= 1.8 ? 'excellent' : experienceScore >= 1.5 ? 'good' : 'needsImprovement'}`),
  });
  totalScore += experienceScore;

  // ============================================
  // 4. SKILLS & TECHNICAL PROFICIENCY (1 point)
  // ============================================
  const skillsScore = Math.max(
    0,
    Math.min(validSkills / 8, 1) * 0.5 +
      (validSkills ? Math.min(1, matchedSkills / Math.min(3, validSkills)) * 0.3 : 0) +
      Math.min(validSkills / 5, 1) * 0.2 -
      (validSkills > 20 ? 0.2 : validSkills > 15 ? 0.1 : 0),
  );

  if (validSkills > 20) suggestions.push(t('feedback.tooManySkills'));
  else if (validSkills > 15) suggestions.push(t('feedback.skillsTooLong'));
  else if (validSkills > 0 && validSkills < 5) suggestions.push(t('feedback.addSkills'));
  if (validSkills >= 3 && matchedSkills === 0) suggestions.push(t('feedback.relevantSkills'));

  categories.push({
    name: "Skills & Proficiency",
    score: round1(skillsScore),
    maxScore: 1,
    feedback: t(`categoryFeedback.skills.${skillsScore >= 0.9 ? 'excellent' : skillsScore >= 0.6 ? 'good' : 'needsImprovement'}`),
  });
  totalScore += skillsScore;

  // ============================================
  // 5. EDUCATION & CERTIFICATIONS (0.5 points)
  // ============================================
  let educationScore = 0;

  const completeEdu = education.filter((edu) => edu.degree && edu.institution && (edu.startDate || edu.endDate)).length;
  if (completeEdu >= 1) {
    educationScore += 0.25;
  } else if (education.length > 0) {
    if (education.some((edu) => edu.degree && edu.institution)) educationScore += 0.15;
    suggestions.push(t('feedback.educationComplete'));
  }

  const validCerts = (data.certificates || []).filter((cert) => cert.name && cert.organization).length;
  if (validCerts >= 1) educationScore += 0.25;
  else suggestions.push(t('feedback.certifications'));

  categories.push({
    name: "Education & Certifications",
    score: round1(educationScore),
    maxScore: 0.5,
    feedback: t(`categoryFeedback.education.${educationScore >= 0.45 ? 'excellent' : 'needsImprovement'}`),
  });
  totalScore += educationScore;

  // ============================================
  // 6. ATS OPTIMIZATION (0.5 points)
  // ============================================
  let atsScore = 0;

  const hasKeywords = validSkills >= 5 || summary.length >= 50 || workExp.some((exp) => exp.position && exp.company);
  if (hasKeywords) atsScore += 0.25;
  else if (validSkills > 0 || summary.length > 0 || workExp.length > 0) {
    suggestions.push(t('feedback.keywords'));
  }

  // Templates are ATS-friendly; only credit them once there is real content.
  const hasSubstantialContentForATS =
    workExp.some((exp) => exp.position || exp.company) ||
    education.some((edu) => edu.degree || edu.institution) ||
    validSkills >= 3 ||
    summary.length >= 50;
  if (data.template && hasSubstantialContentForATS) atsScore += 0.25;
  else if (!data.template) suggestions.push(t('feedback.template'));

  categories.push({
    name: "ATS Optimization",
    score: round1(atsScore),
    maxScore: 0.5,
    feedback: t(`categoryFeedback.ats.${atsScore >= 0.45 ? 'excellent' : 'needsImprovement'}`),
  });
  totalScore += atsScore;

  // ============================================
  // BONUS POINTS — optional extras, never penalized when absent
  // ============================================
  const allText = getAllTextContent(data);

  if (data.personalInfo.website || data.personalInfo.linkedin) bonuses += 0.3;

  // Graded: every quantified result counts, up to 10.
  const metricsCount = (allText.match(COMPREHENSIVE_METRICS_RE) || []).length;
  bonuses += Math.min(metricsCount / 10, 1) * 0.5;

  const hasProjects = (data.projects || []).some((p) => p.name && p.description);
  const mentionsProjects = /\b(project|portfolio|publication|published|article|blog|volunteer|projekt|publikation|ehrenamt)/i.test(allText);
  if (hasProjects || mentionsProjects) bonuses += 0.3;

  const hasCertificates = (data.certificates || []).length > 0;
  const mentionsAchievements = /\b(award|certification|certified|speaking|conference|presentation|recognition|auszeichnung|zertifi|konferenz|vortrag)/i.test(allText);
  if (hasCertificates || mentionsAchievements) bonuses += 0.2;

  const mentionsLeadership = /\b(led|lead|managed|mentor|mentoring|team|supervised|directed|coordinated|organized|geleitet|leitete|führte|koordiniert)/i.test(allText);
  if (mentionsLeadership && workExp.length > 0) bonuses += 0.2;

  // ============================================
  // FINAL CALCULATION
  // ============================================
  // A resume with only contact details scores 0.
  const hasActualResumeContent =
    workExp.some((exp) => (exp.position && exp.position.trim()) || (exp.company && exp.company.trim())) ||
    education.some((edu) => (edu.degree && edu.degree.trim()) || (edu.institution && edu.institution.trim())) ||
    validSkills > 0 ||
    (data.projects || []).some((p) => p.name && p.name.trim()) ||
    (data.certificates || []).some((c) => c.name && c.name.trim()) ||
    (data.languages || []).some((l) => l.language && l.language.trim()) ||
    summary.length > 0;

  if (!hasActualResumeContent) {
    totalScore = 0;
  } else {
    // Base categories total 8; normalize to 10, then add bonuses. Additive only.
    totalScore = Math.max(0, Math.min(10, (totalScore / 8) * 10 + bonuses));
  }

  const overallScore = round1(totalScore);

  suggestions.unshift(t(
    overallScore < 5 ? 'feedback.foundations'
      : overallScore < 7 ? 'feedback.solid'
      : overallScore < 9 ? 'feedback.greatQuantify'
      : 'feedback.excellent',
  ));

  return {
    overallScore,
    categories,
    suggestions: [...new Set(suggestions)].slice(0, 10),
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
