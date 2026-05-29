import { Quote } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { HiredAtEmployer } from "./hiredAtCompanies";
import { HIRED_AT_EMPLOYERS } from "./hiredAtCompanies";
import { HiredAtEmployerLogo } from "./HiredAtEmployerLogo";

const ROW = [...HIRED_AT_EMPLOYERS, ...HIRED_AT_EMPLOYERS];

const TESTIMONIAL_IDS = [1, 2, 3, 4, 5, 6] as const;
/** Rotated order so testimonial strip doesn’t mirror the employer strip beat-for-beat. */
const TESTIMONIAL_IDS_OFFSET = [...TESTIMONIAL_IDS.slice(3), ...TESTIMONIAL_IDS.slice(0, 3)];
const TESTIMONIAL_ROW = [...TESTIMONIAL_IDS_OFFSET, ...TESTIMONIAL_IDS_OFFSET];

const MARQUEE_EDGE_MASK = {
  maskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
  WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
} as const;

function HiredAtEmployerColumn({ employer }: { employer: HiredAtEmployer }) {
  return (
    <article className="group flex w-[10.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-md sm:w-48">
      <HiredAtEmployerLogo employer={employer} />
      <div className="border-t border-border bg-muted/40 px-2.5 py-2.5 dark:bg-muted/30 sm:px-3 sm:py-3">
        <p
          className="hyphens-auto text-balance text-center text-xs font-semibold leading-snug tracking-tight text-primary [overflow-wrap:anywhere] sm:text-sm sm:leading-snug"
          title={employer.name}
        >
          {employer.name}
        </p>
      </div>
    </article>
  );
}

function TestimonialMarqueeCard({ id }: { id: (typeof TESTIMONIAL_IDS)[number] }) {
  const { t } = useLanguage();
  return (
    <figure className="flex w-[18.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md sm:w-[21rem]">
      <div className="flex items-start gap-2.5 px-3 pb-1 pt-3 sm:px-4 sm:pt-4">
        <Quote className="mt-0.5 h-5 w-5 shrink-0 text-primary/40" aria-hidden />
        <blockquote className="min-h-[4rem] sm:min-h-[4.5rem]">
          <p
            className="line-clamp-3 text-left text-sm font-medium leading-snug text-foreground/90 sm:text-[15px] sm:leading-snug"
            title={t(`landing.testimonial${id}Quote`)}
          >
            {t(`landing.testimonial${id}Quote`)}
          </p>
        </blockquote>
      </div>
      <figcaption className="border-t border-border bg-muted/40 px-3 py-2.5 text-left text-sm font-semibold tracking-tight text-primary dark:bg-muted/35 sm:px-4 sm:py-3 sm:text-base">
        {t(`landing.testimonial${id}Name`)}
      </figcaption>
    </figure>
  );
}

export const HiredAtSection = () => {
  const { t } = useLanguage();

  return (
    <section
      className="relative overflow-hidden border-y border-primary/10 bg-gradient-to-b from-primary/[0.22] via-primary/[0.07] to-background py-12 dark:from-primary/25 dark:via-primary/[0.08] dark:to-background sm:py-16"
      aria-labelledby="landing-hired-at-heading"
    >
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-primary/12 blur-3xl dark:bg-primary/10"
        aria-hidden
      />

      <div className="container relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <div className="mb-2 inline-flex items-center rounded-full border border-primary/35 bg-white/90 px-5 py-2 text-base font-semibold text-primary shadow-sm shadow-primary/10 backdrop-blur-sm dark:border-primary/40 dark:bg-card/95 dark:text-primary dark:shadow-md dark:shadow-black/20 sm:text-lg sm:px-6 sm:py-2.5">
          {t("landing.hiredAtBadge")}
        </div>
        <h2
          id="landing-hired-at-heading"
          className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-5xl"
        >
          <span className="inline-block bg-gradient-to-r from-primary to-primary/75 bg-clip-text pb-1.5 text-transparent [-webkit-box-decoration-break:clone] [box-decoration-break:clone] leading-[1.25] sm:pb-2 sm:leading-[1.2]">
            {t("landing.hiredAtTitle")}
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground sm:mt-4 sm:text-xl md:max-w-3xl md:text-2xl md:leading-relaxed">
          {t("landing.hiredAtSubtitle")}
        </p>
      </div>

      {/* Reduced motion: static employers + static testimonial cards (no marquee). */}
      <div className="relative mx-auto mt-10 hidden max-w-5xl flex-col items-center gap-10 px-4 motion-reduce:flex sm:mt-12 sm:px-6">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-7 sm:gap-x-7 sm:gap-y-8">
          {HIRED_AT_EMPLOYERS.map((employer) => (
            <HiredAtEmployerColumn key={employer.id} employer={employer} />
          ))}
        </div>
        <div
          className="flex max-w-5xl flex-wrap justify-center gap-4 sm:gap-5"
          role="region"
          aria-label={t("landing.hiredAtTestimonialsMarqueeLabel")}
        >
          {TESTIMONIAL_IDS.map((id) => (
            <TestimonialMarqueeCard key={id} id={id} />
          ))}
        </div>
      </div>

      {/* Firecode-style: row 1 = logos, row 2 = scrolling quotes (opposite direction, slower). */}
      <div className="group/marqwrap relative mx-auto mt-10 max-w-[100vw] motion-reduce:hidden sm:mt-12">
        <div
          className="relative overflow-hidden rounded-2xl border border-border bg-card py-4 shadow-sm sm:rounded-3xl sm:py-5"
          style={MARQUEE_EDGE_MASK}
        >
          <div
            className="flex w-max items-start gap-6 px-3 pb-0.5 pt-0.5 motion-safe:animate-hired-at-marquee motion-safe:group-hover/marqwrap:[animation-play-state:paused] sm:gap-7 sm:px-4"
            role="region"
            aria-label={t("landing.hiredAtTitle")}
          >
            {ROW.map((employer, i) => (
              <HiredAtEmployerColumn key={`emp-${employer.id}-${i}`} employer={employer} />
            ))}
          </div>

          <div
            className="mt-4 flex w-max items-start gap-5 px-3 pb-0.5 pt-0.5 motion-safe:animate-hired-at-marquee-testimonials motion-safe:group-hover/marqwrap:[animation-play-state:paused] sm:mt-5 sm:gap-6 sm:px-4"
            style={{ animationDirection: "reverse" }}
            role="region"
            aria-label={t("landing.hiredAtTestimonialsMarqueeLabel")}
          >
            {TESTIMONIAL_ROW.map((id, i) => (
              <TestimonialMarqueeCard key={`tm-${id}-${i}`} id={id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
