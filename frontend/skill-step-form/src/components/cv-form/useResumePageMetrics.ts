import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { CVFormData } from "./types";

const PAGE_HEIGHT_PX = 1010;

function measurePages(previewRef: RefObject<HTMLDivElement | null>) {
  const card = previewRef.current;
  if (!card) return null;

  const wrapper = card.querySelector(".resume-content-wrapper");
  if (!wrapper) return null;

  let templateRoot = wrapper.querySelector(".resume-page-container") as HTMLElement | null;
  if (!templateRoot || templateRoot.scrollHeight === 0) {
    templateRoot = wrapper.firstElementChild as HTMLElement | null;
  }
  if (!templateRoot || templateRoot.scrollHeight === 0) {
    const possibleRoots = wrapper.querySelectorAll(
      "div.bg-background, div.p-8, div.max-w-4xl, div.max-w-3xl",
    );
    if (possibleRoots.length > 0) {
      templateRoot = possibleRoots[0] as HTMLElement;
    }
  }
  if (!templateRoot || templateRoot.scrollHeight === 0) {
    const allDivs = Array.from(wrapper.querySelectorAll("div")) as HTMLElement[];
    if (allDivs.length > 0) {
      templateRoot = allDivs.reduce((largest, current) =>
        current.scrollHeight > largest.scrollHeight ? current : largest,
      );
    }
  }
  if (!templateRoot || templateRoot.scrollHeight < 200) return null;

  const contentHeight = templateRoot.scrollHeight;
  const pages = contentHeight > PAGE_HEIGHT_PX + 50 ? Math.ceil(contentHeight / PAGE_HEIGHT_PX) : 1;
  const count = Math.max(1, pages);
  const breaks: number[] = [];
  if (count > 1) {
    for (let i = 1; i < count; i++) breaks.push(PAGE_HEIGHT_PX * i);
  }
  return { pageCount: count, pageBreakPositions: breaks };
}

function breaksEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Page-break overlays are siblings inside the wrapper; ignore their DOM churn. */
function isPreviewOverlayMutation(record: MutationRecord): boolean {
  const overlayClass = (el: Element | null) =>
    el?.classList?.contains("page-break-line") ||
    el?.classList?.contains("page-number-indicator");

  if (overlayClass(record.target instanceof Element ? record.target : null)) {
    return true;
  }

  const nodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
  return (
    nodes.length > 0 &&
    nodes.every(
      (node) =>
        node instanceof Element &&
        (overlayClass(node) || node.querySelector(".page-break-line, .page-number-indicator") !== null),
    )
  );
}

export function useResumePageMetrics(
  previewRef: RefObject<HTMLDivElement | null>,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
  displayData: CVFormData,
  template: string,
  templateChangeKey: number,
) {
  const [pageCount, setPageCount] = useState(1);
  const [pageBreakPositions, setPageBreakPositions] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useLayoutEffect(() => {
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let mutationDebounceId: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = 100;

    const applyMeasurement = () => {
      const result = measurePages(previewRef);
      if (!result) return false;
      setPageCount((prev) => (prev === result.pageCount ? prev : result.pageCount));
      setPageBreakPositions((prev) =>
        breaksEqual(prev, result.pageBreakPositions) ? prev : result.pageBreakPositions,
      );
      return true;
    };

    const attemptCalculation = () => {
      const success = applyMeasurement();
      if (!success && retryCount < maxRetries) {
        retryCount++;
        retryTimeoutId = setTimeout(attemptCalculation, retryInterval);
      } else if (!success) {
        setPageCount((prev) => (prev === 1 ? prev : 1));
        setPageBreakPositions((prev) => (prev.length === 0 ? prev : []));
      } else {
        retryCount = 0;
      }
    };

    const wrapperElement = previewRef.current?.querySelector(".resume-content-wrapper");
    const templateRoot = wrapperElement?.querySelector(".resume-page-container") as HTMLElement | null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const observeTarget = templateRoot ?? wrapperElement;
    if (observeTarget) {
      resizeObserver = new ResizeObserver(() => {
        retryCount = 0;
        attemptCalculation();
      });
      resizeObserver.observe(observeTarget);
    }

    if (wrapperElement) {
      mutationObserver = new MutationObserver((records) => {
        if (records.every(isPreviewOverlayMutation)) return;
        retryCount = 0;
        if (mutationDebounceId) clearTimeout(mutationDebounceId);
        mutationDebounceId = setTimeout(attemptCalculation, 50);
      });
      mutationObserver.observe(wrapperElement, {
        childList: true,
        subtree: true,
        attributes: false,
      });
    }

    retryCount = 0;
    attemptCalculation();

    const handleResize = () => {
      retryCount = 0;
      attemptCalculation();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (mutationDebounceId) clearTimeout(mutationDebounceId);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [displayData, template, templateChangeKey, previewRef]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || pageCount <= 1) {
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
      return;
    }

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const currentPageNum = Math.min(
        Math.max(1, Math.floor(scrollTop / PAGE_HEIGHT_PX) + 1),
        pageCount,
      );
      setCurrentPage((prev) => (prev === currentPageNum ? prev : currentPageNum));
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, [pageCount, pageBreakPositions, scrollContainerRef]);

  return { pageCount, pageBreakPositions, currentPage, pageHeightPx: PAGE_HEIGHT_PX };
}
