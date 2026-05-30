import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CVTemplate } from "./types";
import {
  FileText,
  Sparkles,
  Minimize2,
  Palette,
  Code,
  Star,
  Columns2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TemplateSelectorProps {
  selected: CVTemplate;
  onSelect: (template: CVTemplate) => void;
}

const getTemplates = (t: (key: string) => string) => [
  {
    id: "modern" as CVTemplate,
    name: t('resume.templates.modern'),
    description: t('landing.templateModernDesc'),
    icon: Sparkles,
    preview: "Two-column layout with accent colors",
  },
  {
    id: "classic" as CVTemplate,
    name: t('resume.templates.classic'),
    description: t('landing.templateClassicDesc'),
    icon: FileText,
    preview: "Simple and elegant professional style",
  },
  {
    id: "minimal" as CVTemplate,
    name: t('resume.templates.minimal'),
    description: t('landing.templateMinimalDesc'),
    icon: Minimize2,
    preview: "Ultra-clean with maximum whitespace",
  },
  {
    id: "creative" as CVTemplate,
    name: t('resume.templates.creative'),
    description: t('landing.templateCreativeDesc'),
    icon: Palette,
    preview: "Eye-catching design for creative roles",
  },
  {
    id: "latex" as CVTemplate,
    name: t('resume.templates.latex'),
    description: t('landing.templateLatexDesc'),
    icon: Code,
    preview: "Professional LaTeX-inspired layout",
  },
  {
    id: "starRover" as CVTemplate,
    name: t('resume.templates.starRover'),
    description: t('landing.templateStarRoverDesc'),
    icon: Star,
    preview: "Clean design with distinctive styling",
  },
  {
    id: "slateCopper" as CVTemplate,
    name: t('resume.templates.slateCopper'),
    description: t('landing.templateSlateCopperDesc'),
    icon: Columns2,
    preview: "Two-column editorial layout with slate sidebar",
  },
];

export const TemplateSelector = ({ selected, onSelect }: TemplateSelectorProps) => {
  const { t } = useLanguage();
  const templates = getTemplates(t);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 4;
  const displayedTemplates = showAll ? templates : templates.slice(0, INITIAL_COUNT);
  const hasMore = templates.length > INITIAL_COUNT;
  
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-lg font-semibold">{t('resume.templateSelection.label')}</Label>
        <p className="text-sm text-muted-foreground mt-1">
          {t('resume.templateSelection.description')}
        </p>
      </div>
      
      <div className="flex flex-col gap-4">
        {displayedTemplates.map((template) => {
          const Icon = template.icon;
          const isSelected = selected === template.id;
          
          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected
                  ? "ring-2 ring-primary shadow-md"
                  : "hover:ring-1 hover:ring-muted-foreground/20"
              }`}
              onClick={() => onSelect(template.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                
                <div>
                  <h3 className="font-semibold text-foreground">{template.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {template.description}
                  </p>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {template.preview}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="gap-2"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                {t('common.showLess')}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                {t('common.viewMore')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
