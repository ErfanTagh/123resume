import { useEffect, useRef, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Info, Languages, MessageSquare } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { withResumeSectionsSortedForDisplay } from "@/lib/resumeDisplaySort";
import type { ResumeEditorSideProps } from "./resumeEditorTypes";
import { useResumePageMetrics } from "./useResumePageMetrics";
import { renderResumeTemplate, RESUME_PREVIEW_INLINE_STYLES } from "./renderResumeTemplate";

export const ResumePreviewPane = ({ data }: ResumeEditorSideProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [templateChangeKey, setTemplateChangeKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const template = data.template || "modern";
  const displayData = useMemo(() => withResumeSectionsSortedForDisplay(data), [data]);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(user?.email || "");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const prevTemplateRef = useRef(template);
  useEffect(() => {
    if (prevTemplateRef.current !== template) {
      prevTemplateRef.current = template;
      setTemplateChangeKey((prev) => prev + 1);
    }
  }, [template]);

  const { pageCount, pageBreakPositions, currentPage } = useResumePageMetrics(
    previewRef,
    scrollContainerRef,
    displayData,
    template,
    templateChangeKey,
  );

  useEffect(() => {
    if (template !== "latex" || !horizontalScrollRef.current || !previewRef.current) return;

    const horizontalScrollEl = horizontalScrollRef.current;
    const contentEl = previewRef.current.querySelector(
      ".resume-content-wrapper",
    ) as HTMLElement;
    if (!contentEl) return;

    const updateScrollWidth = () => {
      const spacer = horizontalScrollEl.querySelector("div");
      if (spacer) spacer.style.width = `${contentEl.scrollWidth}px`;
    };

    updateScrollWidth();
    const resizeObserver = new ResizeObserver(updateScrollWidth);
    resizeObserver.observe(contentEl);

    const handleHorizontalScroll = () => {
      contentEl.scrollLeft = horizontalScrollEl.scrollLeft;
    };
    const handleContentScroll = () => {
      horizontalScrollEl.scrollLeft = contentEl.scrollLeft;
    };

    horizontalScrollEl.addEventListener("scroll", handleHorizontalScroll);
    contentEl.addEventListener("scroll", handleContentScroll);

    return () => {
      resizeObserver.disconnect();
      horizontalScrollEl.removeEventListener("scroll", handleHorizontalScroll);
      contentEl.removeEventListener("scroll", handleContentScroll);
    };
  }, [template, displayData]);

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
      await feedbackAPI.sendFeedback({
        name: feedbackName || undefined,
        email: resolvedEmail,
        message: feedbackMessage.trim(),
        context: `Template: ${template}, SectionTitlesLang: ${language}`,
      });
      setIsFeedbackOpen(false);
      setFeedbackMessage("");
      toast({
        title: t("resume.feedback.thankYouTitle") || "Thank you for your feedback!",
        description:
          t("resume.feedback.thankYouDesc") ||
          "We have received your message and will review it soon.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("resume.feedback.error");
      toast({
        title: t("common.error") || "Error",
        description: message || "We could not send your feedback. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className="sticky top-4 flex w-full min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-muted/50 via-muted/25 to-transparent px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/10"
            aria-hidden
          >
            <FileText className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.25} />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {t("resume.preview.title") || "Preview"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm tabular-nums text-muted-foreground">
          <span className="font-medium">
            {pageCount === 1
              ? `${t("resume.preview.page") || "Page"} 1`
              : `${t("resume.preview.page") || "Page"} ${currentPage} / ${pageCount}`}
          </span>
          {pageCount > 1 && (
            <div className="flex gap-0.5">
              {Array.from({ length: pageCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-3 rounded transition-colors ${
                    i + 1 === currentPage ? "bg-primary" : "bg-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          {t("resume.form.sectionTitles")}:
        </span>
        <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "de")}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("resume.form.sectionTitlesEnglish")}</SelectItem>
            <SelectItem value="de">{t("resume.form.sectionTitlesDeutsch")}</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t("resume.feedback.button") || "Feedback"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("resume.feedback.title") || "Send Feedback"}</DialogTitle>
              <DialogDescription>
                {t("resume.feedback.description") ||
                  "Share your ideas, issues, or feature requests with the 123Resume team."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("resume.feedback.name")}</label>
                <Input
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder={t("resume.feedback.namePlaceholder") || "Your name"}
                />
              </div>
              {!user?.email && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("resume.feedback.email")}</label>
                  <Input
                    type="email"
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("resume.feedback.message")}</label>
                <Textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsFeedbackOpen(false)}>
                {t("common.cancel") || "Cancel"}
              </Button>
              <Button type="button" disabled={isSendingFeedback} onClick={handleSendFeedback}>
                {isSendingFeedback && (
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                )}
                {t("resume.feedback.submit") || "Send Feedback"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {template === "latex" && (
        <div
          ref={horizontalScrollRef}
          className="flex-shrink-0 overflow-x-auto border-b border-border px-2 py-1"
          style={{ scrollbarWidth: "thin" }}
        >
          <div style={{ width: "210mm", height: "1px" }} />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        data-resume-scroll
        className={`min-h-0 flex-1 ${
          template === "latex"
            ? "max-h-[calc(100vh-11rem)] overflow-x-hidden overflow-y-auto"
            : "max-h-[calc(100vh-11rem)] overflow-y-auto bg-muted/20"
        }`}
      >
        <Card
          ref={previewRef}
          className={`m-2 h-fit border-0 shadow-none ${
            template === "latex" ? "overflow-x-hidden overflow-y-hidden bg-background" : "overflow-hidden"
          }`}
        >
          <div
            className={`resume-content-wrapper relative ${
              template === "latex" ? "overflow-x-auto overflow-y-hidden" : ""
            }`}
            style={
              template === "latex"
                ? { scrollbarWidth: "none", msOverflowStyle: "none" }
                : undefined
            }
          >
            <style>{RESUME_PREVIEW_INLINE_STYLES}</style>
            {renderResumeTemplate(displayData)}
            {pageCount > 0 && (
              <div
                className="page-number-indicator"
                style={{
                  position: "absolute",
                  right: "8px",
                  top:
                    pageBreakPositions.length > 0
                      ? `${pageBreakPositions[0] - 25}px`
                      : "auto",
                  bottom: pageBreakPositions.length === 0 ? "8px" : "auto",
                  zIndex: 999,
                }}
              >
                Page 1
              </div>
            )}
            {pageBreakPositions.map((position, index) => {
              const pageNumber = index + 2;
              const isLastPage = pageNumber === pageCount;
              const nextPageBreakPosition =
                index + 1 < pageBreakPositions.length
                  ? pageBreakPositions[index + 1]
                  : null;

              return (
                <div key={`break-${index}`}>
                  <div className="page-break-line" style={{ top: `${position}px`, zIndex: 999 }} />
                  <div
                    className="page-number-indicator"
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: isLastPage
                        ? "auto"
                        : nextPageBreakPosition
                          ? `${nextPageBreakPosition - 25}px`
                          : "auto",
                      bottom: isLastPage ? "8px" : "auto",
                      zIndex: 999,
                    }}
                  >
                    Page {pageNumber}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="flex flex-shrink-0 items-start gap-2 border-t border-border bg-muted/20 px-3 py-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("resume.preview.notice")}
        </p>
      </div>
    </div>
  );
};
