import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { TemplateBadgeId } from "@/lib/landingTemplateCatalog";

const BADGE_LABEL_KEY: Record<TemplateBadgeId, string> = {
  recommended: "badgeRecommended",
  ats: "badgeATS",
  new: "badgeNew",
  european: "badgeEuropean",
};

/** Solid pills using site primary blue — readable on card background, not on resume preview. */
const BADGE_CLASS: Record<TemplateBadgeId, string> = {
  recommended:
    "bg-primary text-primary-foreground border-primary shadow-sm",
  ats: "bg-primary/90 text-primary-foreground border-primary/90 shadow-sm",
  new: "bg-background text-primary border-2 border-primary shadow-sm",
  european:
    "bg-primary/10 text-primary border border-primary/25 shadow-sm",
};

type TemplateShowcaseBadgeProps = {
  badgeId: TemplateBadgeId;
};

export const TemplateShowcaseBadge = ({ badgeId }: TemplateShowcaseBadgeProps) => {
  const { t } = useLanguage();

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] sm:text-xs font-semibold leading-tight tracking-normal",
        BADGE_CLASS[badgeId],
      )}
    >
      {t(`landing.${BADGE_LABEL_KEY[badgeId]}`)}
    </span>
  );
};
