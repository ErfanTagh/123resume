import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Final sign-up CTA (swooped.co bottom-CTA spec): one centered column, badge →
 * two-line heading (action in ink, payoff in accent) → subtext → single pill
 * button with a colored glow. Nothing competes with the button.
 */

const COPY = {
  en: {
    badge: "Free to start · No credit card",
    line1: "Create your free account.",
    line2: "Land interviews faster.",
    subtext:
      "Build an ATS-ready resume, generate tailored cover letters, and track every application — all in one place, free to start.",
    cta: "Create your free account",
  },
  de: {
    badge: "Kostenlos starten · Keine Kreditkarte",
    line1: "Erstelle dein kostenloses Konto.",
    line2: "Schneller zum Vorstellungsgespräch.",
    subtext:
      "Erstelle einen ATS-optimierten Lebenslauf, generiere passende Anschreiben und verfolge jede Bewerbung – alles an einem Ort, kostenlos.",
    cta: "Kostenloses Konto erstellen",
  },
} as const;

export const BottomCTA = () => {
  const { language } = useLanguage();
  const c = COPY[language] || COPY.en;

  return (
    <section className="border-t border-[rgba(11,11,20,0.06)] bg-background py-20 dark:border-white/10 md:py-28">
      <div className="mx-auto max-w-[860px] px-6 text-center md:px-12">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {c.badge}
        </div>

        {/* Heading: action in ink, payoff in accent */}
        <h2 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-[52px]">
          <span className="block text-foreground">{c.line1}</span>
          <span className="block text-primary">{c.line2}</span>
        </h2>

        {/* Subtext */}
        <p className="mx-auto mt-5 max-w-[520px] text-base leading-relaxed text-muted-foreground md:text-[17px]">
          {c.subtext}
        </p>

        {/* Single CTA */}
        <div className="mt-10">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-white shadow-[0_8px_22px_-10px_hsl(var(--primary)/0.8)] transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-primary/20"
          >
            {c.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BottomCTA;
