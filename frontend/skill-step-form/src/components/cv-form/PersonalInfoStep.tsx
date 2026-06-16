import { UseFormReturn, useFieldArray, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, X, User, Camera, ChevronDown, ChevronUp, Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CVFormData } from "./types";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { ResumeUpload } from "./ResumeUpload";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { CityAutocomplete } from "@/components/ui/city-autocomplete";
import { ProfessionalTitleAutocomplete } from "@/components/ProfessionalTitleAutocomplete";

import { RESUME_ACCENT_BLUE, RESUME_BODY_GRAY, RESUME_TITLE_GRAY } from "@/lib/resumeTemplatePalette";

interface PersonalInfoStepProps {
  form: UseFormReturn<CVFormData>;
}

export const PersonalInfoStep = ({ form }: PersonalInfoStepProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { fields: interestFields, append: appendInterest, remove: removeInterest } = useFieldArray({
    control: form.control,
    name: "personalInfo.interests",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<Partial<CVFormData> | null>(null);
  const [showMoreLinks, setShowMoreLinks] = useState(false);

  // Ensure styling is initialized when component mounts or template changes
  // Use useLayoutEffect to ensure styling is set before browser paints
  const currentTemplate = form.watch("template");
  const currentStyling = form.watch("styling");
  
  useLayoutEffect(() => {
    const defaultStyling = {
      titleColor: RESUME_TITLE_GRAY,
      textColor: RESUME_BODY_GRAY,
      headingColor: RESUME_ACCENT_BLUE,
      linkColor: RESUME_ACCENT_BLUE,
      fontSize: "medium" as const,
      fontFamily: "Inter",
      titleBold: true,
      headingBold: true,
    };

    const titleColor = currentStyling?.titleColor?.trim();
    const textColor = currentStyling?.textColor?.trim();
    const headingColor = currentStyling?.headingColor?.trim();
    const fontSize = currentStyling?.fontSize;

    // Empty strings from API must not override defaults (that caused infinite setValue loops).
    if (titleColor && textColor && headingColor && fontSize) {
      return;
    }

    form.setValue(
      "styling",
      {
        ...defaultStyling,
        ...currentStyling,
        titleColor: titleColor || defaultStyling.titleColor,
        textColor: textColor || defaultStyling.textColor,
        headingColor: headingColor || defaultStyling.headingColor,
        fontSize: fontSize || defaultStyling.fontSize,
        linkColor: currentStyling?.linkColor?.trim() || defaultStyling.linkColor,
        fontFamily: currentStyling?.fontFamily?.trim() || defaultStyling.fontFamily,
        sectionStyling: currentStyling?.sectionStyling,
      },
      { shouldValidate: false, shouldDirty: false },
    );
  }, [
    currentTemplate,
    currentStyling?.titleColor,
    currentStyling?.textColor,
    currentStyling?.headingColor,
    currentStyling?.fontSize,
    form,
  ]);

  // Initialize image preview from form value (avoiding setState during render)
  useEffect(() => {
    const profileImage = form.getValues("personalInfo.profileImage");
    if (profileImage) {
      setImagePreview(profileImage);
    }
  }, []); // Only run once on mount

  // Update form when parsed data is available
  useEffect(() => {
    if (!parsedData) return;

    // Merge parsed data with current form values
    const currentValues = form.getValues();

    const mergedData = {
      ...currentValues,
      ...parsedData,
      // Ensure arrays are properly merged
      personalInfo: {
        ...currentValues.personalInfo,
        ...parsedData.personalInfo,
      },
      workExperience: parsedData.workExperience || currentValues.workExperience,
      education: parsedData.education || currentValues.education,
      skills: parsedData.skills || currentValues.skills,
    };

    form.reset(mergedData);

    // Clear parsed data after updating form
    setParsedData(null);
  }, [parsedData, form]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 1MB before compression)
      if (file.size > 1 * 1024 * 1024) {
        alert(t('resume.alerts.imageSizeError'));
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert(t('resume.alerts.imageTypeError'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 400x400 (plenty for profile photos)
          const maxSize = 400;
          let width = img.width;
          let height = img.height;

          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = width * ratio;
            height = height * ratio;
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to original if canvas fails
            const base64String = e.target?.result as string;
            setImagePreview(base64String);
            form.setValue("personalInfo.profileImage", base64String);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression (JPEG at 0.85 quality)
          const base64String = canvas.toDataURL('image/jpeg', 0.85);
          setImagePreview(base64String);
          form.setValue("personalInfo.profileImage", base64String);
        };

        img.onerror = () => {
          // Fallback to original if resize fails
          const base64String = e.target?.result as string;
          setImagePreview(base64String);
          form.setValue("personalInfo.profileImage", base64String);
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        alert('Failed to read image file');
      };

      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue("personalInfo.profileImage", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDataParsed = useCallback((data: Partial<CVFormData>) => {
    // Store parsed data in state, useEffect will handle the form update
    setParsedData(data);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">{t('resume.steps.personalInfo')}</h2>
        <p className="text-muted-foreground text-sm sm:text-base">{t('resume.steps.personalInfoDesc')}</p>
      </div>

      {/* Section Styling Controls */}

      {/* Resume Upload Option */}
      <ResumeUpload onDataParsed={handleDataParsed} />
      <Separator />

      {/* Language picker pill — sets the resume output language */}
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Globe className="h-4 w-4 shrink-0" />
              {language === 'de' ? 'Deutsch' : language === 'es' ? 'Español' : language === 'fa' ? 'فارسی' : 'English'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px]">
            {[
              { code: 'en', label: 'English' },
              { code: 'de', label: 'Deutsch' },
            ].map(({ code, label }) => (
              <DropdownMenuItem
                key={code}
                onClick={() => setLanguage(code as any)}
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <span>{label}</span>
                {language === code && <Check className="h-4 w-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t('resume.fields.firstName')} *</Label>
          <Input
            id="firstName"
            {...form.register("personalInfo.firstName")}
            placeholder={t('resume.placeholders.firstName')}
          />
          {form.formState.errors.personalInfo?.firstName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.personalInfo.firstName.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">{t('resume.fields.lastName')} *</Label>
          <Input
            id="lastName"
            {...form.register("personalInfo.lastName")}
            placeholder={t('resume.placeholders.lastName')}
          />
          {form.formState.errors.personalInfo?.lastName && (
            <p className="text-sm text-destructive">
              {form.formState.errors.personalInfo.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="professionalTitle">{t('resume.fields.professionalTitle')}</Label>
        <Controller
          control={form.control}
          name="personalInfo.professionalTitle"
          render={({ field }) => (
            <ProfessionalTitleAutocomplete
              id="professionalTitle"
              value={field.value || ""}
              onChange={field.onChange}
              placeholder={t('resume.placeholders.professionalTitle')}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profileImage">{t('resume.labels.profileImage')}</Label>
        <div className="flex flex-col gap-4">
          <Input
            ref={fileInputRef}
            id="profileImage"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="relative inline-block">
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-border cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
                <img
                  src={imagePreview}
                  alt={`Profile photo preview for ${form.getValues("personalInfo.firstName") || ""} ${form.getValues("personalInfo.lastName") || ""}${form.getValues("personalInfo.professionalTitle") ? ` - ${form.getValues("personalInfo.professionalTitle")}` : ""}`}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: '50% 40%' }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="relative w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="text-xs text-muted-foreground group-hover:text-primary transition-colors text-center px-2">
                  {t('resume.placeholders.uploadImage')}
                </div>
                <Camera className="absolute bottom-2 right-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('resume.placeholders.imageHint')}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t('resume.fields.email')} *</Label>
        <Input
          id="email"
          type="email"
          {...form.register("personalInfo.email")}
          placeholder={t('resume.placeholders.email')}
        />
        {form.formState.errors.personalInfo?.email && (
          <p className="text-sm text-destructive">
            {form.formState.errors.personalInfo.email.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('resume.fields.phone')}</Label>
          <Input
            id="phone"
            {...form.register("personalInfo.phone")}
            placeholder={t('resume.placeholders.phone')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t('resume.fields.location')}</Label>
          <Controller
            control={form.control}
            name="personalInfo.location"
            render={({ field }) => (
              <CityAutocomplete
                id="location"
                value={field.value || ""}
                onChange={field.onChange}
                placeholder={t('resume.placeholders.location')}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="linkedin">{t('resume.fields.linkedin')}</Label>
        <Input
          id="linkedin"
          type="url"
          {...form.register("personalInfo.linkedin")}
          placeholder={t('resume.placeholders.linkedin')}
        />
        {form.formState.errors.personalInfo?.linkedin && (
          <p className="text-sm text-destructive">
            {form.formState.errors.personalInfo.linkedin.message}
          </p>
        )}
      </div>

      {/* More personal links - collapsible section */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowMoreLinks(!showMoreLinks)}
          className="w-full justify-between"
        >
          <span>{t('resume.labels.morePersonalLinks') || 'More Personal Links'}</span>
          {showMoreLinks ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {showMoreLinks && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="github">{t('resume.fields.github')}</Label>
              <Input
                id="github"
                type="url"
                {...form.register("personalInfo.github")}
                placeholder={t('resume.placeholders.github')}
              />
              {form.formState.errors.personalInfo?.github && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.personalInfo.github.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">{t('resume.labels.personalWebsite')}</Label>
              <Input
                id="website"
                type="url"
                {...form.register("personalInfo.website")}
                placeholder={t('resume.placeholders.website')}
              />
              {form.formState.errors.personalInfo?.website && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.personalInfo.website.message}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">{t('resume.sections.professionalSummary')}</Label>
        <Textarea
          id="summary"
          {...form.register("personalInfo.summary")}
          placeholder={t('resume.placeholders.summary')}
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label>{t('resume.labels.interestsHobbies')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('resume.labels.interestsHint')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {interestFields.map((field, index) => (
            <div key={field.id} className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input
                  {...form.register(`personalInfo.interests.${index}.interest`)}
                  placeholder={t('resume.placeholders.interests')}
                />
              </div>
              {interestFields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInterest(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => appendInterest({ interest: "" })}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('resume.actions.addInterest')}
        </Button>
      </div>
    </div>
  );
};
