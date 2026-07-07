import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { aiAPI } from "@/lib/api";
import {
  translationLanguageNative,
  type TranslationLanguageCode,
} from "@/lib/translationLanguages";
import type { TranslationCategory } from "@/lib/translationCategories";
import type { CVFormData } from "./types";

/**
 * In-place resume translation for the editor: translate the current form content
 * into a target language and apply it back via form.reset(). The resume is tagged
 * with its content language (styling.resumeLanguage) so templates render section
 * headings in it. Returns { loading, translate }; translate resolves to true on
 * success so callers can close a dialog.
 */
export function useResumeTranslate(
  form: UseFormReturn<CVFormData> | undefined,
  onApplied?: () => void,
) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const translate = async (
    target: TranslationLanguageCode,
    categories: TranslationCategory[],
  ): Promise<boolean> => {
    if (!form) return false;
    setLoading(true);
    try {
      const { targetLanguage, resume } = await aiAPI.translateResume(
        form.getValues() as Record<string, unknown>,
        { targetLanguage: target, categories },
      );

      const translated = resume as unknown as CVFormData;
      const withLang: CVFormData = {
        ...translated,
        styling: { ...(translated.styling || {}), resumeLanguage: targetLanguage },
      };
      form.reset(withLang);
      onApplied?.();

      const langLabel = translationLanguageNative(targetLanguage);
      toast({
        title: t("resume.translate.doneTitle") || "Resume translated",
        description: (
          t("resume.translate.done") ||
          "Your resume was translated to {lang}. Save to keep the changes."
        ).replace("{lang}", langLabel),
      });
      return true;
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t("resume.translate.error") || "Could not translate the resume. Try again.";
      toast({
        title: t("common.error") || "Error",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { loading, translate };
}
