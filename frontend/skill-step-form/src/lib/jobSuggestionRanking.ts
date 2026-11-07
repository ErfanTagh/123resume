/**
 * Sorting and filters for job suggestions. They run on the jobs already
 * fetched, so changing them costs no search credits.
 */

export type JobLevel = "entry" | "mid" | "senior";
/** How a job's level compares to the user's experience */
export type LevelFit = "fit" | "neutral" | "below" | "above";

export type RankableJob = {
  title: string;
  date: string;
  matchedSkills: string[];
  level: JobLevel;
};

export type JobSort = "best" | "newest";

export type JobFilters = {
  fitsLevel: boolean;
  matchesSkills: boolean;
  last24h: boolean;
  hideSaved: boolean;
};

export const NO_FILTERS: JobFilters = { fitsLevel: false, matchesSkills: false, last24h: false, hideSaved: false };

/** Mid-level people can reach for senior roles; interns and trainee roles are below them. */
export function levelFit(job: JobLevel, user: JobLevel | null): LevelFit {
  if (!user) return "neutral";
  if (job === user) return "fit";
  if (user === "entry") return job === "senior" ? "above" : "neutral";
  if (user === "mid") return job === "entry" ? "below" : "neutral";
  return job === "entry" ? "below" : "neutral";
}

/** Whole days since posting; LinkedIn gives a date without a time. */
export function daysAgo(date: string, now: Date = new Date()): number | null {
  const posted = new Date(`${date}T00:00:00`);
  if (!date || Number.isNaN(posted.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today.getTime() - posted.getTime()) / 86_400_000));
}

const FIT_POINTS: Record<LevelFit, number> = { fit: 2, neutral: 0, below: -4, above: -4 };

export function bestMatchScore(job: RankableJob, user: JobLevel | null, now: Date = new Date()): number {
  const skills = Math.min(job.matchedSkills.length, 3) * 3;
  const days = daysAgo(job.date, now);
  const fresh = days === null ? 0 : days <= 1 ? 1.5 : days <= 3 ? 0.75 : 0;
  return skills + FIT_POINTS[levelFit(job.level, user)] + fresh;
}

export function sortAndFilterJobs<T extends RankableJob>(
  jobs: T[],
  options: {
    sort: JobSort;
    filters: JobFilters;
    userLevel: JobLevel | null;
    isSaved: (job: T) => boolean;
    now?: Date;
  },
): T[] {
  const { sort, filters, userLevel, isSaved, now = new Date() } = options;
  const kept = jobs
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => {
      if (filters.fitsLevel && userLevel) {
        const fit = levelFit(job.level, userLevel);
        if (fit === "below" || fit === "above") return false;
      }
      if (filters.matchesSkills && job.matchedSkills.length === 0) return false;
      if (filters.last24h) {
        const days = daysAgo(job.date, now);
        if (days === null || days > 1) return false;
      }
      if (filters.hideSaved && isSaved(job)) return false;
      return true;
    });

  // Ties keep LinkedIn's own relevance order
  if (sort === "newest") {
    kept.sort((a, b) => (daysAgo(a.job.date, now) ?? 99) - (daysAgo(b.job.date, now) ?? 99) || a.index - b.index);
  } else {
    kept.sort(
      (a, b) => bestMatchScore(b.job, userLevel, now) - bestMatchScore(a.job, userLevel, now) || a.index - b.index,
    );
  }
  return kept.map(({ job }) => job);
}
