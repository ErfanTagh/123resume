import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusBadgeProps {
  status: SaveStatus;
  className?: string;
}

/**
 * Animated pill that reflects per-step draft autosave state.
 * - "saving": spinner + label
 * - "saved":  animated check (draw-in) + label, with a soft pop
 * - "error":  warning icon + label
 * Hidden when "idle".
 *
 * Self-contained keyframes are injected once so the component does not depend
 * on any particular Tailwind animation plugin configuration.
 */
export const SaveStatusBadge = ({ status, className }: SaveStatusBadgeProps) => {
  const { t } = useLanguage();

  if (status === "idle") return null;

  const isSaving = status === "saving";
  const isSaved = status === "saved";
  const isError = status === "error";

  const label = isSaving
    ? t("resume.form.savingDraft") || "Saving"
    : isError
      ? t("resume.form.saveDraftError") || "Couldn't save"
      : t("resume.form.savedDraft") || "Saved";

  return (
    <>
      <style>{`
        @keyframes ssb-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ssb-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes ssb-ring {
          0%   { transform: scale(0.6); opacity: 0.55; }
          100% { transform: scale(1.9); opacity: 0; }
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm select-none backdrop-blur-sm",
          "transition-colors duration-300",
          isSaving &&
            "border-primary/20 bg-primary/10 text-primary",
          isSaved &&
            "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          isError &&
            "border-destructive/25 bg-destructive/10 text-destructive",
          className,
        )}
        style={{ animation: "ssb-pop 320ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {isSaving && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        )}

        {isError && <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />}

        {isSaved && (
          <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
            {/* expanding ring pulse on success */}
            <span
              className="absolute inset-0 rounded-full bg-emerald-500/30"
              style={{ animation: "ssb-ring 600ms ease-out forwards" }}
              aria-hidden="true"
            />
            <svg
              viewBox="0 0 24 24"
              className="relative h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d="M5 13l4 4L19 7"
                style={{
                  strokeDasharray: 24,
                  strokeDashoffset: 24,
                  animation: "ssb-check 320ms ease-out 80ms forwards",
                }}
              />
            </svg>
          </span>
        )}

        <span className="whitespace-nowrap">{label}</span>
      </div>
    </>
  );
};
