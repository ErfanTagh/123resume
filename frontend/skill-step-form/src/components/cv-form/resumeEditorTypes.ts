import type { UseFormReturn } from "react-hook-form";
import type { CVFormData, CVTemplate } from "./types";
import type { ResumeScore } from "@/lib/resumeScorer";
import type { TrackedReviewChange } from "./useResumeAiReview";

/** The AI review shown ON the preview: pending suggestions become clickable
 *  green (improve) / red (delete) marks with an accept/reject popover,
 *  additions appear as chips above the resume, and the preview header carries
 *  the score (its color follows the score) plus the review controls. */
export interface ResumePreviewReview {
  changes: TrackedReviewChange[];
  onAction: (index: number, status: "accepted" | "rejected") => void;
  /** Claude is generating suggestions right now. */
  loading: boolean;
  /** A fetch has completed (distinguishes "no suggestions" from "not asked yet"). */
  fetched: boolean;
  /** The last fetch errored — stop the loading overlay and offer a retry. */
  failed?: boolean;
  /** Displayed overall score 0-10 (base + accepted points). */
  score?: number;
  scoreLoading?: boolean;
  onReanalyzeScore?: () => void;
  pendingCount: number;
  pendingPoints: number;
  allAccepted: boolean;
  onAcceptAll: () => void;
  onRunAgain: () => void;
  /** Set only when there is an action to undo. */
  onUndo?: () => void;
}

export interface ResumeEditorSideProps {
  /** AI review rendered on the preview (review step only). */
  review?: ResumePreviewReview;
  data: CVFormData;
  /** When provided (editor), enables the in-place "Translate" action in the preview toolbar. */
  form?: UseFormReturn<CVFormData>;
  /** Called after an in-place translation so the parent can refresh the score. */
  onTranslated?: () => void;
  serverResumeScore?: ResumeScore;
  serverResumeScoreLoading?: boolean;
  onRequestAiResumeScore?: (opts?: { force?: boolean }) => void;
  onTemplateChange?: (template: CVTemplate) => void;
  onSectionOrderChange?: (sectionOrder: string[]) => void;
  onStylingChange?: (styling: CVFormData["styling"]) => void;
  currentStep?: number;
}
