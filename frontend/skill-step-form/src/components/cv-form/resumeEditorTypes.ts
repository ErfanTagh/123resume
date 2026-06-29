import type { CVFormData, CVTemplate } from "./types";
import type { ResumeScore } from "@/lib/resumeScorer";

export interface ResumeEditorSideProps {
  data: CVFormData;
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
