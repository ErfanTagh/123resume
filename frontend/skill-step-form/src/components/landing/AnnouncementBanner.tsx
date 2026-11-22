import { useEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";

const STORE_URL =
  "https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek";
const DISMISS_KEY = "landing_banner_extension_dismissed";

/**
 * Full-width dismissible promo bar at the very top of the landing page.
 * Loud gradient, a single offer line, a close button (persisted in
 * localStorage so it stays dismissed for that visitor).
 */
export const AnnouncementBanner = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    // Chrome extension is desktop-only, so hide the promo on phones.
    <div
      className="relative hidden overflow-hidden text-white md:block"
      style={{ background: "var(--gradient-primary)" }}
    >
      <div className="lm-glint" />
      <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-3 px-10 py-2 text-center text-sm">
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-wrap items-center justify-center gap-x-2 font-medium"
        >
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
            New
          </span>
          <span>
            Save any job posting straight to your tracker with our{" "}
            <span className="font-bold underline underline-offset-2">Chrome extension</span>
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AnnouncementBanner;
