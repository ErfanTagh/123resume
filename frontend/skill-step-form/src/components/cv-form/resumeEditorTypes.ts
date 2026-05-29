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
}
