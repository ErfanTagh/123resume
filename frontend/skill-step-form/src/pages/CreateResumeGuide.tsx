import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SEO } from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { LandingTemplatePreview } from "@/pages/LandingTemplatePreview";
import {
  getTemplateRecommendation,
  type ExperienceBand,
  type JobSearchFocus,
  type SeniorityLevel,
} from "@/lib/templateGuideRecommendations";
import type { CVTemplate } from "@/components/cv-form/types";
import { ArrowRight, ChevronLeft, Sparkles } from "lucide-react";

/** Questionnaire steps (0 = language … 3 = focus); step 4 = result */
const TOTAL_GUIDE_STEPS = 4;
const RESULT_STEP_INDEX = 4;

const TEMPLATE_TITLE_KEY: Record<CVTemplate, string> = {
  modern: "templateModern",
  classic: "templateClassic",
  creative: "templateCreative",
  minimal: "templateMinimal",
  latex: "templateLatex",
  starRover: "templateStarRover",
  slateCopper: "templateSlateCopper",
  prism: "templatePrism",
};

const TEMPLATE_DESC_KEY: Record<CVTemplate, string> = {
  modern: "templateModernDesc",
  classic: "templateClassicDesc",
  creative: "templateCreativeDesc",
  minimal: "templateMinimalDesc",
  latex: "templateLatexDesc",
  starRover: "templateStarRoverDesc",
  slateCopper: "templateSlateCopperDesc",
  prism: "templatePrismDesc",
};

const CreateResumeGuide = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [guideLang, setGuideLang] = useState<"en" | "de">(() => (language === "de" ? "de" : "en"));
  const [years, setYears] = useState<ExperienceBand | "">("");
  const [seniority, setSeniority] = useState<SeniorityLevel | "">("");
  const [focus, setFocus] = useState<JobSearchFocus | "">("");

  const recommendation = useMemo(() => {
    if (!years || !seniority || !focus) return null;
    return getTemplateRecommendation(years, seniority, focus);
  }, [years, seniority, focus]);

  const applyGuideLanguage = (lang: "en" | "de") => {
    setGuideLang(lang);
    setLanguage(lang);
  };

  const canNext =
    (step === 0) ||
    (step === 1 && years !== "") ||
    (step === 2 && seniority !== "") ||
    (step === 3 && focus !== "");

  const templateTitle = (id: CVTemplate) => t(`landing.${TEMPLATE_TITLE_KEY[id]}`);
  const templateDescription = (id: CVTemplate) => t(`landing.${TEMPLATE_DESC_KEY[id]}`);

  const goCreate = (template: CVTemplate) => {
    navigate(`/create?template=${encodeURIComponent(template)}`);
  };

  return (
    <>
      <SEO
        title={t("resume.templateGuide.pageTitle")}
        description={t("resume.templateGuide.pageDescription")}
        noindex
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {t("resume.templateGuide.badge")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("resume.templateGuide.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {t("resume.templateGuide.subtitle")}
            </p>
            {step < RESULT_STEP_INDEX && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("resume.templateGuide.stepIndicator", { current: step + 1, total: TOTAL_GUIDE_STEPS })}
              </p>
            )}
          </div>

          <Card className="border-border/80 shadow-lg">
            <CardContent className="space-y-6 p-6 sm:p-8">
              {step === 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t("resume.templateGuide.languageLabel")}</Label>
                  <p className="text-sm text-muted-foreground">{t("resume.templateGuide.languageSubtitle")}</p>
                  <RadioGroup
                    value={guideLang}
                    onValueChange={(v) => applyGuideLanguage(v as "en" | "de")}
                    className="grid gap-3"
                  >
                    {(["en", "de"] as const).map((id) => (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 ${
                          guideLang === id ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={id} id={`lang-${id}`} className="mt-1" />
                        <div className="space-y-1">
                          <span className="font-medium leading-none">{t(`resume.templateGuide.language.${id}.title`)}</span>
                          <p className="text-sm text-muted-foreground">{t(`resume.templateGuide.language.${id}.hint`)}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t("resume.templateGuide.yearsLabel")}</Label>
                  <RadioGroup
                    value={years}
                    onValueChange={(v) => setYears(v as ExperienceBand)}
                    className="grid gap-3"
                  >
                    {(
                      [
                        { id: "0-2" as const, key: "y0" },
                        { id: "3-5" as const, key: "y3" },
                        { id: "6-10" as const, key: "y6" },
                        { id: "10+" as const, key: "y10" },
                      ] as const
                    ).map(({ id, key }) => (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 ${
                          years === id ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={id} id={`years-${id}`} className="mt-1" />
                        <div className="space-y-1">
                          <span className="font-medium leading-none">{t(`resume.templateGuide.years.${key}.title`)}</span>
                          <p className="text-sm text-muted-foreground">{t(`resume.templateGuide.years.${key}.hint`)}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t("resume.templateGuide.seniorityLabel")}</Label>
                  <RadioGroup
                    value={seniority}
                    onValueChange={(v) => setSeniority(v as SeniorityLevel)}
                    className="grid gap-3"
                  >
                    {(
                      [
                        { id: "entry" as const, key: "entry" },
                        { id: "mid" as const, key: "mid" },
                        { id: "senior" as const, key: "senior" },
                        { id: "lead" as const, key: "lead" },
                      ] as const
                    ).map(({ id, key }) => (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 ${
                          seniority === id ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={id} id={`sen-${id}`} className="mt-1" />
                        <div className="space-y-1">
                          <span className="font-medium leading-none">{t(`resume.templateGuide.seniority.${key}.title`)}</span>
                          <p className="text-sm text-muted-foreground">{t(`resume.templateGuide.seniority.${key}.hint`)}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t("resume.templateGuide.focusLabel")}</Label>
                  <RadioGroup
                    value={focus}
                    onValueChange={(v) => setFocus(v as JobSearchFocus)}
                    className="grid gap-3"
                  >
                    {(
                      [
                        { id: "ats" as const, key: "ats" },
                        { id: "balanced" as const, key: "balanced" },
                        { id: "standout" as const, key: "standout" },
                      ] as const
                    ).map(({ id, key }) => (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 ${
                          focus === id ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <RadioGroupItem value={id} id={`focus-${id}`} className="mt-1" />
                        <div className="space-y-1">
                          <span className="font-medium leading-none">{t(`resume.templateGuide.focus.${key}.title`)}</span>
                          <p className="text-sm text-muted-foreground">{t(`resume.templateGuide.focus.${key}.hint`)}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step === RESULT_STEP_INDEX && recommendation && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold">{t("resume.templateGuide.resultTitle")}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t(`resume.templateGuide.reasons.${recommendation.reasonKey}`)}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border bg-muted/20">
                    <div className="aspect-[3/4] max-h-[320px] w-full border-b bg-white sm:max-h-[380px]">
                      <LandingTemplatePreview templateName={recommendation.template} />
                    </div>
                    <div className="p-4">
                      <p className="text-lg font-bold">{templateTitle(recommendation.template)}</p>
                      <p className="text-sm text-muted-foreground">{templateDescription(recommendation.template)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button size="lg" className="w-full sm:flex-1" onClick={() => goCreate(recommendation.template)}>
                      {t("resume.templateGuide.useRecommended", { name: templateTitle(recommendation.template) })}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {recommendation.alternates.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{t("resume.templateGuide.alternatesTitle")}</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendation.alternates.map((tid) => (
                          <Button key={tid} variant="outline" size="sm" onClick={() => goCreate(tid)}>
                            {templateTitle(tid)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        setYears("");
                        setSeniority("");
                        setFocus("");
                        setStep(0);
                      }}
                    >
                      {t("resume.templateGuide.restart")}
                    </Button>
                    <Link to="/create" className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline sm:text-right">
                      {t("resume.templateGuide.browseAll")}
                    </Link>
                  </div>
                </div>
              )}

              {step < RESULT_STEP_INDEX && (
                <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={step === 0}
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("common.back")}
                  </Button>
                  <Button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="gap-1">
                    {t("common.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step < RESULT_STEP_INDEX && (
                <p className="text-center text-sm">
                  <Link to="/create" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    {t("resume.templateGuide.skipToTemplates")}
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default CreateResumeGuide;
