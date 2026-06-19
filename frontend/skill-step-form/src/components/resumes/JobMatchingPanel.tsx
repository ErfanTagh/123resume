import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resumeAPI, type Resume } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { CoverLetterSection } from "@/components/resumes/CoverLetterSection";
import { ResumeTailorSection } from "@/components/resumes/ResumeTailorSection";

interface MatchResult {
  resume_id: string;
  job_title: string;
  job_description: string;
  similarity: number;
  match_percentage: number;
  resume_summary: string;
}

type JobMatchingPanelProps = {
  resumes: Resume[];
  isLoadingResumes: boolean;
};

const resumeLabel = (resume: Resume): string => {
  const parts: string[] = [];
  if (resume.personalInfo?.firstName?.trim()) parts.push(resume.personalInfo.firstName.trim());
  if (resume.personalInfo?.lastName?.trim()) parts.push(resume.personalInfo.lastName.trim());
  if (resume.personalInfo?.professionalTitle?.trim()) {
    parts.push(resume.personalInfo.professionalTitle.trim());
  }
  if (resume.name?.trim()) return resume.name.trim();
  return parts.length > 0 ? parts.join(" ") : "Untitled Resume";
};

export function JobMatchingPanel({ resumes, isLoadingResumes }: JobMatchingPanelProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveResumeId =
    selectedResumeId || (resumes.length > 0 ? resumes[0].id : "");

  const selectedResume = resumes.find((r) => r.id === effectiveResumeId);
  const coverLetterDownloadName = selectedResume ? resumeLabel(selectedResume) : undefined;

  const handleMatch = async () => {
    if (!effectiveResumeId) {
      toast({
        title: t("common.error") || "Error",
        description: t("pages.resumes.jobMatching.selectResume") || "Please select a resume",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: t("common.error") || "Error",
        description: t("pages.resumes.jobMatching.enterDescription") || "Please enter a job description",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError("");
    setMatchResult(null);

    try {
      await resumeAPI.getById(effectiveResumeId);
      const result = await resumeAPI.matchToJob(
        effectiveResumeId,
        jobTitle || "Job Description",
        jobDescription,
      );
      setMatchResult(result);
      toast({
        title: t("pages.resumes.jobMatching.completeTitle") || "Matching complete",
        description: `${t("pages.resumes.jobMatching.completeDesc") || "Match score"}: ${result.match_percentage}%`,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("pages.resumes.jobMatching.failed") || "Failed to match";
      setError(msg);
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (percentage >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getMatchLabel = (percentage: number) => {
    if (percentage >= 80) return t("pages.resumes.jobMatching.excellent") || "Excellent Match";
    if (percentage >= 60) return t("pages.resumes.jobMatching.good") || "Good Match";
    if (percentage >= 40) return t("pages.resumes.jobMatching.fair") || "Fair Match";
    return t("pages.resumes.jobMatching.poor") || "Poor Match";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm max-w-2xl font-medium text-sky-900/90 dark:text-sky-100/90 leading-relaxed">
        {t("pages.resumes.jobMatching.subtitle") ||
          "Compare a saved resume with a job description, get a match score, and generate a cover letter."}
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-200">
              {t("pages.resumes.jobMatching.selectTitle") || "Select your resume"}
            </CardTitle>
            <CardDescription className="text-violet-700/90 dark:text-violet-300/90">
              {t("pages.resumes.jobMatching.selectDesc") || "Choose which resume to compare"}
            </CardDescription>
            <Alert className="mt-4 border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs font-medium text-amber-950 dark:text-amber-50">
                {t("pages.resumes.jobMatching.saveNote") ||
                  "Save your resume after editing. Job matching uses the saved version from the database."}
              </AlertDescription>
            </Alert>
          </CardHeader>
          <CardContent>
            {isLoadingResumes ? (
              <div className="text-center py-6">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : resumes.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("pages.resumes.jobMatching.noResumes") || "No resumes yet."}{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/create/start")}>
                    {t("pages.resumes.empty.createButton") || "Create one"}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label className="text-violet-800 dark:text-violet-200 font-medium">
                  {t("pages.resumes.jobMatching.selectPlaceholder") || "Select a resume"}
                </Label>
                <Select value={effectiveResumeId} onValueChange={setSelectedResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("pages.resumes.jobMatching.selectPlaceholder") || "Select a resume"} />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resumeLabel(resume)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader>
            <CardTitle className="text-emerald-800 dark:text-emerald-200">
              {t("pages.resumes.jobMatching.jobTitle") || "Job description"}
            </CardTitle>
            <CardDescription className="text-emerald-700/90 dark:text-emerald-300/90">
              {t("pages.resumes.jobMatching.jobDesc") || "Enter the job you want to match against"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-title" className="text-emerald-800 dark:text-emerald-200 font-medium">
                {t("pages.resumes.jobMatching.jobTitleOptional") || "Job title (optional)"}
              </Label>
              <Input
                id="job-title"
                placeholder={t("pages.resumes.jobMatching.jobTitlePlaceholder") || "e.g. Senior Developer"}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-company" className="text-emerald-800 dark:text-emerald-200 font-medium">
                {t("pages.resumes.jobMatching.companyOptional") || "Company (optional)"}
              </Label>
              <Input
                id="job-company"
                placeholder={t("pages.resumes.jobMatching.companyPlaceholder") || "e.g. Acme Corp"}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-description" className="text-emerald-800 dark:text-emerald-200 font-medium">
                {t("pages.resumes.jobMatching.jobDescriptionRequired") || "Job description *"}
              </Label>
              <Textarea
                id="job-description"
                placeholder={t("pages.resumes.jobMatching.jobDescriptionPlaceholder") || "Paste the job description here..."}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
            <Button
              onClick={handleMatch}
              disabled={isLoading || !effectiveResumeId || !jobDescription.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  {t("pages.resumes.jobMatching.analyzing") || "Analyzing..."}
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  {t("pages.resumes.jobMatching.getScore") || "Get match score"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {matchResult && (
        <Card className={`border-2 ${getMatchColor(matchResult.match_percentage)}`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {t("pages.resumes.jobMatching.scoreTitle") || "Match score"}
                </CardTitle>
                <CardDescription>{matchResult.job_title}</CardDescription>
              </div>
              <div className="text-center">
                <div
                  className={`text-5xl font-bold mb-1 ${getMatchColor(matchResult.match_percentage).split(" ")[0]}`}
                >
                  {matchResult.match_percentage}%
                </div>
                <Badge variant="outline">{getMatchLabel(matchResult.match_percentage)}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-medium">{matchResult.similarity.toFixed(3)}</span>
              <span className="text-sm text-muted-foreground">/ 1.0</span>
            </div>
            <div className="pt-4 border-t">
              <Label className="text-sm font-semibold mb-2 block">
                {t("pages.resumes.jobMatching.summaryLabel") || "Resume summary"}
              </Label>
              <p className="text-sm text-muted-foreground">{matchResult.resume_summary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ResumeTailorSection
        resumeId={effectiveResumeId}
        jobTitle={jobTitle}
        jobDescription={jobDescription}
        companyName={companyName}
        currentMatchPercentage={matchResult?.match_percentage}
        resumeLabel={coverLetterDownloadName}
      />

      <CoverLetterSection
        resumeId={effectiveResumeId}
        jobTitle={jobTitle}
        jobDescription={jobDescription}
        downloadName={coverLetterDownloadName}
      />
    </div>
  );
}
