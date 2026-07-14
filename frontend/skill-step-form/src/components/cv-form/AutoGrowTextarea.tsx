import { forwardRef, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AutoGrowTextareaProps extends React.ComponentPropsWithoutRef<"textarea"> {
  /**
   * Pass the current field value here. When it changes — including programmatic
   * updates from form.reset() or AI fill that don't emit an input event — the
   * textarea re-measures and grows to fit. Without this, long pre-filled text
   * stays clipped at the initial height.
   */
  resizeKey?: unknown;
}

/**
 * A textarea that grows to fit its content instead of clipping or scrolling.
 * Re-measures on mount, on user input, and whenever `resizeKey` changes.
 * Works with react-hook-form `register` (forwards the ref).
 */
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ resizeKey, onInput, className, rows = 1, ...props }, forwardedRef) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    useEffect(() => {
      resize();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resizeKey]);

    return (
      <Textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) {
            (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
          }
        }}
        rows={rows}
        className={cn("resize-none overflow-hidden", className)}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        {...props}
      />
    );
  },
);

AutoGrowTextarea.displayName = "AutoGrowTextarea";
