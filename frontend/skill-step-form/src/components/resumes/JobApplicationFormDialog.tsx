import { useEffect, useState } from "react";
import type { JobApplication, JobApplicationData, JobApplicationStatus, Resume } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";

const STATUS_OPTIONS: JobApplicationStatus[] = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

const EMPTY_FORM: JobApplicationData = {
  jobTitle: "",
  company: "",
  contactPerson: "",
  contactEmail: "",
  jobLink: "",
  resumeId: "",
  coverLetter: "",
  jobDescription: "",
  status: "applied",
  appliedAt: "",
  notes: "",
};

const resumeLabel = (resume: Resume): string => {
  if (resume.name?.trim()) return resume.name.trim();
  const parts: string[] = [];
  if (resume.personalInfo?.firstName?.trim()) parts.push(resume.personalInfo.firstName.trim());
  if (resume.personalInfo?.lastName?.trim()) parts.push(resume.personalInfo.lastName.trim());
  if (resume.personalInfo?.professionalTitle?.trim()) {
    parts.push(resume.personalInfo.professionalTitle.trim());
  }
  return parts.length > 0 ? parts.join(" ") : "Untitled Resume";
};

const toDateInput = (value?: string): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

type JobApplicationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: JobApplication | null;
  resumes: Resume[];
  onSubmit: (data: JobApplicationData) => Promise<void>;
  isSaving: boolean;
};

export function JobApplicationFormDialog({
  open,
  onOpenChange,
  application,
  resumes,
  onSubmit,
  isSaving,
}: JobApplicationFormDialogProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<JobApplicationData>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (application) {
      setForm({
        jobTitle: application.jobTitle || "",
        company: application.company || "",
        contactPerson: application.contactPerson || "",
        contactEmail: application.contactEmail || "",
        jobLink: application.jobLink || "",
        resumeId: application.resumeId || "",
        coverLetter: application.coverLetter || "",
        jobDescription: application.jobDescription || "",
        status: application.status || "applied",
        appliedAt: toDateInput(application.appliedAt),
        notes: application.notes || "",
        matchPercentage: application.matchPercentage,
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        appliedAt: new Date().toISOString().slice(0, 10),
        resumeId: resumes[0]?.id || "",
      });
    }
  }, [open, application, resumes]);

  const setField = <K extends keyof JobApplicationData>(key: K, value: JobApplicationData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: JobApplicationData = {
      ...form,
      appliedAt: form.appliedAt ? new Date(form.appliedAt).toISOString() : undefined,
    };
    await onSubmit(payload);
  };

  const statusLabel = (status: JobApplicationStatus) =>
    t(`pages.resumes.jobTracker.status.${status}`) || status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {application
              ? t("pages.resumes.jobTracker.editTitle") || "Edit application"
              : t("pages.resumes.jobTracker.addTitle") || "Add application"}
          </DialogTitle>
          <DialogDescription>
            {t("pages.resumes.jobTracker.formDesc") ||
              "Track where you applied, which resume you used, and your cover letter."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ja-job-title">{t("pages.resumes.jobTracker.fields.jobTitle") || "Job title *"}</Label>
              <Input
                id="ja-job-title"
                required
                value={form.jobTitle}
                onChange={(e) => setField("jobTitle", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ja-company">{t("pages.resumes.jobTracker.fields.company") || "Company *"}</Label>
              <Input
                id="ja-company"
                required
                value={form.company}
                onChange={(e) => setField("company", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ja-contact">{t("pages.resumes.jobTracker.fields.contactPerson") || "Contact / HR"}</Label>
              <Input
                id="ja-contact"
                value={form.contactPerson || ""}
                onChange={(e) => setField("contactPerson", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ja-email">{t("pages.resumes.jobTracker.fields.contactEmail") || "Contact email"}</Label>
              <Input
                id="ja-email"
                type="email"
                value={form.contactEmail || ""}
                onChange={(e) => setField("contactEmail", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ja-link">{t("pages.resumes.jobTracker.fields.jobLink") || "Job link"}</Label>
            <Input
              id="ja-link"
              type="url"
              placeholder="https://"
              value={form.jobLink || ""}
              onChange={(e) => setField("jobLink", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("pages.resumes.jobTracker.fields.status") || "Status"}</Label>
              <Select
                value={form.status || "applied"}
                onValueChange={(v) => setField("status", v as JobApplicationStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ja-applied">{t("pages.resumes.jobTracker.fields.appliedAt") || "Applied on"}</Label>
              <Input
                id="ja-applied"
                type="date"
                value={form.appliedAt || ""}
                onChange={(e) => setField("appliedAt", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("pages.resumes.jobTracker.fields.resume") || "Resume used"}</Label>
            <Select
              value={form.resumeId || "__none__"}
              onValueChange={(v) => setField("resumeId", v === "__none__" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("pages.resumes.jobTracker.fields.resumePlaceholder") || "Select resume"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("pages.resumes.jobTracker.fields.noResume") || "Not specified"}
                </SelectItem>
                {resumes.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {resumeLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ja-description">
              {t("pages.resumes.jobTracker.fields.jobDescription") || "Job description (optional)"}
            </Label>
            <Textarea
              id="ja-description"
              rows={4}
              className="resize-y"
              value={form.jobDescription || ""}
              onChange={(e) => setField("jobDescription", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ja-cover">
              {t("pages.resumes.jobTracker.fields.coverLetter") || "Cover letter used"}
            </Label>
            <Textarea
              id="ja-cover"
              rows={8}
              className="resize-y min-h-[160px] font-serif leading-relaxed"
              placeholder={
                t("pages.resumes.jobTracker.fields.coverLetterPlaceholder") ||
                "Paste the cover letter you sent for this application..."
              }
              value={form.coverLetter || ""}
              onChange={(e) => setField("coverLetter", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ja-notes">{t("pages.resumes.jobTracker.fields.notes") || "Notes"}</Label>
            <Textarea
              id="ja-notes"
              rows={3}
              className="resize-y"
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t("pages.resumes.jobTracker.saving") || "Saving..."
                : application
                  ? t("pages.resumes.jobTracker.save") || "Save changes"
                  : t("pages.resumes.jobTracker.add") || "Add application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
