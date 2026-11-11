import { useState } from "react";
import { Link } from "react-router-dom";
import { Chrome, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const STORE_URL =
  "https://chromewebstore.google.com/detail/123resume-job-saver/gnmehpfghhjablmcdcghdcblecigglek";
const BLOG_URL = "/blog/save-jobs-chrome-extension";
const DISMISS_KEY = "ext_promo_tracker_dismissed";

/**
 * True only on a desktop Chromium browser (Chrome, Edge, Brave, Opera) that can
 * install from the Chrome Web Store. Avoids pushing an "Add to Chrome" button to
 * Safari/Firefox or mobile users who can't use it.
 */
export function isChromiumDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Mobile|Android|CriOS|FxiOS/.test(ua);
}

/** Rich empty-state pitch: shown when the tracker has no applications yet. */
export function ExtensionPromoEmpty() {
  const { t } = useLanguage();
  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Chrome className="h-7 w-7" />
        </span>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold">
            {t("pages.resumes.jobTracker.extension.emptyTitle") || "Save jobs as you browse"}
          </h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t("pages.resumes.jobTracker.extension.emptyDesc") ||
              "Add the 123Resume Chrome extension and save any job posting to your tracker in one click — Claude tidies it into a clean record, and you can generate a cover letter too."}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <Button asChild>
            <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
              <Chrome className="mr-2 h-4 w-4" />
              {t("pages.resumes.jobTracker.extension.cta") || "Add to Chrome"}
            </a>
          </Button>
          <Button asChild variant="ghost">
            <Link to={BLOG_URL}>
              {t("pages.resumes.jobTracker.extension.how") || "See how it works"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Slim, dismissible banner: shown above the list once the tracker has items. */
export function ExtensionPromoBanner() {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode / blocked storage: just hide for this view */
    }
    setDismissed(true);
  };

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 pr-10 sm:flex-row sm:items-center sm:gap-5">
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Chrome className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-foreground sm:text-lg">
          {t("pages.resumes.jobTracker.extension.bannerTitle") || "Save jobs from any site, in one click"}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("pages.resumes.jobTracker.extension.bannerText") ||
            "Add jobs faster — save any posting with one click using our Chrome extension."}
        </p>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-x-4 gap-y-2">
        <Button asChild>
          <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
            <Chrome className="mr-2 h-4 w-4" />
            {t("pages.resumes.jobTracker.extension.cta") || "Add to Chrome"}
          </a>
        </Button>
        <Link to={BLOG_URL} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
          {t("pages.resumes.jobTracker.extension.how") || "See how it works"}
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("pages.resumes.jobTracker.extension.dismiss") || "Dismiss"}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
