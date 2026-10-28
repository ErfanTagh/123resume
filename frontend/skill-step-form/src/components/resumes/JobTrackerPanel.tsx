import { useCallback, useEffect, useMemo, useState } from "react";
import {
  jobApplicationAPI,
  type JobApplication,
  type JobApplicationData,
  type JobApplicationStatus,
  type Resume,
} from "@/lib/api";
import { JobApplicationFormDialog } from "@/components/resumes/JobApplicationFormDialog";
import { ApplyStreakCard } from "@/components/resumes/ApplyStreakCard";
import { computeApplyStreak } from "@/lib/applyStreak";
import { useRefreshJobApplications } from "@/hooks/useJobApplications";
import { RowAction } from "@/components/resumes/RowAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  CalendarDays,
  ExternalLink,
  FileText,
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

/** Per status: the row's edge stripe, the status pill and the phone-width text. */
const STATUS_STYLE: Record<JobApplicationStatus, { stripe: string; pill: string; text: string }> = {
  saved: {
    stripe: "bg-amber-400",
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
  },
  applied: {
    stripe: "bg-violet-500",
    pill: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
    text: "text-violet-700 dark:text-violet-300",
  },
  interviewing: {
    stripe: "bg-sky-500",
    pill: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
    text: "text-sky-700 dark:text-sky-300",
  },
  offer: {
    stripe: "bg-emerald-500",
    pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  rejected: { stripe: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
  withdrawn: { stripe: "bg-muted-foreground/40", pill: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
};

const FILTERS = ["all", "active", "saved", "closed"] as const;
type Filter = (typeof FILTERS)[number];

const matchesFilter = (app: JobApplication, filter: Filter): boolean => {
  const status = app.status || "applied";
  if (filter === "active") return status === "applied" || status === "interviewing" || status === "offer";
  if (filter === "saved") return status === "saved";
  if (filter === "closed") return status === "rejected" || status === "withdrawn";
  return true;
};

const activityTime = (app: JobApplication): number => {
  const time = new Date(app.appliedAt || app.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

export function JobTrackerPanel({ resumes }: JobTrackerPanelProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>("all");

  const formatDate = (value?: string): string => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(language === "de" ? "de-DE" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const refreshShared = useRefreshJobApplications();

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

  // Newest first by the date applied (or added, for saved jobs)
  const visible = useMemo(
    () => applications.filter((a) => matchesFilter(a, filter)).sort((a, b) => activityTime(b) - activityTime(a)),
    [applications, filter],
  );

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
        const created = await jobApplicationAPI.create(data);
        const before = computeApplyStreak(applications, 1);
        const after = computeApplyStreak([...applications, created], 1);
        if (after.appliedToday && !before.appliedToday) {
          // Today's application lit (or extended) the streak: celebrate it
          toast({
            title:
              after.current === 1
                ? t("pages.resumes.jobTracker.streak.celebrateFirst")
                : t("pages.resumes.jobTracker.streak.celebrate").replace("{n}", String(after.current)),
            description: t("pages.resumes.jobTracker.streak.celebrateDesc"),
          });
        } else {
          toast({
            title: t("pages.resumes.jobTracker.createdTitle") || "Application added",
          });
        }
      }
      setDialogOpen(false);
      await loadApplications();
      refreshShared();
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
      refreshShared();
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

      {!isLoading && !error && <ApplyStreakCard applications={applications} />}

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
        <div className="space-y-3">
          {/* Filters with counts, so a long list stays easy to scan */}
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {FILTERS.map((f) => {
              const count = applications.filter((a) => matchesFilter(a, f)).length;
              const on = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setFilter(f)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                    on
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  {t(`pages.resumes.jobTracker.filters.${f}`)}
                  <span className={`tabular-nums text-xs ${on ? "text-background/70" : "text-muted-foreground/80"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              {t("pages.resumes.jobTracker.filters.empty")}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {visible.map((app) => {
                const status = app.status || "applied";
                const date = formatDate(app.appliedAt || app.createdAt);
                return (
                  <div
                    key={app.id}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card py-3 pl-4 pr-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:pr-4"
                  >
                    {/* Status stripe: color-codes the list at a glance */}
                    <span className={`absolute inset-y-0 left-0 w-1 ${STATUS_STYLE[status].stripe}`} aria-hidden />

                    {/* Identity */}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openEdit(app)}
                        className="block max-w-full truncate text-left text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:text-base"
                      >
                        {app.jobTitle}
                      </button>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                        {/* Phones: the status leads the info line (no status column there) */}
                        <span className={`font-semibold sm:hidden ${STATUS_STYLE[status].text}`}>{statusLabel(status)}</span>
                        <span aria-hidden="true" className="sm:hidden">·</span>
                        <span className="font-medium text-foreground/80">{app.company}</span>
                        {date && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 flex-none" />
                              {date}
                            </span>
                          </>
                        )}
                        <span aria-hidden="true" className="hidden md:inline">·</span>
                        <span className="hidden min-w-0 max-w-[16rem] items-center gap-1 md:inline-flex">
                          <FileText className="h-3 w-3 flex-none" />
                          <span className="truncate">{resumeNameById(app.resumeId)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Status column, aligned across rows */}
                    <div className="hidden w-32 flex-none justify-end sm:flex">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status].pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[status].stripe}`} aria-hidden />
                        {statusLabel(status)}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-none items-center gap-1 sm:gap-1.5">
                      {app.jobLink ? (
                        <RowAction tone="sky" label={t("pages.resumes.jobTracker.viewJob") || "View job posting"} href={app.jobLink}>
                          <ExternalLink className="h-4 w-4" />
                        </RowAction>
                      ) : (
                        <span className="hidden h-9 w-9 sm:block" aria-hidden />
                      )}
                      <RowAction tone="primary" label={t("common.edit") || "Edit"} onClick={() => openEdit(app)}>
                        <Pencil className="h-4 w-4" />
                      </RowAction>
                      <RowAction tone="danger" label={t("common.delete") || "Delete"} onClick={() => setDeleteId(app.id)}>
                        <Trash2 className="h-4 w-4" />
                      </RowAction>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
