import { useEffect, useRef, useState } from "react";
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

/** Animates a number toward `target` (ease-out), rounded to one decimal. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    if (from === target) return;
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* no matchMedia: animate */
    }
    if (reduced) {
      current.current = target;
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const next = from + (target - from) * (1 - Math.pow(1 - p, 3));
      current.current = next;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return Math.round(value * 10) / 10;
}

/** Briefly shows how much the score just moved ("+0.6"). */
function useScoreDelta(score: number | undefined): number | null {
  const [delta, setDelta] = useState<number | null>(null);
  const previous = useRef(score);
  useEffect(() => {
    const prev = previous.current;
    previous.current = score;
    if (prev == null || score == null) return;
    const d = Math.round((score - prev) * 10) / 10;
    if (d === 0) return;
    setDelta(d);
    const id = window.setTimeout(() => setDelta(null), 2400);
    return () => window.clearTimeout(id);
  }, [score]);
  return delta;
}

export const CVRating = ({
  onAnalyze,
  isAnalyzing,
  rating: parentRating,
  ratingLoading = false,
}: CVRatingProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const animatedScore = useCountUp(parentRating?.overallScore ?? 0);
  const scoreDelta = useScoreDelta(parentRating?.overallScore);

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

  const suggestions = (rating.suggestions || [])
    .map((s) => s.replace(/^-\s*/, "").trim())
    .filter(Boolean);

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
          {/* The number is computed locally and always current, so it stays
              visible while the AI rewrites the feedback text below. */}
          <div
            className={`relative flex min-h-[3.5rem] items-baseline justify-center gap-1 font-bold transition-colors duration-500 ${getOverallScoreColor(animatedScore)}`}
          >
            <span className="relative text-5xl leading-snug tabular-nums tracking-tight">
              {animatedScore.toFixed(1)}
              {scoreDelta != null ? (
                <span
                  key={`${scoreDelta}-${rating.overallScore}`}
                  className={`absolute -right-3 top-1 translate-x-full rounded-full px-2 py-0.5 text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-500 ${
                    scoreDelta > 0
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {scoreDelta > 0 ? "+" : ""}
                  {scoreDelta.toFixed(1)}
                </span>
              ) : null}
            </span>
            <span className="text-2xl leading-snug text-muted-foreground">/10</span>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
          <Progress value={animatedScore * 10} className="h-3" />
        </div>

        {suggestions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("resume.score.suggestionsTitle") || "How to improve your score"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("resume.score.suggestionsHint") ||
                "Each tip points to something you can edit here in the builder."}
            </p>
            <ul className="list-none space-y-2 pl-0 text-sm leading-relaxed text-foreground">
              {suggestions.slice(0, 6).map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span className="whitespace-pre-wrap">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
                    <span className="whitespace-pre-wrap">{line.replace(/^-\s*/, "")}</span>
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
