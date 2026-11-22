import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  /** Final value to count to. */
  to: number;
  /** Text before the number (e.g. currency). */
  prefix?: string;
  /** Text after the number (e.g. "+", "k", "%"). */
  suffix?: string;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts up from 0 to `to` the first time it scrolls into view.
 * Renders the final value immediately under reduced motion / no-JS.
 */
export const CountUp = ({ to, prefix = "", suffix = "", duration = 1600, className = "" }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setValue(to);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (started.current || !entries.some((e) => e.isIntersecting)) return;
        started.current = true;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(eased * to));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

export default CountUp;
