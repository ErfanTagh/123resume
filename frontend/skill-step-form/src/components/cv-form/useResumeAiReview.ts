import { useCallback, useEffect, useRef, useState } from "react";
import { UseFormReturn, type FieldPath } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { resumeProseLanguage } from "@/lib/resumeContentLanguage";
import { useToast } from "@/hooks/use-toast";
import { aiAPI, type ResumeImproveChange } from "@/lib/api";
import type { CVFormData } from "./types";

export type ReviewChangeStatus = "pending" | "accepted" | "rejected";

export interface TrackedReviewChange extends ResumeImproveChange {
  status: ReviewChangeStatus;
}

// Item key inside each array an addition can go into.
const ITEM_KEY: Record<string, string> = {
  responsibilities: "responsibility",
  highlights: "highlight",
  skills: "skill",
  descriptions: "description",
};

// "workExperience.0.responsibilities.1.responsibility" → parent array + index + item key.
const ARRAY_ITEM_RE = /^(.+)\.(\d+)\.([A-Za-z]+)$/;

/**
 * Claude's resume review for the Review step: fetches improvement suggestions
 * automatically (each with an estimated score gain), and applies accepted
 * rewrites, additions and deletions straight into the builder form. The change
 * list drives the interactive green/red marks on the resume preview.
 */
export function useResumeAiReview(
  form: UseFormReturn<CVFormData>,
  options: {
    enabled: boolean;
    onApplied?: () => void;
    /** Current overall score (0-10): sent to the backend so the suggestions'
     *  points are calibrated to reach exactly 10 when all are accepted. */
    currentScore?: number;
  },
) {
  const { enabled, onApplied, currentScore } = options;
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [changes, setChanges] = useState<TrackedReviewChange[] | null>(null);
  const [loading, setLoading] = useState(false);
  /** The last fetch errored (lets the UI stop waiting and offer a retry). */
  const [failed, setFailed] = useState(false);
  const autoFetchedRef = useRef(false);
  /** Last accept/reject, so the action bar can offer one-step Undo. */
  const [lastActionIndex, setLastActionIndex] = useState<number | null>(null);

  const writeField = useCallback(
    (change: TrackedReviewChange, value: string) => {
      form.setValue(change.path as FieldPath<CVFormData>, value as never, {
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [form],
  );

  // Additions append to an array (e.g. "skills") and Undo removes that item again.
  const writeAddition = useCallback(
    (change: TrackedReviewChange, present: boolean) => {
      const path = change.path as FieldPath<CVFormData>;
      const key = ITEM_KEY[change.path.split(".").pop() ?? ""] ?? "text";
      const items =
        ((form.getValues(path) as unknown) as Array<Record<string, string>> | undefined) ?? [];
      let next: Array<Record<string, string>>;
      if (present) {
        next = [...items, { [key]: change.improved }];
      } else {
        const at = items.map((it) => it?.[key]).lastIndexOf(change.improved);
        if (at < 0) return;
        next = items.filter((_, i) => i !== at);
      }
      form.setValue(path, next as never, { shouldDirty: true, shouldTouch: true });
    },
    [form],
  );

  /**
   * Deletions: an array item (bullet/highlight/education line) is removed from its
   * parent array — matched by CONTENT, not index, so earlier deletions in the same
   * array can't make the index stale. A plain field (summary, description) is
   * cleared. `present: true` removes, `present: false` restores.
   */
  const writeDeletion = useCallback(
    (change: TrackedReviewChange, present: boolean) => {
      const m = change.path.match(ARRAY_ITEM_RE);
      if (m) {
        const [, parentPath, indexStr, key] = m;
        const parent = form.getValues(parentPath as FieldPath<CVFormData>) as unknown;
        if (Array.isArray(parent)) {
          const items = parent as Array<Record<string, string>>;
          if (present) {
            const at = items.findIndex(
              (it) => (it?.[key] ?? "").trim() === change.original.trim(),
            );
            if (at < 0) return;
            form.setValue(
              parentPath as FieldPath<CVFormData>,
              items.filter((_, i) => i !== at) as never,
              { shouldDirty: true, shouldTouch: true },
            );
          } else {
            const at = Math.min(Number(indexStr), items.length);
            const next = [...items];
            next.splice(at, 0, { [key]: change.original });
            form.setValue(parentPath as FieldPath<CVFormData>, next as never, {
              shouldDirty: true,
              shouldTouch: true,
            });
          }
          return;
        }
      }
      // Plain text field: clear it / restore the original.
      writeField(change, present ? "" : change.original);
    },
    [form, writeField],
  );

  const apply = useCallback(
    (change: TrackedReviewChange) => {
      if (change.kind === "add") writeAddition(change, true);
      else if (change.kind === "delete") writeDeletion(change, true);
      else writeField(change, change.improved);
    },
    [writeAddition, writeDeletion, writeField],
  );
  const revert = useCallback(
    (change: TrackedReviewChange) => {
      if (change.kind === "add") writeAddition(change, false);
      else if (change.kind === "delete") writeDeletion(change, false);
      else writeField(change, change.original);
    },
    [writeAddition, writeDeletion, writeField],
  );

  const fetchImprovements = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setLastActionIndex(null);
    try {
      const values = form.getValues();
      const result = await aiAPI.improveResume(values as Record<string, unknown>, {
        // The resume's language, not the UI's — otherwise a German resume gets
        // rewritten into English when the site is set to English.
        outputLanguage: resumeProseLanguage(values, language),
        currentScore,
      });
      const list = Array.isArray(result?.changes) ? result.changes : [];
      setChanges(list.map((c) => ({ ...c, status: "pending" as ReviewChangeStatus })));
      if (list.length === 0) {
        toast({
          title: t("resume.improve.noChangesTitle") || "Nothing to improve",
          description:
            t("resume.improve.noChanges") ||
            "Your resume text already looks strong — no rewrites suggested.",
        });
      }
    } catch (err) {
      setChanges(null);
      setFailed(true);
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
  }, [form, language, t, toast, currentScore]);

  // Reaching the Review step starts the Claude review by itself — no button press.
  useEffect(() => {
    if (!enabled || !user || autoFetchedRef.current || changes !== null || loading) return;
    autoFetchedRef.current = true;
    void fetchImprovements();
  }, [enabled, user, changes, loading, fetchImprovements]);

  const setStatus = useCallback(
    (index: number, status: ReviewChangeStatus) => {
      setChanges((current) => {
        const target = current?.[index];
        if (!current || !target) return current;
        return current.map((c, i) => (i === index ? { ...c, status } : c));
      });
      // Form writes outside the updater: React may defer/replay updaters.
      const target = changes?.[index];
      if (!target) return;
      if (status === "accepted") {
        apply(target);
      } else if (target.status === "accepted") {
        revert(target);
      }
      setLastActionIndex(status === "pending" ? null : index);
      onApplied?.();
    },
    [changes, apply, revert, onApplied],
  );

  const acceptAll = useCallback(() => {
    if (!changes) return;
    for (const c of changes) {
      if (c.status === "pending") apply(c);
    }
    setChanges(
      changes.map((c) =>
        c.status === "pending" ? { ...c, status: "accepted" as ReviewChangeStatus } : c,
      ),
    );
    setLastActionIndex(null);
    toast({
      title: t("resume.improve.appliedAllTitle") || "Improvements applied",
      description:
        t("resume.improve.appliedAll") || "All remaining suggestions were added to your resume.",
    });
    onApplied?.();
  }, [changes, apply, toast, t, onApplied]);

  const undoLast = useCallback(() => {
    if (lastActionIndex === null) return;
    setStatus(lastActionIndex, "pending");
  }, [lastActionIndex, setStatus]);

  /** Forget everything (switching resumes / loading test data). */
  const reset = useCallback(() => {
    setChanges(null);
    setFailed(false);
    setLastActionIndex(null);
    autoFetchedRef.current = false;
  }, []);

  const pendingCount = changes?.filter((c) => c.status === "pending").length ?? 0;
  const acceptedCount = changes?.filter((c) => c.status === "accepted").length ?? 0;
  const pendingPoints =
    changes?.reduce((sum, c) => (c.status === "pending" ? sum + (c.points ?? 0) : sum), 0) ?? 0;
  const acceptedPoints =
    changes?.reduce((sum, c) => (c.status === "accepted" ? sum + (c.points ?? 0) : sum), 0) ?? 0;
  /** Every suggestion handled and none rejected → the resume earned its 10/10. */
  const allAccepted =
    !!changes && changes.length > 0 && changes.every((c) => c.status === "accepted");

  return {
    changes,
    loading,
    failed,
    fetchImprovements,
    setStatus,
    acceptAll,
    undoLast,
    canUndo: lastActionIndex !== null,
    reset,
    pendingCount,
    acceptedCount,
    pendingPoints,
    acceptedPoints,
    allAccepted,
  };
}
