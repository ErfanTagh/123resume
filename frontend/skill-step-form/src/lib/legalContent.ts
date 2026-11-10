// Content for the legal pages (Terms of Service, Privacy Policy), in English and
// German. Kept here as typed data rather than ~120 flat i18n keys so the long
// prose stays readable and the two languages sit side by side.
//
// NOTE: written to match what 123Resume actually does (AI via Anthropic, the
// Claude connector, Job Suggestions via SearchApi, email via Mailgun, hosting at
// Hetzner). It is not legal advice; have it reviewed before relying on it, and
// add a German Impressum (legally required) with the operator's full details.

export type LegalBlock = { p: string } | { lead?: string; list: string[] };

export type LegalSection = { title: string; blocks: LegalBlock[] };

export type LegalDoc = {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
};

const CONTACT = "contact@123resume.de";

// ──────────────────────────────────────────────────────────────────────────
// Terms of Service
// ──────────────────────────────────────────────────────────────────────────

export const TERMS: Record<"en" | "de", LegalDoc> = {
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated: November 2026",
    intro:
      "These Terms govern your use of 123Resume (the “Service”). By creating an account or using the Service, you agree to them. If you do not agree, please do not use the Service.",
    sections: [
      {
        title: "1. The Service",
        blocks: [
          {
            p: "123Resume is an online tool to create, edit, score, translate and manage resumes, track job applications, and discover job listings. Some features use artificial intelligence and third-party services, described below.",
          },
        ],
      },
      {
        title: "2. Eligibility and Accounts",
        blocks: [
          {
            p: "You must be at least 16 years old to use the Service. You are responsible for keeping your login credentials confidential and for all activity under your account. Please provide accurate information and tell us promptly about any unauthorized use of your account.",
          },
        ],
      },
      {
        title: "3. Acceptable Use",
        blocks: [
          { lead: "You may use 123Resume for your own personal job-search purposes, including to:", list: [
            "create and edit resumes and download them as PDF files;",
            "save multiple resume versions and track your job applications;",
            "use the AI features and connect the Service to Claude via our connector.",
          ] },
          { lead: "You may not:", list: [
            "resell or redistribute our templates, or reverse-engineer or copy our code;",
            "use the Service to break the law, infringe anyone's rights, or add content you do not have the right to use;",
            "disrupt, overload, or attempt to gain unauthorized access to the Service or to other users' data;",
            "scrape or access the Service by automated means other than the connector we provide.",
          ] },
        ],
      },
      {
        title: "4. Your Content and Ownership",
        blocks: [
          {
            p: "You keep all rights to the resume content and other information you add (“Your Content”). You are responsible for its accuracy and legality. You grant us the limited right to store, process and display Your Content solely to operate the Service for you — including sending the relevant parts to the AI and other providers described below. We do not sell Your Content.",
          },
        ],
      },
      {
        title: "5. AI Features",
        blocks: [
          {
            p: "Features such as resume scoring, parsing of uploaded resumes, the “improve” and translation tools, job matching, and the assistant send the relevant text of your resume to our AI provider, Anthropic (“Claude”), to generate a result. Your profile photo is not sent to the AI.",
          },
          {
            p: "AI output can be wrong, incomplete or biased. Always review it before you rely on it or submit a resume to an employer. You are responsible for the final resume you use.",
          },
        ],
      },
      {
        title: "6. Job Suggestions",
        blocks: [
          {
            p: "The Job Suggestions feature sends a job title and location derived from your resume to a third-party search provider (SearchApi.io) to return recent public job postings from LinkedIn. Results come from LinkedIn and may be inaccurate or out of date; we do not endorse any employer or posting. This feature is in a test phase, is rate-limited, and may change or be removed at any time.",
          },
        ],
      },
      {
        title: "7. The Claude Connector",
        blocks: [
          {
            p: "You can connect 123Resume to Claude (Anthropic) using our connector. After you sign in and authorize it, Claude can read and edit your resumes and job tracker on your behalf. The connector cannot delete a resume, and you can disconnect it at any time from Claude. Your use of Claude is also subject to Anthropic's own terms.",
          },
        ],
      },
      {
        title: "8. Third-Party Services",
        blocks: [
          {
            p: "We rely on third parties to provide the Service, including Anthropic (AI), SearchApi.io (job search), Mailgun (email), Hetzner (hosting, in Germany), and any social login provider you choose (Google, LinkedIn, GitHub, Xing). How these providers handle personal data is described in our Privacy Policy.",
          },
        ],
      },
      {
        title: "9. Communications",
        blocks: [
          {
            p: "While you have an account we may send you service messages (for example about your account or security) and occasional product updates. You can unsubscribe from product and marketing emails at any time using the link in those emails; essential service messages may still be sent.",
          },
        ],
      },
      {
        title: "10. Operator Access",
        blocks: [
          {
            p: "We may access account data where reasonably necessary to operate, maintain, secure or support the Service, to investigate abuse, or to comply with legal obligations. We do not access Your Content for unrelated purposes. See the Privacy Policy for details.",
          },
        ],
      },
      {
        title: "11. Availability and Changes to the Service",
        blocks: [
          {
            p: "We work to keep the Service reliable but do not guarantee that it will be uninterrupted or error-free. We may modify, suspend or discontinue features — including free features and test features — at any time.",
          },
        ],
      },
      {
        title: "12. Disclaimer",
        blocks: [
          {
            p: "To the maximum extent permitted by law, the Service is provided “as is” and “as available”, without warranties of any kind. We do not warrant that the Service, the AI output, or the job data will be accurate, complete, or fit for a particular purpose.",
          },
        ],
      },
      {
        title: "13. Limitation of Liability",
        blocks: [
          {
            p: "To the maximum extent permitted by law, 123Resume and its operator are not liable for indirect, incidental, special or consequential damages arising from your use of the Service. Nothing in these Terms limits liability that cannot be limited by law — for example for intent, gross negligence, or injury to life, body or health. Your mandatory consumer-protection rights under the law of your country of residence remain unaffected.",
          },
        ],
      },
      {
        title: "14. Termination",
        blocks: [
          {
            p: "You can stop using the Service and delete your account at any time. We may suspend or terminate access if you materially breach these Terms. When you delete a resume or your account, the associated data is removed as described in the Privacy Policy.",
          },
        ],
      },
      {
        title: "15. Governing Law",
        blocks: [
          {
            p: "These Terms are governed by the laws of the Federal Republic of Germany, excluding its conflict-of-law rules and the UN Convention on Contracts for the International Sale of Goods. If you are a consumer, the mandatory consumer-protection laws of your country of residence also apply.",
          },
        ],
      },
      {
        title: "16. Changes to These Terms",
        blocks: [
          {
            p: "We may update these Terms to reflect changes to the Service or the law. We will update the “Last updated” date and, for significant changes, make reasonable efforts to notify you. Continued use of the Service after changes take effect means you accept the updated Terms.",
          },
        ],
      },
      {
        title: "17. Contact",
        blocks: [{ p: `For questions about these Terms, contact us at ${CONTACT}.` }],
      },
    ],
  },

  de: {
    title: "Nutzungsbedingungen",
    lastUpdated: "Zuletzt aktualisiert: November 2026",
    intro:
      "Diese Nutzungsbedingungen regeln Ihre Nutzung von 123Resume (der „Dienst“). Mit der Erstellung eines Kontos oder der Nutzung des Dienstes stimmen Sie ihnen zu. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst bitte nicht.",
    sections: [
      {
        title: "1. Der Dienst",
        blocks: [
          {
            p: "123Resume ist ein Online-Werkzeug zum Erstellen, Bearbeiten, Bewerten, Übersetzen und Verwalten von Lebensläufen, zum Nachverfolgen von Bewerbungen und zum Entdecken von Stellenanzeigen. Einige Funktionen nutzen künstliche Intelligenz und Dienste Dritter, die nachfolgend beschrieben werden.",
          },
        ],
      },
      {
        title: "2. Zulässigkeit und Konten",
        blocks: [
          {
            p: "Sie müssen mindestens 16 Jahre alt sein, um den Dienst zu nutzen. Sie sind dafür verantwortlich, Ihre Zugangsdaten vertraulich zu halten, und für alle Aktivitäten unter Ihrem Konto. Bitte machen Sie zutreffende Angaben und informieren Sie uns unverzüglich über jede unbefugte Nutzung Ihres Kontos.",
          },
        ],
      },
      {
        title: "3. Zulässige Nutzung",
        blocks: [
          { lead: "Sie dürfen 123Resume für Ihre eigene Jobsuche nutzen, insbesondere um:", list: [
            "Lebensläufe zu erstellen, zu bearbeiten und als PDF herunterzuladen;",
            "mehrere Versionen zu speichern und Ihre Bewerbungen nachzuverfolgen;",
            "die KI-Funktionen zu nutzen und den Dienst über unseren Connector mit Claude zu verbinden.",
          ] },
          { lead: "Sie dürfen nicht:", list: [
            "unsere Vorlagen weiterverkaufen oder weiterverbreiten oder unseren Code zurückentwickeln oder kopieren;",
            "den Dienst nutzen, um gegen Gesetze zu verstoßen, Rechte Dritter zu verletzen oder Inhalte einzustellen, zu deren Nutzung Sie nicht berechtigt sind;",
            "den Dienst stören, überlasten oder versuchen, unbefugt auf den Dienst oder auf Daten anderer Nutzer zuzugreifen;",
            "den Dienst automatisiert auslesen oder abrufen, außer über den von uns bereitgestellten Connector.",
          ] },
        ],
      },
      {
        title: "4. Ihre Inhalte und Eigentum",
        blocks: [
          {
            p: "Sie behalten alle Rechte an den Lebenslaufinhalten und sonstigen Informationen, die Sie hinzufügen („Ihre Inhalte“). Sie sind für deren Richtigkeit und Rechtmäßigkeit verantwortlich. Sie räumen uns das begrenzte Recht ein, Ihre Inhalte zu speichern, zu verarbeiten und anzuzeigen, ausschließlich um den Dienst für Sie zu betreiben — einschließlich der Übermittlung der relevanten Teile an die nachfolgend beschriebenen KI- und sonstigen Anbieter. Wir verkaufen Ihre Inhalte nicht.",
          },
        ],
      },
      {
        title: "5. KI-Funktionen",
        blocks: [
          {
            p: "Funktionen wie die Lebenslaufbewertung, das Einlesen hochgeladener Lebensläufe, die Werkzeuge „Verbessern“ und „Übersetzen“, der Stellenabgleich und der Assistent übermitteln den relevanten Text Ihres Lebenslaufs an unseren KI-Anbieter Anthropic („Claude“), um ein Ergebnis zu erzeugen. Ihr Profilfoto wird nicht an die KI übermittelt.",
          },
          {
            p: "KI-Ergebnisse können falsch, unvollständig oder verzerrt sein. Prüfen Sie sie stets, bevor Sie sich darauf verlassen oder einen Lebenslauf bei einem Arbeitgeber einreichen. Für den letztlich verwendeten Lebenslauf sind Sie verantwortlich.",
          },
        ],
      },
      {
        title: "6. Jobvorschläge",
        blocks: [
          {
            p: "Die Funktion Jobvorschläge übermittelt einen aus Ihrem Lebenslauf abgeleiteten Jobtitel und Ort an einen Drittanbieter (SearchApi.io), um aktuelle öffentliche Stellenanzeigen von LinkedIn zurückzugeben. Die Ergebnisse stammen von LinkedIn und können ungenau oder veraltet sein; wir empfehlen keinen Arbeitgeber und keine Anzeige. Diese Funktion befindet sich in einer Testphase, ist mengenmäßig begrenzt und kann jederzeit geändert oder entfernt werden.",
          },
        ],
      },
      {
        title: "7. Der Claude-Connector",
        blocks: [
          {
            p: "Sie können 123Resume über unseren Connector mit Claude (Anthropic) verbinden. Nachdem Sie sich angemeldet und ihn autorisiert haben, kann Claude in Ihrem Auftrag Ihre Lebensläufe und Ihre Bewerbungsübersicht lesen und bearbeiten. Der Connector kann keinen Lebenslauf löschen, und Sie können ihn jederzeit in Claude trennen. Ihre Nutzung von Claude unterliegt zusätzlich den eigenen Bedingungen von Anthropic.",
          },
        ],
      },
      {
        title: "8. Dienste Dritter",
        blocks: [
          {
            p: "Wir setzen zur Bereitstellung des Dienstes Dritte ein, darunter Anthropic (KI), SearchApi.io (Jobsuche), Mailgun (E-Mail), Hetzner (Hosting in Deutschland) sowie den von Ihnen gewählten Anbieter für die Social-Anmeldung (Google, LinkedIn, GitHub, Xing). Wie diese Anbieter personenbezogene Daten verarbeiten, ist in unserer Datenschutzerklärung beschrieben.",
          },
        ],
      },
      {
        title: "9. Kommunikation",
        blocks: [
          {
            p: "Solange Sie ein Konto haben, können wir Ihnen Service-Nachrichten (etwa zu Ihrem Konto oder zur Sicherheit) und gelegentlich Produktneuigkeiten senden. Von Produkt- und Marketing-E-Mails können Sie sich jederzeit über den Link in diesen E-Mails abmelden; wesentliche Service-Nachrichten können dennoch versendet werden.",
          },
        ],
      },
      {
        title: "10. Zugriff des Betreibers",
        blocks: [
          {
            p: "Wir können auf Kontodaten zugreifen, soweit dies vernünftigerweise erforderlich ist, um den Dienst zu betreiben, zu warten, abzusichern oder zu unterstützen, um Missbrauch zu untersuchen oder um gesetzlichen Pflichten nachzukommen. Wir greifen nicht zu sachfremden Zwecken auf Ihre Inhalte zu. Einzelheiten finden Sie in der Datenschutzerklärung.",
          },
        ],
      },
      {
        title: "11. Verfügbarkeit und Änderungen des Dienstes",
        blocks: [
          {
            p: "Wir bemühen uns um einen zuverlässigen Dienst, garantieren jedoch nicht, dass er ununterbrochen oder fehlerfrei ist. Wir können Funktionen — einschließlich kostenloser Funktionen und Testfunktionen — jederzeit ändern, aussetzen oder einstellen.",
          },
        ],
      },
      {
        title: "12. Haftungsausschluss",
        blocks: [
          {
            p: "Soweit gesetzlich zulässig, wird der Dienst „wie besehen“ und „wie verfügbar“ ohne jegliche Gewährleistung bereitgestellt. Wir gewährleisten nicht, dass der Dienst, die KI-Ergebnisse oder die Jobdaten richtig, vollständig oder für einen bestimmten Zweck geeignet sind.",
          },
        ],
      },
      {
        title: "13. Haftungsbeschränkung",
        blocks: [
          {
            p: "Soweit gesetzlich zulässig, haften 123Resume und sein Betreiber nicht für indirekte, beiläufige, besondere oder Folgeschäden aus Ihrer Nutzung des Dienstes. Nichts in diesen Bedingungen beschränkt eine Haftung, die gesetzlich nicht beschränkt werden kann — etwa für Vorsatz, grobe Fahrlässigkeit oder die Verletzung von Leben, Körper oder Gesundheit. Ihre zwingenden Verbraucherschutzrechte nach dem Recht Ihres Wohnsitzlandes bleiben unberührt.",
          },
        ],
      },
      {
        title: "14. Beendigung",
        blocks: [
          {
            p: "Sie können die Nutzung des Dienstes jederzeit beenden und Ihr Konto löschen. Wir können den Zugang aussetzen oder beenden, wenn Sie wesentlich gegen diese Bedingungen verstoßen. Wenn Sie einen Lebenslauf oder Ihr Konto löschen, werden die zugehörigen Daten gemäß der Datenschutzerklärung entfernt.",
          },
        ],
      },
      {
        title: "15. Anwendbares Recht",
        blocks: [
          {
            p: "Diese Bedingungen unterliegen dem Recht der Bundesrepublik Deutschland unter Ausschluss des Kollisionsrechts und des UN-Kaufrechts. Wenn Sie Verbraucher sind, gelten zusätzlich die zwingenden Verbraucherschutzvorschriften Ihres Wohnsitzlandes.",
          },
        ],
      },
      {
        title: "16. Änderungen dieser Bedingungen",
        blocks: [
          {
            p: "Wir können diese Bedingungen anpassen, um Änderungen des Dienstes oder der Rechtslage abzubilden. Wir aktualisieren das Datum „Zuletzt aktualisiert“ und bemühen uns bei wesentlichen Änderungen in angemessener Weise, Sie zu benachrichtigen. Die weitere Nutzung des Dienstes nach Inkrafttreten der Änderungen gilt als Zustimmung zu den aktualisierten Bedingungen.",
          },
        ],
      },
      {
        title: "17. Kontakt",
        blocks: [{ p: `Bei Fragen zu diesen Bedingungen erreichen Sie uns unter ${CONTACT}.` }],
      },
    ],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Privacy Policy
// ──────────────────────────────────────────────────────────────────────────

export const PRIVACY: Record<"en" | "de", LegalDoc> = {
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: November 2026",
    intro:
      "This policy explains how 123Resume handles your personal data and your rights under the GDPR.",
    sections: [
      {
        title: "1. Who is responsible",
        blocks: [
          {
            p: `The controller for your personal data is the operator of 123Resume, contactable at ${CONTACT}. The operator's full legal details are set out in the Impressum (legal notice).`,
          },
        ],
      },
      {
        title: "2. Data we collect",
        blocks: [
          { list: [
            "Account data: your name, email address and a hashed password; or, if you use social login, the basic profile (name, email) provided by that provider.",
            "Resume content: everything you put into your resumes — personal and contact details, work and education history, skills, and an optional photo — and your job-tracker entries.",
            "Usage and technical data: your IP address, browser and device information, and server logs, used to operate and secure the Service.",
          ] },
        ],
      },
      {
        title: "3. How and why we use your data",
        blocks: [
          { lead: "We process your data on the following legal bases:", list: [
            "To provide the Service you requested — create, store, score, translate and manage your resumes and track applications (Art. 6(1)(b) GDPR, performance of a contract).",
            "To secure, maintain and improve the Service and prevent abuse (Art. 6(1)(f), legitimate interests).",
            "To send product updates where permitted, which you can opt out of (Art. 6(1)(a) or (f)).",
            "To comply with legal obligations (Art. 6(1)(c)).",
          ] },
        ],
      },
      {
        title: "4. AI processing",
        blocks: [
          {
            p: "When you use an AI feature or the Claude connector, the relevant text of your resume is sent to our AI provider, Anthropic, to generate the result. Your profile photo is not sent. Anthropic processes this data to return a response; its own privacy terms apply to that processing.",
          },
        ],
      },
      {
        title: "5. Job Suggestions",
        blocks: [
          {
            p: "When you use Job Suggestions, a job title and location derived from your resume are sent to SearchApi.io to retrieve public LinkedIn job postings. We briefly cache results to limit the number of requests.",
          },
        ],
      },
      {
        title: "6. The Claude connector",
        blocks: [
          {
            p: "If you connect Claude, you authorize it to read and edit your resumes and job tracker through our connector. We store the authorization tokens needed to keep the connection working. You can revoke the connection at any time in Claude.",
          },
        ],
      },
      {
        title: "7. Service providers and recipients",
        blocks: [
          {
            p: "We share data only as needed to run the Service, with: Anthropic (AI), SearchApi.io (job search), Mailgun (email delivery and open/click tracking on our emails), Hetzner (hosting in Germany), and the social login provider you choose. We do not sell your data.",
          },
        ],
      },
      {
        title: "8. International transfers",
        blocks: [
          {
            p: "Some providers (for example Anthropic) are based outside the EU/EEA, in the United States. Where your data is transferred there, we rely on appropriate safeguards such as the EU Standard Contractual Clauses.",
          },
        ],
      },
      {
        title: "9. Cookies and tracking",
        blocks: [
          {
            p: "We use strictly necessary browser storage (such as a login token) to keep you signed in. Our product emails may contain open and click tracking; you can disable images in your email client or unsubscribe to avoid it.",
          },
        ],
      },
      {
        title: "10. Data retention",
        blocks: [
          {
            p: "We keep your account and resume data for as long as you have an account. When you delete a resume or your account, we delete the associated data, except where we are required to keep limited records to comply with the law.",
          },
        ],
      },
      {
        title: "11. Your rights",
        blocks: [
          {
            p: `You have the right to access, correct, delete, restrict or object to the processing of your data, and to data portability. You can withdraw consent at any time and lodge a complaint with a data-protection supervisory authority. To exercise your rights, contact ${CONTACT}.`,
          },
        ],
      },
      {
        title: "12. Data security",
        blocks: [
          {
            p: "We use measures such as encrypted connections (HTTPS), hashed passwords and access controls to protect your data. No method of transmission or storage is completely secure, but we work to keep your data safe.",
          },
        ],
      },
      {
        title: "13. Children",
        blocks: [
          {
            p: "The Service is not intended for anyone under 16, and we do not knowingly collect personal data from children under 16.",
          },
        ],
      },
      {
        title: "14. Changes to this policy",
        blocks: [
          {
            p: "We may update this policy from time to time. We will update the “Last updated” date and, for significant changes, make reasonable efforts to notify you.",
          },
        ],
      },
      {
        title: "15. Browser extension",
        blocks: [
          {
            p: "We offer an optional Chrome extension, “123Resume Autofill”. It is not required to use 123Resume and does nothing until you install it and sign in. What it accesses:",
          },
          {
            list: [
              "Your 123Resume login: it reads your existing session (access and refresh tokens) from a 123resume.de tab you are already signed in to, and stores it in your browser's local storage so it can call our API for you.",
              "Your resumes: it fetches your resume data from our API to fill application forms, and the openings that match your resume.",
              "The current job page: when you click “Fill current form”, it fills contact fields (name, email, phone, links) into the form on the tab you are viewing. It runs only on that tab, only when you click, and does not read or transmit the contents of other sites.",
            ],
          },
          {
            p: "The extension communicates only with the 123Resume API (https://123resume.de). It sends your data to no other server and contains no tracking or advertising. Your login stays in your browser; remove it any time with the extension's “Disconnect” button or by uninstalling it.",
          },
        ],
      },
      {
        title: "16. Contact",
        blocks: [{ p: `For privacy questions or to exercise your rights, contact us at ${CONTACT}.` }],
      },
    ],
  },

  de: {
    title: "Datenschutzerklärung",
    lastUpdated: "Zuletzt aktualisiert: November 2026",
    intro:
      "Diese Erklärung beschreibt, wie 123Resume Ihre personenbezogenen Daten verarbeitet und welche Rechte Ihnen nach der DSGVO zustehen.",
    sections: [
      {
        title: "1. Verantwortlicher",
        blocks: [
          {
            p: `Verantwortlich für Ihre personenbezogenen Daten ist der Betreiber von 123Resume, erreichbar unter ${CONTACT}. Die vollständigen rechtlichen Angaben des Betreibers finden Sie im Impressum.`,
          },
        ],
      },
      {
        title: "2. Welche Daten wir erheben",
        blocks: [
          { list: [
            "Kontodaten: Ihr Name, Ihre E-Mail-Adresse und ein gehashtes Passwort; oder, bei Nutzung der Social-Anmeldung, das vom Anbieter bereitgestellte Basisprofil (Name, E-Mail).",
            "Lebenslaufinhalte: alles, was Sie in Ihre Lebensläufe eintragen — persönliche und Kontaktdaten, Berufs- und Ausbildungsverlauf, Fähigkeiten und ein optionales Foto — sowie Ihre Einträge in der Bewerbungsübersicht.",
            "Nutzungs- und technische Daten: Ihre IP-Adresse, Browser- und Geräteinformationen sowie Server-Protokolle, die dem Betrieb und der Sicherheit des Dienstes dienen.",
          ] },
        ],
      },
      {
        title: "3. Wie und warum wir Ihre Daten verwenden",
        blocks: [
          { lead: "Wir verarbeiten Ihre Daten auf folgenden Rechtsgrundlagen:", list: [
            "zur Bereitstellung des von Ihnen gewünschten Dienstes — Erstellen, Speichern, Bewerten, Übersetzen und Verwalten Ihrer Lebensläufe sowie Nachverfolgen von Bewerbungen (Art. 6 Abs. 1 lit. b DSGVO, Vertragserfüllung);",
            "zur Absicherung, Wartung und Verbesserung des Dienstes und zur Missbrauchsvermeidung (Art. 6 Abs. 1 lit. f, berechtigte Interessen);",
            "zum Versand von Produktneuigkeiten, soweit zulässig, von denen Sie sich abmelden können (Art. 6 Abs. 1 lit. a oder f);",
            "zur Erfüllung gesetzlicher Pflichten (Art. 6 Abs. 1 lit. c).",
          ] },
        ],
      },
      {
        title: "4. KI-Verarbeitung",
        blocks: [
          {
            p: "Wenn Sie eine KI-Funktion oder den Claude-Connector nutzen, wird der relevante Text Ihres Lebenslaufs an unseren KI-Anbieter Anthropic übermittelt, um das Ergebnis zu erzeugen. Ihr Profilfoto wird nicht übermittelt. Anthropic verarbeitet diese Daten, um eine Antwort zurückzugeben; für diese Verarbeitung gelten die eigenen Datenschutzbestimmungen von Anthropic.",
          },
        ],
      },
      {
        title: "5. Jobvorschläge",
        blocks: [
          {
            p: "Wenn Sie Jobvorschläge nutzen, werden ein aus Ihrem Lebenslauf abgeleiteter Jobtitel und Ort an SearchApi.io übermittelt, um öffentliche Stellenanzeigen von LinkedIn abzurufen. Wir speichern Ergebnisse kurzzeitig zwischen, um die Zahl der Anfragen zu begrenzen.",
          },
        ],
      },
      {
        title: "6. Der Claude-Connector",
        blocks: [
          {
            p: "Wenn Sie Claude verbinden, autorisieren Sie es, über unseren Connector Ihre Lebensläufe und Ihre Bewerbungsübersicht zu lesen und zu bearbeiten. Wir speichern die für die Verbindung erforderlichen Autorisierungs-Tokens. Sie können die Verbindung jederzeit in Claude widerrufen.",
          },
        ],
      },
      {
        title: "7. Dienstleister und Empfänger",
        blocks: [
          {
            p: "Wir geben Daten nur weiter, soweit dies für den Betrieb des Dienstes erforderlich ist, an: Anthropic (KI), SearchApi.io (Jobsuche), Mailgun (E-Mail-Versand sowie Öffnungs-/Klick-Tracking unserer E-Mails), Hetzner (Hosting in Deutschland) und den von Ihnen gewählten Social-Login-Anbieter. Wir verkaufen Ihre Daten nicht.",
          },
        ],
      },
      {
        title: "8. Übermittlung in Drittländer",
        blocks: [
          {
            p: "Einige Anbieter (zum Beispiel Anthropic) haben ihren Sitz außerhalb der EU/des EWR, in den Vereinigten Staaten. Soweit Ihre Daten dorthin übermittelt werden, stützen wir uns auf geeignete Garantien wie die Standardvertragsklauseln der EU.",
          },
        ],
      },
      {
        title: "9. Cookies und Tracking",
        blocks: [
          {
            p: "Wir verwenden unbedingt erforderliche Browser-Speicherung (etwa ein Anmelde-Token), um Sie angemeldet zu halten. Unsere Produkt-E-Mails können Öffnungs- und Klick-Tracking enthalten; Sie können Bilder in Ihrem E-Mail-Programm deaktivieren oder sich abmelden, um dies zu vermeiden.",
          },
        ],
      },
      {
        title: "10. Speicherdauer",
        blocks: [
          {
            p: "Wir speichern Ihre Konto- und Lebenslaufdaten, solange Sie ein Konto haben. Wenn Sie einen Lebenslauf oder Ihr Konto löschen, löschen wir die zugehörigen Daten, es sei denn, wir sind gesetzlich verpflichtet, begrenzte Aufzeichnungen aufzubewahren.",
          },
        ],
      },
      {
        title: "11. Ihre Rechte",
        blocks: [
          {
            p: `Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung und Widerspruch gegen die Verarbeitung Ihrer Daten sowie auf Datenübertragbarkeit. Sie können eine Einwilligung jederzeit widerrufen und sich bei einer Datenschutz-Aufsichtsbehörde beschweren. Zur Ausübung Ihrer Rechte wenden Sie sich an ${CONTACT}.`,
          },
        ],
      },
      {
        title: "12. Datensicherheit",
        blocks: [
          {
            p: "Wir setzen Maßnahmen wie verschlüsselte Verbindungen (HTTPS), gehashte Passwörter und Zugriffskontrollen ein, um Ihre Daten zu schützen. Keine Übertragungs- oder Speichermethode ist vollständig sicher, wir bemühen uns jedoch, Ihre Daten zu schützen.",
          },
        ],
      },
      {
        title: "13. Kinder",
        blocks: [
          {
            p: "Der Dienst richtet sich nicht an Personen unter 16 Jahren, und wir erheben wissentlich keine personenbezogenen Daten von Kindern unter 16 Jahren.",
          },
        ],
      },
      {
        title: "14. Änderungen dieser Erklärung",
        blocks: [
          {
            p: "Wir können diese Erklärung von Zeit zu Zeit anpassen. Wir aktualisieren das Datum „Zuletzt aktualisiert“ und bemühen uns bei wesentlichen Änderungen in angemessener Weise, Sie zu benachrichtigen.",
          },
        ],
      },
      {
        title: "15. Browser-Erweiterung",
        blocks: [
          {
            p: "Wir bieten eine optionale Chrome-Erweiterung „123Resume Autofill“ an. Sie ist für die Nutzung von 123Resume nicht erforderlich und tut nichts, bis Sie sie installieren und sich anmelden. Worauf sie zugreift:",
          },
          {
            list: [
              "Ihre 123Resume-Anmeldung: Sie liest Ihre bestehende Sitzung (Access- und Refresh-Token) aus einem 123resume.de-Tab, in dem Sie bereits angemeldet sind, und speichert sie im lokalen Speicher Ihres Browsers, um unsere API für Sie aufzurufen.",
              "Ihre Lebensläufe: Sie ruft Ihre Lebenslaufdaten über unsere API ab, um Bewerbungsformulare auszufüllen, sowie die zu Ihrem Lebenslauf passenden Stellen.",
              "Die aktuelle Stellenseite: Wenn Sie auf „Formular ausfüllen“ klicken, füllt sie Kontaktfelder (Name, E-Mail, Telefon, Links) in das Formular im gerade geöffneten Tab ein. Sie läuft nur in diesem Tab, nur auf Ihren Klick, und liest oder übermittelt keine Inhalte anderer Websites.",
            ],
          },
          {
            p: "Die Erweiterung kommuniziert ausschließlich mit der 123Resume-API (https://123resume.de). Sie sendet Ihre Daten an keinen anderen Server und enthält kein Tracking und keine Werbung. Ihre Anmeldung bleibt in Ihrem Browser; Sie können sie jederzeit über die Schaltfläche „Trennen“ der Erweiterung oder durch Deinstallation entfernen.",
          },
        ],
      },
      {
        title: "16. Kontakt",
        blocks: [{ p: `Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte erreichen Sie uns unter ${CONTACT}.` }],
      },
    ],
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Impressum (legal notice, § 5 DDG) — required for a German-operated site.
// ──────────────────────────────────────────────────────────────────────────

const OPERATOR = ["Seyed Erfan Taghvaei", "Kurt-Schumacher-Straße 46", "67663 Kaiserslautern", "Deutschland"];

export const IMPRESSUM: Record<"en" | "de", LegalDoc> = {
  en: {
    title: "Legal Notice (Impressum)",
    lastUpdated: "Last updated: November 2026",
    intro: "Information pursuant to § 5 of the German Digital Services Act (DDG).",
    sections: [
      {
        title: "Operator",
        blocks: [
          { p: "123Resume is operated by:" },
          { list: ["Seyed Erfan Taghvaei", "Kurt-Schumacher-Straße 46", "67663 Kaiserslautern", "Germany"] },
        ],
      },
      {
        title: "Contact",
        blocks: [{ p: `Email: ${CONTACT}` }],
      },
      {
        title: "Responsible for content (§ 18 (2) MStV)",
        blocks: [{ list: ["Seyed Erfan Taghvaei", "Kurt-Schumacher-Straße 46", "67663 Kaiserslautern, Germany"] }],
      },
      {
        title: "Consumer dispute resolution",
        blocks: [
          {
            p: "We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.",
          },
        ],
      },
    ],
  },
  de: {
    title: "Impressum",
    lastUpdated: "Stand: November 2026",
    intro: "Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz).",
    sections: [
      {
        title: "Betreiber",
        blocks: [
          { p: "123Resume wird betrieben von:" },
          { list: OPERATOR },
        ],
      },
      {
        title: "Kontakt",
        blocks: [{ p: `E-Mail: ${CONTACT}` }],
      },
      {
        title: "Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)",
        blocks: [{ list: ["Seyed Erfan Taghvaei", "Kurt-Schumacher-Straße 46", "67663 Kaiserslautern"] }],
      },
      {
        title: "Verbraucherstreitbeilegung",
        blocks: [
          {
            p: "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
          },
        ],
      },
    ],
  },
};
