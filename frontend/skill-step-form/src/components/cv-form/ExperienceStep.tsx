import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MonthPicker } from "@/components/ui/month-picker";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";
import { TechnologyAutocomplete } from "@/components/TechnologyAutocomplete";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { PowerSkillsAutocomplete } from "@/components/PowerSkillsAutocomplete";
import { WorkBulletAiSuggest } from "@/components/cv-form/WorkBulletAiSuggest";
import { AiImproveTextarea } from "@/components/cv-form/AiImproveTextarea";
import { WorkDescriptionAiImprove } from "@/components/cv-form/WorkDescriptionAiImprove";


interface ExperienceStepProps {
  form: UseFormReturn<CVFormData>;
}

const WorkExperienceItem = ({ form, index }: { form: UseFormReturn<CVFormData>; index: number }) => {
  const { t } = useLanguage();
  const endDate = form.watch(`workExperience.${index}.endDate`);
  const [isCurrentlyWorking, setIsCurrentlyWorking] = useState(() => {
    // Initialize based on endDate - if empty, assume currently working
    return !endDate || endDate === "";
  });

  // Sync checkbox state when endDate changes externally
  useEffect(() => {
    if (endDate && endDate !== "") {
      setIsCurrentlyWorking(false);
    }
  }, [endDate]);

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

  const position = form.watch(`workExperience.${index}.position`) || "";
  const company = form.watch(`workExperience.${index}.company`) || "";
  const roleDescription = form.watch(`workExperience.${index}.description`) || "";
  const responsibilities = form.watch(`workExperience.${index}.responsibilities`) || [];
  const technologies = form.watch(`workExperience.${index}.technologies`) || [];
  const existingBullets = responsibilities
    .map((r) => (typeof r?.responsibility === "string" ? r.responsibility : ""))
    .filter((b) => b.trim());

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

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Switch
            id={`workExperience.${index}.currentlyWorking`}
            checked={isCurrentlyWorking}
            onCheckedChange={(checked) => {
              setIsCurrentlyWorking(checked);
              if (checked) {
                // When checked, clear the end date
                form.setValue(`workExperience.${index}.endDate`, "");
              }
              // When unchecked, keep endDate as is (user can select it)
            }}
          />
          <Label
            htmlFor={`workExperience.${index}.currentlyWorking`}
            className="text-sm font-normal cursor-pointer"
          >
            {t('resume.labels.currentlyWorking')}
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(value) => {
                    field.onChange(value);
                    // If user selects a date, automatically uncheck "currently working"
                    if (value && value !== "") {
                      setIsCurrentlyWorking(false);
                    }
                  }}
                  placeholder={t('resume.placeholders.selectEndDate')}
                  disabled={isCurrentlyWorking}
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Role summary / free-text description */}
      <Controller
        control={form.control}
        name={`workExperience.${index}.description`}
        render={({ field }) => (
          <WorkDescriptionAiImprove
            fieldId={`workExperience.${index}.description`}
            label={t('resume.fields.experienceDescription') || t('resume.fields.summary')}
            placeholder={t('resume.placeholders.experienceDescription') || t('resume.placeholders.summary')}
            value={field.value || ""}
            onChange={field.onChange}
            position={position}
            company={company}
          />
        )}
      />

      <WorkBulletAiSuggest
        position={position}
        company={company}
        description={roleDescription}
        existingBullets={existingBullets}
        technologies={technologies.map((t) => t?.technology || "").filter(Boolean)}
        onAdd={(bullet) => appendResp({ responsibility: bullet })}
        sectionLabel={t('resume.labels.keyResponsibilities')}
        addButton={
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
        }
      >
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
      </WorkBulletAiSuggest>

      <div className="space-y-3">
        <div>
          <Label>{t('resume.labels.technologies')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.technologiesHintWork')}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

const ProjectItem = ({ form, index }: { form: UseFormReturn<CVFormData>; index: number }) => {
  const { t } = useLanguage();
  const endDate = form.watch(`projects.${index}.endDate`);
  const [isOngoing, setIsOngoing] = useState(() => {
    // Initialize based on endDate - if empty, assume ongoing
    return !endDate || endDate === "";
  });

  // Sync checkbox state when endDate changes externally
  useEffect(() => {
    if (endDate && endDate !== "") {
      setIsOngoing(false);
    }
  }, [endDate]);

  const { fields: techFields, append: appendTech, remove: removeTech } = useFieldArray({
    control: form.control,
    name: `projects.${index}.technologies`,
  });

  const projectName = form.watch(`projects.${index}.name`) || "";

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
            label={t('resume.fields.projectDescription')}
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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Switch
            id={`projects.${index}.ongoing`}
            checked={isOngoing}
            onCheckedChange={(checked) => {
              setIsOngoing(checked);
              if (checked) {
                // When checked, clear the end date
                form.setValue(`projects.${index}.endDate`, "");
              }
              // When unchecked, keep endDate as is (user can select it)
            }}
          />
          <Label
            htmlFor={`projects.${index}.ongoing`}
            className="text-sm font-normal cursor-pointer"
          >
            {t('resume.labels.ongoing')}
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onChange={(value) => {
                    field.onChange(value);
                    // If user selects a date, automatically uncheck "ongoing"
                    if (value && value !== "") {
                      setIsOngoing(false);
                    }
                  }}
                  placeholder={t('resume.placeholders.selectEndDate')}
                  disabled={isOngoing}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`projects.${index}.link`}>{t('resume.labels.projectLink')}</Label>
        <Input
          type="url"
          {...form.register(`projects.${index}.link`)}
          placeholder={t('resume.placeholders.projectLink')}
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

export const ProjectsStep = ({ form }: ExperienceStepProps) => {
  const { t } = useLanguage();
  const { fields: projectFields, append: appendProject, remove: removeProject } = useFieldArray({
    control: form.control,
    name: "projects",
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Projects Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">{t('resume.labels.projectsTitle')}</h2>
          <p className="text-muted-foreground">{t('resume.labels.projectsDesc')}</p>
        </div>

        {/* Section Styling Controls */}

        {projectFields.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg mb-4">
            <p className="text-muted-foreground mb-4">{t('resume.labels.noProjects')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => appendProject({
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

        {projectFields.map((field, index) => (
          <div key={field.id} className="p-6 border rounded-lg bg-card space-y-4 relative mb-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeProject(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <ProjectItem form={form} index={index} />
          </div>
        ))}

        {projectFields.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => appendProject({
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
    </div>
  );
};

export const ExperienceStep = ({ form }: ExperienceStepProps) => {
  const { t } = useLanguage();
  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({
    control: form.control,
    name: "workExperience",
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Work Experience Section */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">{t('resume.steps.workExperience')}</h2>
          <p className="text-muted-foreground">{t('resume.steps.workExperienceDesc')}</p>
        </div>

        {/* Section Styling Controls */}

        {workFields.map((field, index) => (
          <div key={field.id} className="p-6 border rounded-lg bg-card space-y-4 relative mb-4">
            {workFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => removeWork(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            <WorkExperienceItem form={form} index={index} />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => appendWork({
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
      </div>

      <Separator />

      {/* Projects Section (reused wrapper) */}
      <ProjectsStep form={form} />
    </div>
  );
};

