export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  gradient: string;
  iconColor: string;
  image?: string;
  content: string;
  tags?: string[]; // Array of tag strings for better content organization and SEO
}

type BlogPostsByLanguage = {
  en: BlogPost[];
  de: BlogPost[];
};

export const blogPostsByLanguage: BlogPostsByLanguage = {
  en: [
    {
      id: "edit-resume-with-claude",
      title: "How to Edit Your Resume Just by Asking Claude (Step-by-Step Guide)",
      excerpt: "123Resume now works inside Claude. Learn what that means, how to connect it in two minutes and what to ask. No technical knowledge needed.",
      category: "AI Tools",
      readTime: "3 min read",
      date: "Oct 25, 2026",
      gradient: "from-orange-500/20 via-rose-500/10 to-amber-500/5",
      iconColor: "text-orange-500",
      image: "/blog-claude-connector.png",
      tags: ["AI", "Claude", "Resume Tips", "How-To"],
      content: `
Tell Claude what changed in your career, and your resume on 123Resume updates in seconds. No forms to click through and no technical knowledge needed.

## Set it up in 2 minutes

1. Open connectors in Claude | Go to **Customize → Connectors** (in some versions **Settings → Connectors**) and click **Add custom connector**.
2. Add 123Resume | Name it 123Resume and paste the address \`https://123resume.de/mcp\`.
3. Log in and allow | Sign in with your 123Resume account (email, Google, LinkedIn or GitHub) and click **Allow**.

## Then just ask

>> Show me my resumes on 123Resume
>> Add my new job as Marketing Manager at Bosch to my resume
>> Make my summary stronger, without inventing anything
>> Copy my resume and tailor it to this job ad: …
>> Undo the last change

!> Mention "123Resume" in your message, so Claude knows you mean your resume.

## Your data stays yours

+ Claude only sees and edits **your own** resumes, and only after you click Allow
+ Claude never sees your password, because you log in on 123Resume itself
+ Every change is saved as a version, so you can always undo it
+ The connector can't delete a resume, and you can disconnect anytime

To make a change, the parts of your resume you work on are sent to Claude (by Anthropic), like anything else you type into Claude.

## Using Claude Code?

Add the connector with one command, then type \`/mcp\` and log in:

\`\`\`
claude mcp add --transport http --scope user 123resume https://123resume.de/mcp
\`\`\`

## Questions

### Does it cost extra?

Not on 123Resume. Your Claude plan decides how much you can use Claude, and whether you can add custom connectors.

### What exactly is a connector?

It gives Claude secure access to one app, here your 123Resume account, so it can read and update your resumes when you ask. It's built on MCP, the open standard Claude uses to connect to apps.
`,
    },
    {
      id: "resume-mistakes",
      title: "10 Resume Mistakes That Cost You Job Interviews",
      excerpt: "Avoid these common pitfalls that hiring managers see every day. Learn what makes recruiters pass on otherwise qualified candidates.",
      category: "Resume Tips",
      readTime: "5 min read",
      date: "Dec 10, 2025",
      gradient: "from-rose-500/20 via-orange-500/10 to-amber-500/5",
      iconColor: "text-rose-500",
      image: "/blog-resume-mistakes.png",
      tags: ["Resume Tips", "Job Search", "ATS", "Common Mistakes"],
      content: `
## Introduction

Your resume is your first impression, and unfortunately, many job seekers unknowingly sabotage their chances before they even get an interview. After reviewing thousands of resumes, hiring managers consistently see the same mistakes that immediately land applications in the rejection pile.

## 1. Typos and Grammatical Errors

Nothing screams "I don't pay attention to details" louder than a resume riddled with spelling mistakes. Always proofread multiple times and have someone else review your resume before sending.

## 2. Using an Unprofessional Email Address

Still using that email from high school? Time to upgrade. Create a professional email with your name, like firstname.lastname@email.com.

## 3. Including Irrelevant Work Experience

That summer job at the ice cream shop from 10 years ago? Leave it off unless you're applying for food service. Focus on relevant experience that demonstrates transferable skills.

## 4. Writing a Generic Objective Statement

"Seeking a challenging position where I can utilize my skills" tells employers nothing. Instead, write a targeted summary that highlights your specific value proposition.

## 5. Making It Too Long

Unless you're a senior executive with decades of experience, keep your resume to one page. Recruiters spend an average of 7 seconds on initial resume scans.

## 6. Poor Formatting

Inconsistent fonts, cramped text, and confusing layouts make your resume hard to read. Use clean formatting with adequate white space.

## 7. Listing Duties Instead of Achievements

Don't just list what you were responsible for—show what you accomplished. Use numbers and metrics whenever possible.

## 8. Ignoring Keywords

Many companies use ATS (Applicant Tracking Systems) to filter resumes. Include relevant keywords from the job description to make it past the initial screening.

## 9. Including Personal Information

In most countries, including your age, marital status, or photo is unnecessary and can lead to unconscious bias. Focus on your qualifications instead.

## 10. Not Tailoring for Each Application

Sending the same generic resume to every job is a recipe for rejection. Customize your resume to match each position's requirements.

## Conclusion

Avoiding these common mistakes will significantly improve your chances of landing an interview. Take the time to craft a polished, professional resume that showcases your best qualities and achievements.
      `
    },
    {
      id: "ats-friendly-resume",
      title: "How to Write an ATS-Friendly Resume in 2025",
      excerpt: "Master the art of getting past Applicant Tracking Systems. Discover the keywords and formatting tricks that get your resume seen.",
      category: "ATS Optimization",
      readTime: "7 min read",
      date: "Dec 8, 2025",
      gradient: "from-blue-500/20 via-cyan-500/10 to-teal-500/5",
      iconColor: "text-blue-500",
      image: "/ats.png",
      tags: ["ATS", "Resume Optimization", "Keywords", "Formatting"],
      content: `
## What is an ATS?

An Applicant Tracking System (ATS) is software that companies use to collect, sort, scan, and rank job applications. Over 90% of Fortune 500 companies use some form of ATS to manage their hiring process.

## Why ATS Optimization Matters

If your resume isn't ATS-friendly, it might never be seen by human eyes—regardless of how qualified you are. Understanding how these systems work is crucial for modern job searching.

## Key Strategies for ATS Success

### Use Standard Section Headings

Stick to conventional headings like "Work Experience," "Education," and "Skills." Creative alternatives might confuse the system.

### Include Relevant Keywords

Carefully read the job description and incorporate matching keywords naturally throughout your resume. Focus on:
- Technical skills mentioned in the posting
- Industry-specific terminology
- Required qualifications and certifications

### Choose the Right File Format

Unless specified otherwise, submit your resume as a .docx file. While PDFs preserve formatting, some older ATS systems struggle to parse them correctly.

### Use Simple Formatting

Avoid:
- Tables and columns
- Headers and footers
- Images and graphics
- Text boxes
- Unusual fonts

### Spell Out Acronyms

Include both the acronym and full name: "Search Engine Optimization (SEO)" instead of just "SEO."

## Testing Your Resume

Use online ATS simulators to test how well your resume performs. Many free tools can give you insights into potential issues.

## The Balance

Remember that your resume ultimately needs to impress humans too. Find the balance between ATS optimization and creating a document that's engaging and easy to read.
      `
    },
    {
      id: "quantifying-achievements",
      title: "The Power of Quantifying Your Achievements",
      excerpt: "Learn how to transform vague job descriptions into compelling achievements with numbers and metrics that impress employers.",
      category: "Career Growth",
      readTime: "4 min read",
      date: "Dec 5, 2025",
      gradient: "from-emerald-500/20 via-green-500/10 to-lime-500/5",
      iconColor: "text-emerald-500",
      image: "/quatifying.png",
      tags: ["Career Growth", "Resume Writing", "Achievements", "Metrics"],
      content: `
## Why Numbers Matter

Hiring managers are drawn to concrete evidence of success. Numbers provide proof of your capabilities and help employers visualize the impact you could have on their organization.

## The Formula for Achievement Statements

Use this structure: **Action Verb + Task + Result with Numbers**

### Before and After Examples

**Weak:** "Responsible for managing social media accounts"
**Strong:** "Grew Instagram following by 150% (10K to 25K followers) in 6 months, increasing engagement rate from 2% to 8%"

**Weak:** "Helped improve customer satisfaction"
**Strong:** "Implemented new customer service protocols that increased satisfaction scores from 72% to 94%"

## Types of Metrics to Include

### Financial Impact
- Revenue generated
- Costs reduced
- Budget managed
- Sales increased

### Scale and Scope
- Team size managed
- Clients served
- Projects completed
- Geographic regions covered

### Efficiency Gains
- Time saved
- Processes improved
- Error rates reduced
- Productivity increased

### Growth Metrics
- Percentage improvements
- Year-over-year comparisons
- Market share gains

## When You Don't Have Exact Numbers

Estimate conservatively and use ranges or approximations:
- "Approximately 50 clients"
- "Over $100K in sales"
- "Reduced processing time by ~30%"

## Making It Believable

Be prepared to discuss your metrics in interviews. Keep records of your achievements and be ready to explain the context and methodology behind your numbers.
      `
    },
    {
      id: "remote-job-applications",
      title: "Remote Job Applications: What's Different?",
      excerpt: "Tailor your resume for remote positions. Highlight the skills and experiences that remote employers value most.",
      category: "Remote Work",
      readTime: "6 min read",
      date: "Dec 3, 2025",
      gradient: "from-violet-500/20 via-purple-500/10 to-fuchsia-500/5",
      iconColor: "text-violet-500",
      image: "/VScode.png",
      content: `
## The Remote Work Revolution

Remote work has transformed from a perk to a standard option for many industries. But applying for remote positions requires a different approach than traditional office jobs.

## Skills Remote Employers Prioritize

### Self-Management
Demonstrate your ability to work independently, manage your time, and stay productive without supervision.

### Communication
Remote work relies heavily on written communication. Highlight your experience with:
- Async communication tools (Slack, email)
- Video conferencing
- Documentation
- Cross-timezone collaboration

### Technical Proficiency
Show comfort with:
- Project management tools (Asana, Trello, Jira)
- Communication platforms
- Cloud-based collaboration tools
- Basic troubleshooting

## Tailoring Your Resume for Remote

### Mention Remote Experience
If you've worked remotely before, make it prominent. Include phrases like:
- "Fully remote position"
- "Managed distributed team across 5 time zones"
- "Collaborated with global stakeholders"

### Highlight Relevant Achievements
- Projects completed independently
- Successful virtual team leadership
- Cross-functional remote collaboration

### Address the Logistics
Consider mentioning:
- Your home office setup
- Reliable internet connection
- Flexibility with meeting times

## Cover Letter Tips

Use your cover letter to explain why you're suited for remote work. Share specific examples of how you've thrived in remote or independent work situations.

## Red Flags to Avoid

Don't suggest that you want remote work for convenience or to avoid commuting. Focus on how remote work helps you deliver your best results.
      `
    },
    {
      id: "career-change-resume",
      title: "Career Change Resume: A Complete Guide",
      excerpt: "Pivoting to a new industry? Here's how to reframe your experience and skills to make a successful transition.",
      category: "Career Change",
      readTime: "8 min read",
      date: "Nov 30, 2025",
      gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/5",
      iconColor: "text-amber-500",
      image: "/career-change.png",
      tags: ["Career Change", "Resume Tips", "Transition", "Skills"],
      content: `
## Making a Successful Career Pivot

Changing careers can feel daunting, but with the right resume strategy, you can successfully transition to a new field. The key is reframing your experience to highlight transferable skills.

## Step 1: Identify Transferable Skills

Every job builds skills that apply across industries:
- Leadership and management
- Communication
- Problem-solving
- Project management
- Data analysis
- Customer service

## Step 2: Research Your Target Industry

Before writing your resume:
- Study job descriptions in your target field
- Identify common requirements and keywords
- Understand the industry's priorities and challenges
- Connect with people in the field

## Step 3: Choose the Right Resume Format

Consider a combination/hybrid resume that:
- Leads with a skills-based summary
- Groups experience by skill category rather than chronology
- Emphasizes relevant projects and achievements

## Step 4: Craft a Compelling Summary

Your summary should:
- Acknowledge your transition
- Highlight relevant transferable skills
- Show enthusiasm for the new field
- Mention any relevant training or certifications

### Example:
"Marketing professional with 8 years of experience transitioning to UX design. Combines deep understanding of user psychology and behavior with newly completed UX certification. Proven track record of creating user-centered campaigns that drive engagement."

## Step 5: Reframe Your Experience

Translate your past experience into language relevant to your new field. Focus on:
- Universal skills used in any context
- Projects that relate to your target role
- Results that demonstrate relevant capabilities

## Step 6: Fill Skill Gaps

Show you're serious about the change:
- Complete relevant certifications
- Take online courses
- Build portfolio projects
- Volunteer or freelance in the new field

## The Cover Letter Advantage

Career changers should always include a cover letter. It's your opportunity to tell your story and explain why you're making the transition.
      `
    },
    {
      id: "cover-letter-vs-resume",
      title: "Cover Letter vs Resume: What Matters More?",
      excerpt: "Understand when to focus on your cover letter and when your resume does the heavy lifting in the application process.",
      category: "Job Search",
      readTime: "5 min read",
      date: "Nov 28, 2025",
      gradient: "from-pink-500/20 via-rose-500/10 to-red-500/5",
      iconColor: "text-pink-500",
      image: "/cover-letter.png",
      tags: ["Cover Letter", "Job Search", "Application", "Resume Tips"],
      content: `
## The Great Debate

Job seekers often wonder which document deserves more attention: the resume or the cover letter? The answer depends on several factors.

## When the Resume Matters Most

### Highly Technical Roles
For positions requiring specific technical skills, your resume's skills section and experience take precedence.

### ATS-Heavy Applications
Large companies that rely heavily on ATS scanning prioritize resume keywords over cover letters.

### When Cover Letters Are Optional
If a cover letter isn't required, employers are signaling that the resume carries more weight.

## When the Cover Letter Matters Most

### Career Transitions
Cover letters allow you to explain gaps, transitions, and non-linear career paths that resumes can't address.

### Creative Industries
Fields like marketing, writing, and design use cover letters to evaluate creativity and communication skills.

### Competitive Positions
When many candidates have similar qualifications, a compelling cover letter can differentiate you.

### When Specifically Requested
If a job posting emphasizes the cover letter or asks specific questions, take it seriously.

## The Ideal Approach

### Strong Resume Foundation
Your resume should stand on its own and clearly communicate your qualifications.

### Strategic Cover Letters
Write tailored cover letters for positions where they can make a difference, rather than sending generic ones everywhere.

### Quality Over Quantity
A few well-crafted applications beat dozens of generic submissions.

## Tips for Both Documents

- Customize for each application
- Use consistent formatting and branding
- Proofread thoroughly
- Focus on the employer's needs, not just your wants

## The Bottom Line

Both documents serve different purposes. The resume provides facts and figures; the cover letter provides context and personality. Master both to maximize your chances of landing interviews.
      `
    }
  ],
  de: [
    {
      id: "edit-resume-with-claude",
      title: "Lebenslauf bearbeiten, indem Sie einfach Claude fragen (Schritt-für-Schritt-Anleitung)",
      excerpt: "123Resume funktioniert jetzt direkt in Claude. Erfahren Sie, was das bedeutet, wie Sie es in zwei Minuten verbinden und was Sie fragen können. Ganz ohne Technikwissen.",
      category: "KI-Tools",
      readTime: "3 Min. Lesezeit",
      date: "25. Okt. 2026",
      gradient: "from-orange-500/20 via-rose-500/10 to-amber-500/5",
      iconColor: "text-orange-500",
      image: "/blog-claude-connector.png",
      tags: ["KI", "Claude", "Lebenslauf-Tipps", "Anleitung"],
      content: `
Sagen Sie Claude, was sich in Ihrer Karriere geändert hat, und Ihr Lebenslauf bei 123Resume aktualisiert sich in Sekunden. Keine Formulare und kein Technikwissen nötig.

## In 2 Minuten eingerichtet

1. Connectors in Claude öffnen | Gehen Sie zu **Customize → Connectors** (je nach Version **Einstellungen → Connectors**) und klicken Sie auf **Add custom connector**.
2. 123Resume hinzufügen | Geben Sie als Namen 123Resume ein und fügen Sie die Adresse \`https://123resume.de/mcp\` ein.
3. Anmelden und erlauben | Melden Sie sich mit Ihrem 123Resume-Konto an (E-Mail, Google, LinkedIn oder GitHub) und klicken Sie auf **Allow**.

## Dann einfach fragen

>> Zeige mir meine Lebensläufe bei 123Resume
>> Füge meinen neuen Job als Marketing Manager bei Bosch zu meinem Lebenslauf hinzu
>> Formuliere meine Zusammenfassung stärker, ohne etwas zu erfinden
>> Kopiere meinen Lebenslauf und passe ihn an diese Stellenanzeige an: …
>> Mach die letzte Änderung rückgängig

!> Erwähnen Sie "123Resume" in Ihrer Nachricht, damit Claude weiß, dass Sie Ihren Lebenslauf meinen.

## Ihre Daten gehören Ihnen

+ Claude sieht und bearbeitet nur **Ihre eigenen** Lebensläufe, und erst nachdem Sie auf Allow geklickt haben
+ Claude sieht Ihr Passwort nie, denn Sie melden sich direkt bei 123Resume an
+ Jede Änderung wird als Version gespeichert und lässt sich jederzeit rückgängig machen
+ Der Connector kann keinen Lebenslauf löschen, und Sie können die Verbindung jederzeit trennen

Für eine Änderung werden die Teile Ihres Lebenslaufs, an denen Sie arbeiten, an Claude (von Anthropic) gesendet, wie alles andere, was Sie in Claude eingeben.

## Sie nutzen Claude Code?

Fügen Sie den Connector mit einem Befehl hinzu, geben Sie dann \`/mcp\` ein und melden Sie sich an:

\`\`\`
claude mcp add --transport http --scope user 123resume https://123resume.de/mcp
\`\`\`

## Fragen

### Kostet das extra?

Nicht bei 123Resume. Ihr Claude-Tarif bestimmt, wie viel Sie Claude nutzen können und ob Sie eigene Connectors hinzufügen können.

### Was genau ist ein Connector?

Er gibt Claude sicheren Zugriff auf eine App, hier Ihr 123Resume-Konto, damit Claude Ihre Lebensläufe auf Ihre Bitte hin lesen und aktualisieren kann. Er basiert auf MCP, dem offenen Standard, mit dem sich Claude mit Apps verbindet.
`,
    },
    {
      id: "resume-mistakes",
      title: "10 Lebenslauf-Fehler, die Sie Jobinterviews kosten",
      excerpt: "Vermeiden Sie diese häufigen Fallstricke, die Personalverantwortliche täglich sehen. Erfahren Sie, was Recruiter dazu bringt, ansonsten qualifizierte Kandidaten abzulehnen.",
      category: "Lebenslauf-Tipps",
      readTime: "5 Min. Lesezeit",
      date: "10. Dez. 2025",
      gradient: "from-rose-500/20 via-orange-500/10 to-amber-500/5",
      iconColor: "text-rose-500",
      image: "/blog-resume-mistakes.png",
      content: `
## Einführung

Ihr Lebenslauf ist Ihr erster Eindruck, und leider sabotieren viele Bewerber unwissentlich ihre Chancen, bevor sie überhaupt zu einem Vorstellungsgespräch eingeladen werden. Nach der Überprüfung Tausender von Lebensläufen sehen Personalverantwortliche immer wieder die gleichen Fehler, die Bewerbungen sofort in den Ablehnungsstapel landen lassen.

## 1. Rechtschreib- und Grammatikfehler

Nichts schreit "Ich achte nicht auf Details" lauter als ein Lebenslauf voller Rechtschreibfehler. Lassen Sie Ihren Lebenslauf immer mehrmals Korrektur lesen und von jemand anderem überprüfen, bevor Sie ihn absenden.

## 2. Verwendung einer unprofessionellen E-Mail-Adresse

Verwenden Sie noch die E-Mail aus der Schulzeit? Zeit für ein Upgrade. Erstellen Sie eine professionelle E-Mail mit Ihrem Namen, wie vorname.nachname@email.com.

## 3. Irrelevante Berufserfahrung einbeziehen

Dieser Ferienjob im Eiscafé von vor 10 Jahren? Lassen Sie ihn weg, es sei denn, Sie bewerben sich im Gastronomiebereich. Konzentrieren Sie sich auf relevante Erfahrungen, die übertragbare Fähigkeiten demonstrieren.

## 4. Verfassen einer generischen Zielstellung

"Suche eine herausfordernde Position, in der ich meine Fähigkeiten nutzen kann" sagt Arbeitgebern nichts. Schreiben Sie stattdessen eine gezielte Zusammenfassung, die Ihren spezifischen Wert hervorhebt.

## 5. Zu lang machen

Sofern Sie kein Führungskräfte mit jahrzehntelanger Erfahrung sind, beschränken Sie Ihren Lebenslauf auf eine Seite. Recruiter verbringen durchschnittlich 7 Sekunden mit dem ersten Scan eines Lebenslaufs.

## 6. Schlechte Formatierung

Inkonsistente Schriftarten, gedrängter Text und verwirrende Layouts machen Ihren Lebenslauf schwer lesbar. Verwenden Sie eine saubere Formatierung mit ausreichend Weißraum.

## 7. Aufgaben statt Leistungen auflisten

Listen Sie nicht nur auf, wofür Sie verantwortlich waren – zeigen Sie, was Sie erreicht haben. Verwenden Sie Zahlen und Kennzahlen, wann immer möglich.

## 8. Keywords ignorieren

Viele Unternehmen verwenden ATS (Applicant Tracking Systems), um Lebensläufe zu filtern. Fügen Sie relevante Keywords aus der Stellenbeschreibung ein, um die erste Sichtung zu überstehen.

## 9. Persönliche Informationen einbeziehen

In den meisten Ländern ist das Einbeziehen von Alter, Familienstand oder Foto unnötig und kann zu unbewussten Vorurteilen führen. Konzentrieren Sie sich stattdessen auf Ihre Qualifikationen.

## 10. Nicht für jede Bewerbung anpassen

Derselbe generische Lebenslauf für jeden Job ist ein Rezept für Ablehnung. Passen Sie Ihren Lebenslauf an die Anforderungen jeder Position an.

## Fazit

Die Vermeidung dieser häufigen Fehler wird Ihre Chancen auf ein Vorstellungsgespräch erheblich verbessern. Nehmen Sie sich die Zeit, einen polierten, professionellen Lebenslauf zu erstellen, der Ihre besten Eigenschaften und Leistungen präsentiert.
      `
    },
    {
      id: "ats-friendly-resume",
      title: "Wie man einen ATS-freundlichen Lebenslauf in 2025 schreibt",
      excerpt: "Meistern Sie die Kunst, Bewerber-Tracking-Systeme zu passieren. Entdecken Sie die Keywords und Formatierungstricks, die Ihren Lebenslauf sichtbar machen.",
      category: "ATS-Optimierung",
      readTime: "7 Min. Lesezeit",
      date: "8. Dez. 2025",
      gradient: "from-blue-500/20 via-cyan-500/10 to-teal-500/5",
      iconColor: "text-blue-500",
      image: "/ats.png",
      content: `
## Was ist ein ATS?

Ein Applicant Tracking System (ATS) ist eine Software, die Unternehmen verwenden, um Bewerbungen zu sammeln, zu sortieren, zu scannen und zu bewerten. Über 90% der Fortune-500-Unternehmen verwenden eine Form von ATS zur Verwaltung ihres Einstellungsprozesses.

## Warum ATS-Optimierung wichtig ist

Wenn Ihr Lebenslauf nicht ATS-freundlich ist, wird er möglicherweise nie von menschlichen Augen gesehen – unabhängig davon, wie qualifiziert Sie sind. Das Verständnis, wie diese Systeme funktionieren, ist für die moderne Jobsuche entscheidend.

## Schlüsselstrategien für ATS-Erfolg

### Verwenden Sie Standard-Abschnittsüberschriften

Halten Sie sich an konventionelle Überschriften wie "Berufserfahrung", "Bildung" und "Fähigkeiten". Kreative Alternativen können das System verwirren.

### Relevante Keywords einbeziehen

Lesen Sie die Stellenbeschreibung sorgfältig durch und integrieren Sie passende Keywords natürlich in Ihren Lebenslauf. Konzentrieren Sie sich auf:
- Technische Fähigkeiten, die in der Ausschreibung erwähnt werden
- Branchenspezifische Terminologie
- Erforderliche Qualifikationen und Zertifizierungen

### Wählen Sie das richtige Dateiformat

Reichen Sie Ihren Lebenslauf als .docx-Datei ein, sofern nicht anders angegeben. Während PDFs die Formatierung beibehalten, haben einige ältere ATS-Systeme Schwierigkeiten, sie korrekt zu parsen.

### Verwenden Sie einfache Formatierung

Vermeiden Sie:
- Tabellen und Spalten
- Kopf- und Fußzeilen
- Bilder und Grafiken
- Textfelder
- Ungewöhnliche Schriftarten

### Akronyme ausschreiben

Fügen Sie sowohl das Akronym als auch den vollständigen Namen ein: "Search Engine Optimization (SEO)" anstatt nur "SEO".

## Testen Sie Ihren Lebenslauf

Verwenden Sie Online-ATS-Simulatoren, um zu testen, wie gut Ihr Lebenslauf abschneidet. Viele kostenlose Tools können Ihnen Einblicke in potenzielle Probleme geben.

## Das Gleichgewicht

Denken Sie daran, dass Ihr Lebenslauf letztendlich auch Menschen beeindrucken muss. Finden Sie die Balance zwischen ATS-Optimierung und der Erstellung eines ansprechenden und leicht lesbaren Dokuments.
      `
    },
    {
      id: "quantifying-achievements",
      title: "Die Kraft der Quantifizierung Ihrer Erfolge",
      excerpt: "Lernen Sie, wie Sie vage Stellenbeschreibungen in überzeugende Erfolge mit Zahlen und Kennzahlen umwandeln, die Arbeitgeber beeindrucken.",
      category: "Karrierewachstum",
      readTime: "4 Min. Lesezeit",
      date: "5. Dez. 2025",
      gradient: "from-emerald-500/20 via-green-500/10 to-lime-500/5",
      iconColor: "text-emerald-500",
      image: "/quatifying.png",
      content: `
## Warum Zahlen wichtig sind

Personalverantwortliche werden von konkreten Erfolgsnachweisen angezogen. Zahlen liefern Beweise für Ihre Fähigkeiten und helfen Arbeitgebern, die Auswirkungen zu visualisieren, die Sie auf ihre Organisation haben könnten.

## Die Formel für Erfolgsaussagen

Verwenden Sie diese Struktur: **Handlungsverb + Aufgabe + Ergebnis mit Zahlen**

### Vorher-Nachher-Beispiele

**Schwach:** "Verantwortlich für die Verwaltung von Social-Media-Konten"
**Stark:** "Steigerte Instagram-Follower um 150% (10K auf 25K Follower) in 6 Monaten und erhöhte die Engagement-Rate von 2% auf 8%"

**Schwach:** "Helfen, Kundenzufriedenheit zu verbessern"
**Stark:** "Implementierte neue Kundenservice-Protokolle, die die Zufriedenheitswerte von 72% auf 94% erhöhten"

## Arten von Kennzahlen, die Sie einbeziehen sollten

### Finanzieller Einfluss
- Generierter Umsatz
- Reduzierte Kosten
- Verwaltetes Budget
- Erhöhte Verkäufe

### Umfang und Reichweite
- Verwaltete Teamgröße
- Bediente Kunden
- Abgeschlossene Projekte
- Abgedeckte geografische Regionen

### Effizienzsteigerungen
- Gesparte Zeit
- Verbesserte Prozesse
- Reduzierte Fehlerquoten
- Erhöhte Produktivität

### Wachstumsmetriken
- Prozentuale Verbesserungen
- Jahr-über-Jahr-Vergleiche
- Marktanteilsgewinne

## Wenn Sie keine genauen Zahlen haben

Schätzen Sie konservativ und verwenden Sie Bereiche oder Näherungswerte:
- "Ungefähr 50 Kunden"
- "Über 100K $ in Verkäufen"
- "Reduzierte Bearbeitungszeit um ~30%"

## Es glaubwürdig machen

Seien Sie bereit, Ihre Kennzahlen in Vorstellungsgesprächen zu diskutieren. Führen Sie Aufzeichnungen über Ihre Erfolge und seien Sie bereit, den Kontext und die Methodik hinter Ihren Zahlen zu erklären.
      `
    },
    {
      id: "remote-job-applications",
      title: "Bewerbungen für Remote-Jobs: Was ist anders?",
      excerpt: "Passen Sie Ihren Lebenslauf für Remote-Positionen an. Heben Sie die Fähigkeiten und Erfahrungen hervor, die Remote-Arbeitgeber am meisten schätzen.",
      category: "Remote-Arbeit",
      readTime: "6 Min. Lesezeit",
      date: "3. Dez. 2025",
      gradient: "from-violet-500/20 via-purple-500/10 to-fuchsia-500/5",
      iconColor: "text-violet-500",
      image: "/VScode.png",
      content: `
## Die Remote-Arbeit-Revolution

Remote-Arbeit hat sich von einem Bonus zu einer Standardoption für viele Branchen entwickelt. Die Bewerbung für Remote-Positionen erfordert jedoch einen anderen Ansatz als traditionelle Bürojobs.

## Fähigkeiten, die Remote-Arbeitgeber priorisieren

### Selbstmanagement
Demonstrieren Sie Ihre Fähigkeit, unabhängig zu arbeiten, Ihre Zeit zu verwalten und produktiv zu bleiben ohne Aufsicht.

### Kommunikation
Remote-Arbeit ist stark auf schriftliche Kommunikation angewiesen. Heben Sie Ihre Erfahrung mit hervor:
- Asynchronen Kommunikationstools (Slack, E-Mail)
- Videokonferenzen
- Dokumentation
- Zusammenarbeit über Zeitzonen hinweg

### Technische Kompetenz
Zeigen Sie Komfort mit:
- Projektmanagement-Tools (Asana, Trello, Jira)
- Kommunikationsplattformen
- Cloud-basierten Collaboration-Tools
- Grundlegender Fehlerbehebung

## Anpassen Ihres Lebenslaufs für Remote

### Remote-Erfahrung erwähnen
Wenn Sie bereits remote gearbeitet haben, machen Sie es prominent. Fügen Sie Phrasen wie hinzu:
- "Vollständige Remote-Position"
- "Verwaltetes verteiltes Team über 5 Zeitzonen hinweg"
- "Zusammenarbeit mit globalen Stakeholdern"

### Relevante Erfolge hervorheben
- Unabhängig abgeschlossene Projekte
- Erfolgreiche virtuelle Teamführung
- Funktionsübergreifende Remote-Zusammenarbeit

### Logistik ansprechen
Erwägen Sie zu erwähnen:
- Ihr Home-Office-Setup
- Zuverlässige Internetverbindung
- Flexibilität bei Meeting-Zeiten

## Tipps für Anschreiben

Verwenden Sie Ihr Anschreiben, um zu erklären, warum Sie für Remote-Arbeit geeignet sind. Teilen Sie spezifische Beispiele, wie Sie in Remote- oder unabhängigen Arbeitssituationen erfolgreich waren.

## Warnsignale, die Sie vermeiden sollten

Suggerieren Sie nicht, dass Sie Remote-Arbeit aus Bequemlichkeit oder zur Vermeidung des Pendelns wünschen. Konzentrieren Sie sich darauf, wie Remote-Arbeit Ihnen hilft, Ihre besten Ergebnisse zu liefern.
      `
    },
    {
      id: "career-change-resume",
      title: "Karrierewechsel-Lebenslauf: Ein vollständiger Leitfaden",
      excerpt: "Pivotieren Sie zu einer neuen Branche? Hier erfahren Sie, wie Sie Ihre Erfahrung und Fähigkeiten umformulieren, um einen erfolgreichen Übergang zu schaffen.",
      category: "Karrierewechsel",
      readTime: "8 Min. Lesezeit",
      date: "30. Nov. 2025",
      gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/5",
      iconColor: "text-amber-500",
      image: "/career-change.png",
      content: `
## Einen erfolgreichen Karrierepivot machen

Ein Karrierewechsel kann entmutigend erscheinen, aber mit der richtigen Lebenslaufstrategie können Sie erfolgreich zu einem neuen Bereich wechseln. Der Schlüssel ist die Umformulierung Ihrer Erfahrung, um übertragbare Fähigkeiten hervorzuheben.

## Schritt 1: Übertragbare Fähigkeiten identifizieren

Jeder Job baut Fähigkeiten auf, die branchenübergreifend anwendbar sind:
- Führung und Management
- Kommunikation
- Problemlösung
- Projektmanagement
- Datenanalyse
- Kundenservice

## Schritt 2: Recherchieren Sie Ihre Zielbranche

Bevor Sie Ihren Lebenslauf schreiben:
- Studieren Sie Stellenbeschreibungen in Ihrem Zielbereich
- Identifizieren Sie gemeinsame Anforderungen und Keywords
- Verstehen Sie die Prioritäten und Herausforderungen der Branche
- Vernetzen Sie sich mit Menschen in diesem Bereich

## Schritt 3: Wählen Sie das richtige Lebenslaufformat

Erwägen Sie einen Kombinations-/Hybrid-Lebenslauf, der:
- Mit einer fähigkeitsbasierten Zusammenfassung beginnt
- Erfahrung nach Fähigkeitskategorien statt chronologisch gruppiert
- Relevante Projekte und Erfolge betont

## Schritt 4: Erstellen Sie eine überzeugende Zusammenfassung

Ihre Zusammenfassung sollte:
- Ihren Übergang anerkennen
- Relevante übertragbare Fähigkeiten hervorheben
- Begeisterung für das neue Feld zeigen
- Relevante Schulungen oder Zertifizierungen erwähnen

### Beispiel:
"Marketing-Fachmann mit 8 Jahren Erfahrung im Übergang zum UX-Design. Kombiniert tiefes Verständnis von Benutzerpsychologie und -verhalten mit neu abgeschlossener UX-Zertifizierung. Bewährte Erfolgsbilanz bei der Erstellung benutzerzentrierter Kampagnen, die Engagement steigern."

## Schritt 5: Formulieren Sie Ihre Erfahrung um

Übersetzen Sie Ihre bisherige Erfahrung in die für Ihr neues Feld relevante Sprache. Konzentrieren Sie sich auf:
- Universelle Fähigkeiten, die in jedem Kontext verwendet werden
- Projekte, die sich auf Ihre Zielrolle beziehen
- Ergebnisse, die relevante Fähigkeiten demonstrieren

## Schritt 6: Fähigkeitslücken schließen

Zeigen Sie, dass es Ihnen ernst ist mit dem Wechsel:
- Schließen Sie relevante Zertifizierungen ab
- Nehmen Sie Online-Kurse
- Erstellen Sie Portfolio-Projekte
- Engagieren Sie sich freiwillig oder freiberuflich im neuen Bereich

## Der Vorteil des Anschreibens

Karrierewechsler sollten immer ein Anschreiben beifügen. Es ist Ihre Gelegenheit, Ihre Geschichte zu erzählen und zu erklären, warum Sie den Übergang vollziehen.
      `
    },
    {
      id: "cover-letter-vs-resume",
      title: "Anschreiben vs. Lebenslauf: Was zählt mehr?",
      excerpt: "Verstehen Sie, wann Sie sich auf Ihr Anschreiben konzentrieren sollten und wann Ihr Lebenslauf die Hauptarbeit im Bewerbungsprozess leistet.",
      category: "Jobsuche",
      readTime: "5 Min. Lesezeit",
      date: "28. Nov. 2025",
      gradient: "from-pink-500/20 via-rose-500/10 to-red-500/5",
      iconColor: "text-pink-500",
      image: "/cover-letter.png",
      content: `
## Die große Debatte

Bewerber fragen sich oft, welchem Dokument mehr Aufmerksamkeit gewidmet werden sollte: dem Lebenslauf oder dem Anschreiben? Die Antwort hängt von mehreren Faktoren ab.

## Wenn der Lebenslauf am wichtigsten ist

### Hochtechnische Rollen
Bei Positionen, die spezifische technische Fähigkeiten erfordern, haben der Fähigkeitsbereich und die Erfahrung in Ihrem Lebenslauf Vorrang.

### ATS-lastige Bewerbungen
Große Unternehmen, die stark auf ATS-Scanning angewiesen sind, priorisieren Lebenslauf-Keywords gegenüber Anschreiben.

### Wenn Anschreiben optional sind
Wenn ein Anschreiben nicht erforderlich ist, signalisieren Arbeitgeber, dass der Lebenslauf mehr Gewicht hat.

## Wenn das Anschreiben am wichtigsten ist

### Karriereübergänge
Anschreiben ermöglichen es Ihnen, Lücken, Übergänge und nicht-lineare Karrierewege zu erklären, die Lebensläufe nicht ansprechen können.

### Kreative Branchen
Bereiche wie Marketing, Schreiben und Design verwenden Anschreiben, um Kreativität und Kommunikationsfähigkeiten zu bewerten.

### Wettbewerbsintensive Positionen
Wenn viele Kandidaten ähnliche Qualifikationen haben, kann ein überzeugendes Anschreiben Sie unterscheiden.

### Wenn ausdrücklich angefordert
Wenn eine Stellenausschreibung das Anschreiben betont oder spezifische Fragen stellt, nehmen Sie es ernst.

## Der ideale Ansatz

### Starke Lebenslauffundament
Ihr Lebenslauf sollte für sich stehen und Ihre Qualifikationen klar kommunizieren.

### Strategische Anschreiben
Schreiben Sie maßgeschneiderte Anschreiben für Positionen, bei denen sie einen Unterschied machen können, anstatt überall generische zu senden.

### Qualität vor Quantität
Einige gut gestaltete Bewerbungen sind besser als Dutzende generischer Einsendungen.

## Tipps für beide Dokumente

- Passen Sie für jede Bewerbung an
- Verwenden Sie konsistente Formatierung und Branding
- Korrekturlesen Sie gründlich
- Konzentrieren Sie sich auf die Bedürfnisse des Arbeitgebers, nicht nur auf Ihre Wünsche

## Das Fazit

Beide Dokumente dienen unterschiedlichen Zwecken. Der Lebenslauf liefert Fakten und Zahlen; das Anschreiben liefert Kontext und Persönlichkeit. Meistern Sie beide, um Ihre Chancen auf Vorstellungsgespräche zu maximieren.
      `
    }
  ],
};

export const getBlogPosts = (language: 'en' | 'de' = 'en'): BlogPost[] => {
  return blogPostsByLanguage[language] || blogPostsByLanguage.en;
};

export const getBlogPost = (id: string, language: 'en' | 'de' = 'en'): BlogPost | undefined => {
  return getBlogPosts(language).find(post => post.id === id);
};
