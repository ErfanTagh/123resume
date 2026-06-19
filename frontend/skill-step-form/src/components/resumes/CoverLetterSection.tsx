import { useRef, useState } from "react";
import { resumeAPI } from "@/lib/api";
import { generatePDF } from "@/lib/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, Download, FileText, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type CoverLetterLanguage = "en" | "de";

type CoverLetterSectionProps = {
  resumeId: string;
  jobTitle: string;
  jobDescription: string;
  downloadName?: string;
};

const sanitizeFilename = (value: string): string =>
  value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "Cover-Letter";

export function CoverLetterSection({
  resumeId,
  jobTitle,
  jobDescription,
  downloadName,
}: CoverLetterSectionProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [letterLanguage, setLetterLanguage] = useState<CoverLetterLanguage>(
    language === "de" ? "de" : "en",
  );

  const [coverLetter, setCoverLetter] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = Boolean(resumeId && jobDescription.trim());

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast({
        title: t("common.error") || "Error",
        description:
          t("pages.resumes.jobMatching.coverLetter.missingInputs") ||
          "Select a resume and enter a job description first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const result = await resumeAPI.generateCoverLetter(
        resumeId,
        jobTitle || "Job Description",
        jobDescription,
        { outputLanguage: letterLanguage },
      );
      setCoverLetter(result.cover_letter);
      toast({
        title: t("pages.resumes.jobMatching.coverLetter.readyTitle") || "Cover letter ready",
        description:
          t("pages.resumes.jobMatching.coverLetter.readyDesc") ||
          "Review and edit the letter before downloading.",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("pages.resumes.jobMatching.coverLetter.failed") || "Failed to generate cover letter";
      setError(msg);
      toast({ title: t("common.error") || "Error", description: msg, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || !coverLetter.trim()) return;

    setIsDownloading(true);
    try {
      const base = sanitizeFilename(downloadName || jobTitle || "Cover-Letter");
      await generatePDF(printRef.current, base);
      toast({
        title: t("pages.resumes.jobMatching.coverLetter.downloadedTitle") || "Download started",
        description:
          t("pages.resumes.jobMatching.coverLetter.downloadedDesc") || "Your cover letter PDF is downloading.",
      });
    } catch {
      toast({
        title: t("common.error") || "Error",
        description:
          t("pages.resumes.jobMatching.coverLetter.downloadFailed") || "Could not download PDF. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!coverLetter.trim()) return;
    const blob = new Blob([coverLetter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename(downloadName || jobTitle || "Cover-Letter")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-l-4 border-l-sky-500 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sky-800 dark:text-sky-200 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t("pages.resumes.jobMatching.coverLetter.title") || "Cover letter"}
        </CardTitle>
        <CardDescription className="text-sky-700/90 dark:text-sky-300/90">
          {t("pages.resumes.jobMatching.coverLetter.subtitle") ||
            "Generate a tailored cover letter from your saved resume and the job description above."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="space-y-2 sm:max-w-xs flex-1">
            <Label htmlFor="cover-letter-language" className="text-sky-800 dark:text-sky-200 font-medium">
              {t("pages.resumes.jobMatching.coverLetter.languageLabel") || "Cover letter language"}
            </Label>
            <Select
              value={letterLanguage}
              onValueChange={(value) => setLetterLanguage(value as CoverLetterLanguage)}
            >
              <SelectTrigger id="cover-letter-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">
                  {t("pages.resumes.jobMatching.coverLetter.languageEn") || "English"}
                </SelectItem>
                <SelectItem value="de">
                  {t("pages.resumes.jobMatching.coverLetter.languageDe") || "German"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !canGenerate}
            className="w-full sm:w-auto"
            size="lg"
          >
            {isGenerating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                {t("pages.resumes.jobMatching.coverLetter.generating") || "Generating..."}
              </>
            ) : coverLetter ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("pages.resumes.jobMatching.coverLetter.regenerate") || "Regenerate cover letter"}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("pages.resumes.jobMatching.coverLetter.generate") || "Generate cover letter"}
              </>
            )}
          </Button>
        </div>

        {coverLetter && (
          <div className="space-y-3 pt-2">
            <Label htmlFor="cover-letter-text" className="text-sky-800 dark:text-sky-200 font-medium">
              {t("pages.resumes.jobMatching.coverLetter.editLabel") || "Edit your cover letter"}
            </Label>
            <Textarea
              id="cover-letter-text"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={14}
              className="resize-y min-h-[280px] font-serif leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleDownloadPdf}
                disabled={isDownloading || !coverLetter.trim()}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloading
                  ? t("pages.resumes.jobMatching.coverLetter.downloading") || "Downloading..."
                  : t("pages.resumes.jobMatching.coverLetter.downloadPdf") || "Download PDF"}
              </Button>
              <Button type="button" variant="outline" onClick={handleDownloadTxt} disabled={!coverLetter.trim()}>
                {t("pages.resumes.jobMatching.coverLetter.downloadTxt") || "Download .txt"}
              </Button>
            </div>
          </div>
        )}

        <div
          ref={printRef}
          aria-hidden
          className="fixed left-[-9999px] top-0 w-[190mm] bg-white text-black"
        >
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "12pt",
              lineHeight: 1.65,
              padding: "18mm 20mm",
              whiteSpace: "pre-wrap",
            }}
          >
            {coverLetter}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
