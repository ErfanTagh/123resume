import type { CVFormData } from "@/components/cv-form/types";
import { aiAPI } from "@/lib/api";
import { logResumeScore } from "@/lib/resumeScoreDebug";
import { summarizeResumePayloadForScore } from "@/lib/resumeScorePayloadSummary";
import {
  calculateResumeScore,
  type ResumeScore,
} from "@/lib/resumeScorer";

/** Never send profile photos to the scoring API — not used by the rubric and they bloat the payload. */
function cloneResumeForAiScore(data: CVFormData): CVFormData {
  try {
    const copy = structuredClone(data) as CVFormData;
    if (copy.personalInfo) {
      delete copy.personalInfo.profileImage;
    }
    return copy;
  } catch {
    if (!data.personalInfo) {
      return { ...data } as CVFormData;
    }
    const { profileImage: _omit, ...personalInfoRest } = data.personalInfo;
    return { ...data, personalInfo: personalInfoRest } as CVFormData;
  }
}

function normalizeAiScore(raw: {
  overallScore: number;
  estimatedPages?: number;
  overallFeedback?: string;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
  suggestions: string[];
}): ResumeScore {
  const overallFeedback =
    typeof raw.overallFeedback === "string" ? raw.overallFeedback.trim() : "";
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
    overallFeedback: overallFeedback || undefined,
    fromAi: true,
  };
}

export type GetResumeScoreOptions = {
  /** When false and authenticated, API errors throw instead of using local heuristic (default true). */
  fallbackToLocal?: boolean;
  /** Matches site / résumé section language: AI prose in English or German. */
  outputLanguage?: "en" | "de";
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
  const outputLanguage = options?.outputLanguage ?? "en";
  if (!isAuthenticated) {
    return calculateResumeScore(data);
  }
  const payloadForApi = cloneResumeForAiScore(data);
  const payloadSummary = summarizeResumePayloadForScore(payloadForApi);
  logResumeScore("client:getResumeScoreWithOptionalAI:start", {
    outputLanguage,
    fallbackToLocal,
    payloadSummary,
  });
  if (import.meta.env.DEV) {
    console.info("[resume-score] payload sent to API", payloadSummary);
  }
  try {
    const raw = await aiAPI.scoreResume(payloadForApi, {
      outputLanguage,
    });
    logResumeScore("client:getResumeScoreWithOptionalAI:api-ok", {
      overall: raw.overallScore,
      suggestionCount: raw.suggestions?.length ?? 0,
    });
    if (import.meta.env.DEV) {
      console.info("[resume-score] server AI ok", {
        overall: raw.overallScore,
        suggestionCount: raw.suggestions?.length ?? 0,
      });
    }
    return normalizeAiScore(raw);
  } catch (err) {
    logResumeScore("client:getResumeScoreWithOptionalAI:api-error", {
      err: err instanceof Error ? err.message : String(err),
      fallbackToLocal,
    });
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
    logResumeScore("client:getResumeScoreWithOptionalAI:fallback-local", {
      err: err instanceof Error ? err.message : String(err),
    });
    return calculateResumeScore(data);
  }
}
