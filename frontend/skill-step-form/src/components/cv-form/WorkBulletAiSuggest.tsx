import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/lib/api";

interface WorkBulletAiSuggestProps {
  position: string;
  company: string;
  description: string;
  existingBullets: string[];
  technologies?: string[];
  onAdd: (bullet: string) => void;
  sectionLabel: string;
  addButton: ReactNode;
  children: ReactNode;
}

export const WorkBulletAiSuggest = ({
  position,
  company,
  description,
  existingBullets,
  technologies = [],
  onAdd,
  sectionLabel,
  addButton,
  children,
}: WorkBulletAiSuggestProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasContext =
    Boolean(position.trim()) ||
    Boolean(company.trim()) ||
    Boolean(description.trim()) ||
    existingBullets.some((b) => b.trim());

  const fetchSuggestion = async () => {
    if (!user) return;
    if (!hasContext) {
      toast({
        title: t("resume.aiBullet.needContextTitle"),
        description: t("resume.aiBullet.needContext"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await aiAPI.suggestWorkBullet({
        position: position.trim(),
        company: company.trim(),
        description: description.trim(),
        existingBullets: existingBullets.map((b) => b.trim()).filter(Boolean),
        technologies: technologies.map((tech) => tech.trim()).filter(Boolean),
        outputLanguage: language === "de" ? "de" : "en",
      });
      const bullet = typeof result?.bullet === "string" ? result.bullet.trim() : "";
      if (!bullet) {
        throw new Error(t("resume.aiBullet.emptyResponse"));
      }
      setSuggestion(bullet);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t("resume.aiBullet.error");
      toast({
        title: t("resume.aiBullet.errorTitle"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!suggestion?.trim()) return;
    onAdd(suggestion.trim());
    setSuggestion(null);
    toast({
      title: t("resume.aiBullet.addedTitle"),
      description: t("resume.aiBullet.added"),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{sectionLabel}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={fetchSuggestion}
              disabled={loading}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {loading ? t("resume.aiBullet.generating") : t("resume.aiBullet.suggest")}
            </Button>
          ) : null}
          {addButton}
        </div>
      </div>

      {children}

      {!user ? (
        <p className="text-xs text-muted-foreground">
          {t("resume.aiBullet.signIn")}{" "}
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
              onClick={fetchSuggestion}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {t("resume.aiBullet.refresh")}
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleAdd}
              disabled={loading}
            >
              <Check className="h-3.5 w-3.5" />
              {t("resume.aiBullet.add")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
