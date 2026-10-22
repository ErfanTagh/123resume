import {
  Briefcase,
  CreditCard,
  FileText,
  Globe,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ResumesTabId } from "@/components/resumes/resumesTabStyles";

export type ResumesTabConfig = {
  id: ResumesTabId;
  /** i18n key under LanguageContext `t()` */
  labelKey: string;
  /** English fallback when the key is missing */
  fallback: string;
  icon: LucideIcon;
};

/**
 * Single source of truth for Resumes page tabs.
 * Consumed by the side rail and Header dropdown (R7).
 */
export const RESUMES_TABS: ResumesTabConfig[] = [
  {
    id: "resumes",
    labelKey: "pages.resumes.tabs.resumes",
    fallback: "My Resumes",
    icon: FileText,
  },
  {
    id: "job-matching",
    labelKey: "pages.resumes.tabs.jobMatching",
    fallback: "Job matching",
    icon: Sparkles,
  },
  {
    id: "job-tracker",
    labelKey: "pages.resumes.tabs.jobTracker",
    fallback: "Job tracker",
    icon: Briefcase,
  },
  {
    id: "portfolio",
    labelKey: "pages.resumes.tabs.portfolio",
    fallback: "Portfolio",
    icon: Globe,
  },
  {
    id: "business-card",
    labelKey: "pages.resumes.tabs.businessCard",
    fallback: "Card",
    icon: CreditCard,
  },
];

export const RESUMES_TAB_IDS = RESUMES_TABS.map((t) => t.id);

export function isResumesTabId(value: string | null): value is ResumesTabId {
  return value !== null && (RESUMES_TAB_IDS as string[]).includes(value);
}

export function resumesTabHref(id: ResumesTabId): string {
  return id === "resumes" ? "/resumes" : `/resumes?tab=${id}`;
}
