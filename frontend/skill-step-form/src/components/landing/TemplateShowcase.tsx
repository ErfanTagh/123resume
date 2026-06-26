import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingTemplatePreview } from "@/pages/LandingTemplatePreview";
import { TemplateCarouselPreviewNav } from "@/components/landing/TemplateCarouselPreviewNav";
import { TemplateShowcaseBadge } from "@/components/landing/TemplateShowcaseBadge";
import { LANDING_TEMPLATE_CATALOG } from "@/lib/landingTemplateCatalog";
import type { CVTemplate } from "@/components/cv-form/types";
import { RESUME_COLOR_THEMES, DEFAULT_RESUME_THEME_ID, getResumeThemeAccent } from "@/lib/resumeColorThemes";
import { Check } from "lucide-react";

interface TemplateShowcaseProps {
  hideHeader?: boolean;
  showViewAll?: boolean;
}

export const TemplateShowcase = ({
  hideHeader = false,
  showViewAll = true,
}: TemplateShowcaseProps) => {
  const { t } = useLanguage();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  // Per-template color choice, carried into the editor via ?theme=.
  const [cardThemes, setCardThemes] = useState<Record<string, string>>({});

  const templateHref = (key: CVTemplate) => {
    const themeId = cardThemes[key] || DEFAULT_RESUME_THEME_ID;
    return `/create?template=${encodeURIComponent(key)}&theme=${encodeURIComponent(themeId)}`;
  };

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/20 border-y border-border/60 overflow-x-hidden">
      <div className="container mx-auto max-w-7xl">
        {!hideHeader && (
          <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4 leading-tight">
              {t("landing.templatesSectionTitle")}
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              {t("landing.templatesSectionSubtitle")}
            </p>
          </div>
        )}

        <Carousel
          setApi={setCarouselApi}
          opts={{
            align: "start",
            dragFree: true,
            containScroll: "trimSnaps",
          }}
          className="w-full relative [--showcase-footer-h:5.75rem]"
        >
          <CarouselContent className="-ml-3 sm:-ml-4">
            {LANDING_TEMPLATE_CATALOG.map((item) => (
              <CarouselItem
                key={item.key}
                className="pl-3 sm:pl-4 basis-[88%] sm:basis-[62%] md:basis-[46%] lg:basis-[34%] xl:basis-[30%] min-w-0"
              >
                <article className="group flex flex-col rounded-2xl border border-border bg-card shadow-sm hover:shadow-[0_12px_32px_-12px_hsl(var(--primary)/0.25)] hover:border-primary/30 transition-all duration-300 overflow-hidden">
                  <div className="relative aspect-[3/4] min-h-[340px] sm:min-h-[400px] md:min-h-[460px] bg-white overflow-hidden">
                    <Link
                      to={templateHref(item.key)}
                      className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      aria-label={`${t(`landing.${item.nameKey}`)} — ${t("landing.chooseThisTemplate")}`}
                    />
                    <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
                      <LandingTemplatePreview
                        templateName={item.key}
                        previewScale={0.48}
                        accent={getResumeThemeAccent(cardThemes[item.key] || DEFAULT_RESUME_THEME_ID)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 border-t border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                    {item.badges.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 w-full">
                        {item.badges.map((badgeId) => (
                          <TemplateShowcaseBadge key={badgeId} badgeId={badgeId} />
                        ))}
                      </div>
                    )}
                    <h3 className="text-sm sm:text-base font-semibold text-foreground text-center leading-snug">
                      {t("landing.templateLabel")}{" "}
                      {t(`landing.${item.nameKey}`)}
                    </h3>

                    {/* Pick an accent color before opening the editor */}
                    <div
                      className="flex flex-wrap justify-center gap-1.5"
                      role="radiogroup"
                      aria-label={t("resume.settings.colorTheme") || "Color theme"}
                    >
                      {RESUME_COLOR_THEMES.map((theme) => {
                        const selectedId = cardThemes[item.key] || DEFAULT_RESUME_THEME_ID;
                        const active = selectedId === theme.id;
                        return (
                          <button
                            key={theme.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() =>
                              setCardThemes((prev) => ({ ...prev, [item.key]: theme.id }))
                            }
                            title={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                            aria-label={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                            className={`relative h-5 w-5 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              active
                                ? "ring-2 ring-offset-1 ring-primary scale-110"
                                : "ring-1 ring-border hover:ring-primary/40 hover:scale-110"
                            }`}
                            style={{ background: theme.accent }}
                          >
                            {active && (
                              <Check className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" strokeWidth={3.5} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <Link to={templateHref(item.key)} className="w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl border-2 font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                      >
                        {t("landing.chooseThisTemplate")}
                      </Button>
                    </Link>
                  </div>
                </article>
              </CarouselItem>
            ))}
          </CarouselContent>

          <TemplateCarouselPreviewNav
            api={carouselApi}
            prevLabel={t("landing.templatesCarouselPrev")}
            nextLabel={t("landing.templatesCarouselNext")}
          />
        </Carousel>

        <p className="text-center text-xs text-muted-foreground mt-4 sm:hidden">
          {t("landing.templatesScrollHint")}
        </p>

        {showViewAll && (
          <div className="text-center mt-10 sm:mt-14">
            <Link to="/templates">
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl px-8 border-2 font-semibold"
              >
                {t("landing.viewAllTemplates")}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};
