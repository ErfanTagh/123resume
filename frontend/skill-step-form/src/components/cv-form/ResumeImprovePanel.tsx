import { useState } from "react";
import { UseFormReturn, type FieldPath } from "react-hook-form";
import { Check, RefreshCw, Sparkles, X, Wand2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { aiAPI, type ResumeImproveChange } from "@/lib/api";
import type { CVFormData } from "./types";

type ChangeStatus = "pending" | "accepted" | "rejected";

interface TrackedChange extends ResumeImproveChange {
  status: ChangeStatus;
}

interface ResumeImprovePanelProps {
  form: UseFormReturn<CVFormData>;
}

/**
 * One-click "Improve my resume": asks the AI to rewrite the editable free-text
 * fields (summary, work role summaries, project descriptions), then shows each
 * proposed change as a before→after card the user can Accept or Reject. Accepted
 * changes are written straight back into the builder form.
 */
export const ResumeImprovePanel = ({ form }: ResumeImprovePanelProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<TrackedChange[] | null>(null);

  if (!user) return null;

  const writeField = (change: TrackedChange, value: string) => {
    // RHF accepts dotted/bracket string paths (e.g. "workExperience.0.description").
    form.setValue(change.path as FieldPath<CVFormData>, value as never, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const fetchImprovements = async () => {
    setLoading(true);
    try {
      const result = await aiAPI.improveResume(form.getValues() as Record<string, unknown>, {
        outputLanguage: language === "de" ? "de" : "en",
      });
      const list = Array.isArray(result?.changes) ? result.changes : [];
      if (list.length === 0) {
        setChanges([]);
        toast({
          title: t("resume.improve.noChangesTitle") || "Nothing to improve",
          description:
            t("resume.improve.noChanges") ||
            "Your resume text already looks strong — no rewrites suggested.",
        });
        return;
      }
      setChanges(list.map((c) => ({ ...c, status: "pending" as ChangeStatus })));
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : t("resume.improve.error") || "Could not generate improvements. Try again.";
      toast({
        title: t("common.error") || "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setStatus = (index: number, status: ChangeStatus) => {
    setChanges((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      if (status === "accepted") {
        writeField(target, target.improved);
      } else if (target.status === "accepted") {
        // Leaving an accepted change (Undo / Reject) restores the original text.
        writeField(target, target.original);
      }
      next[index] = { ...target, status };
      return next;
    });
  };

  const acceptAll = () => {
    setChanges((prev) => {
      if (!prev) return prev;
      return prev.map((c) => {
        if (c.status === "pending") {
          writeField(c, c.improved);
          return { ...c, status: "accepted" as ChangeStatus };
        }
        return c;
      });
    });
    toast({
      title: t("resume.improve.appliedAllTitle") || "Improvements applied",
      description:
        t("resume.improve.appliedAll") || "All remaining suggestions were added to your resume.",
    });
  };

  const pendingCount = changes?.filter((c) => c.status === "pending").length ?? 0;
  const acceptedCount = changes?.filter((c) => c.status === "accepted").length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          {t("resume.improve.title") || "Improve my resume with AI"}
        </CardTitle>
        <CardDescription>
          {t("resume.improve.subtitle") ||
            "Let AI rewrite your summary and descriptions. Review each change and accept or reject it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!changes ? (
          <Button type="button" className="w-full gap-2" onClick={fetchImprovements} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t("resume.improve.analyzing") || "Improving your resume…"}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("resume.improve.cta") || "Improve my resume"}
              </>
            )}
          </Button>
        ) : changes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t("resume.improve.noChanges") ||
                "Your resume text already looks strong — no rewrites suggested."}
            </p>
            <Button type="button" variant="outline" className="gap-2" onClick={fetchImprovements} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("resume.improve.runAgain") || "Run again"}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {(t("resume.improve.summaryCount") ||
                  "{accepted} applied · {pending} to review")
                  .replace("{accepted}", String(acceptedCount))
                  .replace("{pending}", String(pendingCount))}
              </p>
              <div className="flex items-center gap-2">
                {pendingCount > 0 ? (
                  <Button type="button" size="sm" className="gap-1.5" onClick={acceptAll}>
                    <Check className="h-3.5 w-3.5" />
                    {t("resume.improve.acceptAll") || "Accept all"}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={fetchImprovements}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  {t("resume.improve.runAgain") || "Run again"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {changes.map((change, index) => (
                <div
                  key={`${change.path}-${index}`}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                    <span className="text-sm font-medium text-foreground">{change.label}</span>
                    {change.status === "accepted" ? (
                      <Badge className="bg-green-500 hover:bg-green-500">
                        {t("resume.improve.accepted") || "Accepted"}
                      </Badge>
                    ) : change.status === "rejected" ? (
                      <Badge variant="secondary">{t("resume.improve.rejected") || "Rejected"}</Badge>
                    ) : null}
                  </div>

                  <div className="grid gap-3 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("resume.improve.before") || "Current"}
                      </p>
                      <p className="rounded-md bg-muted/50 p-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {change.original}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {t("resume.improve.after") || "Suggested"}
                      </p>
                      <p className="rounded-md bg-primary/5 p-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {change.improved}
                      </p>
                    </div>
                  </div>

                  {change.status === "pending" ? (
                    <div className="flex items-center justify-end gap-2 border-t border-border bg-background/60 px-3 py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setStatus(index, "rejected")}
                      >
                        <X className="h-3.5 w-3.5" />
                        {t("resume.improve.reject") || "Reject"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 gap-1.5 bg-primary hover:bg-primary/90"
                        onClick={() => setStatus(index, "accepted")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t("resume.improve.accept") || "Accept"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end border-t border-border bg-background/60 px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatus(index, "pending")}
                      >
                        {t("resume.improve.undo") || "Undo"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
