import { cn } from "@/lib/utils";

export type ResumesTabId = "resumes" | "job-matching" | "job-tracker" | "portfolio";

/** Compact tab list: no chrome, tabs sit inline. */
export const resumesTabsListClass = cn(
  "h-auto w-full flex flex-wrap items-center gap-0.5 sm:gap-1",
  "bg-transparent p-0 shadow-none border-0 rounded-none",
);

/**
 * Minimal text tabs: muted by default, light hover, active = blue text only (no fill pill).
 */
export const resumesTabTriggerClass = cn(
  "relative inline-flex items-center justify-center",
  "rounded-md px-2.5 py-1 text-xs sm:text-sm font-medium",
  "text-muted-foreground",
  "transition-colors duration-150 ease-out",
  "hover:text-foreground hover:bg-muted/50",
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
  "data-[state=active]:text-blue-600 data-[state=active]:font-semibold",
  "dark:data-[state=active]:text-blue-400",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);
