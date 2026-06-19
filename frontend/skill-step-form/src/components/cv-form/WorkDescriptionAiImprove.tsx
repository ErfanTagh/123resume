import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/lib/api";

interface WorkDescriptionAiImproveProps {
  fieldId: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  position: string;
  company: string;
}

export const WorkDescriptionAiImprove = ({
  fieldId,
  label,
  placeholder,
  value,
  onChange,
  position,
  company,
}: WorkDescriptionAiImproveProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasContext =
    Boolean(value.trim()) || Boolean(position.trim()) || Boolean(company.trim());

  const fetchImprovement = async () => {
    if (!user) return;
    if (!hasContext) {
      toast({
        title: t("resume.aiDescription.needContextTitle"),
        description: t("resume.aiDescription.needContext"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await aiAPI.improveWorkDescription({
        description: value.trim(),
        position: position.trim(),
        company: company.trim(),
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={fieldId}>{label}</Label>
        {user ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={fetchImprovement}
            disabled={loading}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? t("resume.aiDescription.generating") : t("resume.aiDescription.improve")}
          </Button>
        ) : null}
      </div>

      <Textarea
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />

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
          <p className="px-4 py-3 text-sm leading-relaxed text-foreground">{suggestion}</p>
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
