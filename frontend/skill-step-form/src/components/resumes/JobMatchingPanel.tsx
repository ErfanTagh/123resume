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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, Target, TrendingUp, Wand2, FileText } from "lucide-react";
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
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1 — single input card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>
            {t("pages.resumes.jobMatching.selectTitle") || "Match a resume to a job"}
          </CardTitle>
          <CardDescription>
            {t("pages.resumes.jobMatching.subtitle") ||
              "Compare a saved resume with a job description to get a match score, tailoring tips, and a cover letter."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: resume + meta */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resume-select" className="font-medium">
                  {t("pages.resumes.jobMatching.selectPlaceholder") || "Resume"}
                </Label>
                {isLoadingResumes ? (
                  <div className="flex h-10 items-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                  <Select value={effectiveResumeId} onValueChange={setSelectedResumeId}>
                    <SelectTrigger id="resume-select">
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
                )}
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {t("pages.resumes.jobMatching.saveNote") ||
                    "Matching uses the last saved version of your resume."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title" className="font-medium">
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
                <Label htmlFor="job-company" className="font-medium">
                  {t("pages.resumes.jobMatching.companyOptional") || "Company (optional)"}
                </Label>
                <Input
                  id="job-company"
                  placeholder={t("pages.resumes.jobMatching.companyPlaceholder") || "e.g. Acme Corp"}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            {/* Right: description */}
            <div className="flex flex-col space-y-2">
              <Label htmlFor="job-description" className="font-medium">
                {t("pages.resumes.jobMatching.jobDescriptionRequired") || "Job description *"}
              </Label>
              <Textarea
                id="job-description"
                placeholder={t("pages.resumes.jobMatching.jobDescriptionPlaceholder") || "Paste the job description here..."}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[240px] flex-1 resize-none lg:min-h-0"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleMatch}
              disabled={isLoading || !effectiveResumeId || !jobDescription.trim()}
              className="w-full sm:w-auto"
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
          </div>
        </CardContent>
      </Card>

      {/* Step 2 — score (semantic color is intentional here) */}
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

      {/* Step 3 — next actions, revealed after a match */}
      {matchResult && (
        <Tabs defaultValue="tailor" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
            <TabsTrigger value="tailor" className="gap-1.5">
              <Wand2 className="h-4 w-4" />
              {t("pages.resumes.jobMatching.tailor.tab") || "Improve resume"}
            </TabsTrigger>
            <TabsTrigger value="cover" className="gap-1.5">
              <FileText className="h-4 w-4" />
              {t("pages.resumes.jobMatching.coverLetter.tab") || "Cover letter"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tailor" className="mt-4">
            <ResumeTailorSection
              resumeId={effectiveResumeId}
              jobTitle={jobTitle}
              jobDescription={jobDescription}
              companyName={companyName}
              currentMatchPercentage={matchResult?.match_percentage}
              resumeLabel={coverLetterDownloadName}
            />
          </TabsContent>
          <TabsContent value="cover" className="mt-4">
            <CoverLetterSection
              resumeId={effectiveResumeId}
              jobTitle={jobTitle}
              jobDescription={jobDescription}
              downloadName={coverLetterDownloadName}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
