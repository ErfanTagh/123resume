import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  ArrowRight
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { SEO } from "@/components/SEO";
import { TemplateShowcase } from "@/components/landing/TemplateShowcase";
import { HiredAtSection } from "@/components/landing/HiredAtSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeatureTabs } from "@/components/landing/FeatureTabs";

const Landing = () => {
  const { t } = useLanguage();

  return (
    <>
      <SEO
        title="123Resume - Professional CV Builder | Create Your Resume Online"
        description="Build your professional CV with our easy-to-use multi-step form. Create ATS-friendly resumes with multiple templates. Free CV builder with PDF export."
        keywords="CV builder, resume builder, create CV, professional resume, ATS resume, CV templates, resume templates, online CV maker"
      />
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-6">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-1/4 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-[hsl(var(--sunset-violet)/0.18)] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-56 sm:w-96 h-56 sm:h-96 bg-[hsl(var(--sunset-orange)/0.16)] rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/3 w-64 sm:w-[420px] h-64 sm:h-[420px] bg-[hsl(var(--sunset-pink)/0.14)] rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[600px] h-80 sm:h-[600px] bg-gradient-to-br from-[hsl(var(--sunset-violet)/0.10)] via-[hsl(var(--sunset-pink)/0.06)] to-[hsl(var(--sunset-orange)/0.10)] rounded-full blur-3xl" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />
        </div>

        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center space-y-8 sm:space-y-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-semibold text-primary animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('landing.badge')}
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>

            {/* Single H1 for SEO — both lines are one heading (avoid duplicate h1). */}
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h1 className="text-4xl sm:text-6xl md:text-8xl font-extrabold leading-[1.1] tracking-tight">
                <span className="block text-foreground">{t('landing.headline1')}</span>
                <span className="mt-1 block bg-gradient-to-r from-[hsl(var(--sunset-violet))] via-[hsl(var(--sunset-pink))] to-[hsl(var(--sunset-orange))] bg-clip-text text-transparent">
                  {t('landing.headline2')}
                </span>
              </h1>
            </div>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {t('landing.subheadline').split(t('landing.subheadlineHighlight'))[0]}
              <span className="text-foreground font-medium">{t('landing.subheadlineHighlight')}</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 pt-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/create/start" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-semibold">
                  {t('landing.ctaStartBuilding')}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 rounded-2xl border-2 hover:bg-accent hover:-translate-y-0.5 transition-all duration-300 font-semibold">
                  {t('landing.ctaLogin')}
                </Button>
              </Link>
            </div>

            <nav
              className="animate-fade-in border-t border-border/60 pt-8 sm:pt-10"
              style={{ animationDelay: '0.35s' }}
              aria-label={t('landing.seoNavAria')}
            >
              <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-muted-foreground sm:gap-x-8 sm:text-base">
                <li>
                  <Link to="/templates" className="text-primary underline-offset-4 hover:text-primary/90 hover:underline">
                    {t('footer.templates')}
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-primary underline-offset-4 hover:text-primary/90 hover:underline">
                    {t('footer.pricing')}
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="text-primary underline-offset-4 hover:text-primary/90 hover:underline">
                    {t('footer.blog')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="text-primary underline-offset-4 hover:text-primary/90 hover:underline">
                    {t('footer.aboutUs')}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-primary underline-offset-4 hover:text-primary/90 hover:underline">
                    {t('footer.contact')}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </section>

      <FeatureTabs />

      <TemplateShowcase />

      <HiredAtSection />

      <HowItWorksSection />
    </div>
    </>
  );
};

export default Landing;

