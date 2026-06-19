import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";
import { TechnologyAutocomplete } from "@/components/TechnologyAutocomplete";
import { AiImproveTextarea } from "@/components/cv-form/AiImproveTextarea";


interface ProjectsStepProps {
  form: UseFormReturn<CVFormData>;
}

const ProjectItem = ({ form, index }: { form: UseFormReturn<CVFormData>; index: number }) => {
  const { t } = useLanguage();
  const projectName = form.watch(`projects.${index}.name`) || "";
  const { fields: techFields, append: appendTech, remove: removeTech } = useFieldArray({
    control: form.control,
    name: `projects.${index}.technologies`,
  });

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`projects.${index}.name`}>{t('resume.fields.projectName')}</Label>
        <Input
          {...form.register(`projects.${index}.name`)}
          placeholder={t('resume.placeholders.projectName')}
        />
      </div>

      <Controller
        control={form.control}
        name={`projects.${index}.description`}
        render={({ field }) => (
          <AiImproveTextarea
            fieldType="project_description"
            fieldId={`projects.${index}.description`}
            label={t('resume.fields.description')}
            placeholder={t('resume.placeholders.projectDescription')}
            value={field.value || ""}
            onChange={field.onChange}
            projectName={projectName}
          />
        )}
      />

      <div className="space-y-3">
        <div>
          <Label>{t('resume.labels.technologies')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.technologiesHint')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {techFields.map((field, techIndex) => (
            <div key={field.id} className="flex gap-1">
              <Controller
                control={form.control}
                name={`projects.${index}.technologies.${techIndex}.technology`}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label>{t('resume.fields.startDate')}</Label>
          <Controller
            control={form.control}
            name={`projects.${index}.startDate`}
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
            name={`projects.${index}.endDate`}
            render={({ field }) => (
              <MonthPicker
                value={field.value}
                onChange={field.onChange}
                placeholder={t('resume.fields.present')}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`projects.${index}.link`}>{t('resume.labels.projectLink')}</Label>
        <Input
          type="url"
          {...form.register(`projects.${index}.link`)}
          placeholder="https://github.com/username/project"
        />
        {form.formState.errors.projects?.[index]?.link && (
          <p className="text-sm text-destructive">
            {form.formState.errors.projects[index]?.link?.message}
          </p>
        )}
      </div>
    </>
  );
};

export const ProjectsStep = ({ form }: ProjectsStepProps) => {
  const { t } = useLanguage();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "projects",
  });

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.labels.projectsTitle')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{t('resume.labels.projectsDesc')}</p>
      </div>

      {/* Section Styling Controls */}

      {fields.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">{t('resume.labels.noProjects')}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ 
              name: "", 
              description: "", 
              technologies: [], 
              startDate: "", 
              endDate: "", 
              link: "" 
            })}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('resume.labels.addFirstProject')}
          </Button>
        </div>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <ProjectItem form={form} index={index} />
        </div>
      ))}

      {fields.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ 
            name: "", 
            description: "", 
            technologies: [], 
            startDate: "", 
            endDate: "", 
            link: "" 
          })}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('resume.labels.addAnotherProject')}
        </Button>
      )}
    </div>
  );
};
