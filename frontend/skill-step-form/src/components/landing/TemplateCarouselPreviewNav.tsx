import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const arrowButtonClass =
  "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-border bg-background/95 text-foreground shadow-md transition-colors hover:bg-accent hover:shadow-lg touch-manipulation";

type TemplateCarouselPreviewNavProps = {
  api: CarouselApi | undefined;
  prevLabel: string;
  nextLabel: string;
};

/** Left/right zones over the preview row — scroll carousel; center passes clicks to template links below. */
export const TemplateCarouselPreviewNav = ({
  api,
  prevLabel,
  nextLabel,
}: TemplateCarouselPreviewNavProps) => {
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const syncScrollState = useCallback((instance: CarouselApi | undefined) => {
    if (!instance) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    setCanScrollPrev(instance.canScrollPrev());
    setCanScrollNext(instance.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;

    syncScrollState(api);
    api.on("reInit", syncScrollState);
    api.on("select", syncScrollState);
    api.on("resize", syncScrollState);

    return () => {
      api.off("reInit", syncScrollState);
      api.off("select", syncScrollState);
      api.off("resize", syncScrollState);
    };
  }, [api, syncScrollState]);

  const scrollPrev = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canScrollPrev) api?.scrollPrev();
  };

  const scrollNext = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canScrollNext) api?.scrollNext();
  };

  const edgeZoneClass =
    "flex h-full w-[28%] max-w-[9.5rem] min-w-[4.5rem] items-center justify-center transition-opacity duration-300 ease-out";
  const hiddenEdge = "opacity-0 pointer-events-none";

  return (
    <div
      className="absolute inset-x-0 top-0 z-40 flex pointer-events-none bottom-[var(--showcase-footer-h,5.75rem)]"
      aria-hidden={false}
    >
      <button
        type="button"
        disabled={!canScrollPrev}
        className={cn(
          edgeZoneClass,
          canScrollPrev ? "pointer-events-auto" : hiddenEdge,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-r-3xl",
        )}
        onClick={scrollPrev}
        aria-label={prevLabel}
        aria-hidden={!canScrollPrev}
        tabIndex={canScrollPrev ? 0 : -1}
      >
        <span className={arrowButtonClass} aria-hidden>
          <ChevronLeft className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
      </button>

      <div className="flex-1 min-w-0 pointer-events-none" aria-hidden />

      <button
        type="button"
        disabled={!canScrollNext}
        className={cn(
          edgeZoneClass,
          canScrollNext ? "pointer-events-auto" : hiddenEdge,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-l-3xl",
        )}
        onClick={scrollNext}
        aria-label={nextLabel}
        aria-hidden={!canScrollNext}
        tabIndex={canScrollNext ? 0 : -1}
      >
        <span className={arrowButtonClass} aria-hidden>
          <ChevronRight className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
      </button>
    </div>
  );
};
