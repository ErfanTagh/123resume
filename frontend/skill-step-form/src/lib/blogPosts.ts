export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  /** ISO date for Article JSON-LD / Open Graph (YYYY-MM-DD). */
  isoDate?: string;
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
      id: "daily-apply-streak",
      title: "Why Doing Something Daily Beats Doing It Perfectly Once",
      excerpt: "Consistency leads to success. A few solid applications every day beat waiting for the perfect weekend, especially in a tough job market.",
      category: "Job Search",
      readTime: "4 min read",
      date: "Oct 30, 2026",
      isoDate: "2026-10-30",
      gradient: "from-amber-500/20 via-orange-500/10 to-rose-500/5",
      iconColor: "text-amber-500",
      image: "/blog-apply-streak.png",
      tags: ["Job Search", "Consistency", "Habits", "Apply Streak"],
      content: `
Most people don't miss their goals because they aren't smart enough. They miss them because they wait for a free weekend that never shows up and then do nothing for weeks. **Consistency leads to success.** A little every day almost always wins.

> Even five minutes a day raises your chances. All you need is to show up daily. Apps like Duolingo figured this out years ago: a small daily habit beats a big plan you never start.

## Quality beats volume

Sending more applications is not always better. Ten rushed applications with an obvious AI-generated cover letter often lose to four careful ones that actually sound like you. Recruiters notice, especially now when the job market doesn't look great and every inbox is full of the same generic messages.

## Where to find jobs (and when to apply)

Our advice: first, try applying through the **company's own website**. This is usually the best path. The posting is official, your application goes where it should, and you skip extra middle layers of the platforms.

If you use LinkedIn or other platforms, filter for recent postings, like jobs posted **only this week**. Applying early is always better. Fresh listings have fewer applicants, and your name shows up while the role is newly posted and HR is actively reviewing applicants.

!> "Find a job" is huge. "Send one solid application today" is something you can finish before dinner.

## Start your apply streak on 123Resume

That daily habit is why we added an **apply streak** to the job tracker.

1. Log every application | Hit **Add application** in the [job tracker](/resumes?tab=job-tracker) when you apply. Company, role, resume version, and cover letter all in one place.
2. Grow your streak | Log at least one application a day, and your streak flame grows by one.
3. See the month at a glance | A simple calendar shows the days you applied and the gaps.
4. Get a nudge when it matters | If you haven't applied yet today, the flame in the top bar reminds you before midnight.

Another benefit of the tracker is you keep a record of where you applied and what the job description said. If you get an interview, you can reopen that posting, review the requirements, and study the concepts they care about instead of guessing from memory.

You can also log applications through Claude with our [Claude connector](/blog/edit-resume-with-claude). Paste the job details and ask Claude to add it to your tracker. No need to fill the form by hand every time.

Do the small thing today. One good application. Then come back tomorrow.

[Open the job tracker and start your streak →](/resumes?tab=job-tracker)
`,
    },
    {
      id: "edit-resume-with-claude",
      title: "How to Edit Your Resume Just by Asking Claude (Step-by-Step Guide)",
      excerpt: "123Resume now works inside Claude. Learn what that means, how to connect it in one minute and what to ask. No technical knowledge needed.",
      category: "AI Tools",
      readTime: "3 min read",
      date: "Oct 25, 2026",
      isoDate: "2026-10-25",
      gradient: "from-orange-500/20 via-rose-500/10 to-amber-500/5",
      iconColor: "text-orange-500",
      image: "/blog-claude-connector.png",
      tags: ["AI", "Claude", "Resume Tips", "How-To"],
      content: `
Tell Claude what changed in your career, and your resume on 123Resume updates in seconds. No forms to click through and no technical knowledge needed.

## Set it up in 1 minute

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
  ],
  de: [
    {
      id: "daily-apply-streak",
      title: "Warum täglich etwas tun besser ist als einmal perfekt",
      excerpt: "Beständigkeit führt zum Erfolg. Ein paar gute Bewerbungen jeden Tag schlagen das Warten auf das perfekte Wochenende, gerade in einem schwierigen Jobmarkt.",
      category: "Jobsuche",
      readTime: "4 Min. Lesezeit",
      date: "30. Okt. 2026",
      isoDate: "2026-10-30",
      gradient: "from-amber-500/20 via-orange-500/10 to-rose-500/5",
      iconColor: "text-amber-500",
      image: "/blog-apply-streak.png",
      tags: ["Jobsuche", "Beständigkeit", "Gewohnheiten", "Bewerbungs-Serie"],
      content: `
Die meisten Menschen verfehlen ihre Ziele nicht, weil ihnen Talent fehlt. Sie warten auf ein freies Wochenende, das nie kommt, und tun dann wochenlang nichts. **Beständigkeit führt zum Erfolg.** Ein wenig jeden Tag gewinnt fast immer.

> Auch nur fünf Minuten am Tag erhöhen Ihre Chancen. Sie müssen nur täglich erscheinen. Apps wie Duolingo haben das vor Jahren verstanden: eine kleine tägliche Gewohnheit schlägt den großen Plan, den man nie startet.

## Qualität schlägt Menge

Mehr Bewerbungen sind nicht immer besser. Zehn hastige Bewerbungen mit einem offensichtlich KI-generierten Anschreiben verlieren oft gegen vier sorgfältige, die wirklich nach Ihnen klingen. Recruiter merken das, besonders jetzt, wenn der Jobmarkt nicht besonders gut aussieht und jedes Postfach voller gleicher Standardtexte ist.

## Wo Sie Stellen finden (und wann Sie sich bewerben)

Unser Rat: versuchen Sie zuerst, sich über die **Website des Unternehmens** zu bewerben. Das ist meist der beste Weg. Die Anzeige ist offiziell, Ihre Unterlagen landen am richtigen Ort, und Sie sparen sich die Extra-Schichten der Plattformen.

Wenn Sie LinkedIn oder andere Plattformen nutzen, filtern Sie nach aktuellen Anzeigen, zum Beispiel Stellen, die **nur diese Woche** gepostet wurden. Früh bewerben ist immer besser. Frische Anzeigen haben weniger Bewerber, und Ihr Name erscheint, während die Stelle neu ist und HR aktiv Bewerbungen sichtet.

!> „Einen Job finden“ ist riesig. „Heute eine gute Bewerbung schicken“ schaffen Sie vor dem Abendessen.

## Starten Sie Ihre Bewerbungs-Serie bei 123Resume

Genau für diese tägliche Gewohnheit gibt es im Job-Tracker eine **Bewerbungs-Serie**.

1. Jede Bewerbung erfassen | Klicken Sie auf **Bewerbung hinzufügen** im [Job-Tracker](/resumes?tab=job-tracker), wenn Sie sich bewerben. Unternehmen, Stelle, Lebenslauf-Version und Anschreiben an einem Ort.
2. Serie aufbauen | Tragen Sie mindestens eine Bewerbung am Tag ein, und Ihre Flamme wächst um eins.
3. Den Monat im Blick | Ein einfacher Kalender zeigt die Tage mit Bewerbungen und die Lücken.
4. Reminder, wenn es zählt | Wenn Sie heute noch nichts eingetragen haben, erinnert die Flamme in der oberen Leiste Sie vor Mitternacht.

Ein weiterer Vorteil des Trackers: Sie behalten den Überblick, wohin Sie sich beworben haben und was in der Stellenanzeige stand. Wenn ein Interview kommt, können Sie die Anzeige erneut öffnen, die Anforderungen prüfen und die Themen lernen, die dem Unternehmen wichtig sind, statt aus dem Gedächtnis zu raten.

Sie können Bewerbungen auch über Claude eintragen, mit unserem [Claude-Connector](/blog/edit-resume-with-claude). Fügen Sie die Job-Details ein und bitten Sie Claude, sie in Ihren Tracker zu übernehmen. Das Formular müssen Sie dann nicht jedes Mal selbst ausfüllen.

Machen Sie heute den kleinen Schritt. Eine gute Bewerbung. Und morgen wieder.

[Job-Tracker öffnen und Serie starten →](/resumes?tab=job-tracker)
`,
    },
    {
      id: "edit-resume-with-claude",
      title: "Lebenslauf bearbeiten, indem Sie einfach Claude fragen (Schritt-für-Schritt-Anleitung)",
      excerpt: "123Resume funktioniert jetzt direkt in Claude. Erfahren Sie, was das bedeutet, wie Sie es in einer Minute verbinden und was Sie fragen können. Ganz ohne Technikwissen.",
      category: "KI-Tools",
      readTime: "3 Min. Lesezeit",
      date: "25. Okt. 2026",
      isoDate: "2026-10-25",
      gradient: "from-orange-500/20 via-rose-500/10 to-amber-500/5",
      iconColor: "text-orange-500",
      image: "/blog-claude-connector.png",
      tags: ["KI", "Claude", "Lebenslauf-Tipps", "Anleitung"],
      content: `
Sagen Sie Claude, was sich in Ihrer Karriere geändert hat, und Ihr Lebenslauf bei 123Resume aktualisiert sich in Sekunden. Keine Formulare und kein Technikwissen nötig.

## In 1 Minute eingerichtet

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
  ],
};

export const getBlogPosts = (language: 'en' | 'de' = 'en'): BlogPost[] => {
  return blogPostsByLanguage[language] || blogPostsByLanguage.en;
};

export const getBlogPost = (id: string, language: 'en' | 'de' = 'en'): BlogPost | undefined => {
  return getBlogPosts(language).find(post => post.id === id);
};
