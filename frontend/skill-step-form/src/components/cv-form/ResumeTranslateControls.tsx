import { useState } from "react";
import { Languages, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  TRANSLATION_LANGUAGES,
  type TranslationLanguageCode,
} from "@/lib/translationLanguages";
import {
  ALL_TRANSLATION_CATEGORY_CODES,
  TRANSLATION_CATEGORIES,
  type TranslationCategory,
} from "@/lib/translationCategories";

interface ResumeTranslateControlsProps {
  loading: boolean;
  defaultTarget: TranslationLanguageCode;
  /** Called with the chosen target language and the selected content categories. */
  onTranslate: (target: TranslationLanguageCode, categories: TranslationCategory[]) => void;
}

/**
 * Shared translation controls: pick a target language, choose WHICH parts of the
 * resume to translate (all selected by default), then translate. Used inline in
 * the editor panel and inside the translate dialog on the resume list.
 */
export const ResumeTranslateControls = ({
  loading,
  defaultTarget,
  onTranslate,
}: ResumeTranslateControlsProps) => {
  const { t } = useLanguage();
  const [target, setTarget] = useState<TranslationLanguageCode>(defaultTarget);
  const [selected, setSelected] = useState<Set<TranslationCategory>>(
    () => new Set(ALL_TRANSLATION_CATEGORY_CODES),
  );

  const allSelected = selected.size === ALL_TRANSLATION_CATEGORY_CODES.length;

  const toggle = (code: TranslationCategory, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const toggleAll = (on: boolean) => {
    setSelected(on ? new Set(ALL_TRANSLATION_CATEGORY_CODES) : new Set());
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("resume.translate.targetLabel") || "Translate into"}</Label>
        <Select
          value={target}
          onValueChange={(v) => setTarget(v as TranslationLanguageCode)}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSLATION_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.native}
                {lang.native !== lang.label ? ` · ${lang.label}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("resume.translate.whatToTranslate") || "What to translate"}</Label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(v) => toggleAll(v === true)}
              disabled={loading}
            />
            {t("resume.translate.selectAll") || "All"}
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TRANSLATION_CATEGORIES.map((cat) => (
            <label
              key={cat.code}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
            >
              <Checkbox
                checked={selected.has(cat.code)}
                onCheckedChange={(v) => toggle(cat.code, v === true)}
                disabled={loading}
              />
              {t(cat.labelKey) || cat.code}
            </label>
          ))}
        </div>
      </div>

      <Button
        type="button"
        className="w-full gap-2"
        disabled={loading || selected.size === 0}
        onClick={() => onTranslate(target, Array.from(selected))}
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            {t("resume.translate.translating") || "Translating your resume…"}
          </>
        ) : (
          <>
            <Languages className="h-4 w-4" />
            {t("resume.translate.cta") || "Translate"}
          </>
        )}
      </Button>
    </div>
  );
};
