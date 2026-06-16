import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { TechnologyAutocomplete } from "@/components/TechnologyAutocomplete";
import { PowerSkillsAutocomplete } from "@/components/PowerSkillsAutocomplete";


interface WorkExperienceStepProps {
  form: UseFormReturn<CVFormData>;
}

const WorkExperienceItem = ({ form, index }: { form: UseFormReturn<CVFormData>; index: number }) => {
  const { t } = useLanguage();
  const { fields: respFields, append: appendResp, remove: removeResp } = useFieldArray({
    control: form.control,
    name: `workExperience.${index}.responsibilities`,
  });

  const { fields: techFields, append: appendTech, remove: removeTech } = useFieldArray({
    control: form.control,
    name: `workExperience.${index}.technologies`,
  });

  const { fields: compFields, append: appendComp, remove: removeComp } = useFieldArray({
    control: form.control,
    name: `workExperience.${index}.competencies`,
  });

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`workExperience.${index}.position`}>{t('resume.fields.position')} *</Label>
        <Input
          {...form.register(`workExperience.${index}.position`)}
          placeholder={t('resume.placeholders.position')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`workExperience.${index}.company`}>{t('resume.fields.company')} *</Label>
        <Input
          {...form.register(`workExperience.${index}.company`)}
          placeholder={t('resume.placeholders.company')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`workExperience.${index}.link`}>{t('resume.labels.companyWebsiteLink')}</Label>
        <Input
          type="url"
          inputMode="url"
          autoComplete="url"
          {...form.register(`workExperience.${index}.link`)}
          placeholder={t('resume.placeholders.companyUrl')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`workExperience.${index}.location`}>{t('resume.fields.location')}</Label>
        <Controller
          control={form.control}
          name={`workExperience.${index}.location`}
          render={({ field }) => (
            <CityAutocomplete
              id={`workExperience.${index}.location`}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={t('resume.placeholders.jobLocation')}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label>{t('resume.fields.startDate')}</Label>
          <Controller
            control={form.control}
            name={`workExperience.${index}.startDate`}
            render={({ field }) => (
              <MonthPicker
                value={field.value}
                onChange={field.onChange}
                placeholder={t('resume.placeholders.selectStartDate')}
              />
            )}
          />
        </div>
        
        <div className="space-y-2">
          <Label>{t('resume.fields.endDate')}</Label>
          <Controller
            control={form.control}
            name={`workExperience.${index}.endDate`}
            render={({ field }) => (
              <MonthPicker
                value={field.value}
                onChange={field.onChange}
                placeholder={t('resume.placeholders.selectEndDate')}
              />
            )}
          />
        </div>
      </div>

      {/* Role summary / free-text description */}
      <div className="space-y-2">
        <Label htmlFor={`workExperience.${index}.description`}>
          {t('resume.fields.experienceDescription') || t('resume.fields.summary')}
        </Label>
        <Textarea
          {...form.register(`workExperience.${index}.description`)}
          placeholder={t('resume.placeholders.experienceDescription') || t('resume.placeholders.summary')}
          rows={3}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('resume.labels.keyResponsibilities')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendResp({ responsibility: "" })}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('resume.labels.add')}
          </Button>
        </div>
        <div className="space-y-2">
          {respFields.map((field, respIndex) => (
            <div key={field.id} className="flex gap-2">
              <Textarea
                {...form.register(`workExperience.${index}.responsibilities.${respIndex}.responsibility`)}
                placeholder={t('resume.placeholders.responsibility')}
                rows={1}
                className="flex-1 resize-none h-9 min-h-0 leading-5 py-1.5"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeResp(respIndex)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>{t('resume.labels.technologies')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.technologiesHintWork')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {techFields.map((field, techIndex) => (
            <div key={field.id} className="flex gap-1">
              <Controller
                control={form.control}
                name={`workExperience.${index}.technologies.${techIndex}.technology`}
                render={({ field: techField }) => (
                  <TechnologyAutocomplete
                    value={techField.value || ""}
                    onChange={techField.onChange}
                    placeholder={t('resume.placeholders.technology')}
                    className="text-sm"
                  />
                )}
              />
              {techFields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeTech(techIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendTech({ technology: "" })}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('resume.labels.addTechnology')}
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>{t('resume.labels.keyCompetencies')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.competenciesHint')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {compFields.map((field, compIndex) => (
            <div key={field.id} className="flex gap-1">
              <Controller
                control={form.control}
                name={`workExperience.${index}.competencies.${compIndex}.competency`}
                render={({ field: compField }) => (
                  <PowerSkillsAutocomplete
                    value={compField.value || ""}
                    onChange={compField.onChange}
                    placeholder={t('resume.placeholders.competency')}
                    className="text-sm"
                  />
                )}
              />
              {compFields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeComp(compIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendComp({ competency: "" })}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('resume.labels.addCompetency')}
        </Button>
      </div>
    </>
  );
};

export const WorkExperienceStep = ({ form }: WorkExperienceStepProps) => {
  const { t } = useLanguage();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "workExperience",
  });

  // Ensure at least one entry is always present - run immediately on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentWorkExp = form.getValues("workExperience");
      if (!currentWorkExp || currentWorkExp.length === 0) {
        append({ 
          position: "", 
          company: "", 
          location: "",
          startDate: "", 
          endDate: "", 
          description: "",
          responsibilities: [],
          technologies: [],
          competencies: [],
          link: "",
        }, { shouldFocus: false });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  
  // Also check when fields change
  useEffect(() => {
    if (fields.length === 0) {
      append({ 
        position: "", 
        company: "", 
        location: "",
        startDate: "", 
        endDate: "", 
        description: "",
        responsibilities: [],
        technologies: [],
        competencies: [],
        link: "",
      }, { shouldFocus: false });
    }
  }, [fields.length, append]);

  const handleRemove = (index: number) => {
    remove(index);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.steps.workExperience')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{t('resume.steps.workExperienceDesc')}</p>
      </div>

      {/* Section Styling Controls */}

      {fields.map((field, index) => (
        <div key={field.id} className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative">
          {fields.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => handleRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          
          <WorkExperienceItem form={form} index={index} />
        </div>
      ))}

      {fields.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ 
            position: "", 
            company: "", 
            location: "",
            startDate: "", 
            endDate: "", 
            description: "",
            responsibilities: [],
            technologies: [],
            competencies: [],
            link: "",
          })}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('resume.actions.addExperience')}
        </Button>
      )}
    </div>
  );
};
