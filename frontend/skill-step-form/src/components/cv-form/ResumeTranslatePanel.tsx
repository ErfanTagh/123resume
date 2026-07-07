import { UseFormReturn } from "react-hook-form";
import { Languages } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ResumeTranslateControls } from "./ResumeTranslateControls";
import { useResumeTranslate } from "./useResumeTranslate";
import type { CVFormData } from "./types";

interface ResumeTranslatePanelProps {
  form: UseFormReturn<CVFormData>;
  /** Called after the resume is translated so the parent can refresh the score. */
  onApplied?: () => void;
}

/**
 * "Translate my resume" panel. Pick a target language and choose which parts to
 * translate (all by default). Name, contact details, links and dates stay as-is.
 * The translated content replaces the current fields in place — Save to keep it,
 * or leave the editor to discard.
 */
export const ResumeTranslatePanel = ({ form, onApplied }: ResumeTranslatePanelProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { loading, translate } = useResumeTranslate(form, onApplied);

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5 text-primary" />
          {t("resume.translate.title") || "Translate my resume"}
        </CardTitle>
        <CardDescription>
          {t("resume.translate.subtitle") ||
            "Translate your whole resume into another language. Your name, contact details and dates stay as-is. This replaces your current text — save to keep it."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResumeTranslateControls
          loading={loading}
          defaultTarget={language === "en" ? "de" : "en"}
          onTranslate={translate}
        />
      </CardContent>
    </Card>
  );
};
