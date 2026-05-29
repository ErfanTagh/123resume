import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Download,
  FilePenLine,
  LayoutTemplate,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

type StepConfig = {
  step: number;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  cardClass: string;
  circleClass: string;
  iconClass: string;
};

const STEPS: StepConfig[] = [
  {
    step: 1,
    titleKey: "step1Title",
    descKey: "step1Desc",
    icon: LayoutTemplate,
    cardClass: "bg-blue-50 border-blue-200",
    circleClass: "bg-blue-600",
    iconClass: "text-blue-600",
  },
  {
    step: 2,
    titleKey: "step2Title",
    descKey: "step2Desc",
    icon: FilePenLine,
    cardClass: "bg-indigo-50 border-indigo-200",
    circleClass: "bg-indigo-600",
    iconClass: "text-indigo-600",
  },
  {
    step: 3,
    titleKey: "step3Title",
    descKey: "step3Desc",
    icon: Sparkles,
    cardClass: "bg-violet-50 border-violet-200",
    circleClass: "bg-violet-600",
    iconClass: "text-violet-600",
  },
  {
    step: 4,
    titleKey: "step4Title",
    descKey: "step4Desc",
    icon: Download,
    cardClass: "bg-emerald-50 border-emerald-200",
    circleClass: "bg-emerald-600",
    iconClass: "text-emerald-600",
  },
];

const ROWS: [number, number][] = [
  [0, 1],
  [2, 3],
];

const StepArrowHorizontal = ({ delay }: { delay: number }) => (
  <motion.div
    className="flex shrink-0 items-center justify-center px-1 text-muted-foreground"
    initial={{ opacity: 0, scaleX: 0 }}
    whileInView={{ opacity: 1, scaleX: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.35 }}
    aria-hidden
  >
    <ArrowRight className="h-7 w-7 sm:h-8 sm:w-8" />
  </motion.div>
);

const StepArrowVertical = ({ delay }: { delay: number }) => (
  <motion.div
    className="flex shrink-0 items-center justify-center py-1 text-muted-foreground"
    initial={{ opacity: 0, scaleY: 0 }}
    whileInView={{ opacity: 1, scaleY: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.35 }}
    aria-hidden
  >
    <ArrowDown className="h-7 w-7 sm:h-8 sm:w-8" />
  </motion.div>
);

const StepCard = ({ item, index }: { item: StepConfig; index: number }) => {
  const { t } = useLanguage();
  const Icon = item.icon;

  return (
    <motion.div
      className={cn(
        "flex w-full min-w-0 flex-col rounded-xl border-2 p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6",
        item.cardClass,
      )}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.12, duration: 0.4 }}
    >
      <div className="mb-4 flex items-center gap-3.5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white",
            item.circleClass,
          )}
        >
          {item.step}
        </div>
        <Icon className={cn("h-7 w-7 shrink-0 sm:h-8 sm:w-8", item.iconClass)} aria-hidden />
      </div>
      <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground sm:text-xl">
        {t(`landing.${item.titleKey}`)}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t(`landing.${item.descKey}`)}
      </p>
    </motion.div>
  );
};

export const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-8 text-center sm:mb-12">
          <h2 className="mb-3 text-3xl font-bold text-foreground sm:mb-4 sm:text-5xl">
            {t("landing.howItWorksTitle")}
          </h2>
          <p className="text-lg text-muted-foreground sm:text-xl">
            {t("landing.howItWorksSubtitle")}
          </p>
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-stretch gap-3 sm:gap-4">
          {ROWS.map((indices, rowIndex) => (
            <div key={rowIndex} className="flex flex-col items-stretch">
              <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
                <StepCard item={STEPS[indices[0]]} index={indices[0]} />
                <div className="hidden items-center justify-center sm:flex">
                  <StepArrowHorizontal delay={indices[0] * 0.12 + 0.08} />
                </div>
                <div className="flex justify-center sm:hidden">
                  <StepArrowVertical delay={indices[0] * 0.12 + 0.08} />
                </div>
                <StepCard item={STEPS[indices[1]]} index={indices[1]} />
              </div>
              {rowIndex < ROWS.length - 1 && (
                <div className="flex justify-center py-1 sm:py-2">
                  <StepArrowVertical delay={1.2} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 text-center sm:mt-14">
          <Link to="/create/start">
            <Button
              size="lg"
              className="rounded-xl bg-primary px-6 py-5 text-base transition-transform hover:scale-105 hover:bg-primary/90 sm:px-8 sm:py-6 sm:text-lg"
            >
              {t("landing.ctaStartBuildingNow")}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
