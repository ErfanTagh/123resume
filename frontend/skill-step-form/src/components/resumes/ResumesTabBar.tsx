import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resumesTabTriggerClass, resumesTabsListClass, type ResumesTabId } from "@/components/resumes/resumesTabStyles";

type TabConfig = {
  id: ResumesTabId;
  label: string;
};

type ResumesTabBarProps = {
  tabs: TabConfig[];
};

export function ResumesTabBar({ tabs }: ResumesTabBarProps) {
  return (
    <TabsList className={resumesTabsListClass}>
      {tabs.map(({ id, label }) => (
        <TabsTrigger key={id} value={id} className={resumesTabTriggerClass}>
          {label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
