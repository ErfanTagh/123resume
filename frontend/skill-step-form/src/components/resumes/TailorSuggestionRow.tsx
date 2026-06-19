import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TailorSuggestion } from "@/lib/resumeTailorUtils";
import { useLanguage } from "@/contexts/LanguageContext";

type TailorSuggestionRowProps = {
  suggestion: TailorSuggestion;
  onAccept: () => void;
  onDecline: () => void;
  isApplying: boolean;
};

export function TailorSuggestionRow({
  suggestion,
  onAccept,
  onDecline,
  isApplying,
}: TailorSuggestionRowProps) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{suggestion.label}</p>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
        <div className="rounded-md border border-red-200 bg-red-50/80 dark:bg-red-950/30 dark:border-red-900/50 p-3 min-h-[4.5rem]">
          <p className="text-[10px] uppercase tracking-wide font-medium text-red-700/80 dark:text-red-300/80 mb-1.5">
            {t("pages.resumes.jobMatching.tailor.before") || "Current"}
          </p>
          <p className="text-sm whitespace-pre-wrap text-red-950/90 dark:text-red-50/90 leading-relaxed">
            {suggestion.before || "—"}
          </p>
        </div>
        <div className="hidden md:flex items-center justify-center text-muted-foreground">
          <ArrowRight className="h-5 w-5 shrink-0" />
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-900/50 p-3 min-h-[4.5rem]">
          <p className="text-[10px] uppercase tracking-wide font-medium text-blue-700/80 dark:text-blue-300/80 mb-1.5">
            {t("pages.resumes.jobMatching.tailor.after") || "Suggested"}
          </p>
          <p className="text-sm whitespace-pre-wrap text-blue-950/90 dark:text-blue-50/90 leading-relaxed">
            {suggestion.after}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onDecline}
          disabled={isApplying}
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          {t("pages.resumes.jobMatching.tailor.decline") || "Decline"}
        </Button>
        <Button type="button" size="sm" onClick={onAccept} disabled={isApplying}>
          <Check className="mr-1.5 h-3.5 w-3.5" />
          {isApplying
            ? t("pages.resumes.jobMatching.tailor.applying") || "Applying..."
            : t("pages.resumes.jobMatching.tailor.accept") || "Accept"}
        </Button>
      </div>
    </div>
  );
}
