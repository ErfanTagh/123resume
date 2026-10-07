/**
 * Directional checks for the local resume scorer and the AI-language picker.
 *
 *   npx tsx scripts/check-resume-scorer.ts
 *
 * Users saw a score that stayed frozen through real improvements, and German
 * resumes getting English advice. These checks pin the behaviour that fixed it:
 * a better resume scores higher, a worse one lower, the same one identically,
 * and prose follows the resume's language. Exits non-zero on any failure.
 */
import { calculateResumeScore } from "../src/lib/resumeScorer";
import {
  detectTextLanguage,
  resumeProseLanguage,
  textProseLanguage,
} from "../src/lib/resumeContentLanguage";

type Resume = Parameters<typeof calculateResumeScore>[0];
type Lang = "en" | "de";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `   [${detail}]` : ""}`);
  if (!ok) failures += 1;
}

const clone = (r: Resume): Resume => JSON.parse(JSON.stringify(r));
const overall = (r: Resume, lang: Lang) => calculateResumeScore(r, lang).overallScore;
const bullets = (texts: string[]) => texts.map((responsibility) => ({ responsibility }));
const skillList = (names: string[]) => names.map((skill) => ({ skill }));

const GERMAN: Resume = {
  template: "modern",
  personalInfo: {
    firstName: "Jana", lastName: "Wolf", email: "jana@example.de", location: "Hamburg",
    professionalTitle: "Kundenberaterin",
    summary: "Kundenberaterin mit 5 Jahren Erfahrung im Energiesektor. Schwerpunkt auf telefonischer Beratung, Beschwerdemanagement und Einarbeitung neuer Kollegen.",
    interests: [],
  },
  workExperience: [
    {
      position: "Kundenberaterin", company: "Stadtwerke Nord", startDate: "2021-01", endDate: "",
      description: "Telefonische und schriftliche Betreuung von Privat- und Gewerbekunden im Strom- und Gasvertrieb.",
      responsibilities: bullets([
        "war zuständig für die Kundenbetreuung am Telefon",
        "habe neue Kollegen eingearbeitet",
        "Beschwerden bearbeitet und Lösungen gefunden",
      ]),
      technologies: [], competencies: [],
    },
    {
      position: "Servicemitarbeiterin", company: "Hansa Mobil", startDate: "2018-03", endDate: "2020-12",
      description: "Beratung im Shop zu Mobilfunkverträgen und Endgeräten, Bearbeitung von Vertragsänderungen.",
      responsibilities: bullets(["Umsatzziele um 15 % übertroffen"]),
      technologies: [], competencies: [],
    },
  ],
  education: [{ degree: "Kauffrau für Büromanagement", institution: "IHK Hamburg", startDate: "2015-08", endDate: "2018-06", field: "" }],
  skills: skillList(["SAP", "Beschwerdemanagement", "MS Office", "Kundenberatung"]),
  languages: [{ language: "Deutsch", proficiency: "Muttersprache" }],
  projects: [], certificates: [],
} as Resume;

const ENGLISH: Resume = {
  template: "modern",
  personalInfo: {
    firstName: "Sam", lastName: "Lee", email: "sam@example.com", location: "London",
    professionalTitle: "Marketing Coordinator",
    summary: "Marketing coordinator with experience in social media and retail sales, looking for a role in brand marketing.",
    interests: [],
  },
  workExperience: [
    {
      position: "Marketing Coordinator", company: "Brightside Studio", startDate: "2023-07", endDate: "",
      description: "Coordinated social media and email campaigns for a design studio with retail clients.",
      responsibilities: bullets([
        "posted on instagram for the company",
        "made reports about how the posts did",
        "helped with the newsletter",
      ]),
      technologies: [], competencies: [],
    },
    {
      position: "Sales Associate", company: "Northwind Retail", startDate: "2021-03", endDate: "2023-06",
      description: "Advised customers on electronics and handled returns and exchanges in a busy store.",
      responsibilities: bullets(["Exceeded monthly sales targets by 12% in 2022"]),
      technologies: [], competencies: [],
    },
  ],
  education: [{ degree: "BA Marketing", institution: "University of Leeds", startDate: "2018-09", endDate: "2021-06", field: "" }],
  skills: skillList(["Instagram", "Canva", "Mailchimp", "Excel"]),
  languages: [{ language: "English", proficiency: "Native" }],
  projects: [], certificates: [],
} as Resume;

type Edit = { label: string; expect: "up" | "down" | "same"; apply: (r: Resume) => void };

function directional(name: string, base: Resume, lang: Lang, edits: Edit[]): void {
  const before = overall(base, lang);
  console.log(`\n--- ${name}: base score ${before} ---`);
  for (const { label, expect, apply } of edits) {
    const edited = clone(base);
    apply(edited);
    const after = overall(edited, lang);
    const ok = expect === "up" ? after > before : expect === "down" ? after < before : after === before;
    check(`${name}: ${label} -> ${expect}`, ok, `${before} -> ${after}`);
  }
}

// -------------------------------------------------------------------------
// 1. The score moves the right way
// -------------------------------------------------------------------------
directional("DE", GERMAN, "de", [
  { label: "identical copy", expect: "same", apply: () => {} },
  { label: "vague bullet becomes strong verb + metric", expect: "up", apply: (r) => {
    r.workExperience![0].responsibilities![1].responsibility = "12 neue Kolleginnen und Kollegen eingearbeitet und die Einarbeitungszeit um 30 % verkürzt"; } },
  { label: "all three weak bullets rewritten", expect: "up", apply: (r) => {
    r.workExperience![0].responsibilities = bullets([
      "Täglich über 60 Kundenanfragen gelöst und die Erstlösungsquote auf 87 % gesteigert",
      "12 neue Kolleginnen und Kollegen eingearbeitet, Einarbeitungszeit um 30 % verkürzt",
      "Beschwerdequote durch strukturierte Rückrufe um 20 % gesenkt",
    ]); } },
  { label: "summary made specific", expect: "up", apply: (r) => {
    r.personalInfo.summary = "Kundenberaterin mit 5 Jahren Erfahrung im Energiesektor, die täglich über 60 Anfragen löst und die Erstlösungsquote auf 87 % gesteigert hat. Stark in Beschwerdemanagement, SAP und der Einarbeitung neuer Teammitglieder."; } },
  { label: "four relevant skills added", expect: "up", apply: (r) => {
    r.skills!.push(...skillList(["Salesforce", "Konfliktlösung", "Zendesk", "Teamführung"])); } },
  { label: "strong new bullet added", expect: "up", apply: (r) => {
    r.workExperience![0].responsibilities!.push({ responsibility: "Kundenzufriedenheit durch ein neues Rückrufsystem um 18 % erhöht" }); } },
  { label: "the metric bullet weakened", expect: "down", apply: (r) => {
    r.workExperience![1].responsibilities![0].responsibility = "habe im Laden gearbeitet"; } },
  { label: "the metric bullet deleted", expect: "down", apply: (r) => {
    r.workExperience![1].responsibilities = []; } },
  { label: "latest role emptied", expect: "down", apply: (r) => {
    r.workExperience![0].description = ""; r.workExperience![0].responsibilities = []; } },
]);

directional("EN", ENGLISH, "en", [
  { label: "identical copy", expect: "same", apply: () => {} },
  { label: "vague bullet becomes strong verb + metric", expect: "up", apply: (r) => {
    r.workExperience![0].responsibilities![0].responsibility = "Grew the studio's Instagram following from 2,000 to 11,000 in nine months"; } },
  { label: "summary made specific", expect: "up", apply: (r) => {
    r.personalInfo.summary = "Marketing coordinator with 3 years of experience who grew a studio's Instagram audience 5x and lifted newsletter open rates to 41%. Skilled in Canva, Mailchimp and campaign reporting."; } },
  { label: "the metric bullet weakened", expect: "down", apply: (r) => {
    r.workExperience![1].responsibilities![0].responsibility = "worked in the store"; } },
]);

// -------------------------------------------------------------------------
// 2. Deterministic and in range
// -------------------------------------------------------------------------
console.log("\n--- determinism and bounds ---");
const a = calculateResumeScore(GERMAN, "de");
const b = calculateResumeScore(clone(GERMAN), "de");
check("same resume, same full result", JSON.stringify(a) === JSON.stringify(b));
check("overall within 0-10", a.overallScore >= 0 && a.overallScore <= 10, String(a.overallScore));
check("no category above its maximum", a.categories.every((c) => c.score <= c.maxScore),
  a.categories.map((c) => `${c.score}/${c.maxScore}`).join(" "));
const empty = calculateResumeScore({ personalInfo: { firstName: "A", lastName: "B", email: "a@b.de" } } as Resume, "de");
check("contact details only scores 0", empty.overallScore === 0, String(empty.overallScore));

// -------------------------------------------------------------------------
// 3. Prose follows the resume's language
// -------------------------------------------------------------------------
console.log("\n--- language ---");
check("German resume, English UI -> German prose", resumeProseLanguage(GERMAN, "en") === "de");
check("English resume, German UI -> English prose", resumeProseLanguage(ENGLISH, "de") === "en");
check("translator-declared language wins",
  resumeProseLanguage({ ...clone(ENGLISH), styling: { resumeLanguage: "de" } }, "en") === "de");
check("no text -> UI language", resumeProseLanguage({ personalInfo: { summary: "" } }, "de") === "de");
check("snake_case API resume is read too", resumeProseLanguage({
  personal_info: { summary: GERMAN.personalInfo.summary },
  work_experience: [{ description: "Betreuung von Kunden und Einarbeitung neuer Kollegen", responsibilities: [] }],
}, "en") === "de");
check("one German bullet plus its title is enough",
  textProseLanguage(["Kundenberaterin", "Stadtwerke Nord", "habe neue Kollegen eingearbeitet und die Kunden betreut"], "en") === "de");
check("a lone skill is too little to judge -> UI language", textProseLanguage(["SAP"], "de") === "de");

const deText = calculateResumeScore(GERMAN, "de");
const enText = calculateResumeScore(GERMAN, "en");
const prose = (s: typeof deText) => [...s.suggestions, ...s.categories.map((c) => c.feedback)].join(" ");
check("German tips for a German resume", detectTextLanguage(prose(deText)) === "de", deText.suggestions[0]?.slice(0, 60));
check("English tips when asked for English", detectTextLanguage(prose(enText)) === "en", enText.suggestions[0]?.slice(0, 60));

console.log(failures ? `\n${failures} FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
