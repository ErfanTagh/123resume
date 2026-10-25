import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CLAUDE_MARK } from "@/components/landing/claudeMark";

/**
 * Homepage demo of the Claude connector: a prompt types itself in a Claude
 * chat, the connector's tools run, and the resume next to it updates. Loops
 * while visible; shows the finished state without motion for reduced motion.
 */

const COPY = {
  en: {
    badge: "New",
    eyebrow: "Works with Claude",
    title: "Edit your resume by just asking Claude",
    subtitle: "Connect 123Resume to Claude once. Then describe the change, and your resume updates on its own.",
    connected: "123Resume connected",
    placeholder: "Reply to Claude…",
    prompt: "Make my summary stronger and add Google Analytics to my skills",
    reply: "Done! I rewrote your summary and added Google Analytics to your skills. The old version is saved, so you can undo anytime.",
    updated: "Updated via Claude",
    summary: "Summary",
    skills: "Skills",
    before: "I did marketing and social media for different companies.",
    after: "Marketing manager experienced in social media and campaign planning across several companies.",
    title2: "Marketing Manager",
    cta: "See how to connect it in 1 minute",
  },
  de: {
    badge: "Neu",
    eyebrow: "Funktioniert mit Claude",
    title: "Lebenslauf bearbeiten, indem Sie einfach Claude fragen",
    subtitle: "Verbinden Sie 123Resume einmal mit Claude. Dann beschreiben Sie die Änderung, und Ihr Lebenslauf aktualisiert sich von selbst.",
    connected: "123Resume verbunden",
    placeholder: "Antworten Sie Claude…",
    prompt: "Formuliere meine Zusammenfassung stärker und füge Google Analytics zu meinen Kenntnissen hinzu",
    reply: "Erledigt! Ich habe Ihre Zusammenfassung überarbeitet und Google Analytics hinzugefügt. Die alte Version ist gespeichert, Sie können alles rückgängig machen.",
    updated: "Über Claude aktualisiert",
    summary: "Zusammenfassung",
    skills: "Kenntnisse",
    before: "Ich habe Marketing und Social Media für verschiedene Firmen gemacht.",
    after: "Marketing Managerin mit Erfahrung in Social Media und Kampagnenplanung für mehrere Unternehmen.",
    title2: "Marketing Managerin",
    cta: "In 1 Minute verbinden: so geht's",
  },
};

// The demo's timeline, in order. Each phase lasts DURATION ms (typing is per character).
const PHASES = ["typing", "sent", "tool1", "tool1done", "tool2", "updated", "reply"] as const;
type Phase = (typeof PHASES)[number];
const DURATION: Record<Phase, number> = {
  typing: 450,
  sent: 600,
  tool1: 900,
  tool1done: 350,
  tool2: 1100,
  updated: 900,
  reply: 4800,
};
const TYPE_MS = 32;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function ClaudeMark({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={CLAUDE_MARK} />
    </svg>
  );
}

export function ClaudeConnectorDemo() {
  const { language } = useLanguage();
  const c = COPY[language === "de" ? "de" : "en"];

  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState<Phase>(reduced ? "reply" : "typing");
  const [typed, setTyped] = useState(reduced ? Number.MAX_SAFE_INTEGER : 0);

  // Run only while the section is on screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    // At the top of the page it is on screen from the start: don't wait for
    // the observer's first callback to begin.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) setVisible(true);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Restart from the beginning when the language changes.
  useEffect(() => {
    if (reduced) return;
    setPhase("typing");
    setTyped(0);
  }, [language, reduced]);

  useEffect(() => {
    if (reduced || !visible) return;
    let id: number;
    if (phase === "typing" && typed < c.prompt.length) {
      id = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS);
    } else {
      id = window.setTimeout(() => {
        const next = PHASES.indexOf(phase) + 1;
        if (next < PHASES.length) {
          setPhase(PHASES[next]);
        } else {
          setTyped(0);
          setPhase("typing");
        }
      }, DURATION[phase]);
    }
    return () => window.clearTimeout(id);
  }, [phase, typed, visible, reduced, c.prompt.length]);

  const at = (p: Phase) => PHASES.indexOf(phase) >= PHASES.indexOf(p);
  const typing = phase === "typing";
  const updated = at("updated");

  return (
    <section ref={sectionRef} className="bg-[#f7f3ee] px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
      <div className="container mx-auto max-w-6xl">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D97757]/25 bg-white/80 py-1 pl-1 pr-3 text-sm font-medium text-foreground">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              {c.badge}
            </span>
            <ClaudeMark className="h-4 w-4 fill-[#D97757]" />
            {c.eyebrow}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{c.title}</h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">{c.subtitle}</p>
        </div>

        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Claude chat */}
          <div className="flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_20px_60px_-20px_rgba(60,40,20,0.25)]">
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-3.5">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <ClaudeMark className="h-5 w-5 fill-[#D97757]" />
                Claude
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {c.connected}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-5 py-5">
              {at("sent") && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#f0eee9] px-4 py-2.5 text-[15px] text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {c.prompt}
                </div>
              )}
              {at("tool1") && <ToolRow name="get_resume" done={at("tool1done")} />}
              {at("tool2") && <ToolRow name="edit_resume" done={updated} />}
              {at("reply") && (
                <div className="flex gap-2.5 text-[15px] leading-relaxed text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <ClaudeMark className="mt-1 h-4 w-4 shrink-0 fill-[#D97757]" />
                  <p>{c.reply}</p>
                </div>
              )}
            </div>

            <div className="border-t border-black/5 p-3">
              <div className="flex min-h-[48px] items-center rounded-xl border border-black/10 px-4 py-2.5 text-[15px]">
                {typing ? (
                  <span className="text-foreground">
                    {c.prompt.slice(0, typed)}
                    <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground" />
                  </span>
                ) : (
                  <span className="text-muted-foreground">{c.placeholder}</span>
                )}
              </div>
            </div>
          </div>

          {/* The resume on 123resume.de */}
          <div className="flex min-h-[430px] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_20px_60px_-20px_rgba(60,40,20,0.25)]">
            <div className="flex items-center gap-2 border-b border-black/5 bg-[#fbfaf8] px-5 py-3.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 rounded-md bg-white px-3 py-1 text-xs text-muted-foreground ring-1 ring-black/5">
                123resume.de/resume
              </span>
            </div>

            <div className="relative flex-1 px-6 py-6 sm:px-8">
              {updated && (
                <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 animate-in fade-in zoom-in-90 duration-300">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  {c.updated}
                </div>
              )}
              <div className="text-2xl font-bold text-foreground">Sarah Klein</div>
              <div className="text-sm text-muted-foreground">{c.title2}</div>

              <div className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.summary}</div>
              <div className="mt-1 h-px bg-black/5" />
              <div className="mt-3 min-h-[78px] text-[15px] leading-relaxed">
                {updated ? (
                  <span
                    key="after"
                    className="rounded-md bg-emerald-50 px-1 text-emerald-900 [box-decoration-break:clone] animate-in fade-in duration-700"
                  >
                    {c.after}
                  </span>
                ) : (
                  <span key="before" className="text-muted-foreground">
                    {c.before}
                  </span>
                )}
              </div>

              <div className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">{c.skills}</div>
              <div className="mt-1 h-px bg-black/5" />
              <div className="mt-3 flex flex-wrap gap-2">
                {["Canva", "SEO", "Mailchimp", "Instagram"].map((s) => (
                  <span key={s} className="rounded-full bg-[#f3f1ec] px-3 py-1 text-sm text-foreground">
                    {s}
                  </span>
                ))}
                {updated && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-300 animate-in fade-in zoom-in-75 duration-500">
                    Google Analytics
                  </span>
                )}
              </div>

              <div className="mt-7 space-y-2.5 opacity-60">
                <div className="h-2.5 w-11/12 rounded-full bg-[#efece6]" />
                <div className="h-2.5 w-4/5 rounded-full bg-[#efece6]" />
                <div className="h-2.5 w-2/3 rounded-full bg-[#efece6]" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/blog/edit-resume-with-claude"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-primary/40"
          >
            {c.cta}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ToolRow({ name, done }: { name: string; done: boolean }) {
  return (
    <div className="flex w-fit items-center gap-2.5 rounded-xl border border-black/5 bg-[#fbfaf8] px-3 py-2 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#D97757]">
        <span className="text-[11px] font-bold text-white">123</span>
      </span>
      <span className="font-semibold text-foreground">123resume</span>
      <span className="font-mono text-[13px] text-muted-foreground">{name}</span>
      {done ? (
        <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
