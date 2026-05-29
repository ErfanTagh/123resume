/**
 * Trace AI resume scoring in the browser console.
 * - On by default in Vite dev (`import.meta.env.DEV`).
 * - In production builds, set `VITE_DEBUG_RESUME_SCORE=true` in `.env` and rebuild.
 */
export function logResumeScore(event: string, data?: Record<string, unknown>): void {
  const enabled =
    import.meta.env.DEV ||
    import.meta.env.VITE_DEBUG_RESUME_SCORE === "true";
  if (!enabled) return;
  const line = {
    t: new Date().toISOString(),
    ...data,
  };
  console.info("[resume-score]", event, line);
  // Also expose last event for support debugging in DevTools: window.__resumeScoreDebug
  try {
    const w = window as Window & {
      __resumeScoreDebug?: { lastEvent: string; last: Record<string, unknown> };
    };
    w.__resumeScoreDebug = { lastEvent: event, last: line };
  } catch {
    /* non-browser */
  }
}
