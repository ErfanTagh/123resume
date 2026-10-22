import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSideRail, appSideRailItemClass } from "@/components/AppSideRail";
import { useResumesSidebar } from "@/contexts/ResumesSidebarContext";
import { cn } from "@/lib/utils";
import { RESUMES_TABS, type ResumesTabConfig } from "@/components/resumes/resumesTabs";

type ResumesTabBarProps = {
  tabs?: ResumesTabConfig[];
  getLabel: (tab: ResumesTabConfig) => string;
};

export function ResumesTabBar({ tabs = RESUMES_TABS, getLabel }: ResumesTabBarProps) {
  const { collapsed } = useResumesSidebar();

  return (
    <AppSideRail label="Resumes sections">
      <TabsList className="h-auto w-full flex-col items-stretch gap-1 rounded-none border-0 bg-transparent p-0 shadow-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const label = getLabel(tab);
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                appSideRailItemClass,
                "data-[state=active]:bg-primary/10 data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none",
              )}
              title={label}
              aria-label={label}
              tabIndex={collapsed ? -1 : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate whitespace-nowrap">{label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </AppSideRail>
  );
}
