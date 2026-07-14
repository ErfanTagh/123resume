import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoGrowTextarea } from "@/components/cv-form/AutoGrowTextarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MonthPicker } from "@/components/ui/month-picker";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";
import { CVFormData } from "./types";
import { useLanguage } from "@/contexts/LanguageContext";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { DegreeAutocomplete } from "@/components/DegreeAutocomplete";
import { FieldOfStudyAutocomplete } from "@/components/FieldOfStudyAutocomplete";


interface EducationStepProps {
  form: UseFormReturn<CVFormData>;
}

const EducationItem = ({ form, index }: { form: UseFormReturn<CVFormData>; index: number }) => {
  const { t } = useLanguage();
  const endDate = form.watch(`education.${index}.endDate`);
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(() => {
    // Initialize based on endDate - if empty, assume currently studying
    return !endDate || endDate === "";
  });

  // Sync checkbox state when endDate changes externally
  useEffect(() => {
    if (endDate && endDate !== "") {
      setIsCurrentlyStudying(false);
    }
  }, [endDate]);

  const { fields: courseFields, append: appendCourse, remove: removeCourse } = useFieldArray({
    control: form.control,
    name: `education.${index}.keyCourses`,
  });

  const { fields: descFields, append: appendDesc, remove: removeDesc } = useFieldArray({
    control: form.control,
    name: `education.${index}.descriptions`,
  });

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`education.${index}.degree`}>{t('resume.fields.degree')} *</Label>
        <Controller
          control={form.control}
          name={`education.${index}.degree`}
          render={({ field }) => (
            <DegreeAutocomplete
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={t('resume.placeholders.degree')}
              id={`education.${index}.degree`}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`education.${index}.institution`}>{t('resume.fields.institution')} *</Label>
        <Input
          {...form.register(`education.${index}.institution`)}
          placeholder={t('resume.placeholders.institution')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`education.${index}.link`}>{t('resume.labels.institutionWebsiteLink')}</Label>
        <Input
          type="url"
          inputMode="url"
          autoComplete="url"
          {...form.register(`education.${index}.link`)}
          placeholder={t('resume.placeholders.institutionUrl')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`education.${index}.location`}>{t('resume.fields.location')}</Label>
        <Controller
          control={form.control}
          name={`education.${index}.location`}
          render={({ field }) => (
            <CityAutocomplete
              id={`education.${index}.location`}
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={t('resume.placeholders.location')}
            />
          )}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Switch
            id={`education.${index}.currentlyStudying`}
            checked={isCurrentlyStudying}
            onCheckedChange={(checked) => {
              setIsCurrentlyStudying(checked);
              if (checked) {
                // When checked, clear the end date
                form.setValue(`education.${index}.endDate`, "");
              }
              // When unchecked, keep endDate as is (user can select it)
            }}
          />
          <Label
            htmlFor={`education.${index}.currentlyStudying`}
            className="text-sm font-normal cursor-pointer"
          >
            {t('resume.labels.currentlyStudying')}
          </Label>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <Label>{t('resume.fields.startDate')}</Label>
            <Controller
              control={form.control}
              name={`education.${index}.startDate`}
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
              name={`education.${index}.endDate`}
              render={({ field }) => (
                <MonthPicker
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    // If user selects a date, automatically uncheck "currently studying"
                    if (value && value !== "") {
                      setIsCurrentlyStudying(false);
                    }
                  }}
                  placeholder={t('resume.placeholders.selectEndDate')}
                  disabled={isCurrentlyStudying}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`education.${index}.field`}>{t('resume.fields.field')}</Label>
        <Controller
          control={form.control}
          name={`education.${index}.field`}
          render={({ field }) => (
            <FieldOfStudyAutocomplete
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={t('resume.placeholders.fieldOfStudy')}
              id={`education.${index}.field`}
            />
          )}
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label>{t('resume.labels.keyCourses')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.keyCoursesHint')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {courseFields.map((field, courseIndex) => (
            <div key={field.id} className="flex gap-1">
              <Input
                {...form.register(`education.${index}.keyCourses.${courseIndex}.course`)}
                placeholder={t('resume.placeholders.course')}
                className="text-sm"
              />
              {courseFields.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeCourse(courseIndex)}
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
          onClick={() => appendCourse({ course: "" })}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('resume.labels.addCourse')}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>{t('resume.labels.keyDescriptions')}</Label>
            <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.keyDescriptionsHint')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendDesc({ description: "" })}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('resume.labels.addDescription')}
          </Button>
        </div>
        <div className="space-y-2">
          {descFields.map((field, descIndex) => (
            <div key={field.id} className="flex gap-2">
              <AutoGrowTextarea
                {...form.register(`education.${index}.descriptions.${descIndex}.description`)}
                resizeKey={form.watch(`education.${index}.descriptions.${descIndex}.description`)}
                placeholder={t('resume.placeholders.responsibility')}
                className="flex-1 min-h-9 leading-5 py-1.5"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDesc(descIndex)}
                className="shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const EducationStep = ({ form }: EducationStepProps) => {
  const { t } = useLanguage();
  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: "education",
  });

  const { fields: certificateFields, append: appendCertificate, remove: removeCertificate } = useFieldArray({
    control: form.control,
    name: "certificates",
  });

  // Ensure at least one education entry is always present
  useEffect(() => {
    if (educationFields.length === 0) {
      appendEducation({ 
        degree: "", 
        institution: "", 
        location: "",
        startDate: "", 
        endDate: "", 
        field: "",
        keyCourses: [],
        descriptions: [],
        link: "",
      });
    }
  }, [educationFields.length, appendEducation]);

  const handleRemoveEducation = (index: number) => {
    removeEducation(index);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Education Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.steps.education')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('resume.labels.educationDesc')}</p>
        </div>

        {/* Section Styling Controls */}

        {educationFields.map((field, index) => (
          <div key={field.id} className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative mb-4">
            {educationFields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveEducation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            <EducationItem form={form} index={index} />
          </div>
        ))}

        {educationFields.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => appendEducation({ 
              degree: "", 
              institution: "", 
              location: "",
              startDate: "", 
              endDate: "", 
              field: "",
              keyCourses: [],
              descriptions: [],
              link: "",
            })}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('resume.actions.addAnotherEducation')}
          </Button>
        )}
      </div>

      <Separator />

      {/* Certificates Section */}
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.labels.certificatesTitle')}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">{t('resume.labels.certificatesDesc')}</p>
        </div>

        {certificateFields.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg mb-4">
            <p className="text-muted-foreground mb-4">{t('resume.labels.noCertificates')}</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => appendCertificate({ name: "", organization: "", issueDate: "", expirationDate: "", credentialId: "", url: "" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('resume.labels.addFirstCertificate')}
            </Button>
          </div>
        )}

        {certificateFields.map((field, index) => (
          <div key={field.id} className="p-4 sm:p-6 border rounded-lg bg-card space-y-3 sm:space-y-4 relative mb-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removeCertificate(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <div className="space-y-2">
              <Label htmlFor={`certificates.${index}.name`}>{t('resume.fields.certificateName')}</Label>
              <Input
                {...form.register(`certificates.${index}.name`)}
                placeholder={t('resume.placeholders.certificateName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`certificates.${index}.organization`}>{t('resume.labels.issuingOrganization')}</Label>
              <Input
                {...form.register(`certificates.${index}.organization`)}
                placeholder={t('resume.placeholders.certOrg')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label>{t('resume.fields.issueDate')}</Label>
                <Controller
                  control={form.control}
                  name={`certificates.${index}.issueDate`}
                  render={({ field }) => (
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('resume.placeholders.selectIssueDate')}
                    />
                  )}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('resume.labels.expirationDate')}</Label>
                <Controller
                  control={form.control}
                  name={`certificates.${index}.expirationDate`}
                  render={({ field }) => (
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('resume.placeholders.noExpiration')}
                      clearable
                      clearAriaLabel={t('resume.actions.clearCertificateExpiration')}
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`certificates.${index}.credentialId`}>{t('resume.labels.credentialId')}</Label>
              <Input
                {...form.register(`certificates.${index}.credentialId`)}
                placeholder={t('resume.placeholders.credentialIdExample')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`certificates.${index}.url`}>{t('resume.labels.credentialUrl')}</Label>
              <Input
                type="url"
                {...form.register(`certificates.${index}.url`)}
                placeholder={t('resume.placeholders.credentialUrlExample')}
              />
              {form.formState.errors.certificates?.[index]?.url && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.certificates[index]?.url?.message}
                </p>
              )}
            </div>
          </div>
        ))}

        {certificateFields.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => appendCertificate({ name: "", organization: "", issueDate: "", expirationDate: "", credentialId: "", url: "" })}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('resume.actions.addAnotherCertificate')}
          </Button>
        )}
      </div>
    </div>
  );
};
