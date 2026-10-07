import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoGrowTextarea } from "@/components/cv-form/AutoGrowTextarea";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";

interface PublicationsStepProps {
  form: UseFormReturn<CVFormData>;
}

const emptyPublication = () => ({
  title: "",
  publisher: "",
  publicationDate: "",
  url: "",
  description: "",
});

export const PublicationsStep = ({ form }: PublicationsStepProps) => {
  const { t } = useLanguage();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "publications",
  });

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">
          {t("resume.labels.publicationsTitle")}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {t("resume.labels.publicationsDesc")}
        </p>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg mb-4">
          <p className="text-muted-foreground mb-4">{t("resume.labels.noPublications")}</p>
          <Button type="button" variant="outline" onClick={() => append(emptyPublication())}>
            <Plus className="mr-2 h-4 w-4" />
            {t("resume.labels.addFirstPublication")}
          </Button>
        </div>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative mb-4"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => remove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <div className="space-y-2">
            <Label htmlFor={`publications.${index}.title`}>
              {t("resume.fields.publicationTitle")}
            </Label>
            <Input
              {...form.register(`publications.${index}.title`)}
              placeholder={t("resume.placeholders.publicationTitle")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`publications.${index}.publisher`}>
              {t("resume.labels.publicationPublisher")}
            </Label>
            <Input
              {...form.register(`publications.${index}.publisher`)}
              placeholder={t("resume.placeholders.publicationPublisher")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("resume.fields.publicationDate")}</Label>
            <Controller
              control={form.control}
              name={`publications.${index}.publicationDate`}
              render={({ field: dateField }) => (
                <MonthPicker
                  value={dateField.value}
                  onChange={dateField.onChange}
                  placeholder={t("resume.placeholders.selectPublicationDate")}
                  clearable
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`publications.${index}.url`}>
              {t("resume.labels.publicationUrl")}
            </Label>
            <Input
              type="url"
              {...form.register(`publications.${index}.url`)}
              placeholder={t("resume.placeholders.publicationUrl")}
            />
            {form.formState.errors.publications?.[index]?.url && (
              <p className="text-sm text-destructive">
                {form.formState.errors.publications[index]?.url?.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`publications.${index}.description`}>
              {t("resume.fields.publicationDescription")}
            </Label>
            <AutoGrowTextarea
              {...form.register(`publications.${index}.description`)}
              placeholder={t("resume.placeholders.publicationDescription")}
              className="min-h-16"
            />
          </div>
        </div>
      ))}

      {fields.length > 0 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append(emptyPublication())}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("resume.actions.addAnotherPublication")}
        </Button>
      )}
    </div>
  );
};
