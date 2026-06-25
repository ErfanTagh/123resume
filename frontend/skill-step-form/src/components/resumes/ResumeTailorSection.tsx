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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Sparkles, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type ResumeTailorSectionProps = {
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  companyName?: string;
  currentMatchPercentage?: number;
  resumeLabel?: string;
};

export function ResumeTailorSection({
  resumeId,
  jobTitle,
  jobDescription,
  companyName,
  currentMatchPercentage = 0,
  resumeLabel,
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
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [effectiveMatch, setEffectiveMatch] = useState(currentMatchPercentage);

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
      });
      const pendingIds = new Set(
        suggestions.filter((s) => !handledIds.includes(s.id)).map((s) => s.id),
      );
      const merged = [
        ...suggestions.filter((s) => !handledIds.includes(s.id)),
        ...result.suggestions.filter((s) => !pendingIds.has(s.id) && !handledIds.includes(s.id)),
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
          "Press again for the next ~20% improvement round.")
      : (t("pages.resumes.jobMatching.tailor.firstHint") ||
          "Each round suggests changes to improve match by ~20%.");

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
