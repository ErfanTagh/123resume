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
      id: "save-jobs-chrome-extension",
      title: "Save Jobs and Write Cover Letters Right From the Posting — Our New Chrome Extension",
      excerpt: "Browse roles that fit your resume, save any posting to your tracker in one click, and generate a tailored cover letter — without leaving the page.",
      category: "Job Search",
      readTime: "3 min read",
      date: "Nov 11, 2026",
      isoDate: "2026-11-11",
      gradient: "from-rose-500/20 via-pink-500/10 to-fuchsia-500/5",
      iconColor: "text-rose-500",
      image: "/blog-extension.png",
      tags: ["Chrome Extension", "Job Search", "AI", "Cover Letter", "123Resume"],
      content: `
Applying for jobs means living across a dozen tabs. You find a great role on one career page, a promising one on another, and by Friday you can't remember which was which — and every posting still wants its own cover letter.

Our new Chrome extension, **123Resume Job Saver**, pulls all of that into one place, right next to the job you're looking at.

[Add it to Chrome →](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek)

## Set it up in 1 minute

1. Install it | Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek) and click **Add to Chrome**.
2. Sign in to 123Resume | Make sure you're logged in at 123resume.de in a tab — the extension reuses that session, with no separate login.
3. Open it and pick a resume | Click the 123Resume icon in your toolbar, choose a resume, and you're ready.

!> You need a free 123Resume account. No account yet? Build your resume first at 123resume.de.

## What it does

### See openings that fit your resume

Open the extension and it shows open roles matched to the resume you pick, pulled straight from companies' own career pages. They link to the real application form and are free to browse. Flip on **Germany & remote only** to keep the list focused on roles you can take.

### Save any job to your tracker — tidied up for you

Found a posting anywhere on the web? Click **Save this job to my tracker**. The extension reads the page, and Claude turns the messy posting into a clean record — title, company, location, salary, responsibilities, requirements and key skills — then files it in your 123Resume job tracker. Your whole search stays in one list instead of scattered across bookmarks and tabs.

### Write a cover letter — and download the PDF

Still on the posting? Pick a resume, choose English or German, and hit **Generate cover letter**. You get a letter tuned to that specific role — no generic templates — ready to review and **download as a PDF**.

## Your data stays yours

+ It reads a job page **only when you click a button** — never in the background, and never on sites you're only browsing
+ It talks **only to the 123Resume API** — no third parties, no tracking, no ads
+ Your login stays in your browser, and you can remove it anytime with **Disconnect**

Full details are in our [Privacy Policy](https://123resume.de/privacy), under "Browser extension".

## Get started

[Install the extension](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek), sign in at 123resume.de, and keep your whole job hunt — openings, saved roles and cover letters — in one place.
`,
    },
    {
      id: "job-search-international-students-germany",
      title: "How to Increase Your Chances in the Job Search as an International Student in Germany",
      excerpt: "You can have all the knowledge in the world, but interviews are won with words. Here is how non-native speakers can prepare for German interviews.",
      category: "Job Search",
      readTime: "4 min read",
      date: "Nov 6, 2026",
      isoDate: "2026-11-06",
      gradient: "from-sky-500/20 via-blue-500/10 to-indigo-500/5",
      iconColor: "text-sky-500",
      image: "/blog-germany-interview.png",
      tags: ["Job Search", "Germany", "International Students", "German Language", "Interviews"],
      content: `
Here is an uncomfortable truth about job interviews: you could have all the knowledge in the world, but if you can't express it well in the interview, another applicant who speaks better and uses better vocabulary might get the job and take over the role that should have been yours. Hiring managers don't grade what's in your head. They grade what comes out of your mouth in those 45 minutes.

## The interview is a language test in disguise

That sounds unfair, and sometimes it is. But put yourself in the interviewer's chair: they meet two candidates with similar degrees and similar projects. One searches for words, answers in short, hesitant sentences, and falls back on vague phrases. The other explains their work clearly, uses the right professional terms, and asks sharp questions back. Guess who feels like "a better fit for the team".

**It was never only about knowledge. It's about how convincingly you can present it.**

## Why Germany makes this extra hard

If you're looking for a job in Germany as a non-native speaker, you already know the challenge: German is not an easy language. The grammar is unforgiving, the professional vocabulary is long and specific, and interview German is its own register — more formal than the German you use with friends, but full of standard phrases that native speakers produce without thinking.

Many international students in Germany speak good everyday German and still freeze in interviews. Not because their German is bad, but because interview vocabulary — words like **Berufserfahrung**, **Gehaltsvorstellung**, **Kündigungsfrist**, **Stärken und Schwächen** — simply never came up in daily life or at university.

## The trick: learn the words that actually appear in interviews

Here is the good news: interview language is surprisingly repetitive. The same questions, the same phrases, and the same vocabulary come up again and again, across companies and industries. You don't need to master all of German. You need to master the few hundred words that dominate the interview setting.

That is a much smaller, much more realistic goal — and it's exactly what spaced repetition flashcards are built for.

1. Learn the high-frequency interview words first | Focus on the vocabulary that appears in almost every interview: experience, strengths, notice period, salary expectations, teamwork, responsibilities.
2. Review a few minutes every day | Ten minutes of daily review beats a cram session the night before. By interview day, the words come out automatically instead of being searched for.
3. Practice saying them out loud | Knowing a word passively is not the same as producing it under pressure. Build example sentences and say them aloud.

To make this easy, we put together a free German interview vocabulary collection on RecallCards, our flashcard app. One click adds the deck to your account, and you can start reviewing right away:

[Get the German interview vocabulary deck on RecallCards →](https://recallcards.net/import/ix3OWCwiUx7S)

!> Review the deck daily in the two weeks before your interview. The goal is that words like "Gehaltsvorstellung" trigger an instant answer, not a pause.

## A few more things that help

+ Prepare answers to the standard questions (tell me about yourself, strengths and weaknesses, why this company) and rehearse them in German out loud
+ Reuse the vocabulary from the job ad — if the posting says "eigenverantwortlich", say "eigenverantwortlich" in your answers
+ It's fine to speak slower and simpler, but correctly, rather than fast and messy
+ If you blank on a word, describe it instead of stopping — interviewers care about communication, not perfection

Your knowledge got you the interview. Make sure your words can carry it over the finish line.
`,
    },
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
      id: "save-jobs-chrome-extension",
      title: "Jobs speichern und Anschreiben direkt aus der Stellenanzeige — unsere neue Chrome-Erweiterung",
      excerpt: "Entdecken Sie passende Stellen, speichern Sie jede Anzeige mit einem Klick in Ihrem Tracker und erstellen Sie ein passgenaues Anschreiben — ohne die Seite zu verlassen.",
      category: "Jobsuche",
      readTime: "3 Min. Lesezeit",
      date: "11. Nov. 2026",
      isoDate: "2026-11-11",
      gradient: "from-rose-500/20 via-pink-500/10 to-fuchsia-500/5",
      iconColor: "text-rose-500",
      image: "/blog-extension.png",
      tags: ["Chrome-Erweiterung", "Jobsuche", "KI", "Anschreiben", "123Resume"],
      content: `
Bei der Jobsuche lebt man in einem Dutzend Tabs. Eine gute Stelle auf der einen Karriereseite, eine vielversprechende auf der nächsten — und am Freitag wissen Sie nicht mehr, welche welche war. Jede Anzeige will außerdem ihr eigenes Anschreiben.

Unsere neue Chrome-Erweiterung **123Resume Job Saver** bringt all das an einen Ort, direkt neben der Stelle, die Sie gerade ansehen.

[Zu Chrome hinzufügen →](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek)

## In 1 Minute eingerichtet

1. Installieren | Öffnen Sie die [Chrome-Web-Store-Seite](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek) und klicken Sie auf **Add to Chrome**.
2. Bei 123Resume anmelden | Stellen Sie sicher, dass Sie in einem Tab bei 123resume.de angemeldet sind — die Erweiterung nutzt diese Sitzung, ganz ohne separate Anmeldung.
3. Öffnen und Lebenslauf wählen | Klicken Sie auf das 123Resume-Symbol in Ihrer Symbolleiste, wählen Sie einen Lebenslauf, und los geht's.

!> Sie brauchen ein kostenloses 123Resume-Konto. Noch keines? Erstellen Sie zuerst Ihren Lebenslauf auf 123resume.de.

## Was sie kann

### Passende Stellen sehen

Öffnen Sie die Erweiterung, und sie zeigt offene Stellen, die zum gewählten Lebenslauf passen — direkt von den Karriereseiten der Unternehmen. Sie verlinken auf das echte Bewerbungsformular und sind kostenlos. Mit **Nur Deutschland & Remote** bleibt die Liste auf passende Stellen beschränkt.

### Jede Stelle in den Tracker speichern — automatisch aufbereitet

Irgendwo eine Anzeige gefunden? Klicken Sie auf **Diese Stelle in meinen Tracker speichern**. Die Erweiterung liest die Seite, und Claude macht aus der unübersichtlichen Anzeige einen sauberen Eintrag — Titel, Unternehmen, Ort, Gehalt, Aufgaben, Anforderungen und wichtigste Skills — und legt ihn in Ihrem 123Resume-Bewerbungstracker ab. Ihre ganze Suche bleibt in einer Liste statt verstreut über Lesezeichen und Tabs.

### Ein Anschreiben erstellen — und als PDF herunterladen

Noch auf der Anzeige? Wählen Sie einen Lebenslauf und Englisch oder Deutsch und klicken Sie auf **Anschreiben erstellen**. Sie erhalten ein auf genau diese Stelle zugeschnittenes Anschreiben — keine Standardvorlagen — zum Prüfen und als **PDF herunterladen**.

## Ihre Daten bleiben bei Ihnen

+ Sie liest eine Stellenseite **nur auf Ihren Klick** — nie im Hintergrund und nie auf Seiten, die Sie nur durchstöbern
+ Sie kommuniziert **ausschließlich mit der 123Resume-API** — keine Dritten, kein Tracking, keine Werbung
+ Ihre Anmeldung bleibt in Ihrem Browser, und Sie können sie jederzeit über **Trennen** entfernen

Alle Details finden Sie in unserer [Datenschutzerklärung](https://123resume.de/privacy) unter „Browser-Erweiterung".

## Jetzt starten

[Installieren Sie die Erweiterung](https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek), melden Sie sich bei 123resume.de an, und behalten Sie Ihre ganze Jobsuche — Stellen, gespeicherte Jobs und Anschreiben — an einem Ort.
`,
    },
    {
      id: "job-search-international-students-germany",
      title: "So erhöhen Sie Ihre Chancen bei der Jobsuche als internationale:r Studierende:r in Deutschland",
      excerpt: "Sie können alles Wissen der Welt haben, doch Interviews werden mit Worten gewonnen. So bereiten sich Nicht-Muttersprachler auf deutsche Vorstellungsgespräche vor.",
      category: "Jobsuche",
      readTime: "4 Min. Lesezeit",
      date: "6. Nov. 2026",
      isoDate: "2026-11-06",
      gradient: "from-sky-500/20 via-blue-500/10 to-indigo-500/5",
      iconColor: "text-sky-500",
      image: "/blog-germany-interview.png",
      tags: ["Jobsuche", "Deutschland", "Internationale Studierende", "Deutsch lernen", "Vorstellungsgespräch"],
      content: `
Eine unbequeme Wahrheit über Vorstellungsgespräche: Sie können alles Wissen der Welt haben, doch wenn Sie es im Gespräch nicht gut ausdrücken können, bekommt vielleicht ein anderer Bewerber den Job, der besser spricht und die passenderen Worte findet — und übernimmt die Rolle, die eigentlich Ihre hätte sein sollen. Hiring Manager bewerten nicht, was in Ihrem Kopf ist. Sie bewerten, was in diesen 45 Minuten aus Ihrem Mund kommt.

## Das Interview ist ein versteckter Sprachtest

Das klingt unfair, und manchmal ist es das auch. Aber versetzen Sie sich in die Lage der Interviewer: Zwei Kandidaten mit ähnlichen Abschlüssen und ähnlichen Projekten. Einer sucht nach Worten, antwortet in kurzen, zögerlichen Sätzen und flüchtet sich in vage Floskeln. Der andere erklärt seine Arbeit klar, nutzt die richtigen Fachbegriffe und stellt kluge Rückfragen. Raten Sie, wer „besser ins Team passt".

**Es ging nie nur um Wissen. Es geht darum, wie überzeugend Sie es präsentieren können.**

## Warum Deutschland es besonders schwer macht

Wenn Sie als Nicht-Muttersprachler in Deutschland einen Job suchen, kennen Sie die Herausforderung: Deutsch ist keine einfache Sprache. Die Grammatik verzeiht wenig, das Berufsvokabular ist lang und spezifisch, und Interview-Deutsch ist ein eigenes Register — formeller als das Deutsch mit Freunden, aber voller Standardphrasen, die Muttersprachler produzieren, ohne nachzudenken.

Viele internationale Studierende in Deutschland sprechen gutes Alltagsdeutsch und blockieren trotzdem im Interview. Nicht weil ihr Deutsch schlecht ist, sondern weil Interview-Vokabeln — Wörter wie **Berufserfahrung**, **Gehaltsvorstellung**, **Kündigungsfrist**, **Stärken und Schwächen** — im Alltag und an der Uni schlicht nie vorkamen.

## Der Trick: Lernen Sie die Wörter, die wirklich im Interview auftauchen

Die gute Nachricht: Interview-Sprache wiederholt sich erstaunlich oft. Dieselben Fragen, dieselben Phrasen und dieselben Vokabeln tauchen immer wieder auf, über Unternehmen und Branchen hinweg. Sie müssen nicht das gesamte Deutsch beherrschen. Sie müssen die paar hundert Wörter beherrschen, die im Interview-Kontext dominieren.

Das ist ein viel kleineres, viel realistischeres Ziel — und genau dafür sind Karteikarten mit Spaced Repetition gemacht.

1. Zuerst die häufigsten Interview-Wörter lernen | Konzentrieren Sie sich auf das Vokabular, das in fast jedem Gespräch vorkommt: Erfahrung, Stärken, Kündigungsfrist, Gehaltsvorstellung, Teamarbeit, Verantwortung.
2. Jeden Tag ein paar Minuten wiederholen | Zehn Minuten tägliche Wiederholung schlagen das Pauken am Abend davor. Am Tag des Interviews kommen die Wörter automatisch, statt gesucht zu werden.
3. Laut aussprechen üben | Ein Wort passiv zu kennen ist nicht dasselbe, wie es unter Druck zu produzieren. Bilden Sie Beispielsätze und sagen Sie sie laut.

Damit das leicht fällt, haben wir eine kostenlose Sammlung mit deutschen Interview-Vokabeln auf RecallCards zusammengestellt, unserer Karteikarten-App. Ein Klick fügt das Deck Ihrem Konto hinzu, und Sie können sofort loslegen:

[Deutsches Interview-Vokabel-Deck auf RecallCards holen →](https://recallcards.net/import/ix3OWCwiUx7S)

!> Wiederholen Sie das Deck täglich in den zwei Wochen vor Ihrem Interview. Das Ziel: Wörter wie „Gehaltsvorstellung" lösen eine sofortige Antwort aus, keine Pause.

## Was außerdem hilft

+ Bereiten Sie Antworten auf die Standardfragen vor (erzählen Sie von sich, Stärken und Schwächen, warum dieses Unternehmen) und üben Sie sie laut auf Deutsch
+ Übernehmen Sie das Vokabular aus der Stellenanzeige — steht dort „eigenverantwortlich", sagen Sie „eigenverantwortlich" in Ihren Antworten
+ Lieber langsamer und einfacher, aber korrekt sprechen, als schnell und durcheinander
+ Fällt Ihnen ein Wort nicht ein, umschreiben Sie es, statt zu stoppen — Interviewern geht es um Kommunikation, nicht um Perfektion

Ihr Wissen hat Ihnen das Interview verschafft. Sorgen Sie dafür, dass Ihre Worte es über die Ziellinie tragen.
`,
    },
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
