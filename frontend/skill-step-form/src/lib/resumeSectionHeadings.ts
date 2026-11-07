// Section-heading translations for RESUME rendering, independent of the app UI
// language. A resume can be translated into a language the app UI itself does
// not support (es/fr/it/pt/tr), so templates resolve their section headings
// (`resume.sections.*`) against this table using the resume's own language,
// falling back to the UI translator for everything else.
//
// Keys mirror the `resume.sections.*` i18n keys used by the templates. Keep in
// sync with the translation targets in src/lib/translationLanguages.ts.

const SECTION_PREFIX = "resume.sections.";

type SectionHeadings = Record<string, string>;

export const RESUME_SECTION_HEADINGS: Record<string, SectionHeadings> = {
  en: {
    professionalSummary: "Professional Summary",
    summary: "Summary",
    aboutMe: "About Me",
    contact: "Contact",
    workExperience: "Work Experience",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
    certifications: "Certifications",
    publications: "Publications",
    skills: "Skills",
    languages: "Languages",
    interests: "Interests",
    technologies: "Technologies",
  },
  de: {
    professionalSummary: "Professionelle Zusammenfassung",
    summary: "Zusammenfassung",
    aboutMe: "Über mich",
    contact: "Kontakt",
    workExperience: "Berufserfahrung",
    experience: "Erfahrung",
    education: "Bildung",
    projects: "Projekte",
    certifications: "Zertifizierungen",
    publications: "Publikationen",
    skills: "Fähigkeiten",
    languages: "Sprachen",
    interests: "Interessen",
    technologies: "Technologien",
  },
  es: {
    professionalSummary: "Resumen Profesional",
    summary: "Resumen",
    aboutMe: "Sobre Mí",
    contact: "Contacto",
    workExperience: "Experiencia Laboral",
    experience: "Experiencia",
    education: "Educación",
    projects: "Proyectos",
    certifications: "Certificaciones",
    publications: "Publicaciones",
    skills: "Habilidades",
    languages: "Idiomas",
    interests: "Intereses",
    technologies: "Tecnologías",
  },
  fr: {
    professionalSummary: "Résumé Professionnel",
    summary: "Résumé",
    aboutMe: "À Propos",
    contact: "Contact",
    workExperience: "Expérience Professionnelle",
    experience: "Expérience",
    education: "Formation",
    projects: "Projets",
    certifications: "Certifications",
    publications: "Publications",
    skills: "Compétences",
    languages: "Langues",
    interests: "Centres d'Intérêt",
    technologies: "Technologies",
  },
  it: {
    professionalSummary: "Profilo Professionale",
    summary: "Riepilogo",
    aboutMe: "Su di Me",
    contact: "Contatti",
    workExperience: "Esperienza Lavorativa",
    experience: "Esperienza",
    education: "Istruzione",
    projects: "Progetti",
    certifications: "Certificazioni",
    publications: "Pubblicazioni",
    skills: "Competenze",
    languages: "Lingue",
    interests: "Interessi",
    technologies: "Tecnologie",
  },
  pt: {
    professionalSummary: "Resumo Profissional",
    summary: "Resumo",
    aboutMe: "Sobre Mim",
    contact: "Contato",
    workExperience: "Experiência Profissional",
    experience: "Experiência",
    education: "Formação",
    projects: "Projetos",
    certifications: "Certificações",
    publications: "Publicações",
    skills: "Competências",
    languages: "Idiomas",
    interests: "Interesses",
    technologies: "Tecnologias",
  },
  tr: {
    professionalSummary: "Profesyonel Özet",
    summary: "Özet",
    aboutMe: "Hakkımda",
    contact: "İletişim",
    workExperience: "İş Deneyimi",
    experience: "Deneyim",
    education: "Eğitim",
    projects: "Projeler",
    certifications: "Sertifikalar",
    publications: "Yayınlar",
    skills: "Yetenekler",
    languages: "Diller",
    interests: "İlgi Alanları",
    technologies: "Teknolojiler",
  },
};

// Language levels (`resume.proficiency.*`), in the resume's language too, so a
// translated resume doesn't show levels in the app's UI language.
const PROFICIENCY_PREFIX = "resume.proficiency.";

export const RESUME_PROFICIENCY_LABELS: Record<string, Record<string, string>> = {
  en: { native: "Native", fluent: "Fluent", advanced: "Advanced", intermediate: "Intermediate", basic: "Basic" },
  de: { native: "Muttersprache", fluent: "Fließend", advanced: "Fortgeschritten", intermediate: "Mittelstufe", basic: "Grundkenntnisse" },
  es: { native: "Nativo", fluent: "Fluido", advanced: "Avanzado", intermediate: "Intermedio", basic: "Básico" },
  fr: { native: "Langue maternelle", fluent: "Courant", advanced: "Avancé", intermediate: "Intermédiaire", basic: "Notions de base" },
  it: { native: "Madrelingua", fluent: "Fluente", advanced: "Avanzato", intermediate: "Intermedio", basic: "Base" },
  pt: { native: "Nativo", fluent: "Fluente", advanced: "Avançado", intermediate: "Intermediário", basic: "Básico" },
  tr: { native: "Ana dil", fluent: "Akıcı", advanced: "İleri", intermediate: "Orta", basic: "Temel" },
};

type UiTranslate = (key: string, ...args: unknown[]) => string;

/**
 * Wrap the UI translator so that `resume.sections.*` and `resume.proficiency.*`
 * keys resolve to the resume's own language (when set and supported); every
 * other key falls through to the UI translator unchanged. Templates swap their
 * `t` for this.
 */
export const makeResumeT = (
  uiT: UiTranslate,
  resumeLanguage?: string | null,
): UiTranslate => {
  const table = resumeLanguage ? RESUME_SECTION_HEADINGS[resumeLanguage] : undefined;
  const levels = resumeLanguage ? RESUME_PROFICIENCY_LABELS[resumeLanguage] : undefined;
  if (!table && !levels) return uiT;
  return (key: string, ...args: unknown[]): string => {
    if (typeof key === "string" && table && key.startsWith(SECTION_PREFIX)) {
      const heading = table[key.slice(SECTION_PREFIX.length)];
      if (heading) return heading;
    }
    if (typeof key === "string" && levels && key.startsWith(PROFICIENCY_PREFIX)) {
      const level = levels[key.slice(PROFICIENCY_PREFIX.length)];
      if (level) return level;
    }
    return uiT(key, ...args);
  };
};
