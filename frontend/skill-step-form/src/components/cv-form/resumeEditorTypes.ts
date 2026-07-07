import type { UseFormReturn } from "react-hook-form";
import type { CVFormData, CVTemplate } from "./types";
import type { ResumeScore } from "@/lib/resumeScorer";

export interface ResumeEditorSideProps {
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
  /** When true, show a "parsing your resume" loading overlay on the preview. */
  isParsing?: boolean;
}
