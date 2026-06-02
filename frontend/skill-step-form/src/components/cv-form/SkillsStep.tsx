import { useEffect } from "react";
import { Controller, UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageAutocomplete } from "@/components/LanguageAutocomplete";
import { SectionStylingControls } from "./SectionStylingControls";
import {
  KNOWN_PROFICIENCY_KEYS,
  ProficiencyKey,
  normalizeProficiencyKey,
  formatProficiency,
} from "@/lib/languageProficiency";

interface SkillsStepProps {
  form: UseFormReturn<CVFormData>;
}

type SkillGroupValue = NonNullable<CVFormData["skillGroups"]>[number];

function flattenSkillsFromGroups(skillGroups: CVFormData["skillGroups"]): NonNullable<CVFormData["skills"]> {
  if (!Array.isArray(skillGroups)) return [];
  const allSkills = skillGroups
    .flatMap((group) => (group?.skills || []))
    .map((row) => row?.skill?.trim() || "")
    .filter(Boolean);
  const uniqueSkills: string[] = [];
  const seen = new Set<string>();
  for (const item of allSkills) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSkills.push(item);
  }
  return uniqueSkills.map((skill) => ({ skill }));
}

const SkillGroupCard = ({
  form,
  index,
  canRemove,
  onRemove,
}: {
  form: UseFormReturn<CVFormData>;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) => {
  const { t } = useLanguage();
  const {
    fields: groupSkillFields,
    append: appendGroupSkill,
    remove: removeGroupSkill,
  } = useFieldArray({
    control: form.control,
    name: `skillGroups.${index}.skills` as const,
  });

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor={`skillGroups.${index}.name`}>
            {t("resume.labels.skillGroupName") || "Group name"}
          </Label>
          <Input
            id={`skillGroups.${index}.name`}
            {...form.register(`skillGroups.${index}.name` as const)}
            placeholder={
              t("resume.placeholders.skillGroupName") ||
              "e.g., Programming Languages"
            }
          />
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="mt-7">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("resume.labels.skills") || "Skills"}</Label>
        {groupSkillFields.map((skillField, skillIndex) => (
          <div key={skillField.id} className="flex items-center gap-2">
            <Input
              {...form.register(`skillGroups.${index}.skills.${skillIndex}.skill` as const)}
              placeholder={t("resume.placeholders.skill")}
            />
            {groupSkillFields.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeGroupSkill(skillIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => appendGroupSkill({ skill: "" })}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("resume.actions.addSkillToGroup") || "Add Skill to Group"}
      </Button>
    </div>
  );
};

export const SkillsStep = ({ form }: SkillsStepProps) => {
  const { t } = useLanguage();
  const { fields: skillGroupFields, append: appendSkillGroup, remove: removeSkillGroup } = useFieldArray({
    control: form.control,
    name: "skillGroups",
  });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: "languages",
  });

  const proficiencyLevels = [...KNOWN_PROFICIENCY_KEYS] as ProficiencyKey[];
  const watchedSkillGroups = useWatch({
    control: form.control,
    name: "skillGroups",
  });

  useEffect(() => {
    const currentGroups = form.getValues("skillGroups");
    if (Array.isArray(currentGroups) && currentGroups.length > 0) return;
    const existingSkills = (form.getValues("skills") || [])
      .map((row) => row?.skill?.trim() || "")
      .filter(Boolean);
    if (existingSkills.length === 0) return;

    const migratedGroup: SkillGroupValue = {
      name: t("resume.labels.defaultSkillGroup") || "General Skills",
      skills: existingSkills.map((skill) => ({ skill })),
    };
    form.setValue("skillGroups", [migratedGroup], { shouldDirty: false });
  }, [form, t]);

  useEffect(() => {
    if (!Array.isArray(watchedSkillGroups) || watchedSkillGroups.length === 0) return;
    form.setValue("skills", flattenSkillsFromGroups(watchedSkillGroups), {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, watchedSkillGroups]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Skills Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.steps.skills')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {t('resume.labels.skillGroupsDesc') || t('resume.labels.skillsDesc')}
          </p>
        </div>

        {/* Section Styling Controls */}
        <SectionStylingControls 
          form={form} 
          sectionName="skills" 
          sectionLabel={t('resume.steps.skills') || 'Skills'} 
        />

        <div className="space-y-4 mb-4">
          {skillGroupFields.map((groupField, index) => (
            <SkillGroupCard
              key={groupField.id}
              form={form}
              index={index}
              canRemove={skillGroupFields.length > 1}
              onRemove={() => removeSkillGroup(index)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => appendSkillGroup({ name: "", skills: [{ skill: "" }] })}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('resume.actions.addSkillGroup') || "Add Skill Group"}
        </Button>
      </div>

      <Separator />

      {/* Languages Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.steps.languages')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('resume.labels.languagesDesc')}</p>
        </div>

        {languageFields.map((field, index) => (
          <div key={field.id} className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative mb-4">
            {languageFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => removeLanguage(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor={`languages.${index}.language`}>{t('resume.fields.language')} *</Label>
                <LanguageAutocomplete
                  value={field.language || ""}
                  onChange={(value) => form.setValue(`languages.${index}.language`, value)}
                  placeholder={t('resume.fields.language')}
                  id={`languages.${index}.language`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`languages.${index}.proficiency`}>{t('resume.fields.proficiency')} *</Label>
                <Controller
                  control={form.control}
                  name={`languages.${index}.proficiency`}
                  render={({ field: proficiencyField }) => {
                    const normalizedValue = normalizeProficiencyKey(proficiencyField.value);
                    return (
                      <Select
                        onValueChange={proficiencyField.onChange}
                        value={normalizedValue || ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('resume.placeholders.selectLevel')} />
                        </SelectTrigger>
                        <SelectContent>
                          {proficiencyLevels.map((key) => (
                            <SelectItem key={key} value={key}>
                              {formatProficiency(t, key)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => appendLanguage({ language: "", proficiency: "" })}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('resume.actions.addLanguage')}
        </Button>
      </div>
    </div>
  );
};
