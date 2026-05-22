import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { ResumeScore } from "@/lib/resumeScorer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ResumeScoreNumberShimmer } from "@/components/cv-form/ResumeScoreNumberShimmer";

interface RatingCategory {
  name: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface CVRatingProps {
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  /** AI score from parent (Review step only). */
  rating?: {
    overallScore: number;
    categories: RatingCategory[];
    suggestions: string[];
    overallFeedback?: string;
    fromAi?: boolean;
  };
  /** True while DeepSeek score is in flight. */
  ratingLoading?: boolean;
}

const LOGGED_IN_PLACEHOLDER_OVERALL = 2.5;

export const CVRating = ({
  onAnalyze,
  isAnalyzing,
  rating: parentRating,
  ratingLoading = false,
}: CVRatingProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("resume.score.label") || "Resume Score"}
          </CardTitle>
          <CardDescription>
            {t("resume.score.signInForAi") ||
              "Sign in to get an AI resume score and tailored comments on this step."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link to="/login">{t("navigation.login") || "Log in"}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getOverallScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 dark:text-green-400";
    if (score >= 6) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 4) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getOverallStatus = (score: number) => {
    if (score >= 8)
      return {
        label: t("resume.score.status.excellent") || "Excellent",
        color: "bg-green-500",
      };
    if (score >= 6)
      return {
        label: t("resume.score.status.good") || "Good",
        color: "bg-yellow-500",
      };
    if (score >= 4)
      return {
        label: t("resume.score.status.fair") || "Fair",
        color: "bg-orange-500",
      };
    return {
      label: t("resume.score.status.needsImprovement") || "Needs Improvement",
      color: "bg-red-500",
    };
  };

  const rating = parentRating as ResumeScore | undefined;

  if (!rating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("resume.score.label") || "Resume Score"}
          </CardTitle>
          <CardDescription>
            {ratingLoading
              ? t("resume.score.waitAi")
              : t("resume.score.reviewAiHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[140px] flex-col items-center justify-center gap-4 py-10">
          <div className="flex items-baseline justify-center gap-1 font-bold">
            {ratingLoading ? (
              <ResumeScoreNumberShimmer size="xl" />
            ) : (
              <>
                <span
                  className={`text-5xl leading-snug tabular-nums tracking-tight ${getOverallScoreColor(LOGGED_IN_PLACEHOLDER_OVERALL)}`}
                >
                  {LOGGED_IN_PLACEHOLDER_OVERALL}
                </span>
                <span className="text-2xl leading-snug text-muted-foreground">/10</span>
              </>
            )}
          </div>
          {!ratingLoading && onAnalyze ? (
            <Button type="button" variant="outline" className="w-full max-w-xs" onClick={onAnalyze}>
              {t("resume.score.reanalyze") || "Re-analyze CV"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const status = getOverallStatus(rating.overallScore);

  const categoryNameMap: Record<string, string> = {
    "Content Quality": t("resume.score.categories.contentQuality") || "Content Quality",
    "Structure & Format": t("resume.score.categories.structureFormat") || "Structure & Format",
    "Professional Summary": t("resume.score.categories.professionalSummary") || "Professional Summary",
    "Experience Section": t("resume.score.categories.experience") || "Experience Section",
    "Skills & Proficiency": t("resume.score.categories.skills") || "Skills & Proficiency",
    "Education & Certifications": t("resume.score.categories.education") || "Education & Certifications",
    "ATS Optimization": t("resume.score.categories.ats") || "ATS Optimization",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t("resume.score.label") || "Resume Score"}
        </CardTitle>
        <CardDescription className="space-y-2">
          <span>
            {t("resume.score.subtitleAi") || "AI feedback based on your current CV content."}
          </span>
          {(ratingLoading || isAnalyzing) ? (
            <span className="block text-xs font-medium text-primary">
              {t("resume.score.scoringInProgress") || "Updating score with AI…"}
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 text-center">
          <div
            className={`relative flex min-h-[3.5rem] items-baseline justify-center gap-1 font-bold ${
              ratingLoading || isAnalyzing ? "text-muted-foreground" : getOverallScoreColor(rating.overallScore)
            }`}
          >
            {ratingLoading || isAnalyzing ? (
              <ResumeScoreNumberShimmer size="xl" />
            ) : (
              <>
                <span className="text-5xl leading-snug tabular-nums tracking-tight">{rating.overallScore}</span>
                <span className="text-2xl leading-snug text-muted-foreground">/10</span>
              </>
            )}
          </div>
          <Badge className={status.color}>{status.label}</Badge>
          <Progress
            value={rating.overallScore * 10}
            className={`h-3 ${ratingLoading || isAnalyzing ? "animate-pulse opacity-60" : ""}`}
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">{t("resume.score.breakdown") || "Score Breakdown"}</h4>
          {rating.categories.map((category, index) => {
            const localizedName = categoryNameMap[category.name] || category.name;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{localizedName}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(category.score, category.maxScore)}`}>
                    {category.score}/{category.maxScore}
                  </span>
                </div>
                <Progress value={(category.score / category.maxScore) * 100} className="h-2" />
                {category.feedback?.trim() && rating.fromAi !== false ? (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {category.feedback.replace(/^\-\s*/, "").trim()}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {rating.fromAi !== false && rating.overallFeedback?.trim() ? (
          <div className="space-y-2 rounded-lg border border-primary/15 bg-muted/30 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("resume.score.overallAiSummary")}
            </h4>
            <p className="text-xs text-muted-foreground">{t("resume.score.overallAiSummaryHint")}</p>
            <ul className="list-none space-y-2 pl-0 text-sm leading-relaxed text-foreground">
              {rating.overallFeedback
                .split(/\n+/)
                .map((line) => line.trim())
                .filter(Boolean)
                .slice(0, 8)
                .map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    <span className="whitespace-pre-wrap">{line.replace(/^\-\s*/, "")}</span>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {onAnalyze ? (
          <Button
            type="button"
            onClick={onAnalyze}
            variant="outline"
            className="w-full"
            disabled={isAnalyzing}
          >
            {t("resume.score.reanalyze") || "Re-analyze CV"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
