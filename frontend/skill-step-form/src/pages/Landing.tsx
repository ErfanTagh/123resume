import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";
import { TemplateShowcase } from "@/components/landing/TemplateShowcase";
import { HiredAtSection } from "@/components/landing/HiredAtSection";
import { FeatureTabs } from "@/components/landing/FeatureTabs";
import { ClaudeConnectorDemo } from "@/components/landing/ClaudeConnectorDemo";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { HeroCardStack } from "@/components/landing/HeroCardStack";
import { RotatingWord } from "@/components/landing/RotatingWord";
import { FeatureFlow } from "@/components/landing/FeatureFlow";
import { BottomCTA } from "@/components/landing/BottomCTA";
import { Reveal } from "@/components/landing/Reveal";
import "@/components/landing/landingMotion.css";

const HEADLINE_ROTATE: Record<string, string[]> = {
  en: ["stand out", "impressive", "unforgettable", "interview-ready"],
  de: ["besonders", "beeindruckend", "unvergesslich", "interviewreif"],
};

const Landing = () => {
  const { t, language } = useLanguage();
  const rotateWords = HEADLINE_ROTATE[language] || HEADLINE_ROTATE.en;

  return (
    <>
      <SEO
        title="123Resume - Professional CV Builder | Create Your Resume Online"
        description="Build your professional CV with our easy-to-use multi-step form. Create ATS-friendly resumes with multiple templates. Free CV builder with PDF export."
        keywords="CV builder, resume builder, create CV, professional resume, ATS resume, CV templates, resume templates, online CV maker"
      />
      <div className="min-h-screen bg-background">
      <AnnouncementBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-[hsl(var(--sunset-violet)/0.18)] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-56 sm:w-96 h-56 sm:h-96 bg-[hsl(var(--sunset-orange)/0.16)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/3 w-64 sm:w-[420px] h-64 sm:h-[420px] bg-[hsl(var(--sunset-pink)/0.14)] rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '0.5s' }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1320px] px-6 pb-16 pt-14 md:px-12 md:pb-20 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left: copy + CTA (7 of 12) */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold text-muted-foreground animate-fade-in">
                <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" />
                {t('landing.badge')}
              </div>

              {/* Single H1 for SEO — both lines are one heading (avoid duplicate h1). */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <span className="block text-foreground">{t('landing.headline1')}</span>
                <span className="mt-1 block">
                  <RotatingWord
                    words={rotateWords}
                    className="whitespace-nowrap bg-gradient-to-r from-[hsl(var(--sunset-violet))] via-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))] bg-clip-text text-transparent"
                  />
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-[560px] mx-auto lg:mx-0 leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {t('landing.subheadline').split(t('landing.subheadlineHighlight'))[0]}
                <span className="text-foreground font-medium">{t('landing.subheadlineHighlight')}</span>
              </p>

              {/* Concrete inventory line */}
              <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                {t('landing.heroInventory')}
              </p>

              {/* CTA Buttons */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Link to="/create/start" className="w-full sm:w-auto">
                  <Button size="lg" className="group w-full sm:w-auto bg-primary hover:bg-primary/90 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-semibold">
                    {t('landing.ctaStartBuilding')}
                    <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-2xl border-2 hover:bg-accent hover:-translate-y-0.5 transition-all duration-300 font-semibold">
                    {t('landing.ctaLogin')}
                  </Button>
                </Link>
              </div>

              {/* Risk-reversal / trust line */}
              <p className="mt-6 flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.35s' }}>
                <Check className="h-4 w-4 flex-none text-[hsl(var(--primary))]" />
                {t('landing.heroTrust')}
              </p>
            </div>

            {/* Right: overlapping card stack (5 of 12) */}
            <div className="relative animate-fade-in lg:col-span-5" style={{ animationDelay: '0.2s' }}>
              <HeroCardStack />
            </div>
          </div>
        </div>
      </section>

      {/* The Claude connector demo: the newest flagship feature. */}
      <Reveal>
        <ClaudeConnectorDemo />
      </Reveal>

      <Reveal>
        <FeatureTabs />
      </Reveal>

      <Reveal>
        <TemplateShowcase />
      </Reveal>

      <FeatureFlow />

      <Reveal>
        <HiredAtSection />
      </Reveal>

      <Reveal>
        <BottomCTA />
      </Reveal>
    </div>
    </>
  );
};

export default Landing;

