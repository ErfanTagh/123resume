import type { CVFormData } from "@/components/cv-form/types";
import { aiAPI } from "@/lib/api";
import { logResumeScore } from "@/lib/resumeScoreDebug";
import { summarizeResumePayloadForScore } from "@/lib/resumeScorePayloadSummary";
import {
  calculateResumeScore,
  type ResumeScore,
} from "@/lib/resumeScorer";
import { resumeProseLanguage, type ResumeProseLanguage } from "@/lib/resumeContentLanguage";
import type { ResumeTextChange } from "@/lib/resumeTextChanges";

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

/**
 * Turn the server's AI review into a ResumeScore.
 *
 * The NUMBERS are the AI's judgment of the resume's interview chances for its
 * target role (1 = thrown out, 10 = very likely an interview). Identical
 * resumes get identical scores from the server's content cache. The local
 * rule-based scorer only fills gaps: category names/maxima the UI expects, and
 * text for a category the AI left out.
 */
function aiScoreToResumeScore(
  data: CVFormData,
  lang: ResumeProseLanguage,
  raw: {
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
  },
): ResumeScore {
  const local = calculateResumeScore(data, lang);
  const aiByName = new Map(
    (raw.categories || []).map((c) => [c.name, c] as const),
  );
  const aiOverallFeedback =
    typeof raw.overallFeedback === "string" ? raw.overallFeedback.trim() : "";
  const aiSuggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions.filter((s) => typeof s === "string" && s.trim())
    : [];
  const overall = Number(raw.overallScore);

  return {
    overallScore: Number.isFinite(overall) ? overall : local.overallScore,
    categories: local.categories.map((c) => {
      const ai = aiByName.get(c.name);
      const aiScore = Number(ai?.score);
      return {
        name: c.name,
        score: ai && Number.isFinite(aiScore) ? aiScore : c.score,
        maxScore: c.maxScore,
        feedback: (ai?.feedback || c.feedback || "").trim(),
      };
    }),
    suggestions: aiSuggestions.length > 0 ? aiSuggestions : local.suggestions,
    overallFeedback: aiOverallFeedback || local.overallFeedback,
    fromAi: true,
  };
}

export type GetResumeScoreOptions = {
  /** When false and authenticated, API errors throw instead of using local heuristic (default true). */
  fallbackToLocal?: boolean;
  /** Language of the AI prose and canned tips. Defaults to the resume's own language. */
  outputLanguage?: "en" | "de";
  /** The last score and what changed since, so a re-score reflects the edits. */
  previous?: { score: number; changes: ResumeTextChange[] };
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
  // Default to the resume's own language, not English, when the caller doesn't say.
  const outputLanguage = options?.outputLanguage ?? resumeProseLanguage(data);
  if (!isAuthenticated) {
    return calculateResumeScore(data, outputLanguage);
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
      previous: options?.previous,
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
    return aiScoreToResumeScore(data, outputLanguage, raw);
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
    return calculateResumeScore(data, outputLanguage);
  }
}
