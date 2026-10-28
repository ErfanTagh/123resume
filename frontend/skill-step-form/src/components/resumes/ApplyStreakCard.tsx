import { useMemo } from "react";
import { Flame } from "lucide-react";
import type { JobApplication } from "@/lib/api";
import { computeApplyStreak, keyToDate, type HeatmapCell } from "@/lib/applyStreak";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const WEEKS = 16;

/** Sunset ramp for the activity grid: more applications, deeper color. */
function cellColor(count: number): string {
  if (count <= 0) return "hsl(var(--muted))";
  if (count === 1) return "hsl(var(--sunset-orange) / 0.45)";
  if (count === 2) return "hsl(var(--sunset-pink) / 0.7)";
  if (count === 3) return "hsl(var(--sunset-pink))";
  return "hsl(var(--sunset-violet))";
}

const GRADIENT = "bg-gradient-to-br from-[hsl(var(--sunset-orange))] via-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-violet))]";

export function ApplyStreakCard({ applications }: { applications: JobApplication[] }) {
  const { t, language } = useLanguage();
  const locale = language === "de" ? "de-DE" : "en-GB";
  const s = useMemo(() => computeApplyStreak(applications, WEEKS), [applications]);
  const k = (key: string) => t(`pages.resumes.jobTracker.streak.${key}`);

  const lit = s.current > 0;
  const message = {
    done: k("doneToday").replace("{next}", String(s.current + 1)),
    atRisk: k("atRisk").replace("{n}", String(s.current)),
    lost: k("lost"),
    none: k("start"),
  }[s.state];

  const cellLabel = (c: HeatmapCell) => {
    const date = keyToDate(c.date).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
    const tpl = c.count === 0 ? k("cellNone") : c.count === 1 ? k("cellOne") : k("cellMany");
    return tpl.replace("{n}", String(c.count)).replace("{date}", date);
  };

  // A month label above the first week that starts in that month
  const monthLabels = s.heatmap.map((week, i) => {
    const month = keyToDate(week[0].date).getMonth();
    const prev = i > 0 ? keyToDate(s.heatmap[i - 1][0].date).getMonth() : -1;
    return month !== prev ? keyToDate(week[0].date).toLocaleDateString(locale, { month: "short" }) : "";
  });
  const todayKey = s.today;

  return (
    <section className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Streak */}
      <div className="relative bg-gradient-to-br from-[hsl(var(--sunset-orange)/0.10)] via-[hsl(var(--sunset-pink)/0.07)] to-[hsl(var(--sunset-violet)/0.10)] p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {s.state === "atRisk" && (
              <span className="absolute inset-0 rounded-2xl bg-[hsl(var(--sunset-pink)/0.45)] motion-safe:animate-ping" aria-hidden />
            )}
            <span
              className={cn(
                "relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm",
                lit ? `${GRADIENT} text-white shadow-[hsl(var(--sunset-pink)/0.35)]` : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <Flame className="h-9 w-9" fill={lit ? "currentColor" : "none"} strokeWidth={lit ? 1.5 : 2} />
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{k("title")}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold leading-none tracking-tight tabular-nums text-foreground">{s.current}</span>
              <span className="text-sm font-semibold text-muted-foreground">
                {s.current === 1 ? k("unitOne") : k("unitMany")}
              </span>
            </div>
          </div>
        </div>

        <p
          className={cn(
            "mt-4 text-sm leading-relaxed",
            s.state === "atRisk" ? "font-semibold text-primary" : "text-muted-foreground",
          )}
          role={s.state === "atRisk" ? "alert" : undefined}
        >
          {message}
        </p>

        {/* This week, Duolingo style */}
        <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-label={k("thisWeek")}>
          {s.week.map((c) => {
            const isToday = c.date === todayKey;
            const done = c.count > 0;
            return (
              <li key={c.date} className="flex flex-col items-center gap-1.5" title={c.future ? undefined : cellLabel(c)}>
                <span className={cn("text-[11px] font-semibold uppercase", isToday ? "text-foreground" : "text-muted-foreground")}>
                  {keyToDate(c.date).toLocaleDateString(locale, { weekday: "narrow" })}
                </span>
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    done && `${GRADIENT} text-white shadow-sm`,
                    !done && isToday && "border-2 border-dashed border-primary bg-card motion-safe:animate-pulse",
                    !done && !isToday && !c.future && "bg-muted",
                    c.future && "border border-dashed border-border",
                  )}
                >
                  {done && <Flame className="h-4 w-4" fill="currentColor" strokeWidth={1.5} />}
                </span>
              </li>
            );
          })}
        </ol>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card/70 text-center">
          {[
            [k("best"), s.best],
            [k("thisWeek"), s.thisWeek],
            [k("total"), s.total],
          ].map(([label, value]) => (
            <div key={label} className="px-2 py-2.5">
              <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
              <dd className="text-lg font-bold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Activity over the last weeks */}
      <div className="border-t border-border p-5 sm:p-6 lg:border-l lg:border-t-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-base font-bold text-foreground">{k("chartTitle")}</h3>
          <span className="text-xs text-muted-foreground">{k("chartDesc")}</span>
        </div>

        <div className="mt-4 flex gap-2">
          {/* Weekday labels (Mon, Wed, Fri) */}
          <div className="grid shrink-0 grid-rows-[auto_repeat(7,minmax(0,1fr))] gap-[3px] pt-px text-[10px] text-muted-foreground">
            <span className="h-4" />
            {s.week.map((c, i) => (
              <span key={c.date} className="flex items-center leading-none">
                {i % 2 === 0 && i < 5 ? keyToDate(c.date).toLocaleDateString(locale, { weekday: "short" }) : ""}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))` }}>
              {monthLabels.map((label, i) => (
                <span key={i} className="h-4 overflow-visible whitespace-nowrap text-[10px] leading-4 text-muted-foreground">
                  {label}
                </span>
              ))}
            </div>
            <div
              className="grid grid-flow-col gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`, gridTemplateRows: "repeat(7, auto)" }}
              role="img"
              aria-label={`${k("chartTitle")}: ${s.total}`}
            >
              {s.heatmap.flat().map((c) => (
                <span
                  key={c.date}
                  title={c.future ? undefined : cellLabel(c)}
                  className={cn(
                    "aspect-square w-full max-w-[22px] rounded-[4px]",
                    c.future && "invisible",
                    c.date === todayKey && "ring-2 ring-foreground/25 ring-offset-1 ring-offset-card",
                  )}
                  style={{ backgroundColor: cellColor(c.count) }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
          <span>{k("less")}</span>
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: cellColor(n) }} aria-hidden />
          ))}
          <span>{k("more")}</span>
        </div>
      </div>
    </section>
  );
}
