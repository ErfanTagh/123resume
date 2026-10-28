import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Framed tints per action — full literal class strings so Tailwind keeps them. */
export const ROW_ACTION_TONES = {
  primary: "bg-primary/10 text-primary ring-primary/20 hover:bg-primary/20",
  sky: "bg-sky-500/10 text-sky-600 ring-sky-500/20 hover:bg-sky-500/20 dark:text-sky-400",
  violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20 hover:bg-violet-500/20 dark:text-violet-400",
  neutral: "bg-muted text-muted-foreground ring-border hover:bg-muted/70 hover:text-foreground",
  danger: "bg-muted text-muted-foreground ring-border hover:bg-destructive/10 hover:text-destructive hover:ring-destructive/30",
} as const;

export const ROW_ACTION_FRAME =
  "flex h-8 w-8 flex-none items-center justify-center rounded-lg ring-1 ring-inset transition-colors sm:h-9 sm:w-9 disabled:pointer-events-none disabled:opacity-60";

/** One icon action on a list row (resumes, applications) — tinted frame, label shown as a tooltip. */
export const RowAction = ({
  label,
  onClick,
  href,
  disabled,
  tone,
  children,
}: {
  label: string;
  onClick?: () => void;
  /** Opens in a new tab instead of running onClick */
  href?: string;
  disabled?: boolean;
  tone: keyof typeof ROW_ACTION_TONES;
  children: React.ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          onClick={(e) => e.stopPropagation()}
          className={`${ROW_ACTION_FRAME} ${ROW_ACTION_TONES[tone]}`}
        >
          {children}
        </a>
      ) : (
        <button
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={`${ROW_ACTION_FRAME} ${ROW_ACTION_TONES[tone]}`}
        >
          {children}
        </button>
      )}
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
