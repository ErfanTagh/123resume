import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AutoGrowTextarea } from "@/components/cv-form/AutoGrowTextarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { aiAPI, type AiImproveFieldType } from "@/lib/api";

export interface AiImproveTextareaProps {
  fieldType: AiImproveFieldType;
  fieldId: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  position?: string;
  company?: string;
  professionalTitle?: string;
  projectName?: string;
  rows?: number;
}

export const AiImproveTextarea = ({
  fieldType,
  fieldId,
  label,
  placeholder,
  value,
  onChange,
  position = "",
  company = "",
  professionalTitle = "",
  projectName = "",
  rows = 3,
}: AiImproveTextareaProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasContext = (() => {
    if (value.trim()) return true;
    switch (fieldType) {
      case "professional_summary":
        return Boolean(professionalTitle.trim());
      case "project_description":
        return Boolean(projectName.trim());
      default:
        return Boolean(position.trim()) || Boolean(company.trim());
    }
  })();

  const needContextMessage = (() => {
    switch (fieldType) {
      case "professional_summary":
        return t("resume.aiDescription.needContextProfessional");
      case "project_description":
        return t("resume.aiDescription.needContextProject");
      default:
        return t("resume.aiDescription.needContext");
    }
  })();

  const fetchImprovement = async () => {
    if (!user) return;
    if (!hasContext) {
      toast({
        title: t("resume.aiDescription.needContextTitle"),
        description: needContextMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await aiAPI.improveResumeText({
        fieldType,
        description: value.trim(),
        position: position.trim(),
        company: company.trim(),
        professionalTitle: professionalTitle.trim(),
        projectName: projectName.trim(),
        outputLanguage: language === "de" ? "de" : "en",
      });
      const improved =
        typeof result?.description === "string" ? result.description.trim() : "";
      if (!improved) {
        throw new Error(t("resume.aiDescription.emptyResponse"));
      }
      setSuggestion(improved);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t("resume.aiDescription.error");
      toast({
        title: t("resume.aiDescription.errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion?.trim()) return;
    onChange(suggestion.trim());
    setSuggestion(null);
    toast({
      title: t("resume.aiDescription.appliedTitle"),
      description: t("resume.aiDescription.applied"),
    });
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>{label}</Label>

      <div className="relative rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {user ? (
          <div className="pointer-events-none absolute right-2 top-2 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pointer-events-auto h-7 gap-1 rounded-full border-input bg-background px-2.5 text-xs font-medium shadow-sm"
              onClick={fetchImprovement}
              disabled={loading}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? t("resume.aiDescription.generating") : t("resume.aiDescription.improve")}
            </Button>
          </div>
        ) : null}

        <AutoGrowTextarea
          id={fieldId}
          value={value}
          resizeKey={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`min-h-[108px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0${user ? " pr-[9.5rem]" : ""}`}
        />
      </div>

      {!user ? (
        <p className="text-xs text-muted-foreground">
          {t("resume.aiDescription.signIn")}{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-2 hover:underline">
            {t("navigation.login")}
          </Link>
        </p>
      ) : null}

      {suggestion ? (
        <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/5">
          <p className="px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {suggestion}
          </p>
          <div className="flex items-center justify-between gap-2 border-t border-primary/15 bg-background/60 px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={fetchImprovement}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("resume.aiDescription.refresh")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleApply}
              disabled={loading}
            >
              <Check className="h-3.5 w-3.5" />
              {t("resume.aiDescription.apply")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
