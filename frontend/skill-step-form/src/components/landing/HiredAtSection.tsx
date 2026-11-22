import { useLanguage } from "@/contexts/LanguageContext";
import type { HiredAtEmployer } from "./hiredAtCompanies";
import { HIRED_AT_EMPLOYERS } from "./hiredAtCompanies";
import { HiredAtEmployerLogo } from "./HiredAtEmployerLogo";

const ROW = [...HIRED_AT_EMPLOYERS, ...HIRED_AT_EMPLOYERS];

const MARQUEE_EDGE_MASK = {
  maskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
} as const;

function HiredAtEmployerColumn({ employer }: { employer: HiredAtEmployer }) {
  return (
    <article className="group flex w-44 shrink-0 flex-col overflow-hidden rounded-2xl border border-primary/25 bg-[hsl(var(--accent))] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/55 hover:shadow-md dark:bg-primary/10 sm:w-52">
      <HiredAtEmployerLogo
        employer={employer}
        className="rounded-t-2xl border-primary/15 bg-transparent px-5 shadow-none sm:px-6"
      />
      <div className="px-3 py-2.5">
        <p
          className="truncate text-center text-xs font-semibold tracking-tight text-primary sm:text-sm"
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
      className="relative overflow-hidden bg-background py-8 sm:py-10"
      aria-labelledby="landing-hired-at-heading"
    >
      {/* Short caption only — no stats, no reviews. */}
      <div className="container relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2
          id="landing-hired-at-heading"
          className="text-xl font-bold tracking-tight text-[hsl(var(--primary))] sm:text-2xl"
        >
          {t("landing.hiredAtTitle")}
        </h2>
      </div>

      {/* Reduced motion: static, wrapped logo grid (no marquee). */}
      <div className="relative mx-auto mt-4 hidden max-w-5xl flex-col items-center px-4 motion-reduce:flex sm:mt-6 sm:px-6">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-5 sm:gap-x-6 sm:gap-y-6">
          {HIRED_AT_EMPLOYERS.map((employer) => (
            <HiredAtEmployerColumn key={employer.id} employer={employer} />
          ))}
        </div>
      </div>

      {/* Single continuous logo marquee — sits directly on the pink section, no box. */}
      <div className="group/marqwrap relative mx-auto mt-4 max-w-[100vw] motion-reduce:hidden sm:mt-6">
        <div
          className="relative overflow-hidden py-3 sm:py-4"
          style={MARQUEE_EDGE_MASK}
        >
          <div
            className="flex w-max items-start gap-5 px-3 pb-0.5 pt-0.5 motion-safe:animate-hired-at-marquee motion-safe:group-hover/marqwrap:[animation-play-state:paused] sm:gap-6 sm:px-4"
            role="region"
            aria-label={t("landing.hiredAtTitle")}
          >
            {ROW.map((employer, i) => (
              <HiredAtEmployerColumn key={`emp-${employer.id}-${i}`} employer={employer} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
