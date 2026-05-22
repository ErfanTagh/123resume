import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { CVFormData, CVTemplate } from "./types";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ModernTemplate } from "./templates/ModernTemplate";
import { ClassicTemplate } from "./templates/ClassicTemplate";
import { MinimalTemplate } from "./templates/MinimalTemplate";
import { CreativeTemplate } from "./templates/CreativeTemplate";
import { LatexTemplate } from "./templates/LatexTemplate";
import { StarRoverTemplate } from "./templates/StarRoverTemplate";
import { CVRating } from "./CVRating";
import { TemplateSelector } from "./TemplateSelector";
import { SectionOrderManager } from "./SectionOrderManager";
import { StylingSettings } from "./StylingSettings";
import { FileText, FileStack, Settings, Info, Languages, MessageSquare, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { feedbackAPI } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { logResumeScore } from "@/lib/resumeScoreDebug";
import type { ResumeScore } from "@/lib/resumeScorer";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";

interface CVPreviewProps {
  data: CVFormData;
  /** Logged-in: AI score from parent (Review step or Score tab refresh). */
  serverResumeScore?: ResumeScore;
  serverResumeScoreLoading?: boolean;
  /** Logged-in: request AI score (e.g. when opening Score tab or Re-analyze). */
  onRequestAiResumeScore?: (opts?: { force?: boolean }) => void;
  onTemplateChange?: (template: CVTemplate) => void;
  onSectionOrderChange?: (sectionOrder: string[]) => void;
  onStylingChange?: (styling: CVFormData['styling']) => void;
  currentStep?: number; // Current step to show relevant section styling
}

export const CVPreview = ({
  data,
  serverResumeScore,
  serverResumeScoreLoading,
  onRequestAiResumeScore,
  onTemplateChange,
  onSectionOrderChange,
  onStylingChange,
  currentStep,
}: CVPreviewProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("design");
  const [pageCount, setPageCount] = useState(1);
  const [pageBreakPositions, setPageBreakPositions] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [templateChangeKey, setTemplateChangeKey] = useState(0); // Force rerender on template change
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const template = data.template || "modern";
  const defaultSectionOrder = ["summary", "workExperience", "education", "projects", "certificates", "skills", "languages", "interests"];
  const sectionOrder = data.sectionOrder || defaultSectionOrder;
  const displayData = useMemo(() => withResumeSectionsSortedForDisplay(data), [data]);

  // Feedback dialog state (preview-side, so it’s near section titles)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(user?.email || "");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleSendFeedback = async () => {
    const resolvedEmail = (user?.email || feedbackEmail).trim();

    if (!resolvedEmail || !feedbackMessage.trim()) {
      toast({
        title: t("common.error") || "Error",
        description:
          t("resume.feedback.validation") ||
          "Please provide your email and a short message.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingFeedback(true);
      const context = `Template: ${template}, SectionTitlesLang: ${language}`;
      await feedbackAPI.sendFeedback({
        name: feedbackName || undefined,
        email: resolvedEmail,
        message: feedbackMessage.trim(),
        context,
      });

      setIsFeedbackOpen(false);
      setFeedbackMessage("");

      toast({
        title: t("resume.feedback.thankYouTitle") || "Thank you for your feedback!",
        description:
          t("resume.feedback.thankYouDesc") ||
          "We have received your message and will review it soon.",
      });
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description:
          error?.message ||
          t("resume.feedback.error") ||
          "We could not send your feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingFeedback(false);
    }
  };

  // Track template changes and force rerender
  const prevTemplateRef = useRef(template);
  useEffect(() => {
    if (prevTemplateRef.current !== template) {
      prevTemplateRef.current = template;
      setTemplateChangeKey(prev => prev + 1); // Force rerender
    }
  }, [template]);

  // Calculate page count based on content height
  // Use useLayoutEffect for synchronous DOM measurement after React updates
  useLayoutEffect(() => {
    if (previewRef.current && activeTab === "design") {
      let retryTimeoutId: NodeJS.Timeout | null = null;
      let retryCount = 0;
      const maxRetries = 10; // Reduced retries since useLayoutEffect runs after DOM updates
      const retryInterval = 100; // Faster retries

      const calculatePages = (): boolean => {
        const card = previewRef.current;
        if (!card) {
          setPageCount(1);
          return false;
        }

        // Find the wrapper div that contains the template
        const wrapper = card.querySelector('.resume-content-wrapper');
        if (!wrapper) {
          setPageCount(1);
          return false;
        }

        // Find the template's root element - prioritize .resume-page-container class
        // which is the standard root element for all templates
        let templateRoot = wrapper.querySelector('.resume-page-container') as HTMLElement;

        // Fallback: if resume-page-container not found, try first direct child
        if (!templateRoot || templateRoot.scrollHeight === 0) {
          templateRoot = wrapper.firstElementChild as HTMLElement;
        }

        // Fallback: if first child is not found or has no height, look for divs with template-like classes
        if (!templateRoot || templateRoot.scrollHeight === 0) {
          // Try to find the template root by looking for divs with common template classes
          const possibleRoots = wrapper.querySelectorAll('div.bg-background, div.p-8, div.max-w-4xl, div.max-w-3xl');
          if (possibleRoots.length > 0) {
            templateRoot = possibleRoots[0] as HTMLElement;
          }
        }

        // Last fallback: find the largest div in the wrapper
        if (!templateRoot || templateRoot.scrollHeight === 0) {
          const allDivs = Array.from(wrapper.querySelectorAll('div')) as HTMLElement[];
          if (allDivs.length > 0) {
            templateRoot = allDivs.reduce((largest, current) => {
              return (current.scrollHeight > largest.scrollHeight) ? current : largest;
            }, allDivs[0]);
          }
        }

        // If still no valid template root found, return false to indicate retry needed
        if (!templateRoot) {
          return false;
        }

        // Wait for content to actually render - check if height is meaningful
        // Templates should have at least some minimum height (e.g., header section)
        const minExpectedHeight = 200; // Minimum height for a valid template
        if (templateRoot.scrollHeight < minExpectedHeight) {
          // Content might still be loading, retry
          return false;
        }

        // Verify we're measuring the correct template by checking for expected structure
        // All templates should have a resume-page-container class or be a direct child with content
        const hasResumeContainer = templateRoot.classList.contains('resume-page-container');
        const hasContent = templateRoot.querySelector('h1, h2, [data-resume-section]') !== null;
        if (!hasResumeContainer && !hasContent) {
          // Might be measuring wrong element or template not fully rendered, retry
          return false;
        }

        // Get the actual rendered height of the content
        // Use scrollHeight for accurate measurement including all content
        const contentHeight = templateRoot.scrollHeight;

        // A4 page dimensions: 210mm x 297mm
        // At 96dpi: 794px x 1123px
        // Account for PDF padding: 15mm top + 15mm bottom = 30mm = ~113px
        // Actual content area per page: ~1010px
        // But in preview, templates have their own padding (p-8 = 32px = 64px total)
        // So effective page height in preview: ~1010px
        const pageHeight = 1010;

        // Calculate pages - use a smaller buffer (50px) since we're measuring scrollHeight
        // which should be accurate. The buffer accounts for minor spacing differences.
        const pages = contentHeight > pageHeight + 50
          ? Math.ceil(contentHeight / pageHeight)
          : 1;

        setPageCount(Math.max(1, pages));

        // Calculate page break positions (where each page ends)
        const breaks: number[] = [];
        if (pages > 1) {
          for (let i = 1; i < pages; i++) {
            breaks.push(pageHeight * i);
          }
        }
        setPageBreakPositions(breaks);
        return true; // Success
      };

      // Retry logic for template changes
      // useLayoutEffect runs after DOM updates, but we still need retries for async content
      const attemptCalculation = () => {
        const success = calculatePages();
        if (!success && retryCount < maxRetries) {
          retryCount++;
          retryTimeoutId = setTimeout(attemptCalculation, retryInterval);
        } else if (!success) {
          // After max retries, default to 1 page
          setPageCount(1);
          setPageBreakPositions([]);
        } else {
          // Reset retry count on success
          retryCount = 0;
        }
      };

      // Use ResizeObserver to watch for content size changes
      const wrapperElement = previewRef.current?.querySelector('.resume-content-wrapper');
      let resizeObserver: ResizeObserver | null = null;
      let mutationObserver: MutationObserver | null = null;

      if (wrapperElement) {
        resizeObserver = new ResizeObserver(() => {
          retryCount = 0; // Reset retry count on resize
          attemptCalculation();
        });
        resizeObserver.observe(wrapperElement);

        // Also use MutationObserver to detect when template content changes
        mutationObserver = new MutationObserver(() => {
          retryCount = 0; // Reset retry count on mutation
          // Add small delay to ensure React has finished rendering
          setTimeout(() => {
            attemptCalculation();
          }, 50);
        });
        mutationObserver.observe(wrapperElement, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      }

      // Start calculation immediately - useLayoutEffect runs after DOM is updated
      retryCount = 0; // Reset retry count when effect runs
      attemptCalculation();

      // Also recalculate on window resize
      const handleResize = () => {
        retryCount = 0; // Reset retry count on resize
        attemptCalculation();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        if (retryTimeoutId) {
          clearTimeout(retryTimeoutId);
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (mutationObserver) {
          mutationObserver.disconnect();
        }
        window.removeEventListener('resize', handleResize);
      };
    } else {
      // Reset to 1 page when not on design tab
      setPageCount(1);
      setPageBreakPositions([]);
      setCurrentPage(1);
    }
  }, [displayData, activeTab, template, templateChangeKey]); // Add templateChangeKey to dependencies

  // Separate effect to handle template changes specifically
  // Use useLayoutEffect for immediate DOM measurement after template change
  useLayoutEffect(() => {
    if (previewRef.current && activeTab === "design") {
      let attemptCount = 0;
      const maxAttempts = 10;
      let timeoutId: NodeJS.Timeout | null = null;
      
      const attemptCalculation = () => {
        attemptCount++;
        const card = previewRef.current;
        if (!card) {
          if (attemptCount < maxAttempts) {
            timeoutId = setTimeout(attemptCalculation, 100);
          }
          return;
        }

        const wrapper = card.querySelector('.resume-content-wrapper');
        if (!wrapper) {
          if (attemptCount < maxAttempts) {
            timeoutId = setTimeout(attemptCalculation, 100);
          }
          return;
        }

        // Look for the template root - prioritize .resume-page-container
        let templateRoot = wrapper.querySelector('.resume-page-container') as HTMLElement;
        
        // Fallback to first child if resume-page-container not found
        if (!templateRoot) {
          templateRoot = wrapper.firstElementChild as HTMLElement;
        }
        
        // Last fallback: find largest div
        if (!templateRoot || templateRoot.scrollHeight === 0) {
          const allDivs = Array.from(wrapper.querySelectorAll('div')) as HTMLElement[];
          if (allDivs.length > 0) {
            templateRoot = allDivs.reduce((largest, current) => {
              return (current.scrollHeight > largest.scrollHeight) ? current : largest;
            }, allDivs[0]);
          }
        }
        
        if (!templateRoot) {
          if (attemptCount < maxAttempts) {
            timeoutId = setTimeout(attemptCalculation, 100);
          }
          return;
        }

        // Wait for content to render - check if height is meaningful
        if (templateRoot.scrollHeight < 200) {
          if (attemptCount < maxAttempts) {
            timeoutId = setTimeout(attemptCalculation, 100);
          }
          return;
        }

        // Valid measurement - calculate pages
        const contentHeight = templateRoot.scrollHeight;
        const pageHeight = 1010;
        const pages = contentHeight > pageHeight + 50
          ? Math.ceil(contentHeight / pageHeight)
          : 1;

        setPageCount(Math.max(1, pages));

        const breaks: number[] = [];
        if (pages > 1) {
          for (let i = 1; i < pages; i++) {
            breaks.push(pageHeight * i);
          }
        }
        setPageBreakPositions(breaks);
      };

      // Start attempts immediately - useLayoutEffect runs after DOM is updated
      attemptCalculation();

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }
  }, [template, activeTab, templateChangeKey]); // Add templateChangeKey to force recalculation

  // Track scroll position to update current page indicator
  useEffect(() => {
    if (scrollContainerRef.current && activeTab === "design" && pageCount > 1) {
      const scrollContainer = scrollContainerRef.current;
      const pageHeight = 1010;

      const handleScroll = () => {
        const scrollTop = scrollContainer.scrollTop;
        // Calculate which page we're currently viewing
        // Add a buffer (100px) to account for scrolling into the next page
        const currentPageNum = Math.min(
          Math.max(1, Math.floor(scrollTop / pageHeight) + 1),
          pageCount
        );
        setCurrentPage(currentPageNum);
      };

      scrollContainer.addEventListener('scroll', handleScroll);
      // Calculate initial page
      handleScroll();

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    } else {
      setCurrentPage(1);
    }
  }, [pageCount, activeTab, pageBreakPositions]);

  // Sync horizontal scroll between horizontal scrollbar and content for LaTeX
  useEffect(() => {
    if (template !== 'latex' || !horizontalScrollRef.current || !previewRef.current) return;

    const horizontalScrollEl = horizontalScrollRef.current;
    const contentEl = previewRef.current.querySelector('.resume-content-wrapper') as HTMLElement;

    if (!contentEl) return;

    // Set the scrollable width to match content width
    const updateScrollWidth = () => {
      const scrollWidth = contentEl.scrollWidth;
      const spacer = horizontalScrollEl.querySelector('div');
      if (spacer) {
        spacer.style.width = `${scrollWidth}px`;
      }
    };

    updateScrollWidth();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(contentEl);

    const handleHorizontalScroll = () => {
      contentEl.scrollLeft = horizontalScrollEl.scrollLeft;
    };

    const handleContentScroll = () => {
      horizontalScrollEl.scrollLeft = contentEl.scrollLeft;
    };

    horizontalScrollEl.addEventListener('scroll', handleHorizontalScroll);
    contentEl.addEventListener('scroll', handleContentScroll);

    return () => {
      resizeObserver.disconnect();
      horizontalScrollEl.removeEventListener('scroll', handleHorizontalScroll);
      contentEl.removeEventListener('scroll', handleContentScroll);
    };
  }, [template, displayData]);

  const handleTemplateSelect = (selectedTemplate: CVTemplate) => {
    if (onTemplateChange) {
      onTemplateChange(selectedTemplate);
    }
    // Switch to Design tab when template is selected
    setActiveTab("design");
  };

  const handleSectionOrderChange = (newOrder: string[]) => {
    if (onSectionOrderChange) {
      onSectionOrderChange(newOrder);
    }
  };

  const renderTemplate = () => {
    switch (template) {
      case "classic":
        return <ClassicTemplate data={displayData} />;
      case "minimal":
        return <MinimalTemplate data={displayData} />;
      case "creative":
        return <CreativeTemplate data={displayData} />;
      case "latex":
        return <LatexTemplate data={displayData} />;
      case "starRover":
        return <StarRoverTemplate data={displayData} />;
      case "modern":
      default:
        return <ModernTemplate data={displayData} />;
    }
  };

  return (
    <div className="space-y-4 sticky top-4 w-full min-w-[400px]">
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v);
          if (v === "score" && user) {
            logResumeScore("ui:preview-tab-score", {
              hasHandler: typeof onRequestAiResumeScore === "function",
            });
            onRequestAiResumeScore?.();
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="design" className="flex items-center gap-2 text-xs">
            <FileText className="h-4 w-4" />
            {t('resume.tabs.design') || 'Design'}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 text-xs">
            <FileStack className="h-4 w-4" />
            {t('resume.tabs.templates') || 'Templates'}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 text-xs">
            <Settings className="h-4 w-4" />
            {t('resume.tabs.settings') || 'Settings'}
          </TabsTrigger>
          <TabsTrigger value="score" className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-4 w-4" />
            {t('resume.tabs.score') || 'Score'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="mt-4">
          <div className="relative flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
            {/* Page indicator + section titles — sticky at top */}
            <div className="sticky top-0 z-20 mb-2 flex-shrink-0 overflow-visible bg-background/95 pb-2 pt-0.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              {/* Page indicator */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-md border border-border/50">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {pageCount === 1
                      ? `${t('resume.preview.page') || 'Page'} 1`
                      : `${t('resume.preview.page') || 'Page'} ${currentPage} / ${pageCount}`
                    }
                  </span>
                </div>
                {pageCount > 1 && (
                  <div className="flex gap-1">
                    {Array.from({ length: pageCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-4 rounded transition-colors ${i + 1 === currentPage ? 'bg-primary' : 'bg-muted-foreground/40'
                          }`}
                        title={`${t('resume.preview.page') || 'Page'} ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Section titles - controls language of section headings in preview */}
              <div className="flex items-center gap-2 mt-2">
                <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t("resume.form.sectionTitles")}:
                </span>
                <Select
                  value={language}
                  onValueChange={(v) => setLanguage(v as "en" | "de")}
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      {t("resume.form.sectionTitlesEnglish")}
                    </SelectItem>
                    <SelectItem value="de">
                      {t("resume.form.sectionTitlesDeutsch")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto">
                  <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-muted-foreground hover:text-primary"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t("resume.feedback.button") || "Feedback"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t("resume.feedback.title") || "Send Feedback"}
                        </DialogTitle>
                        <DialogDescription>
                          {t("resume.feedback.description") ||
                            "Share your ideas, issues, or feature requests with the 123Resume team."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t("resume.feedback.name") || "Name (optional)"}
                          </label>
                          <Input
                            value={feedbackName}
                            onChange={(e) => setFeedbackName(e.target.value)}
                            placeholder={
                              t("resume.feedback.namePlaceholder") || "Your name"
                            }
                          />
                        </div>
                        {!user?.email && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              {t("resume.feedback.email") || "Email"}
                            </label>
                            <Input
                              type="email"
                              value={feedbackEmail}
                              onChange={(e) => setFeedbackEmail(e.target.value)}
                              placeholder="you@example.com"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">
                            {t("resume.feedback.message") || "Your feedback"}
                          </label>
                          <Textarea
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            placeholder={
                              t("resume.feedback.messagePlaceholder") ||
                              "Tell us what works well, what’s confusing, or what you’d like to see improved."
                            }
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsFeedbackOpen(false)}
                        >
                          {t("common.cancel") || "Cancel"}
                        </Button>
                        <Button
                          type="button"
                          className="gap-2"
                          disabled={isSendingFeedback}
                          onClick={handleSendFeedback}
                        >
                          {isSendingFeedback && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          )}
                          {t("resume.feedback.submit") || "Send Feedback"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            {/* Horizontal scroll container - below page indicator for LaTeX */}
            {template === 'latex' && (
              <div
                ref={horizontalScrollRef}
                className="overflow-x-auto flex-shrink-0 mb-2 pb-1"
                id="latex-horizontal-scroll"
                style={{ scrollbarWidth: 'thin' }}
              >
                <div style={{ width: '210mm', height: '1px' }}></div>
              </div>
            )}

            {/* Scrollable resume content */}
            <div
              className={`flex-1 min-h-0 ${template === 'latex'
                ? 'overflow-x-hidden overflow-y-auto'
                : 'overflow-y-auto bg-muted/30'
                }`}
              ref={scrollContainerRef}
            >
              <Card className={`h-fit ${template === 'latex' ? 'overflow-x-hidden overflow-y-hidden bg-background' : 'overflow-hidden'}`} ref={previewRef}>
                <div className={`resume-content-wrapper relative ${template === 'latex' ? 'overflow-x-auto overflow-y-hidden' : ''}`} style={template === 'latex' ? { scrollbarWidth: 'none', msOverflowStyle: 'none' } : {}}>
                  <style>{`
                  .resume-content-wrapper {
                    position: relative;
                  }
                  .resume-content-wrapper::-webkit-scrollbar {
                    display: none;
                  }
                  /* Visual page break indicator at calculated page boundaries */
                  .page-break-line {
                    position: absolute;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: repeating-linear-gradient(
                      to right,
                      #9ca3af 0px,
                      #9ca3af 8px,
                      transparent 8px,
                      transparent 16px
                    );
                    pointer-events: none;
                    z-index: 999;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                  }
                  /* Page number indicator at bottom right of each page */
                  .page-number-indicator {
                    position: absolute !important;
                    right: 8px !important;
                    font-size: 12px !important;
                    color: #374151 !important;
                    font-weight: 700 !important;
                    pointer-events: none;
                    z-index: 50 !important;
                    background: rgba(255, 255, 255, 0.98) !important;
                    padding: 6px 10px !important;
                    border-radius: 6px !important;
                    border: 2px solid rgba(59, 130, 246, 0.3) !important;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
                    font-family: system-ui, -apple-system, sans-serif !important;
                  }
                  /* Add top padding to resume containers for proper spacing */
                  .resume-page-container {
                    padding-top: 32px !important;
                    padding-bottom: 32px !important;
                  }
                `}</style>
                  {renderTemplate()}

                  {/* Page numbers and break lines */}
                  {/* First page number - at bottom of first page, before first break */}
                  {pageCount > 0 && (
                    <div
                      className="page-number-indicator"
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: pageBreakPositions.length > 0
                          ? `${pageBreakPositions[0] - 25}px`
                          : 'auto',
                        bottom: pageBreakPositions.length === 0 ? '8px' : 'auto',
                        zIndex: 999
                      }}
                    >
                      Page 1
                    </div>
                  )}
                  {/* Page break lines and subsequent page numbers */}
                  {pageBreakPositions.map((position, index) => {
                    const pageNumber = index + 2;
                    // Position represents where page (index+1) ends, so we need next break for page (index+2)
                    // If this is the last page break and there's one more page, position that page number at the end
                    const isLastPage = pageNumber === pageCount;
                    // For page 2, 3, etc., position at bottom of that page (before its next break)
                    // pageBreakPositions[index] is where page (index+1) ends, so page (index+2) starts here
                    // We need the break that marks where page (index+2) ends
                    const pageBreakPosition = pageBreakPositions[index]; // Where this page starts
                    const nextPageBreakPosition = index + 1 < pageBreakPositions.length
                      ? pageBreakPositions[index + 1]
                      : null; // Where this page ends (if not last page)

                    return (
                      <div key={`break-${index}`}>
                        {/* Page break line - marks end of previous page, start of this page */}
                        <div
                          className="page-break-line"
                          style={{ top: `${position}px`, zIndex: 999 }}
                        />
                        {/* Page number at bottom of this page (before next break, or at end if last page) */}
                        <div
                          className="page-number-indicator"
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: isLastPage
                              ? 'auto'
                              : nextPageBreakPosition
                                ? `${nextPageBreakPosition - 25}px` // Bottom of this page (before next break)
                                : 'auto',
                            bottom: isLastPage ? '8px' : 'auto',
                            zIndex: 999
                          }}
                        >
                          Page {pageNumber}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div className="flex items-center gap-2 px-1 mt-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-muted-foreground/30 bg-muted/30">
                  {t('resume.preview.notice') || 'Preview only - Page breaks are approximate. PDF export will have proper formatting.'}
                </Badge>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="p-6">
            <TemplateSelector
              selected={template}
              onSelect={handleTemplateSelect}
            />
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <StylingSettings
            data={data}
            currentStep={currentStep}
            onStylingChange={(styling) => {
              if (onStylingChange) {
                onStylingChange(styling);
              }
            }}
          />
          <SectionOrderManager
            sectionOrder={sectionOrder}
            onReorder={handleSectionOrderChange}
          />
        </TabsContent>

        <TabsContent value="score" className="mt-4">
          <CVRating
            onAnalyze={user ? () => onRequestAiResumeScore?.({ force: true }) : undefined}
            isAnalyzing={!!user && !!serverResumeScoreLoading}
            rating={serverResumeScore}
            ratingLoading={!!user && !!serverResumeScoreLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

