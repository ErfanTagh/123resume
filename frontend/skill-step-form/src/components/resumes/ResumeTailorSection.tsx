import { useEffect, useState } from "react";
import { resumeAPI, type Resume } from "@/lib/api";
import {
  applyTailorSuggestion,
  normalizeApplyPayload,
  tailorDownloadFilename,
  toResumeUpdatePayload,
  type TailorSuggestion,
} from "@/lib/resumeTailorUtils";
import { downloadResumePDF } from "@/lib/resumePdfUtils";
import { TailorSuggestionRow } from "@/components/resumes/TailorSuggestionRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Sparkles, Wand2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type ResumeTailorSectionProps = {
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  companyName?: string;
  currentMatchPercentage?: number;
  resumeLabel?: string;
  /** Called after a tailored copy is saved as a new resume, so the list can refresh. */
  onResumeCreated?: () => void;
};

export function ResumeTailorSection({
  resumeId,
  jobTitle,
  jobDescription,
  companyName,
  currentMatchPercentage = 0,
  resumeLabel,
  onResumeCreated,
}: ResumeTailorSectionProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [suggestions, setSuggestions] = useState<TailorSuggestion[]>([]);
  const [tailorRound, setTailorRound] = useState(1);
  const [maxRounds, setMaxRounds] = useState(5);
  const [projectedMatch, setProjectedMatch] = useState<number | null>(null);
  const [handledIds, setHandledIds] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [effectiveMatch, setEffectiveMatch] = useState(currentMatchPercentage);

  // Scope: which parts of the resume the user lets the AI change.
  const [tailorResume, setTailorResume] = useState<Resume | null>(null);
  const [allowSummary, setAllowSummary] = useState(true);
  const [allowTitle, setAllowTitle] = useState(true);
  const [allowLocation, setAllowLocation] = useState(true);
  const [allowSkills, setAllowSkills] = useState(true);
  const [allowedWork, setAllowedWork] = useState<Set<number>>(new Set());
  const [allowedProjects, setAllowedProjects] = useState<Set<number>>(new Set());

  // Load the resume so we can list its experiences/projects, and allow all by default.
  useEffect(() => {
    let active = true;
    if (!resumeId) {
      setTailorResume(null);
      return;
    }
    (async () => {
      try {
        const r = await resumeAPI.getById(resumeId);
        if (!active) return;
        setTailorResume(r);
        setAllowSummary(true);
        setAllowTitle(true);
        setAllowLocation(true);
        setAllowSkills(true);
        setAllowedWork(new Set((r.workExperience || []).map((_, i) => i)));
        setAllowedProjects(new Set((r.projects || []).map((_, i) => i)));
      } catch {
        if (active) setTailorResume(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [resumeId]);

  const toggleIndex = (set: Set<number>, setter: (s: Set<number>) => void, idx: number) => {
    const next = new Set(set);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setter(next);
  };

  const workList = tailorResume?.workExperience || [];
  const projectList = tailorResume?.projects || [];

  /** Build the allowed-scope payload for the API from the current selection. */
  const buildAllowedScope = () => {
    const allowedSections: string[] = [];
    if (allowSummary) allowedSections.push("professional_summary");
    if (allowTitle) allowedSections.push("professional_title");
    if (allowLocation) allowedSections.push("location");
    if (allowSkills) allowedSections.push("skills");
    if (allowedWork.size > 0) allowedSections.push("work_experience");
    if (allowedProjects.size > 0) allowedSections.push("projects");
    return {
      allowedSections,
      allowedWorkIndexes: [...allowedWork],
      allowedProjectIndexes: [...allowedProjects],
    };
  };

  /** Client-side guarantee: only keep suggestions that target an allowed part. */
  const isSuggestionInScope = (apply: Record<string, unknown>): boolean => {
    const norm = normalizeApplyPayload(apply);
    if (norm.section === "professional_summary") return allowSummary;
    if (norm.section === "professional_title") return allowTitle;
    if (norm.section === "location") return allowLocation;
    if (norm.section === "skills") return allowSkills;
    if (norm.section === "work_experience") return norm.workIndex !== undefined && allowedWork.has(norm.workIndex);
    if (norm.section === "projects") return norm.projectIndex !== undefined && allowedProjects.has(norm.projectIndex);
    return false;
  };

  useEffect(() => {
    setSuggestions([]);
    setTailorRound(1);
    setProjectedMatch(null);
    setHandledIds([]);
    setHasFetched(false);
    setError("");
    setEffectiveMatch(0);
  }, [resumeId, jobDescription]);

  useEffect(() => {
    if (currentMatchPercentage > 0) {
      setEffectiveMatch((prev) => (prev > 0 ? prev : currentMatchPercentage));
    }
  }, [currentMatchPercentage]);

  const canFetch = Boolean(resumeId && jobDescription.trim());
  const atMaxRound = tailorRound > maxRounds;
  const pendingSuggestions = suggestions.filter((s) => !handledIds.includes(s.id));

  const handleFetch = async () => {
    if (!canFetch) {
      toast({
        title: t("common.error") || "Error",
        description:
          t("pages.resumes.jobMatching.tailor.missingInputs") ||
          "Select a resume and enter a job description first.",
        variant: "destructive",
      });
      return;
    }
    if (atMaxRound) return;

    const scope = buildAllowedScope();
    if (scope.allowedSections.length === 0) {
      toast({
        title: t("common.error") || "Error",
        description:
          t("pages.resumes.jobMatching.tailor.noScope") ||
          "Select at least one part of your resume for the AI to change.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    setError("");

    try {
      const result = await resumeAPI.getTailorSuggestions(resumeId, {
        title: jobTitle || "Job Description",
        description: jobDescription,
        round: tailorRound,
        currentMatchPercentage: effectiveMatch,
        skipIds: [
          ...handledIds,
          ...suggestions.filter((s) => !handledIds.includes(s.id)).map((s) => s.id),
        ],
        outputLanguage: language === "de" ? "de" : "en",
        allowedSections: scope.allowedSections,
        allowedWorkIndexes: scope.allowedWorkIndexes,
        allowedProjectIndexes: scope.allowedProjectIndexes,
      });
      const pendingIds = new Set(
        suggestions.filter((s) => !handledIds.includes(s.id)).map((s) => s.id),
      );
      // Client-side guarantee: drop anything outside the user's allowed scope.
      const scoped = result.suggestions.filter((s) =>
        isSuggestionInScope(s.apply as Record<string, unknown>),
      );
      const merged = [
        ...suggestions.filter((s) => !handledIds.includes(s.id)),
        ...scoped.filter((s) => !pendingIds.has(s.id) && !handledIds.includes(s.id)),
      ];
      setSuggestions(merged as TailorSuggestion[]);
      setProjectedMatch(result.projectedMatchPercentage);
      setMaxRounds(result.maxRounds);
      setHasFetched(true);
      setTailorRound((r) => r + 1);
      if (result.suggestions.length === 0) {
        toast({
          title: t("pages.resumes.jobMatching.tailor.noSuggestionsTitle") || "No more suggestions",
          description:
            t("pages.resumes.jobMatching.tailor.noSuggestionsDesc") ||
            "Your resume already aligns well, or try editing manually.",
        });
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobMatching.tailor.failed") || "Failed to get suggestions";
      setError(msg);
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleAccept = async (suggestion: TailorSuggestion) => {
    setApplyingId(suggestion.id);
    try {
      const resume = await resumeAPI.getById(resumeId);
      const apply = normalizeApplyPayload(suggestion.apply as Record<string, unknown>);
      const patched = applyTailorSuggestion(resume, apply);
      const payload = toResumeUpdatePayload({ ...resume, ...patched });
      await resumeAPI.update(resumeId, payload);
      setHandledIds((ids) => [...ids, suggestion.id]);
      if (projectedMatch !== null && effectiveMatch > 0) {
        const pendingCount = Math.max(
          1,
          suggestions.filter((s) => !handledIds.includes(s.id)).length,
        );
        const boost = projectedMatch - effectiveMatch;
        setEffectiveMatch((m) => Math.min(projectedMatch, m + boost / pendingCount));
      }
      toast({
        title: t("pages.resumes.jobMatching.tailor.acceptedTitle") || "Change applied",
        description:
          t("pages.resumes.jobMatching.tailor.acceptedDesc") ||
          "Your resume was updated with this suggestion.",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobMatching.tailor.applyFailed") || "Failed to apply change";
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setApplyingId(null);
    }
  };

  const handleDecline = (suggestion: TailorSuggestion) => {
    setHandledIds((ids) => [...ids, suggestion.id]);
  };

  const handleSaveAsNew = async () => {
    setIsSavingCopy(true);
    try {
      // Pull the latest resume (with any accepted tailoring already applied).
      const resume = await resumeAPI.getById(resumeId);
      const baseName =
        resume.name?.trim() ||
        [resume.personalInfo?.firstName, resume.personalInfo?.lastName].filter(Boolean).join(" ") ||
        "Resume";
      const suffix = (companyName || jobTitle || "").trim();
      const newName = suffix ? `${baseName} — ${suffix}`.slice(0, 200) : `${baseName} (tailored)`.slice(0, 200);

      const payload = { ...toResumeUpdatePayload(resume), name: newName };
      const created = await resumeAPI.create(payload);

      onResumeCreated?.();
      toast({
        title: t("pages.resumes.jobMatching.tailor.savedAsNewTitle") || "Saved as new resume",
        description:
          (t("pages.resumes.jobMatching.tailor.savedAsNewDesc") || "Added to My Resumes as") +
          ` "${newName}".`,
      });
      return created;
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobMatching.tailor.saveAsNewFailed") || "Could not save a copy.";
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSavingCopy(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const resume = await resumeAPI.getById(resumeId);
      const filename = tailorDownloadFilename(resume, companyName || jobTitle);
      await downloadResumePDF(resume, filename);
      toast({
        title: t("pages.resumes.jobMatching.tailor.downloadedTitle") || "Download started",
        description: `${filename}.pdf`,
      });
    } catch {
      toast({
        title: t("common.error") || "Error",
        description:
          t("pages.resumes.jobMatching.tailor.downloadFailed") || "Could not download PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const roundHint = atMaxRound
    ? t("pages.resumes.jobMatching.tailor.maxRounds") || "Maximum improvement rounds reached."
    : hasFetched
      ? (t("pages.resumes.jobMatching.tailor.roundHint") ||
          "Press again to look for any remaining improvements.")
      : (t("pages.resumes.jobMatching.tailor.firstHint") ||
          "Get a full set of suggestions to maximize your match — accept or reject each one.");

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          {t("pages.resumes.jobMatching.tailor.title") || "Tailor resume to job"}
        </CardTitle>
        <CardDescription>
          {t("pages.resumes.jobMatching.tailor.subtitle") ||
            "Get AI suggestions to align your resume with this job. Review each change before applying."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Scope: let the user choose what the AI may change */}
        <div className="rounded-lg border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t("pages.resumes.jobMatching.tailor.scopeTitle") || "What can the AI change?"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allowTitle} onCheckedChange={(v) => setAllowTitle(v === true)} />
              <span className="text-sm">{t("pages.resumes.jobMatching.tailor.scopeTitle2") || "Job title"}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allowSummary} onCheckedChange={(v) => setAllowSummary(v === true)} />
              <span className="text-sm">{t("pages.resumes.jobMatching.tailor.scopeSummary") || "Professional summary"}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allowLocation} onCheckedChange={(v) => setAllowLocation(v === true)} />
              <span className="text-sm">{t("pages.resumes.jobMatching.tailor.scopeLocation") || "Location"}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={allowSkills} onCheckedChange={(v) => setAllowSkills(v === true)} />
              <span className="text-sm">{t("pages.resumes.jobMatching.tailor.scopeSkills") || "Skills"}</span>
            </label>
          </div>

          {workList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("pages.resumes.jobMatching.tailor.scopeExperience") || "Work experience"}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {workList.map((exp, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allowedWork.has(i)}
                      onCheckedChange={() => toggleIndex(allowedWork, setAllowedWork, i)}
                    />
                    <span className="text-sm truncate">
                      {[exp.position, exp.company].filter(Boolean).join(" · ") || `Experience ${i + 1}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {projectList.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t("pages.resumes.jobMatching.tailor.scopeProjects") || "Projects"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {projectList.map((proj, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={allowedProjects.has(i)}
                      onCheckedChange={() => toggleIndex(allowedProjects, setAllowedProjects, i)}
                    />
                    <span className="text-sm truncate">{proj.name || `Project ${i + 1}`}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <Button
            onClick={handleFetch}
            disabled={isFetching || !canFetch || atMaxRound}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isFetching ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                {t("pages.resumes.jobMatching.tailor.loading") || "Analyzing..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {hasFetched
                  ? t("pages.resumes.jobMatching.tailor.more") || "Get more suggestions"
                  : t("pages.resumes.jobMatching.tailor.start") || "Improve resume for this job"}
              </>
            )}
          </Button>
          {hasFetched && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsNew}
                disabled={isSavingCopy}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingCopy
                  ? t("pages.resumes.jobMatching.tailor.savingAsNew") || "Saving..."
                  : t("pages.resumes.jobMatching.tailor.saveAsNew") || "Save as new resume"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading
                  ? t("pages.resumes.jobMatching.tailor.downloading") || "Downloading..."
                  : t("pages.resumes.jobMatching.tailor.download") || "Download tailored PDF"}
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">{roundHint}</p>
        {projectedMatch !== null && hasFetched && (
          <p className="text-sm font-medium text-foreground">
            {t("pages.resumes.jobMatching.tailor.projected") || "Projected match"}: ~{projectedMatch}%
            {resumeLabel ? ` · ${resumeLabel}` : ""}
          </p>
        )}

        {pendingSuggestions.length > 0 && (
          <div className="space-y-4 pt-2">
            {pendingSuggestions.map((s) => (
              <TailorSuggestionRow
                key={s.id}
                suggestion={s}
                onAccept={() => handleAccept(s)}
                onDecline={() => handleDecline(s)}
                isApplying={applyingId === s.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
