/**
 * Tracks last UI action + current page for API error alerts.
 * Sent as X-Client-Path / X-Client-Action headers (see api.ts).
 */
let lastActionId = "";

export function setClientAction(id: string) {
  if (!id) return;
  lastActionId = String(id).slice(0, 200);
}

export function getClientAction(): string {
  return lastActionId;
}

export function getClientPath(): string {
  if (typeof window === "undefined") return "";
  try {
    return `${window.location.pathname}${window.location.search}`.slice(0, 300);
  } catch {
    return "";
  }
}

function slugFromText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9:_-]/g, "")
    .slice(0, 80);
}

export function installClientActionTracker() {
  if (typeof document === "undefined") return;
  if ((window as any).__clientActionTrackerInstalled) return;
  (window as any).__clientActionTrackerInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Element | null;
      if (!target || typeof (target as any).closest !== "function") return;
      const el = target.closest(
        "[data-action-id], button, a, [role='button'], input[type='submit']"
      ) as HTMLElement | null;
      if (!el) return;

      const explicit = el.getAttribute("data-action-id") || el.id;
      if (explicit) {
        setClientAction(explicit);
        return;
      }
      const text = (
        el.innerText ||
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        ""
      ).trim();
      if (text) {
        setClientAction(`click:${slugFromText(text)}`);
      }
    },
    true
  );
}
