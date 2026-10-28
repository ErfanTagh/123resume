import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { useJobApplications } from "@/hooks/useJobApplications";
import { computeApplyStreak } from "@/lib/applyStreak";
import { useLanguage } from "@/contexts/LanguageContext";
import { resumesTabHref } from "@/components/resumes/resumesTabs";
import { cn } from "@/lib/utils";

/**
 * Apply streak in the header, on every page. Shown once the user has used the
 * job tracker; when today's application is still missing it pulses and says so.
 */
export const StreakBadge = () => {
  const { t } = useLanguage();
  const { data } = useJobApplications();
  const streak = useMemo(() => (data ? computeApplyStreak(data, 1) : null), [data]);

  if (!streak || !data?.length) return null;

  const k = (key: string) => t(`pages.resumes.jobTracker.streak.${key}`);
  const atRisk = streak.state === "atRisk";
  const lit = streak.current > 0;
  const title = atRisk
    ? k("badgeTitleAtRisk").replace("{n}", String(streak.current))
    : lit
      ? k("badgeTitle").replace("{n}", String(streak.current))
      : k("badgeTitleZero");

  return (
    <Link
      to={resumesTabHref("job-tracker")}
      title={title}
      aria-label={title}
      className={cn(
        "relative flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-sm font-bold tabular-nums transition-colors sm:h-9 sm:px-2.5",
        atRisk
          ? "bg-primary/10 text-primary ring-1 ring-primary/40 hover:bg-primary/15"
          : lit
            ? "bg-[hsl(var(--sunset-orange)/0.12)] text-[hsl(var(--sunset-orange))] hover:bg-[hsl(var(--sunset-orange)/0.2)]"
            : "text-muted-foreground hover:bg-muted",
      )}
    >
      {atRisk && (
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      )}
      <Flame className="h-4 w-4 sm:h-[18px] sm:w-[18px]" fill={lit ? "currentColor" : "none"} />
      <span>{streak.current}</span>
      {atRisk && <span className="hidden whitespace-nowrap text-xs font-semibold lg:inline">{k("badgeAtRisk")}</span>}
    </Link>
  );
};
