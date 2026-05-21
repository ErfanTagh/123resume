import { cn } from "@/lib/utils";

/** Skeleton sizes: `md` / `xl` span the full score readout when “/10” is hidden while loading. */
const sizeStyles = {
  sm: "h-3.5 w-4",
  /** Preview strip: ~“8/10” in text-sm */
  md: "h-5 w-[3.5rem]",
  lg: "h-8 w-10",
  /** Review / Score tab: ~“8/10” with text-5xl + /10 */
  xl: "h-[3rem] w-[6.25rem] sm:w-28",
} as const;

type ResumeScoreNumberShimmerProps = {
  size?: keyof typeof sizeStyles;
  className?: string;
};

/**
 * Facebook / Instagram–style loading: horizontal shimmer on theme colors
 * (`muted` base, `primary` highlight) — matches site HSL tokens.
 */
export function ResumeScoreNumberShimmer({ size = "md", className }: ResumeScoreNumberShimmerProps) {
  return (
    <span
      role="status"
      aria-label="Loading score"
      className={cn(
        "inline-block shrink-0 rounded-md border border-border/70 shadow-sm",
        "bg-gradient-to-r from-muted via-primary/30 to-muted bg-[length:200%_100%]",
        "dark:via-primary/35",
        "animate-score-shimmer-bg motion-reduce:animate-none",
        sizeStyles[size],
        className,
      )}
    />
  );
}
