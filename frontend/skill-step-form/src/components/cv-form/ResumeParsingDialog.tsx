import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Blocking dialog shown while an uploaded resume is parsed.
 *
 * The server doesn't report progress, so the percentage follows the usual
 * parse time: it eases towards 95% and jumps to 100% when `done` is set.
 * While open, the rest of the app is inert (no clicks, focus or scroll).
 */

const COPY = {
  en: {
    title: "Reading your resume",
    done: "All done!",
    hint: "This usually takes 10 to 30 seconds. Please keep this page open.",
    steps: ["Opening your file", "Finding your experience", "Sorting education and skills", "Filling in your form"],
  },
  de: {
    title: "Ihr Lebenslauf wird gelesen",
    done: "Fertig!",
    hint: "Das dauert meist 10 bis 30 Sekunden. Bitte lassen Sie diese Seite geöffnet.",
    steps: ["Datei wird geöffnet", "Berufserfahrung wird erkannt", "Ausbildung und Kenntnisse werden sortiert", "Formular wird ausgefüllt"],
  },
};

// 95% * (1 - e^(-t/TAU)): about 55% after 10s, 85% after 25s
const TAU_SECONDS = 12;
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ResumeParsingDialogProps {
  open: boolean;
  /** The data has arrived: run up to 100% and show the done state. */
  done: boolean;
}

export const ResumeParsingDialog = ({ open, done }: ResumeParsingDialogProps) => {
  const { language } = useLanguage();
  const c = COPY[language === "de" ? "de" : "en"];
  const gradientId = useId();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    if (done) {
      setProgress(100);
      return;
    }
    const started = performance.now();
    const id = window.setInterval(() => {
      const t = (performance.now() - started) / 1000;
      setProgress(95 * (1 - Math.exp(-t / TAU_SECONDS)));
    }, 100);
    return () => window.clearInterval(id);
  }, [open, done]);

  // Block the page behind the dialog: no clicks, keyboard focus or scrolling.
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    const prevOverflow = document.body.style.overflow;
    root?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    (document.activeElement as HTMLElement | null)?.blur?.();
    return () => {
      root?.removeAttribute("inert");
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const pct = Math.round(progress);
  const step = c.steps[Math.min(c.steps.length - 1, Math.floor((progress / 95) * c.steps.length))];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${gradientId}-title`}
      aria-busy={!done}
    >
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="relative mx-auto h-40 w-40">
          {/* Soft glow behind the ring */}
          <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,hsl(var(--sunset-pink)/0.22),transparent_70%)] blur-md motion-safe:animate-pulse" />

          <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90" aria-hidden="true">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--sunset-violet))" />
                <stop offset="55%" stopColor="hsl(var(--sunset-pink))" />
                <stop offset="100%" stopColor="hsl(var(--sunset-orange))" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="9" className="stroke-muted" />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              stroke={`url(#${gradientId})`}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            {done ? (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--sunset-violet))] via-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))] text-white shadow-lg animate-in zoom-in-50 duration-300">
                <Check className="h-7 w-7" strokeWidth={3} />
              </span>
            ) : (
              <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                {pct}
                <span className="ml-0.5 text-xl font-semibold text-muted-foreground">%</span>
              </span>
            )}
          </div>
        </div>

        <h2 id={`${gradientId}-title`} className="mt-6 text-xl font-bold text-foreground">
          {done ? c.done : c.title}
        </h2>
        <p className="mt-2 min-h-[1.5rem] text-sm font-medium text-primary" aria-live="polite">
          {done ? c.steps[c.steps.length - 1] : step}
        </p>
        {!done && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.hint}</p>}
      </div>
    </div>,
    document.body,
  );
};
