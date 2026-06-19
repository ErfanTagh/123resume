import { useCallback, useEffect, useState } from "react";
import {
  jobApplicationAPI,
  type JobApplication,
  type JobApplicationData,
  type JobApplicationStatus,
  type Resume,
} from "@/lib/api";
import { JobApplicationFormDialog } from "@/components/resumes/JobApplicationFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  Briefcase,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type JobTrackerPanelProps = {
  resumes: Resume[];
};

const resumeLabel = (resume: Resume): string => {
  if (resume.name?.trim()) return resume.name.trim();
  const parts: string[] = [];
  if (resume.personalInfo?.firstName?.trim()) parts.push(resume.personalInfo.firstName.trim());
  if (resume.personalInfo?.lastName?.trim()) parts.push(resume.personalInfo.lastName.trim());
  return parts.length > 0 ? parts.join(" ") : "Untitled Resume";
};

const statusBadgeClass = (status?: JobApplicationStatus): string => {
  switch (status) {
    case "offer":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200";
    case "interviewing":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200";
    case "rejected":
    case "withdrawn":
      return "bg-muted text-muted-foreground";
    case "saved":
      return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-100";
    default:
      return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-200";
  }
};

const formatDate = (value?: string): string => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};

export function JobTrackerPanel({ resumes }: JobTrackerPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await jobApplicationAPI.getAll();
      setApplications(data);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobTracker.loadFailed") || "Failed to load applications";
      setError(msg);
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const resumeNameById = (id?: string) => {
    if (!id) return t("pages.resumes.jobTracker.fields.noResume") || "Not specified";
    const r = resumes.find((x) => x.id === id);
    return r ? resumeLabel(r) : t("pages.resumes.jobTracker.unknownResume") || "Unknown resume";
  };

  const statusLabel = (status?: JobApplicationStatus) =>
    t(`pages.resumes.jobTracker.status.${status || "applied"}`) || status || "applied";

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (app: JobApplication) => {
    setEditing(app);
    setDialogOpen(true);
  };

  const handleSave = async (data: JobApplicationData) => {
    setIsSaving(true);
    try {
      if (editing) {
        await jobApplicationAPI.update(editing.id, data);
        toast({
          title: t("pages.resumes.jobTracker.updatedTitle") || "Application updated",
        });
      } else {
        await jobApplicationAPI.create(data);
        toast({
          title: t("pages.resumes.jobTracker.createdTitle") || "Application added",
        });
      }
      setDialogOpen(false);
      await loadApplications();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobTracker.saveFailed") || "Failed to save application";
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await jobApplicationAPI.delete(deleteId);
      toast({ title: t("pages.resumes.jobTracker.deletedTitle") || "Application deleted" });
      setDeleteId(null);
      await loadApplications();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobTracker.deleteFailed") || "Failed to delete";
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm max-w-2xl font-medium text-sky-900/90 dark:text-sky-100/90 leading-relaxed">
          {t("pages.resumes.jobTracker.subtitle") ||
            "Keep track of jobs you applied to, which resume you used, and your cover letter for each."}
        </p>
        <Button onClick={openCreate} className="w-full sm:w-auto shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          {t("pages.resumes.jobTracker.add") || "Add application"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <Card className="text-center py-10 border-dashed">
          <CardContent className="pt-6">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t("pages.resumes.jobTracker.emptyTitle") || "No applications yet"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t("pages.resumes.jobTracker.emptyDesc") ||
                "Add a job to track your applications, resume version, and cover letter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {applications.map((app) => (
            <Card key={app.id} className="border-l-4 border-l-indigo-500 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{app.jobTitle}</CardTitle>
                    <CardDescription className="font-medium text-foreground/80">
                      {app.company}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className={statusBadgeClass(app.status)}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {app.appliedAt && (
                  <p className="text-muted-foreground">
                    {t("pages.resumes.jobTracker.appliedOn") || "Applied"}: {formatDate(app.appliedAt)}
                  </p>
                )}
                {app.contactPerson && (
                  <p>
                    <span className="text-muted-foreground">
                      {t("pages.resumes.jobTracker.fields.contactPerson") || "Contact"}:
                    </span>{" "}
                    {app.contactPerson}
                    {app.contactEmail ? ` · ${app.contactEmail}` : ""}
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">
                    {t("pages.resumes.jobTracker.fields.resume") || "Resume"}:
                  </span>{" "}
                  {resumeNameById(app.resumeId)}
                </p>
                {app.coverLetter?.trim() && (
                  <p className="text-muted-foreground line-clamp-2 italic">
                    {app.coverLetter.trim().slice(0, 160)}
                    {app.coverLetter.length > 160 ? "…" : ""}
                  </p>
                )}
                {app.jobLink && (
                  <a
                    href={app.jobLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {t("pages.resumes.jobTracker.viewJob") || "View job posting"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(app)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    {t("common.edit") || "Edit"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(app.id)}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {t("common.delete") || "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <JobApplicationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        application={editing}
        resumes={resumes}
        onSubmit={handleSave}
        isSaving={isSaving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pages.resumes.jobTracker.deleteTitle") || "Delete application?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.resumes.jobTracker.deleteDesc") ||
                "This will permanently remove this job from your tracker."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("common.delete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
