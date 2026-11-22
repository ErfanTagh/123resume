import { Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { HeroMockup } from "./HeroMockup";

/**
 * Hero right column: two overlapping "papers on a desk" cards (swooped.co style).
 * Back card = a "My resumes" list (English + German versions); front card = the
 * editor mockup. Rotations/shadows only on lg; stacks cleanly on mobile.
 */

const BACK_SHADOW =
  "0 24px 56px -12px rgba(11,11,20,0.16), 0 4px 16px -4px rgba(11,11,20,0.08)";
const FRONT_SHADOW =
  "0 30px 60px -15px rgba(11,11,20,0.22), 0 4px 16px -4px rgba(11,11,20,0.08)";

const COPY = {
  en: { label: "My resumes", action: "Download PDF", en: "English", de: "German", tpl: "Modern" },
  de: { label: "Meine Lebensläufe", action: "PDF herunterladen", en: "Englisch", de: "Deutsch", tpl: "Modern" },
} as const;

function MiniResumeThumb({ accent }: { accent: string }) {
  return (
    <div className="flex h-12 w-9 flex-none flex-col gap-[3px] rounded-md border border-border bg-white p-1.5 shadow-inner">
      <div className="h-1.5 w-full rounded-sm" style={{ background: accent }} />
      <div className="h-[3px] w-3/4 rounded-sm bg-muted" />
      <div className="h-[3px] w-full rounded-sm bg-muted/70" />
      <div className="h-[3px] w-5/6 rounded-sm bg-muted/70" />
      <div className="h-[3px] w-2/3 rounded-sm bg-muted/70" />
    </div>
  );
}

function ResumeRow({
  lang,
  template,
  score,
  accent,
  highlighted,
}: {
  lang: string;
  template: string;
  score: number;
  accent: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${
        highlighted
          ? "border-[hsl(var(--primary)/0.15)] bg-[hsl(var(--primary)/0.05)]"
          : "border-border bg-foreground/[0.015]"
      }`}
    >
      <MiniResumeThumb accent={accent} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">Software Engineer</p>
        <p className="truncate text-xs text-muted-foreground">
          {lang} · {template}
        </p>
      </div>
      <span className="flex-none rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        ATS {score}
      </span>
    </div>
  );
}

function ResumeListCard({ shadow }: { shadow: string }) {
  const { language } = useLanguage();
  const c = COPY[language] || COPY.en;
  const tpl = "Modern";
  return (
    <div
      className="rounded-2xl border border-[rgba(11,11,20,0.08)] bg-card p-5"
      style={{ boxShadow: shadow }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {c.label}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">2</span>
      </div>
      <div className="space-y-2.5">
        <ResumeRow lang={c.en} template={tpl} score={9.2} accent="hsl(var(--primary))" highlighted />
        <ResumeRow lang={c.de} template={tpl} score={9.2} accent="hsl(var(--sunset-violet))" />
      </div>
      <button
        type="button"
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground py-2.5 text-[13px] font-semibold text-background"
      >
        <Download className="h-4 w-4" />
        {c.action}
      </button>
    </div>
  );
}

export const HeroCardStack = () => {
  return (
    <div className="relative flex flex-col gap-5 lg:block lg:min-h-[560px]">
      {/* Back card: resume list (top-right, +rotate, lighter shadow) — DOM-first; its bottom-left
          corner is hidden behind the editor. */}
      <div className="w-full lg:absolute lg:right-0 lg:top-0 lg:w-[300px] lg:rotate-[1.5deg]">
        <ResumeListCard shadow={BACK_SHADOW} />
      </div>

      {/* Front card: editor mockup (bottom-left, -rotate, deeper shadow) — on top, fully visible. */}
      <div className="w-full lg:absolute lg:bottom-0 lg:left-0 lg:w-[384px] lg:-rotate-[1.5deg]">
        <div className="rounded-2xl" style={{ boxShadow: FRONT_SHADOW }}>
          <HeroMockup embedded />
        </div>
      </div>
    </div>
  );
};

export default HeroCardStack;
