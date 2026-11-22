import { Check, Sparkles, FileDown, Wand2, TrendingUp } from "lucide-react";

/**
 * Static mockup of the resume editor for the hero.
 * Illustrative sample content only (no real data). Shows the "Improve with AI"
 * idea the way the app does it: the written line, then the AI rewrite in the
 * accent color — no motion, just a clean picture.
 */

const CHECKS = ["Keywords matched", "ATS-safe format", "Ideal length"];

export const HeroMockup = ({ embedded = false }: { embedded?: boolean }) => {
  return (
    <div className={`relative mx-auto w-full ${embedded ? "" : "max-w-[520px]"}`}>
      {/* Soft glow behind the card */}
      {!embedded && (
        <div
          className="absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
          style={{
            background:
              "radial-gradient(60% 60% at 70% 20%, hsl(var(--sunset-pink)/0.35), transparent 70%), radial-gradient(50% 50% at 20% 90%, hsl(var(--sunset-violet)/0.30), transparent 70%)",
          }}
        />
      )}

      {/* Editor card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elevated)]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[hsl(var(--sunset-orange))]" />
          <span className="h-3 w-3 rounded-full bg-[hsl(var(--sunset-pink))]" />
          <span className="h-3 w-3 rounded-full bg-[hsl(var(--sunset-violet))]" />
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            123resume · Editor
          </span>
        </div>

        <div className="grid grid-cols-5 gap-0">
          {/* Form side */}
          <div className="col-span-3 space-y-4 p-4 sm:p-5">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Professional title
              </div>
              <div className="flex min-h-[2.4rem] items-center rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground">
                Software Engineer
              </div>
            </div>

            {/* Improve-with-AI: original line → AI rewrite in accent color */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Experience
                </span>
                <span className="inline-flex flex-none items-center gap-1 whitespace-nowrap rounded-full bg-[hsl(var(--accent))] px-2 py-0.5 text-[10px] font-semibold text-[hsl(var(--accent-foreground))]">
                  <Sparkles className="h-3 w-3" />
                  Improve with AI
                </span>
              </div>
              <div className="space-y-2.5 rounded-lg border border-input bg-background p-3">
                <p className="rounded bg-[hsl(var(--sunset-orange)/0.18)] px-2 py-1 text-xs leading-snug text-foreground/80">
                  Worked on backend services and APIs for the company's main product.
                </p>
                <p className="flex items-start gap-1.5 text-xs font-medium leading-snug text-emerald-600 dark:text-emerald-400">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  Engineered RESTful microservices in Go that reduced average API response
                  time by 62%, supporting 2M daily active users.
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  +1.8 ATS points
                </span>
              </div>
            </div>
          </div>

          {/* ATS score side */}
          <div className="col-span-2 flex flex-col justify-center gap-2.5 border-l border-border/70 bg-muted/40 p-3 sm:p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              ATS score
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-extrabold leading-none text-foreground">9.2</span>
              <span className="pb-0.5 text-xs font-semibold text-muted-foreground">/10</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full w-[92%] rounded-full"
                style={{ background: "var(--gradient-primary)" }}
              />
            </div>

            <ul className="mt-1 space-y-2">
              {CHECKS.map((label) => (
                <li key={label} className="flex items-center gap-2 text-xs">
                  <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-[hsl(var(--primary))] text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Floating pills (overlap the card corners) */}
      {!embedded && (
        <>
          <div className="absolute -right-3 -top-4 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-bold shadow-[var(--shadow-elevated)]">
            <Wand2 className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span className="text-foreground">ATS 92</span>
          </div>
          <div className="absolute -bottom-4 -left-3 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold shadow-[var(--shadow-elevated)]">
            <FileDown className="h-4 w-4 text-[hsl(var(--sunset-violet))]" />
            <span className="text-foreground">PDF ready</span>
          </div>
        </>
      )}
    </div>
  );
};

export default HeroMockup;
