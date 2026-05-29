import { useLanguage } from "@/contexts/LanguageContext";
import type { HiredAtEmployer } from "./hiredAtCompanies";
import { HIRED_AT_EMPLOYERS } from "./hiredAtCompanies";
import { HiredAtEmployerLogo } from "./HiredAtEmployerLogo";

const ROW = [...HIRED_AT_EMPLOYERS, ...HIRED_AT_EMPLOYERS];

function HiredAtEmployerColumn({ employer }: { employer: HiredAtEmployer }) {
  return (
    <article className="group flex w-[10.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border-2 border-primary/25 bg-card shadow-md ring-1 ring-primary/10 transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-lg hover:ring-primary/25 sm:w-48">
      <HiredAtEmployerLogo employer={employer} />
      <div className="border-t border-primary/10 bg-gradient-to-r from-primary/[0.12] via-violet-500/[0.08] to-sky-500/[0.1] px-2.5 py-2.5 dark:from-primary/20 dark:via-violet-500/15 dark:to-sky-500/15 sm:px-3 sm:py-3">
        <p
          className="hyphens-auto text-balance text-center text-[11px] font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-[13px] sm:leading-snug"
          title={employer.name}
        >
          {employer.name}
        </p>
      </div>
    </article>
  );
}

export const HiredAtSection = () => {
  const { t } = useLanguage();

  return (
    <section
      className="relative overflow-hidden border-y border-primary/20 bg-gradient-to-b from-primary/[0.12] via-muted/40 to-violet-500/[0.08] py-12 dark:from-primary/15 dark:via-muted/25 dark:to-violet-950/25 sm:py-16"
      aria-labelledby="landing-hired-at-heading"
    >
      <div
        className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl dark:bg-violet-400/15"
        aria-hidden
      />
      <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-[min(100%,42rem)] -translate-x-1/2 bg-gradient-to-b from-primary/15 to-transparent blur-2xl dark:from-primary/20" aria-hidden />

      <div className="container relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary dark:bg-primary/15 dark:text-primary">
          {t("landing.hiredAtBadge")}
        </div>
        <h2
          id="landing-hired-at-heading"
          className="mt-3 bg-gradient-to-r from-primary via-primary to-violet-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:mt-4 sm:text-4xl"
        >
          {t("landing.hiredAtTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-relaxed text-foreground/85 sm:mt-4 sm:text-lg">
          {t("landing.hiredAtSubtitle")}
        </p>
      </div>

      {/* Static grid when user prefers reduced motion */}
      <div className="relative mx-auto mt-10 hidden max-w-5xl flex-wrap justify-center gap-x-6 gap-y-7 px-4 motion-reduce:flex sm:mt-12 sm:gap-x-7 sm:gap-y-8 sm:px-6">
        {HIRED_AT_EMPLOYERS.map((employer) => (
          <HiredAtEmployerColumn key={employer.id} employer={employer} />
        ))}
      </div>

      <div className="relative mt-10 overflow-hidden motion-reduce:hidden sm:mt-12">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-primary/20 via-background/90 to-transparent sm:w-24 dark:from-primary/25 dark:via-background/85"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-primary/20 via-background/90 to-transparent sm:w-24 dark:from-primary/25 dark:via-background/85"
          aria-hidden
        />

        <div className="flex w-max items-start gap-6 px-3 pb-1 pt-1 animate-hired-at-marquee sm:gap-7 sm:px-4">
          {ROW.map((employer, i) => (
            <HiredAtEmployerColumn key={`${employer.id}-${i}`} employer={employer} />
          ))}
        </div>
      </div>
    </section>
  );
};
