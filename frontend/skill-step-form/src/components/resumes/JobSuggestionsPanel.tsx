import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  jobApplicationAPI,
  jobSuggestionAPI,
  type JobApplicationStatus,
  type JobSuggestionsResult,
  type Resume,
  type SuggestedJob,
} from "@/lib/api";
import {
  daysAgo,
  levelFit,
  NO_FILTERS,
  sortAndFilterJobs,
  type JobFilters,
  type JobSort,
} from "@/lib/jobSuggestionRanking";
import { useRefreshJobApplications } from "@/hooks/useJobApplications";
import { RowAction } from "@/components/resumes/RowAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Bookmark, BookmarkCheck, BookmarkX, Building2, Check, Compass, ExternalLink, MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

type JobSuggestionsPanelProps = {
  resumes: Resume[];
  isLoadingResumes: boolean;
};

/** Same name the resume list shows: its own name, else first-last-title. */
const resumeLabel = (resume: Resume): string => {
  if (resume.name?.trim()) return resume.name.trim();
  const info = resume.personalInfo;
  const parts = [info?.firstName?.trim(), info?.lastName?.trim(), info?.professionalTitle?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join("-") : "Untitled Resume";
};

/** LinkedIn's job id from a posting link, so a saved job is recognized even if the URL differs slightly. */
const jobKey = (link?: string): string => {
  if (!link) return "";
  const id = link.match(/(\d{6,})\/?(?:[?#]|$)/);
  return id ? id[1] : link;
};

const FILTER_KEYS: (keyof JobFilters)[] = ["fitsLevel", "matchesSkills", "last24h", "hideSaved"];

const CompanyLogo = ({ src }: { src: string }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Building2 className="h-5 w-5" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-10 w-10 flex-none rounded-lg border border-border bg-white object-contain"
    />
  );
};

export function JobSuggestionsPanel({ resumes, isLoadingResumes }: JobSuggestionsPanelProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const refreshShared = useRefreshJobApplications();

  // "Matching jobs" on a resume row links here with ?resume=<id>
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("resume");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const resumeId =
    selectedResumeId ||
    (requestedId && resumes.some((r) => r.id === requestedId) ? requestedId : "") ||
    resumes[0]?.id ||
    "";

  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<JobSuggestionsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  /** Jobs in the tracker, by LinkedIn job id: the application and its status */
  const [tracked, setTracked] = useState<Map<string, { id: string; status: JobApplicationStatus }>>(new Map());
  const [savingKey, setSavingKey] = useState("");
  const [sort, setSort] = useState<JobSort>("best");
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS);

  const userLevel = result?.profile?.level ?? null;
  // Sorting and filters only reorder what was fetched: no new search, no credits
  const visibleJobs = useMemo(
    () =>
      sortAndFilterJobs(result?.jobs ?? [], {
        sort,
        filters,
        userLevel,
        isSaved: (job) => tracked.has(jobKey(job.link)),
      }),
    [result, sort, filters, userLevel, tracked],
  );
  const anyFilter = FILTER_KEYS.some((key) => filters[key]);

  const runSearch = useCallback(
    async (search?: { q: string; location: string }) => {
      if (!resumeId) return;
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await jobSuggestionAPI.get(resumeId, search);
        setResult(data);
        setKeywords(data.query?.q ?? "");
        setLocation(data.query?.location ?? "");
      } catch (err: unknown) {
        setResult(null);
        setLoadError(err instanceof Error ? err.message : t("pages.resumes.jobSuggestions.errors.upstream"));
      } finally {
        setIsLoading(false);
      }
    },
    [resumeId, t],
  );

  // A resume's own title and city first; the fields can then narrow or change the search
  useEffect(() => {
    runSearch();
  }, [runSearch]);

  // Jobs already in the tracker show as saved (or with their tracker status)
  useEffect(() => {
    jobApplicationAPI
      .getAll()
      .then((apps) =>
        setTracked(
          new Map(
            apps
              .filter((a) => jobKey(a.jobLink))
              .map((a) => [jobKey(a.jobLink), { id: a.id, status: a.status || "applied" }]),
          ),
        ),
      )
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch({ q: keywords.trim(), location: location.trim() });
  };

  const saveJob = async (job: SuggestedJob) => {
    const key = jobKey(job.link);
    setSavingKey(key);
    try {
      const created = await jobApplicationAPI.create({
        jobTitle: job.title,
        company: job.company,
        jobLink: job.link,
        resumeId,
        status: "saved",
      });
      setTracked((prev) => new Map(prev).set(key, { id: created.id, status: "saved" }));
      refreshShared();
      toast({
        title: t("pages.resumes.jobSuggestions.savedTitle"),
        description: t("pages.resumes.jobSuggestions.savedDesc"),
      });
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Error",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSavingKey("");
    }
  };

  // Only a job that is still just "saved" is removed; once the user applied
  // (or moved it on in the tracker), that record stays.
  const unsaveJob = async (job: SuggestedJob) => {
    const key = jobKey(job.link);
    const entry = tracked.get(key);
    if (!entry || entry.status !== "saved") return;
    setSavingKey(key);
    try {
      await jobApplicationAPI.delete(entry.id);
      setTracked((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      refreshShared();
      toast({ title: t("pages.resumes.jobSuggestions.removedTitle") });
    } catch (err: unknown) {
      toast({
        title: t("common.error") || "Error",
        description: err instanceof Error ? err.message : "",
        variant: "destructive",
      });
    } finally {
      setSavingKey("");
    }
  };

  // LinkedIn's "2 days ago" is English only; in German, say it from the posting date
  const postedLabel = (job: SuggestedJob): string => {
    if (language !== "de") return job.postedAt;
    const days = daysAgo(job.date);
    if (days === null) return job.postedAt;
    return new Intl.RelativeTimeFormat("de", { numeric: "auto" }).format(-days, "day");
  };

  const updatedAt = (iso?: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(language === "de" ? "de-DE" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isLoadingResumes && resumes.length === 0) {
    return (
      <Card className="border-dashed py-10 text-center">
        <CardContent className="pt-6">
          <Compass className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
          <h3 className="mb-2 text-lg font-semibold">{t("pages.resumes.jobSuggestions.noResumesTitle")}</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            {t("pages.resumes.jobSuggestions.noResumesDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const jobs = result?.jobs ?? [];
  const errorCode = result?.error;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm font-medium leading-relaxed text-sky-900/90 dark:text-sky-100/90">
        {t("pages.resumes.jobSuggestions.subtitle")}
      </p>

      <form
        onSubmit={handleSearch}
        className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-end"
      >
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="suggest-resume">{t("pages.resumes.jobSuggestions.resume")}</Label>
          <Select value={resumeId} onValueChange={setSelectedResumeId} disabled={resumes.length === 0}>
            <SelectTrigger id="suggest-resume">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resumes.map((resume) => (
                <SelectItem key={resume.id} value={resume.id}>
                  {resumeLabel(resume)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="suggest-keywords">{t("pages.resumes.jobSuggestions.keywords")}</Label>
          <Input
            id="suggest-keywords"
            value={keywords}
            maxLength={100}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder={t("pages.resumes.jobSuggestions.keywordsPlaceholder")}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="suggest-location">{t("pages.resumes.jobSuggestions.location")}</Label>
          <Input
            id="suggest-location"
            value={location}
            maxLength={200}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("pages.resumes.jobSuggestions.locationPlaceholder")}
          />
        </div>
        <Button type="submit" disabled={isLoading || !resumeId} className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
          <Search className="mr-2 h-4 w-4" />
          {t("pages.resumes.jobSuggestions.search")}
        </Button>
      </form>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}
      {errorCode && (
        <Alert variant={errorCode === "no_keywords" || errorCode === "limit_user" ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t(`pages.resumes.jobSuggestions.errors.${errorCode}`)}</AlertDescription>
        </Alert>
      )}

      {/* The page refreshes resumes in the background (e.g. returning to the tab): keep the list then */}
      {isLoading || (isLoadingResumes && resumes.length === 0) ? (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          {t("pages.resumes.jobSuggestions.searching")}
        </div>
      ) : result && !errorCode ? (
        jobs.length === 0 ? (
          <Card className="border-dashed py-10 text-center">
            <CardContent className="pt-6">
              <Compass className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
              <h3 className="mb-2 text-lg font-semibold">{t("pages.resumes.jobSuggestions.emptyTitle")}</h3>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                {t("pages.resumes.jobSuggestions.emptyDesc")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {FILTER_KEYS.filter((key) => key !== "fitsLevel" || userLevel).map((key) => {
                    const on = filters[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium ring-1 ring-inset transition-colors ${
                          on
                            ? "bg-primary/10 text-primary ring-primary/40 hover:bg-primary/15"
                            : "bg-muted text-muted-foreground ring-transparent hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                        {t(`pages.resumes.jobSuggestions.filters.${key}`)}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Label htmlFor="suggest-sort" className="text-sm text-muted-foreground">
                    {t("pages.resumes.jobSuggestions.sort")}
                  </Label>
                  <Select value={sort} onValueChange={(value) => setSort(value as JobSort)}>
                    <SelectTrigger id="suggest-sort" className="h-8 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best">{t("pages.resumes.jobSuggestions.sortBest")}</SelectItem>
                      <SelectItem value="newest">{t("pages.resumes.jobSuggestions.sortNewest")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {t("pages.resumes.jobSuggestions.showing")
                    .replace("{shown}", String(visibleJobs.length))
                    .replace("{total}", String(jobs.length))}{" "}
                  · {t("pages.resumes.jobSuggestions.postedThisWeek")}
                </span>
                {userLevel && result.profile && (
                  <span>
                    {t("pages.resumes.jobSuggestions.yourLevel")
                      .replace("{level}", t(`pages.resumes.jobSuggestions.levels.${userLevel}`))
                      .replace("{years}", String(Math.round(result.profile.experienceYears)))}
                  </span>
                )}
              </div>
            </div>

            {visibleJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                <p>{t("pages.resumes.jobSuggestions.noFilterMatches")}</p>
                {anyFilter && (
                  <Button type="button" variant="link" size="sm" onClick={() => setFilters(NO_FILTERS)}>
                    {t("pages.resumes.jobSuggestions.clearFilters")}
                  </Button>
                )}
              </div>
            ) : (
            <div className="flex flex-col gap-2.5">
              {visibleJobs.map((job) => {
                const key = jobKey(job.link);
                const trackedStatus = tracked.get(key)?.status;
                const fit = levelFit(job.level, userLevel);
                return (
                  <div
                    key={job.jobId || job.link}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card py-3 pl-3 pr-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:pl-4 sm:pr-4"
                  >
                    <CompanyLogo src={job.companyLogo} />

                    <div className="min-w-0 flex-1">
                      <a
                        href={job.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 max-w-full break-words text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:line-clamp-1 sm:text-base"
                      >
                        {job.title}
                      </a>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{job.company}</span>
                        {job.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <MapPin className="h-3 w-3 flex-none" />
                              <span className="truncate">{job.location}</span>
                            </span>
                          </>
                        )}
                        {postedLabel(job) && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{postedLabel(job)}</span>
                          </>
                        )}
                      </div>
                      {(job.matchedSkills.length > 0 || fit !== "neutral") && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
                          {job.matchedSkills.length > 0 && (
                            <>
                              <span className="text-muted-foreground">{t("pages.resumes.jobSuggestions.matches")}</span>
                              {job.matchedSkills.map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                >
                                  {skill}
                                </span>
                              ))}
                            </>
                          )}
                          {fit === "fit" && (
                            <span className="rounded-full px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-300 dark:text-emerald-300 dark:ring-emerald-800">
                              {t("pages.resumes.jobSuggestions.fitsYourLevel")}
                            </span>
                          )}
                          {(fit === "above" || fit === "below") && (
                            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                              {t(
                                fit === "above"
                                  ? "pages.resumes.jobSuggestions.levelAbove"
                                  : "pages.resumes.jobSuggestions.levelBelow",
                              )}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-none items-center gap-1 sm:gap-1.5">
                      <RowAction tone="sky" label={t("pages.resumes.jobSuggestions.open")} href={job.link}>
                        <ExternalLink className="h-4 w-4" />
                      </RowAction>
                      {!trackedStatus ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingKey === key}
                          onClick={() => saveJob(job)}
                          aria-label={t("pages.resumes.jobSuggestions.save")}
                          className="h-8 px-2.5 sm:h-9 sm:px-3"
                        >
                          <Bookmark className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">{t("pages.resumes.jobSuggestions.save")}</span>
                        </Button>
                      ) : trackedStatus === "saved" ? (
                        // Click again to unsave; on hover the label says so
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingKey === key}
                          onClick={() => unsaveJob(job)}
                          aria-label={t("pages.resumes.jobSuggestions.unsave")}
                          title={t("pages.resumes.jobSuggestions.unsave")}
                          className="group h-8 border-primary/40 bg-primary/10 px-2.5 text-primary hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:px-3"
                        >
                          <BookmarkCheck className="h-4 w-4 fill-current sm:mr-1.5 group-hover:hidden" />
                          <BookmarkX className="hidden h-4 w-4 sm:mr-1.5 group-hover:block" />
                          <span className="hidden sm:inline sm:group-hover:hidden">{t("pages.resumes.jobSuggestions.saved")}</span>
                          <span className="hidden sm:group-hover:inline">{t("pages.resumes.jobSuggestions.unsave")}</span>
                        </Button>
                      ) : (
                        // Already applied (or further): the tracker owns it now
                        <span
                          title={t("pages.resumes.jobSuggestions.inTracker")}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground sm:h-9 sm:px-3 sm:text-sm"
                        >
                          <BookmarkCheck className="h-4 w-4" />
                          <span className="hidden sm:inline">{t(`pages.resumes.jobTracker.status.${trackedStatus}`)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )
      ) : null}

      {result && (
        <p className="text-xs text-muted-foreground">
          {result.fetchedAt && !errorCode && (
            <>
              {t("pages.resumes.jobSuggestions.source").replace("{time}", updatedAt(result.fetchedAt))}
              {" · "}
            </>
          )}
          {t("pages.resumes.jobSuggestions.searchesLeft").replace("{n}", String(result.searchesLeft ?? 0))}
        </p>
      )}
    </div>
  );
}
