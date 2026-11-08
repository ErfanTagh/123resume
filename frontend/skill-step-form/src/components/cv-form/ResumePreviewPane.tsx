import { useEffect, useRef, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CheckCircle2, FileText, Info, Languages, MessageSquare, RefreshCw, Trash2, TrendingUp, Wand2, X } from "lucide-react";
import { celebrate } from "@/lib/celebrate";
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
import { ResumeTranslateControls } from "./ResumeTranslateControls";
import { useResumeTranslate } from "./useResumeTranslate";

interface MarkRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** One pending AI suggestion located on the rendered resume. */
interface ChangeMark {
  /** Index into review.changes. */
  index: number;
  color: "green" | "red";
  rects: MarkRect[];
}

const POPOVER_WIDTH = 300;

// Item key inside each array an AI addition can go into (matches useResumeAiReview).
const ADDITION_ITEM_KEY: Record<string, string> = {
  responsibilities: "responsibility",
  highlights: "highlight",
  skills: "skill",
  descriptions: "description",
};

/** Append an AI-suggested addition into a cloned resume at its target array,
 *  so the preview renders the resume as it would look once accepted. */
function appendAdditionAtPath(root: Record<string, unknown>, path: string, text: string): void {
  const parts = path.split(".");
  let obj: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (obj == null || typeof obj !== "object") return;
    obj = /^\d+$/.test(part)
      ? (obj as unknown[])[Number(part)]
      : (obj as Record<string, unknown>)[part];
  }
  if (obj == null || typeof obj !== "object") return;
  const last = parts[parts.length - 1];
  const key = ADDITION_ITEM_KEY[last] ?? "text";
  const holder = obj as Record<string, unknown>;
  if (!Array.isArray(holder[last])) holder[last] = [];
  (holder[last] as Array<Record<string, string>>).push({ [key]: text });
}

/** Score 0 → red, 10 → green: the preview's cover follows the resume score. */
const scoreHue = (score: number) => Math.round((Math.max(0, Math.min(10, score)) / 10) * 142);
const scoreColor = (score: number) => `hsl(${scoreHue(score)} 70% 40%)`;
const scoreTint = (score: number, alpha: number) => `hsl(${scoreHue(score)} 70% 40% / ${alpha})`;

export const ResumePreviewPane = ({ data, form, onTranslated, review }: ResumeEditorSideProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { user } = useAuth();
  const [isTranslateOpen, setIsTranslateOpen] = useState(false);
  const { loading: isTranslating, translate } = useResumeTranslate(form, onTranslated);
  const [templateChangeKey, setTemplateChangeKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const template = data.template || "modern";
  const displayData = useMemo(() => withResumeSectionsSortedForDisplay(data), [data]);

  // AI review: pending ADDITIONS are rendered inline, as if already accepted —
  // the resume preview shows what accepting would look like, with each added
  // piece marked green and clickable (accept keeps it, reject removes it).
  const reviewChangesForData = review?.changes;
  const previewData = useMemo(() => {
    const adds = (reviewChangesForData ?? []).filter(
      (c) => c.kind === "add" && c.status === "pending" && c.improved,
    );
    if (adds.length === 0) return displayData;
    const clone = structuredClone(displayData) as unknown as Record<string, unknown>;
    for (const c of adds) appendAdditionAtPath(clone, c.path, c.improved);
    return clone as typeof displayData;
  }, [displayData, reviewChangesForData]);

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
    previewData,
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
  }, [template, previewData]);

  // AI-review marks: locate each pending suggestion's text on the rendered
  // resume and paint clickable green/red rectangles over it (an overlay, so the
  // React-rendered template DOM itself is never touched). Clicking a mark opens
  // an accept/reject popover anchored to it.
  const [changeMarks, setChangeMarks] = useState<ChangeMark[]>([]);
  const [wrapperWidth, setWrapperWidth] = useState(0);
  const [activeMarkIndex, setActiveMarkIndex] = useState<number | null>(null);
  /** Popover opens below the mark, or above it when the mark is near the
   *  bottom of the viewport. */
  const [popoverPlacement, setPopoverPlacement] = useState<"below" | "above">("below");
  // Hover: a short grace period lets the mouse travel from the mark into the
  // popover (and between lines of one mark) without the dialog closing.
  const hoverCloseTimer = useRef<number>();
  const openMark = (index: number, anchor: HTMLElement) => {
    window.clearTimeout(hoverCloseTimer.current);
    const r = anchor.getBoundingClientRect();
    setPopoverPlacement(window.innerHeight - r.bottom < 260 ? "above" : "below");
    setActiveMarkIndex(index);
  };
  const scheduleCloseMark = () => {
    window.clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => setActiveMarkIndex(null), 250);
  };
  const cancelCloseMark = () => window.clearTimeout(hoverCloseTimer.current);
  useEffect(() => () => window.clearTimeout(hoverCloseTimer.current), []);
  const reviewChanges = review?.changes;
  useEffect(() => {
    const pending = (reviewChanges ?? []).filter((c) => c.status === "pending");
    if (pending.length === 0) {
      setChangeMarks([]);
      return;
    }
    let cancelled = false;
    const compute = () => {
      if (cancelled) return;
      const wrapper = previewRef.current?.querySelector(".resume-content-wrapper") as HTMLElement | null;
      if (!wrapper) return;
      const wrapperRect = wrapper.getBoundingClientRect();
      setWrapperWidth(wrapperRect.width);
      const marks: ChangeMark[] = [];
      (reviewChanges ?? []).forEach((change, index) => {
        if (change.status !== "pending") return;
        const isAdd = change.kind === "add";
        // Additions are rendered inline (previewData) — locate their own text.
        const target = (isAdd ? change.improved : change.original || "").trim();
        if (!target) return;
        const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const content = node.textContent || "";
          // Short added texts (a skill) can occur elsewhere in the resume, so an
          // addition must match a whole text node, not a substring.
          if (isAdd && content.trim() !== target) continue;
          let at = content.indexOf(target);
          let len = target.length;
          if (at < 0 && target.length > 40) {
            // The field may render slightly reformatted — match on a prefix.
            const prefix = target.slice(0, 40);
            at = content.indexOf(prefix);
            if (at >= 0) len = Math.min(content.length - at, target.length);
          }
          if (at < 0) continue;
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, Math.min(at + len, content.length));
          const rects: MarkRect[] = [];
          for (const r of Array.from(range.getClientRects())) {
            if (r.width < 1 || r.height < 1) continue;
            rects.push({
              top: r.top - wrapperRect.top,
              left: r.left - wrapperRect.left,
              width: r.width,
              height: r.height,
            });
          }
          range.detach();
          if (rects.length > 0) {
            marks.push({ index, color: change.kind === "delete" ? "red" : "green", rects });
          }
          break;
        }
      });
      setChangeMarks(marks);
    };
    // Give the template render + fonts a beat before measuring, and measure
    // again after the review-mode column animation (700ms) has finished.
    const timer = window.setTimeout(compute, 180);
    const timerAfterAnimation = window.setTimeout(compute, 950);
    window.addEventListener("resize", compute);
    // The preview grows to full width when the form column closes — text
    // reflows, so remeasure whenever the wrapper's size changes.
    const observed = previewRef.current?.querySelector(".resume-content-wrapper");
    const resizeObserver = new ResizeObserver(() => compute());
    if (observed) resizeObserver.observe(observed);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearTimeout(timerAfterAnimation);
      window.removeEventListener("resize", compute);
      resizeObserver.disconnect();
    };
  }, [reviewChanges, previewData, template]);

  // Close the popover when its change stops being pending (accepted/rejected).
  useEffect(() => {
    if (activeMarkIndex === null) return;
    const change = reviewChanges?.[activeMarkIndex];
    if (!change || change.status !== "pending") setActiveMarkIndex(null);
  }, [reviewChanges, activeMarkIndex]);

  const activeChange = activeMarkIndex !== null ? reviewChanges?.[activeMarkIndex] : undefined;
  const activeMark =
    activeMarkIndex !== null ? changeMarks.find((m) => m.index === activeMarkIndex) : undefined;

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

  // Cover color: the preview's frame and header follow the resume score,
  // turning greener as suggestions are accepted.
  const cover = review?.score != null ? scoreColor(review.score) : undefined;
  const coverTint = (alpha: number) =>
    review?.score != null ? scoreTint(review.score, alpha) : undefined;

  // Big loading overlay while the AI review runs: shown from entering the
  // Review step until both the score and Claude's suggestions are in (or the
  // request failed — then it clears so the user can retry).
  const scoreStepDone = !!review && !review.scoreLoading && review.score != null;
  const reviewOverlayVisible =
    !!review &&
    !review.failed &&
    (review.scoreLoading || review.loading || (review.score != null && !review.fetched));

  return (
    <div
      className="sticky top-4 flex w-full min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm transition-colors duration-700"
      style={cover ? { borderColor: coverTint(0.55) } : undefined}
    >
      {reviewOverlayVisible && (
        <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center gap-7 overflow-hidden rounded-xl bg-background/85 backdrop-blur-md animate-in fade-in duration-300">
          {/* Soft colored glow behind the spinner */}
          <div
            aria-hidden
            className="pointer-events-none absolute h-72 w-72 rounded-full opacity-25 blur-3xl animate-pulse"
            style={{
              background:
                "radial-gradient(circle, hsl(152 70% 45%) 0%, hsl(338 88% 60%) 70%, transparent 100%)",
            }}
          />

          {/* Dual spinning rings around a pulsing wand */}
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
            <div
              className="absolute inset-0 animate-spin rounded-full border-4 border-transparent"
              style={{ borderTopColor: "hsl(var(--primary))", animationDuration: "1.1s" }}
            />
            <div
              className="absolute inset-3 animate-spin rounded-full border-4 border-transparent"
              style={{
                borderBottomColor: "hsl(152 70% 42%)",
                animationDuration: "1.7s",
                animationDirection: "reverse",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Wand2 className="h-9 w-9 animate-pulse text-primary" />
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1 px-6 text-center">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {t("resume.improve.loadingTitle") || "Claude is reviewing your resume"}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("resume.improve.loadingHint") || "This usually takes under a minute."}
            </p>
          </div>

          {/* Progress steps: score, then suggestions */}
          <div className="relative z-10 flex flex-col gap-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              {scoreStepDone ? (
                <CheckCircle2 className="h-[1.1rem] w-[1.1rem] text-emerald-500" />
              ) : (
                <RefreshCw className="h-[1.1rem] w-[1.1rem] animate-spin text-primary" />
              )}
              <span className={scoreStepDone ? "text-muted-foreground line-through decoration-emerald-500/50" : "font-medium text-foreground"}>
                {t("resume.improve.stepScore") || "Scoring your resume"}
              </span>
              {scoreStepDone && review?.score != null && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: cover }}
                >
                  {review.score.toFixed(1)}/10
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {scoreStepDone ? (
                <RefreshCw className="h-[1.1rem] w-[1.1rem] animate-spin text-primary" />
              ) : (
                <span className="flex h-[1.1rem] w-[1.1rem] items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                </span>
              )}
              <span className={scoreStepDone ? "font-medium text-foreground" : "text-muted-foreground"}>
                {t("resume.improve.stepSuggest") || "Finding improvements worth points"}
              </span>
            </div>
          </div>

          {/* Bouncing dots */}
          <div aria-hidden className="relative z-10 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-primary/70"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky below the site navbar, so the score stays visible while the
          user scrolls through the resume. Solid background layer: the resume
          passes underneath. */}
      <div
        className="sticky top-[3.9rem] z-[75] flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-border bg-card bg-gradient-to-r from-muted/50 via-muted/25 to-transparent px-4 py-3 transition-colors duration-700 sm:top-[4.75rem] md:top-[5.75rem]"
        style={
          cover
            ? {
                background: `linear-gradient(to right, ${coverTint(0.18)}, ${coverTint(0.04)}), hsl(var(--card))`,
                borderColor: coverTint(0.35),
              }
            : undefined
        }
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/10 transition-colors duration-700"
            aria-hidden
            style={cover ? { backgroundColor: coverTint(0.15), color: cover } : undefined}
          >
            <FileText className="h-[1.125rem] w-[1.125rem]" strokeWidth={2.25} />
          </div>
          <span className="truncate text-sm font-semibold tracking-tight text-foreground">
            {t("resume.preview.title") || "Preview"}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm tabular-nums text-muted-foreground">
          {review && (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold text-white shadow-sm transition-colors duration-700"
              style={{ backgroundColor: cover ?? "hsl(215 15% 55%)" }}
            >
              {review.scoreLoading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : review.score != null ? (
                `${review.score.toFixed(1)}/10`
              ) : (
                "–"
              )}
              {review.onReanalyzeScore && (
                <button
                  type="button"
                  title={t("resume.score.reanalyze") || "Re-analyze"}
                  className="rounded-full p-0.5 opacity-80 hover:opacity-100 disabled:opacity-40"
                  disabled={review.scoreLoading}
                  onClick={review.onReanalyzeScore}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </span>
          )}
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

      {review && (
        <div
          className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 transition-colors duration-700"
          style={cover ? { background: coverTint(0.06), borderColor: coverTint(0.25) } : undefined}
        >
          {review.loading ? (
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              {t("resume.improve.analyzing") || "Improving your resume…"}
            </span>
          ) : review.allAccepted ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              {t("resume.improve.perfect") || "Perfect — your resume reached 10/10!"}
            </span>
          ) : review.pendingCount > 0 ? (
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: cover }}>
              <TrendingUp className="h-3.5 w-3.5" />
              {(t("resume.improve.suggestionsSummary") || "{count} suggestions · up to +{points} pts")
                .replace("{count}", String(review.pendingCount))
                .replace("{points}", review.pendingPoints.toFixed(1))}
            </span>
          ) : review.fetched ? (
            <span className="text-xs text-muted-foreground">
              {t("resume.improve.noChanges") ||
                "Your resume text already looks strong — no rewrites suggested."}
            </span>
          ) : null}

          <span className="ml-auto flex items-center gap-1.5">
            {review.pendingCount > 0 && !review.loading ? (
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs"
                onClick={(e) => {
                  review.onAcceptAll();
                  celebrate(e.currentTarget, "big");
                }}
              >
                <Check className="h-3 w-3" />
                {t("resume.improve.acceptAll") || "Accept all"}
              </Button>
            ) : null}
            {review.onUndo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={review.onUndo}
              >
                {t("resume.improve.undo") || "Undo"}
              </Button>
            ) : null}
            {!review.loading && (review.fetched || review.failed) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={review.onRunAgain}
              >
                <RefreshCw className="h-3 w-3" />
                {t("resume.improve.runAgain") || "Run again"}
              </Button>
            ) : null}
          </span>
        </div>
      )}

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
        {form && user ? (
          <Dialog
            open={isTranslateOpen}
            onOpenChange={(open) => {
              if (!isTranslating) setIsTranslateOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <Languages className="h-3.5 w-3.5" />
                {t("resume.translate.cta") || "Translate"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("resume.translate.title") || "Translate my resume"}</DialogTitle>
                <DialogDescription>
                  {t("resume.translate.subtitle") ||
                    "Translate your whole resume into another language. Your name, contact details and dates stay as-is. This replaces your current text — save to keep it."}
                </DialogDescription>
              </DialogHeader>
              <ResumeTranslateControls
                loading={isTranslating}
                defaultTarget={language === "en" ? "de" : "en"}
                onTranslate={async (target, categories) => {
                  const ok = await translate(target, categories);
                  if (ok) setIsTranslateOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
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
            {renderResumeTemplate(previewData)}
            {changeMarks.map((mark) =>
              mark.rects.map((r, i) => (
                <div
                  key={`mark-${mark.index}-${i}`}
                  role="button"
                  aria-label={reviewChanges?.[mark.index]?.label}
                  className="absolute cursor-pointer rounded-[2px] transition-opacity hover:opacity-60"
                  onMouseEnter={(e) => openMark(mark.index, e.currentTarget)}
                  onMouseLeave={scheduleCloseMark}
                  onClick={(e) => {
                    e.stopPropagation();
                    openMark(mark.index, e.currentTarget);
                  }}
                  style={{
                    top: r.top - 1,
                    left: r.left - 2,
                    width: r.width + 4,
                    height: r.height + 2,
                    zIndex: 60,
                    backgroundColor:
                      mark.color === "red" ? "rgba(239, 68, 68, 0.16)" : "rgba(16, 185, 129, 0.16)",
                    boxShadow:
                      mark.color === "red"
                        ? "inset 0 -2px 0 rgba(239, 68, 68, 0.65)"
                        : "inset 0 -2px 0 rgba(16, 185, 129, 0.65)",
                  }}
                />
              )),
            )}
            {review && activeChange && activeMark && (
              <div
                className="absolute rounded-lg border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                  width: POPOVER_WIDTH,
                  // Above the page-break/page-number indicators (z-index 999).
                  zIndex: 1200,
                  top:
                    popoverPlacement === "above"
                      ? activeMark.rects[0].top - 8
                      : activeMark.rects[0].top + activeMark.rects[0].height + 8,
                  transform: popoverPlacement === "above" ? "translateY(-100%)" : undefined,
                  left: Math.max(
                    8,
                    Math.min(activeMark.rects[0].left, Math.max(8, wrapperWidth - POPOVER_WIDTH - 8)),
                  ),
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={cancelCloseMark}
                onMouseLeave={scheduleCloseMark}
              >
                <div
                  className={`flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2 ${
                    activeChange.kind === "delete"
                      ? "border-red-200 bg-red-50/70 dark:border-red-900 dark:bg-red-950/40"
                      : "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/40"
                  }`}
                >
                  <span className="truncate text-xs font-semibold text-foreground">
                    {activeChange.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {activeChange.points ? (
                      <Badge
                        variant="outline"
                        className={
                          activeChange.kind === "delete"
                            ? "gap-1 border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                            : "gap-1 border-emerald-300 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
                        }
                      >
                        <TrendingUp className="h-3 w-3" />
                        {(t("resume.improve.points") || "+{points} pts").replace(
                          "{points}",
                          activeChange.points.toFixed(1),
                        )}
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      aria-label={t("common.close") || "Close"}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setActiveMarkIndex(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  {activeChange.kind === "delete" ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {t("resume.improve.deleteWhy") || "Why remove it:"}
                      </span>{" "}
                      {activeChange.reason ||
                        t("resume.improve.deleteBadge") ||
                        "This text weakens your resume."}
                    </p>
                  ) : activeChange.kind === "add" ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {t("resume.improve.newBadge") || "New"}
                        {" · "}
                      </span>
                      {t("resume.improve.addNote") || "Only accept this if it's true for you."}
                    </p>
                  ) : (
                    <>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        {t("resume.improve.after") || "Suggested"}
                      </p>
                      <p className="max-h-40 overflow-y-auto rounded-md bg-emerald-50 p-2 text-xs leading-relaxed text-foreground dark:bg-emerald-950/40 whitespace-pre-wrap">
                        {activeChange.improved}
                      </p>
                    </>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs"
                      onClick={() => review.onAction(activeMark.index, "rejected")}
                    >
                      <X className="h-3 w-3" />
                      {activeChange.kind === "delete"
                        ? t("resume.improve.keep") || "Keep it"
                        : t("resume.improve.reject") || "Reject"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={`h-7 gap-1 px-2 text-xs ${
                        activeChange.kind === "delete"
                          ? "bg-red-600 text-white hover:bg-red-600/90"
                          : "bg-primary hover:bg-primary/90"
                      }`}
                      onClick={() => review.onAction(activeMark.index, "accepted")}
                    >
                      {activeChange.kind === "delete" ? (
                        <Trash2 className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      {activeChange.kind === "delete"
                        ? t("resume.improve.deleteBadge") || "Remove"
                        : t("resume.improve.accept") || "Accept"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
