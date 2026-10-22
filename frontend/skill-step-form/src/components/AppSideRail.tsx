import type { ReactNode } from "react";
import { useResumesSidebar } from "@/contexts/ResumesSidebarContext";
import { cn } from "@/lib/utils";

type AppSideRailProps = {
  children: ReactNode;
  /** Accessible name for the nav landmark. */
  label: string;
};

/**
 * Shared flush-left white rail. Full collapse (w-0) — hamburger/logo live in Header.
 * Inner column stays w-52 so expand/collapse clips instead of reflowing labels.
 */
export function AppSideRail({ children, label }: AppSideRailProps) {
  const { collapsed } = useResumesSidebar();

  return (
    <nav
      className={cn(
        "sticky top-[var(--app-header-height,57px)] z-30",
        "h-[calc(100vh-var(--app-header-height,57px))] shrink-0",
        "overflow-hidden overflow-y-hidden border-r border-border bg-card",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-0 border-r-0" : "w-52",
      )}
      aria-label={label}
      aria-hidden={collapsed}
    >
      <div className="flex w-52 flex-col gap-1 overflow-y-hidden p-2">{children}</div>
    </nav>
  );
}

export const appSideRailItemClass = cn(
  "relative inline-flex w-full items-center justify-start gap-2.5",
  "rounded-md px-2.5 py-2.5 text-sm font-medium no-underline",
  "text-muted-foreground transition-colors",
  "hover:bg-muted hover:text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
);

export const appSideRailItemActiveClass =
  "bg-primary/10 text-primary font-semibold";
