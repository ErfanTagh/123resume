/**
 * Daily apply streak for the job tracker (Duolingo style).
 *
 * A day counts when at least one application was sent that day: appliedAt,
 * or createdAt when no date was entered. "Saved" jobs don't count, nobody
 * applied yet. Days are local calendar days, so the streak ends at the
 * user's own midnight.
 */
import type { JobApplication } from "@/lib/api";

export type StreakState =
  /** Applied today */
  | "done"
  /** Applied yesterday, not yet today: the streak ends at midnight */
  | "atRisk"
  /** Had applications, but the streak broke */
  | "lost"
  /** Never applied */
  | "none";

export type HeatmapCell = { date: string; count: number; future: boolean };

export type ApplyStreak = {
  /** Local YYYY-MM-DD */
  today: string;
  current: number;
  best: number;
  appliedToday: boolean;
  state: StreakState;
  thisWeek: number;
  total: number;
  /** Mon..Sun of the current week */
  week: HeatmapCell[];
  /** Columns of weeks (oldest first), each Mon..Sun */
  heatmap: HeatmapCell[][];
};

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(key: string, delta: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

/** Monday of the week that contains `key` */
function weekStart(key: string): string {
  const offset = (keyToDate(key).getDay() + 6) % 7; // Mon = 0
  return addDays(key, -offset);
}

export function countsByDay(applications: JobApplication[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const app of applications) {
    if (app.status === "saved") continue;
    const raw = app.appliedAt || app.createdAt;
    const d = raw ? new Date(raw) : null;
    if (!d || Number.isNaN(d.getTime())) continue;
    const key = dayKey(d);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function streakEndingAt(counts: Map<string, number>, key: string): number {
  let n = 0;
  while (counts.has(key)) {
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

function bestStreak(counts: Map<string, number>): number {
  let best = 0;
  for (const key of counts.keys()) {
    // Measure each run once, from its first day
    if (counts.has(addDays(key, -1))) continue;
    let n = 0;
    for (let k = key; counts.has(k); k = addDays(k, 1)) n += 1;
    best = Math.max(best, n);
  }
  return best;
}

export function computeApplyStreak(
  applications: JobApplication[],
  weeks = 16,
  now = new Date(),
): ApplyStreak {
  const counts = countsByDay(applications);
  const today = dayKey(now);
  const yesterday = addDays(today, -1);
  const appliedToday = counts.has(today);

  const current = appliedToday
    ? streakEndingAt(counts, today)
    : streakEndingAt(counts, yesterday); // still alive until midnight

  let state: StreakState;
  if (appliedToday) state = "done";
  else if (current > 0) state = "atRisk";
  else if (counts.size > 0) state = "lost";
  else state = "none";

  const cell = (key: string): HeatmapCell => ({ date: key, count: counts.get(key) || 0, future: key > today });

  const monday = weekStart(today);
  const week = Array.from({ length: 7 }, (_, i) => cell(addDays(monday, i)));

  const firstMonday = addDays(monday, -7 * (weeks - 1));
  const heatmap = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => cell(addDays(firstMonday, w * 7 + d))),
  );

  let total = 0;
  for (const n of counts.values()) total += n;

  return {
    today,
    current,
    best: Math.max(bestStreak(counts), current),
    appliedToday,
    state,
    thisWeek: week.reduce((sum, c) => sum + c.count, 0),
    total,
    week,
    heatmap,
  };
}
