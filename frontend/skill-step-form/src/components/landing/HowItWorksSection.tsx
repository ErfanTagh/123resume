import { Fragment } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Download,
  LayoutTemplate,
  UserPlus,
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
    icon: UserPlus,
    cardClass: "bg-blue-50 border-blue-200",
    circleClass: "bg-blue-600",
    iconClass: "text-blue-600",
  },
  {
    step: 2,
    titleKey: "step2Title",
    descKey: "step2Desc",
    icon: LayoutTemplate,
    cardClass: "bg-indigo-50 border-indigo-200",
    circleClass: "bg-indigo-600",
    iconClass: "text-indigo-600",
  },
  {
    step: 3,
    titleKey: "step3Title",
    descKey: "step3Desc",
    icon: Download,
    cardClass: "bg-emerald-50 border-emerald-200",
    circleClass: "bg-emerald-600",
    iconClass: "text-emerald-600",
  },
];

const StepArrow = ({ delay }: { delay: number }) => (
  <>
    <motion.div
      className="flex shrink-0 items-center justify-center text-muted-foreground md:hidden"
      initial={{ opacity: 0, scaleY: 0 }}
      whileInView={{ opacity: 1, scaleY: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
    >
      <ArrowDown className="h-8 w-8" aria-hidden />
    </motion.div>
    <motion.div
      className="hidden shrink-0 items-center justify-center text-muted-foreground md:flex"
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
    >
      <ArrowRight className="h-8 w-8" aria-hidden />
    </motion.div>
  </>
);

export const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            {t("landing.howItWorksTitle")}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            {t("landing.howItWorksSubtitle")}
          </p>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 md:flex-row md:items-stretch">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.step}>
                <motion.div
                  className={cn(
                    "flex w-full flex-1 flex-col rounded-2xl border-2 p-8 shadow-sm transition-shadow hover:shadow-lg md:min-w-0",
                    item.cardClass,
                  )}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -6 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.45 }}
                >
                  <div
                    className={cn(
                      "mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold text-white",
                      item.circleClass,
                    )}
                  >
                    {item.step}
                  </div>
                  <Icon
                    className={cn("mb-3 h-8 w-8", item.iconClass)}
                    aria-hidden
                  />
                  <h3 className="mb-2 text-lg font-semibold text-foreground sm:text-xl">
                    {t(`landing.${item.titleKey}`)}
                  </h3>
                  <p className="text-sm text-muted-foreground sm:text-base">
                    {t(`landing.${item.descKey}`)}
                  </p>
                </motion.div>

                {index < STEPS.length - 1 && (
                  <StepArrow delay={index * 0.2 + 0.1} />
                )}
              </Fragment>
            );
          })}
        </div>

        <div className="mt-12 text-center sm:mt-16">
          <Link to="/create/start">
            <Button
              size="lg"
              className="rounded-xl bg-primary px-6 py-5 text-base hover:bg-primary/90 hover:scale-105 transition-transform sm:px-8 sm:py-6 sm:text-lg"
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
