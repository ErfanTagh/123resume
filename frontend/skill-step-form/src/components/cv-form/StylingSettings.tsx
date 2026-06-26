import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Palette, Type, Bold, Text, RotateCcw, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { CVFormData } from "./types";
import { Separator } from "@/components/ui/separator";
import { RESUME_ACCENT_DEFAULT, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";
import { RESUME_COLOR_THEMES, getActiveResumeThemeId } from "@/lib/resumeColorThemes";

interface StylingSettingsProps {
  data: CVFormData;
  currentStep?: number;
  onStylingChange: (styling: CVFormData['styling']) => void;
}

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Raleway", label: "Raleway" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Playfair Display", label: "Playfair Display" },
];

const SIZE_MAP = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export const StylingSettings = ({ data, currentStep, onStylingChange }: StylingSettingsProps) => {
  const { t } = useLanguage();

  // Safety check: ensure data exists
  if (!data) {
    return null;
  }

  const styling = data.styling || {};

  const updateStyling = (updates: Partial<CVFormData['styling']>) => {
    if (onStylingChange) {
      onStylingChange({ ...styling, ...updates });
    }
  };

  const resetAllStyling = () => {
    if (onStylingChange) {
      onStylingChange({});
    }
  };

  const hasGlobalStyling = styling.fontFamily || styling.fontSize || styling.titleColor || styling.titleBold || styling.headingColor || styling.headingBold || styling.textColor || styling.linkColor;

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1 text-foreground flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {t('resume.settings.stylingTitle') || 'Styling & Typography'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('resume.settings.stylingDesc') || 'Customize fonts, colors, and text styles'}
        </p>
        {/* Reset All Button */}
        <div className="mb-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={resetAllStyling}
            disabled={!hasGlobalStyling}
            className="gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <RotateCcw className="h-4 w-4" />
            {t('resume.settings.resetAll') || 'Reset All Settings'}
          </Button>
        </div>
      </div>

      {/* One-click Color Theme */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('resume.settings.colorTheme') || 'Color theme'}
        </Label>
        <p className="text-xs text-muted-foreground -mt-1">
          {t('resume.settings.colorThemeDesc') || 'Pick an accent for headings, links, and template top bars.'}
        </p>
        <div className="flex flex-wrap gap-2.5 pt-1" role="radiogroup" aria-label={t('resume.settings.colorTheme') || 'Color theme'}>
          {RESUME_COLOR_THEMES.map((theme) => {
            const active = getActiveResumeThemeId(styling.headingColor) === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => updateStyling({ headingColor: theme.accent, linkColor: theme.accent })}
                title={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                aria-label={t(`resume.settings.colorThemes.${theme.labelKey}`) || theme.label}
                className={`relative h-9 w-9 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'ring-2 ring-offset-2 ring-primary scale-105'
                    : 'ring-1 ring-border hover:ring-primary/40 hover:scale-105'
                }`}
                style={{ background: theme.accent }}
              >
                {active && (
                  <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <Label htmlFor="fontFamily" className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          {t('resume.settings.fontFamily') || 'Font Family'}
        </Label>
        <Select
          value={styling.fontFamily || "Inter"}
          onValueChange={(value) => updateStyling({ fontFamily: value })}
        >
          <SelectTrigger id="fontFamily">
            <SelectValue placeholder={t('resume.settings.selectFont') || 'Select font'} />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label htmlFor="fontSize" className="flex items-center gap-2">
          <Text className="h-4 w-4" />
          {t('resume.settings.fontSize') || 'Font Size'}
        </Label>
        <Select
          value={styling.fontSize || "medium"}
          onValueChange={(value) => {
            // Ensure only valid font size values are set
            if (value === "small" || value === "medium" || value === "large") {
              updateStyling({ fontSize: value });
            }
          }}
        >
          <SelectTrigger id="fontSize">
            <SelectValue placeholder={t('resume.settings.selectFontSize') || 'Select font size'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">
              {t('resume.settings.fontSizeSmall') || 'Small'} ({t('resume.settings.fontSizeSmallDesc') || 'More content per page'})
            </SelectItem>
            <SelectItem value="medium">
              {t('resume.settings.fontSizeMedium') || 'Medium'} ({t('resume.settings.fontSizeMediumDesc') || 'Standard'})
            </SelectItem>
            <SelectItem value="large">
              {t('resume.settings.fontSizeLarge') || 'Large'} ({t('resume.settings.fontSizeLargeDesc') || 'Easier to read'})
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t('resume.settings.fontSizeHint') || 'Smaller font sizes allow more content to fit on fewer pages'}
        </p>
      </div>

      {/* Title Color */}
      <div className="space-y-2">
        <Label htmlFor="titleColor" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('resume.settings.titleColor') || 'Title Color'}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="titleColor"
            type="color"
            value={styling.titleColor || RESUME_TITLE_GRAY}
            onChange={(e) => updateStyling({ titleColor: e.target.value })}
            className="w-16 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={styling.titleColor || RESUME_TITLE_GRAY}
            onChange={(e) => updateStyling({ titleColor: e.target.value })}
            placeholder={RESUME_TITLE_GRAY}
            className="flex-1"
          />
        </div>
      </div>

      {/* Title Bold */}
      <div className="flex items-center justify-between">
        <Label htmlFor="titleBold" className="flex items-center gap-2 cursor-pointer">
          <Bold className="h-4 w-4" />
          {t('resume.settings.titleBold') || 'Bold Title'}
        </Label>
        <Switch
          id="titleBold"
          checked={styling.titleBold ?? false}
          onCheckedChange={(checked) => updateStyling({ titleBold: checked })}
        />
      </div>

      {/* Heading Color */}
      <div className="space-y-2">
        <Label htmlFor="headingColor" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('resume.settings.headingColor') || 'Section Heading Color'}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="headingColor"
            type="color"
            value={styling.headingColor || RESUME_ACCENT_DEFAULT}
            onChange={(e) => updateStyling({ headingColor: e.target.value })}
            className="w-16 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={styling.headingColor || RESUME_ACCENT_DEFAULT}
            onChange={(e) => updateStyling({ headingColor: e.target.value })}
            placeholder={RESUME_ACCENT_DEFAULT}
            className="flex-1"
          />
        </div>
      </div>

      {/* Heading Bold */}
      <div className="flex items-center justify-between">
        <Label htmlFor="headingBold" className="flex items-center gap-2 cursor-pointer">
          <Bold className="h-4 w-4" />
          {t('resume.settings.headingBold') || 'Bold Headings'}
        </Label>
        <Switch
          id="headingBold"
          checked={styling.headingBold ?? false}
          onCheckedChange={(checked) => updateStyling({ headingBold: checked })}
        />
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <Label htmlFor="textColor" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('resume.settings.textColor') || 'Text Color'}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="textColor"
            type="color"
            value={styling.textColor || RESUME_BODY_GRAY}
            onChange={(e) => updateStyling({ textColor: e.target.value })}
            className="w-16 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={styling.textColor || RESUME_BODY_GRAY}
            onChange={(e) => updateStyling({ textColor: e.target.value })}
            placeholder={RESUME_BODY_GRAY}
            className="flex-1"
          />
        </div>
      </div>

      {/* Link Color */}
      <div className="space-y-2">
        <Label htmlFor="linkColor" className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('resume.settings.linkColor') || 'Link Color'}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id="linkColor"
            type="color"
            value={styling.linkColor || RESUME_ACCENT_DEFAULT}
            onChange={(e) => updateStyling({ linkColor: e.target.value })}
            className="w-16 h-10 cursor-pointer"
          />
          <Input
            type="text"
            value={styling.linkColor || RESUME_ACCENT_DEFAULT}
            onChange={(e) => updateStyling({ linkColor: e.target.value })}
            placeholder={RESUME_ACCENT_DEFAULT}
            className="flex-1"
          />
        </div>
      </div>

    </Card>
  );
};

