import { cn } from "@/lib/utils";

export type ResumesTabId =
  | "resumes"
  | "job-matching"
  | "job-tracker"
  | "portfolio"
  | "business-card";

/** Outer rail: flush left, white, full viewport height — no vertical scroll. */
export const resumesSideRailClass = cn(
  "sticky top-[var(--app-header-height,57px)] z-30",
  "h-[calc(100vh-var(--app-header-height,57px))] shrink-0",
  "overflow-hidden overflow-y-hidden border-r border-border bg-card",
  "transition-[width] duration-200 ease-out",
);

/** Inner column keeps open width so collapse clips labels instead of reflowing. */
export const resumesSideRailInnerClass = "flex w-52 flex-col gap-1 overflow-y-hidden p-2";

export const resumesTabsListClass = cn(
  "h-auto w-full flex-col items-stretch gap-1 rounded-none border-0 bg-transparent p-0 shadow-none",
);

/** Active = tint + weight (R3). Icons stay left so they remain visible when clipped. */
export const resumesTabTriggerClass = cn(
  "relative inline-flex w-full items-center justify-start gap-2.5",
  "rounded-md px-2.5 py-2.5 text-sm font-medium",
  "text-muted-foreground transition-colors",
  "hover:bg-muted hover:text-foreground",
  "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold",
  "data-[state=active]:shadow-none",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

export const resumesTabLabelClass = "truncate whitespace-nowrap";
