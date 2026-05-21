import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { CVFormData } from "./types";
import { calculateResumeScore, type ResumeScore } from "@/lib/resumeScorer";
import { useEffect, useState } from "react";
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
  data?: CVFormData;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  /** Server AI score from parent (refreshed on step navigation). */
  rating?: {
    overallScore: number;
    categories: RatingCategory[];
    suggestions: string[];
  };
  /** Logged-in: true while DeepSeek score is in flight (parent clears `rating` during fetch). */
  ratingLoading?: boolean;
}

function localRatingOrUndefined(data: CVFormData | undefined): ResumeScore | undefined {
  if (!data) return undefined;
  try {
    return calculateResumeScore(data);
  } catch {
    return undefined;
  }
}

const LOGGED_IN_PLACEHOLDER_OVERALL = 2.5;

export const CVRating = ({
  data,
  onAnalyze,
  isAnalyzing,
  rating: parentRating,
  ratingLoading = false,
}: CVRatingProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const [rating, setRating] = useState<ResumeScore | undefined>(() => {
    if (parentRating != null) return parentRating;
    if (user) return undefined;
    return localRatingOrUndefined(data);
  });

  useEffect(() => {
    if (parentRating != null) {
      setRating(parentRating);
      return;
    }
    if (user) {
      setRating(undefined);
      return;
    }
    if (!data) {
      setRating(undefined);
      return;
    }
    try {
      setRating(localRatingOrUndefined(data));
    } catch {
      setRating(undefined);
    }
  }, [parentRating, user, data]);

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
    if (score >= 8) return {
      label: t('resume.score.status.excellent') || "Excellent",
      color: "bg-green-500",
      borderColor: "border-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      textColor: "text-green-700 dark:text-green-400"
    };
    if (score >= 6) return {
      label: t('resume.score.status.good') || "Good",
      color: "bg-yellow-500",
      borderColor: "border-yellow-500",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      textColor: "text-yellow-700 dark:text-yellow-400"
    };
    if (score >= 4) return {
      label: t('resume.score.status.fair') || "Fair",
      color: "bg-orange-500",
      borderColor: "border-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
      textColor: "text-orange-700 dark:text-orange-400"
    };
    return {
      label: t('resume.score.status.needsImprovement') || "Needs Improvement",
      color: "bg-red-500",
      borderColor: "border-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/20",
      textColor: "text-red-700 dark:text-red-400"
    };
  };

  if (isAuthenticated && !rating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("resume.score.label") || "Resume Score"}
          </CardTitle>
          <CardDescription>
            {ratingLoading
              ? t("resume.score.waitAi") ||
                "AI is analyzing your CV. This may take a few seconds."
              : t("resume.score.moveStepsHint") ||
                "Use Next or Previous to refresh your AI score if it did not load."}
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
        </CardContent>
      </Card>
    );
  }

  if (!rating) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('resume.score.title') || 'CV Rating & Analysis'}
          </CardTitle>
          <CardDescription>
            {data
              ? t('resume.score.description.withData') || "Click analyze to generate your latest resume score"
              : t('resume.score.description.withoutData') || "Get AI-powered feedback on your CV and suggestions for improvement"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? t('resume.score.analyzing') || "Analyzing..." : t('resume.score.analyzeButton') || "Analyze My CV"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const status = getOverallStatus(rating.overallScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('resume.score.label') || 'Resume Score'}
        </CardTitle>
        <CardDescription>
          {t("resume.score.subtitle") || "Real-time completeness analysis"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 text-center">
          <div
            className={`flex items-baseline justify-center gap-1 font-bold ${getOverallScoreColor(rating.overallScore)}`}
          >
            <span className="text-5xl leading-snug tabular-nums tracking-tight">{rating.overallScore}</span>
            <span className="text-2xl leading-snug text-muted-foreground">/10</span>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
          <Progress value={rating.overallScore * 10} className="h-3" />
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">{t('resume.score.breakdown') || 'Score Breakdown'}</h4>
          {rating.categories.map((category, index) => {
            const categoryNameMap: Record<string, string> = {
              'Content Quality': t('resume.score.categories.contentQuality') || 'Content Quality',
              'Structure & Format': t('resume.score.categories.structureFormat') || 'Structure & Format',
              'Professional Summary': t('resume.score.categories.professionalSummary') || 'Professional Summary',
              'Experience Section': t('resume.score.categories.experience') || 'Experience Section',
              'Skills & Proficiency': t('resume.score.categories.skills') || 'Skills & Proficiency',
              'Education & Certifications': t('resume.score.categories.education') || 'Education & Certifications',
              'ATS Optimization': t('resume.score.categories.ats') || 'ATS Optimization',
            };
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
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const feedbackMap: Record<string, string> = {
                      "Excellent use of action verbs and metrics": t('resume.score.categoryFeedback.contentQuality.excellent') || category.feedback,
                      "Good content, add more quantifiable achievements": t('resume.score.categoryFeedback.contentQuality.good') || category.feedback,
                      "Needs stronger action verbs and measurable results": t('resume.score.categoryFeedback.contentQuality.needsImprovement') || category.feedback,
                      "Well-structured and easy to scan": t('resume.score.categoryFeedback.structure.excellent') || category.feedback,
                      "Good structure, could improve formatting": t('resume.score.categoryFeedback.structure.good') || category.feedback,
                      "Needs better organization and formatting": t('resume.score.categoryFeedback.structure.needsImprovement') || category.feedback,
                      "Compelling and specific summary": t('resume.score.categoryFeedback.summary.excellent') || category.feedback,
                      "Good summary, add more specifics": t('resume.score.categoryFeedback.summary.good') || category.feedback,
                      "Needs a more compelling summary": t('resume.score.categoryFeedback.summary.needsImprovement') || category.feedback,
                      "Excellent achievement-focused experience": t('resume.score.categoryFeedback.experience.excellent') || category.feedback,
                      "Good experience section, highlight more achievements": t('resume.score.categoryFeedback.experience.good') || category.feedback,
                      "Needs more achievement-focused descriptions": t('resume.score.categoryFeedback.experience.needsImprovement') || category.feedback,
                      "Well-organized and relevant skills": t('resume.score.categoryFeedback.skills.excellent') || category.feedback,
                      "Good skills, ensure they're relevant": t('resume.score.categoryFeedback.skills.good') || category.feedback,
                      "Needs more relevant and organized skills": t('resume.score.categoryFeedback.skills.needsImprovement') || category.feedback,
                      "Complete education and certifications": t('resume.score.categoryFeedback.education.excellent') || category.feedback,
                      "Add more education or certification details": t('resume.score.categoryFeedback.education.needsImprovement') || category.feedback,
                      "Well-optimized for ATS systems": t('resume.score.categoryFeedback.ats.excellent') || category.feedback,
                      "Add more keywords and ensure standard formatting": t('resume.score.categoryFeedback.ats.needsImprovement') || category.feedback,
                      "Add more keywords and ensure ATS-friendly section content": t('resume.score.categoryFeedback.ats.needsImprovement') || category.feedback,
                    };
                    return feedbackMap[category.feedback] || category.feedback;
                  })()}
                </p>
              </div>
            );
          })}
        </div>

        {rating.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {t('resume.score.suggestions') || 'Suggestions for Improvement'}
            </h4>
            <ul className="space-y-2">
              {rating.suggestions.map((suggestion, index) => {
                const suggestionMap: Record<string, string> = {
                  "Your resume needs significant improvement. Focus on adding quantifiable achievements and strong action verbs.": t('resume.score.feedback.needsImprovement') || suggestion,
                  "Your resume is good but can be improved. Focus on adding more metrics and impact-focused descriptions.": t('resume.score.feedback.canImprove') || suggestion,
                  "Excellent resume! You're well-positioned for job applications.": t('resume.score.feedback.excellent') || suggestion,
                  "Use strong action verbs like 'Led', 'Developed', 'Implemented' instead of 'Responsible for' or 'Worked on'": t('resume.score.feedback.actionVerbs') || suggestion,
                  "Add quantifiable achievements with numbers, percentages, or metrics (e.g., 'Increased revenue by 40%', 'Managed team of 5')": t('resume.score.feedback.quantifiable') || suggestion,
                  "Ensure your skills are relevant and match your work experience": t('resume.score.feedback.skillsRelevant') || suggestion,
                  "Focus on outcomes and impact in your experience descriptions, not just responsibilities": t('resume.score.feedback.outcomes') || suggestion,
                  "Organize your resume sections in a clear, logical order": t('resume.score.feedback.sectionOrder') || suggestion,
                  "Keep bullet points concise - aim for 1-2 lines maximum": t('resume.score.feedback.concise') || suggestion,
                  "Resume may be too long - aim for 1 page (under 5 years experience) or 2 pages (senior roles)": t('resume.score.feedback.tooLong') || suggestion,
                  "Use bullet points and clear structure to make your resume easy to scan": t('resume.score.feedback.bulletPoints') || suggestion,
                  "Make your professional summary more specific and compelling - avoid generic phrases": t('resume.score.feedback.summaryGeneric') || suggestion,
                  "Add a professional summary that highlights your value proposition": t('resume.score.feedback.summaryMissing') || suggestion,
                  "Make your summary more specific - mention years of experience, key technologies, or achievements": t('resume.score.feedback.summarySpecific') || suggestion,
                  "Provide detailed descriptions for your most recent roles": t('resume.score.feedback.detailedDescriptions') || suggestion,
                  "Focus on achievements and outcomes in your work experience, not just responsibilities": t('resume.score.feedback.achievements') || suggestion,
                  "Add detailed work experience with focus on achievements": t('resume.score.feedback.addExperience') || suggestion,
                  "Add context like company size, industry, or technologies used in your experience": t('resume.score.feedback.context') || suggestion,
                  "Consider reducing your skills list - focus on the most relevant ones": t('resume.score.feedback.tooManySkills') || suggestion,
                  "Add more skills to showcase your expertise": t('resume.score.feedback.addSkills') || suggestion,
                  "Add more relevant skills that match industry standards and your experience": t('resume.score.feedback.relevantSkills') || suggestion,
                  "Your skills list may be too long - focus on the most relevant and important skills": t('resume.score.feedback.skillsTooLong') || suggestion,
                  "Complete your education entries with degree, institution, and dates": t('resume.score.feedback.educationComplete') || suggestion,
                  "Add your education details": t('resume.score.feedback.educationMissing') || suggestion,
                  "Consider adding industry-recognized certifications to strengthen your resume": t('resume.score.feedback.certifications') || suggestion,
                  "Add more industry keywords and relevant terms to improve ATS compatibility": t('resume.score.feedback.keywords') || suggestion,
                  "Select a template - our templates are ATS-optimized": t('resume.score.feedback.template') || suggestion,
                  "Review your resume for typos and grammar errors - consider using a spell checker": t('resume.score.feedback.typos') || suggestion,
                  "Use a professional email address (e.g., firstname.lastname@email.com)": t('resume.score.feedback.email') || suggestion,
                  "Replace vague or generic descriptions with specific, achievement-focused statements": t('resume.score.feedback.vague') || suggestion,
                  "Your resume is long but lacks substance - focus on quality over quantity": t('resume.score.feedback.substance') || suggestion,
                  "Ensure you have complete contact information (email, phone, or LinkedIn)": t('resume.score.feedback.contact') || suggestion,
                  "Consider addressing employment gaps or ensure dates are accurate": t('resume.score.feedback.gaps') || suggestion,
                  "Limit interests to 3-5 most relevant ones": t('resume.score.feedback.interests') || suggestion,
                  "Add a professional website or LinkedIn profile to strengthen your online presence": t('resume.score.feedback.onlinePresence') || suggestion,
                  "Your resume is solid! Adding more metrics and impact-focused descriptions would make it even stronger.": t('resume.score.feedback.solid') || suggestion,
                  "Add specific numbers to showcase impact: revenue increased (%), team size managed, cost savings ($), users reached, etc.": t('resume.score.feedback.addSpecificNumbers') || suggestion,
                };
                const localizedSuggestion = suggestionMap[suggestion] || suggestion;

                return (
                  <li key={index} className="flex gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>{localizedSuggestion}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <Button
          onClick={onAnalyze}
          variant="outline"
          className="w-full"
          disabled={isAnalyzing}
        >
          {t('resume.score.reanalyze') || 'Re-analyze CV'}
        </Button>
      </CardContent>
    </Card>
  );
};
