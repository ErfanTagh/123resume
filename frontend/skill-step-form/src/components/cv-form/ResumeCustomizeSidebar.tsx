import { useState } from "react";
import { FileStack, Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CVRating } from "./CVRating";
import { TemplateSelector } from "./TemplateSelector";
import { SectionOrderManager } from "./SectionOrderManager";
import { StylingSettings } from "./StylingSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { logResumeScore } from "@/lib/resumeScoreDebug";
import type { CVTemplate } from "./types";
import type { ResumeEditorSideProps } from "./resumeEditorTypes";
import { cn } from "@/lib/utils";

type PanelId = "templates" | "settings" | "score";

/** Scrollable body when a tool tab is open — taller than the old 300px cap so score/settings are readable. */
const ACTIVE_PANEL_CLASS =
  "min-h-[min(40vh,340px)] max-h-[min(62vh,540px)] overflow-y-auto border-primary/15 bg-muted/15 p-3 sm:min-h-[min(44vh,380px)] sm:max-h-[min(68vh,580px)] sm:p-4";

export const ResumeCustomizeSidebar = ({
  data,
  serverResumeScore,
  serverResumeScoreLoading,
  onRequestAiResumeScore,
  onTemplateChange,
  onSectionOrderChange,
  onStylingChange,
  currentStep,
}: ResumeEditorSideProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [panel, setPanel] = useState<PanelId | null>(null);

  const template = data.template || "modern";
  const defaultSectionOrder = [
    "summary",
    "workExperience",
    "education",
    "projects",
    "certificates",
    "skills",
    "languages",
    "interests",
  ];
  const sectionOrder = data.sectionOrder || defaultSectionOrder;

  const togglePanel = (id: PanelId) => {
    setPanel((current) => {
      const next = current === id ? null : id;
      if (next === "score" && user) {
        logResumeScore("ui:customize-panel-score", {
          hasHandler: typeof onRequestAiResumeScore === "function",
        });
        onRequestAiResumeScore?.();
      }
      return next;
    });
  };

  const tools: { id: PanelId; icon: typeof FileStack; label: string }[] = [
    { id: "templates", icon: FileStack, label: t("resume.tabs.templates") || "Templates" },
    { id: "settings", icon: Settings, label: t("resume.tabs.settings") || "Settings" },
    { id: "score", icon: TrendingUp, label: t("resume.tabs.score") || "Score" },
  ];

  return (
    <div className="shrink-0 space-y-3 border-b border-border pb-4">
      <div className="grid grid-cols-3 gap-2">
        {tools.map(({ id, icon: Icon, label }) => (
          <Button
            key={id}
            type="button"
            variant={panel === id ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-auto flex-col gap-1 px-2 py-2.5 text-[11px] font-semibold leading-tight sm:text-xs",
              panel === id && "py-3 shadow-sm ring-1 ring-primary/20",
            )}
            onClick={() => togglePanel(id)}
            aria-pressed={panel === id}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {panel === "templates" && (
        <Card className={ACTIVE_PANEL_CLASS}>
          <TemplateSelector
            selected={template}
            onSelect={(selected: CVTemplate) => onTemplateChange?.(selected)}
          />
        </Card>
      )}

      {panel === "settings" && (
        <Card className={cn(ACTIVE_PANEL_CLASS, "space-y-4")}>
          <StylingSettings
            data={data}
            currentStep={currentStep}
            onStylingChange={(styling) => onStylingChange?.(styling)}
          />
          <SectionOrderManager
            sectionOrder={sectionOrder}
            onReorder={(order) => onSectionOrderChange?.(order)}
          />
        </Card>
      )}

      {panel === "score" && (
        <Card className={ACTIVE_PANEL_CLASS}>
          <CVRating
            onAnalyze={user ? () => onRequestAiResumeScore?.({ force: true }) : undefined}
            isAnalyzing={!!user && !!serverResumeScoreLoading}
            rating={serverResumeScore}
            ratingLoading={!!user && !!serverResumeScoreLoading}
          />
        </Card>
      )}
    </div>
  );
};
