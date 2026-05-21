import type { CVFormData } from "@/components/cv-form/types";
import { aiAPI } from "@/lib/api";
import {
  calculateResumeScore,
  type ResumeScore,
} from "@/lib/resumeScorer";

function normalizeAiScore(raw: {
  overallScore: number;
  estimatedPages?: number;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
  suggestions: string[];
}): ResumeScore {
  return {
    overallScore: Math.max(0, Math.min(10, Number(raw.overallScore) || 0)),
    categories: (raw.categories || []).map((c) => ({
      name: c.name,
      score: Math.max(0, Math.min(c.maxScore || 0, Number(c.score) || 0)),
      maxScore: c.maxScore,
      feedback: c.feedback || "",
    })),
    suggestions: Array.isArray(raw.suggestions)
      ? raw.suggestions.filter((s) => typeof s === "string" && s.trim())
      : [],
  };
}

export type GetResumeScoreOptions = {
  /** When false and authenticated, API errors throw instead of using local heuristic (default true). */
  fallbackToLocal?: boolean;
};

/**
 * For logged-in users, scores via DeepSeek on the server (rubric-aware).
 * Falls back to local heuristic when `fallbackToLocal` is true (default), or user is a guest.
 */
export async function getResumeScoreWithOptionalAI(
  data: CVFormData,
  isAuthenticated: boolean,
  options?: GetResumeScoreOptions,
): Promise<ResumeScore> {
  const fallbackToLocal = options?.fallbackToLocal !== false;
  if (!isAuthenticated) {
    return calculateResumeScore(data);
  }
  try {
    const raw = await aiAPI.scoreResume(data);
    if (import.meta.env.DEV) {
      console.info("[resume-score] server AI ok", {
        overall: raw.overallScore,
        suggestionCount: raw.suggestions?.length ?? 0,
      });
    }
    return normalizeAiScore(raw);
  } catch (err) {
    if (import.meta.env.DEV) {
      const msg = err instanceof Error ? err.message : String(err);
      if (fallbackToLocal) {
        console.warn(
          "[resume-score] server failed → using local heuristic. Reason:",
          msg,
        );
      } else {
        console.warn("[resume-score] server failed (no local fallback). Reason:", msg);
      }
    }
    if (!fallbackToLocal) {
      throw err instanceof Error ? err : new Error(String(err));
    }
    return calculateResumeScore(data);
  }
}
