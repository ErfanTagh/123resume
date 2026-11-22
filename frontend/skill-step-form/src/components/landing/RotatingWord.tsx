import { useEffect, useState } from "react";

type RotatingWordProps = {
  /** Words to cycle through — all should finish the sentence grammatically. */
  words: string[];
  /** ms per word. */
  interval?: number;
  /** Classes for the accent word (color/gradient). */
  className?: string;
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A single headline word that swaps through synonyms, each fading + rising in
 * (no exit animation — the key change remounts the span and replays it).
 * Screen readers get one stable word; the animated span is aria-hidden.
 * Honors reduced motion and pauses while the tab is hidden.
 */
export const RotatingWord = ({ words, interval = 2200, className = "" }: RotatingWordProps) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReduced() || words.length <= 1) return;
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [words, interval]);

  return (
    <span className="relative inline-block">
      {/* Stable sentence for assistive tech */}
      <span className="sr-only">{words[0]}</span>
      {/* Gradient/clip must live on the element holding the glyphs. */}
      <span key={words[index]} aria-hidden="true" className={`lm-word ${className}`}>
        {words[index]}
      </span>
    </span>
  );
};

export default RotatingWord;
