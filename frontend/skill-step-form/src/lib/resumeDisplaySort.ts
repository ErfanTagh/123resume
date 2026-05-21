import type { CVFormData } from "@/components/cv-form/types";

/** Ongoing roles: empty end date or common “still here” labels (EN/DE). */
function isOngoingEndDate(end: string | undefined | null): boolean {
  if (end == null) return true;
  const t = String(end).trim();
  if (!t) return true;
  const lower = t.toLowerCase();
  const exact = new Set([
    "present",
    "current",
    "now",
    "ongoing",
    "today",
    "gegenwart",
    "aktuell",
    "heute",
    "bisher",
    "laufend",
  ]);
  if (exact.has(lower)) return true;
  return /^(bis\s+)?(heute|jetzt|aktuell)$/i.test(raw.trim());
}

/** Parse common resume date strings to UTC ms; null if unknown. */
export function parseResumeDateForSort(value: string | undefined | null): number | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || isOngoingEndDate(raw)) return null;

  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  m = raw.match(/^(\d{4})-(\d{2})$/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, 15);

  m = raw.match(/^(\d{4})$/);
  if (m) return Date.UTC(Number(m[1]), 5, 15);

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;

  return null;
}

const PRESENT_PRIMARY = 8_640_000_000_000_000; // far-future sentinel for “ongoing”

function timelineSortParts(start?: string, end?: string): { primary: number; secondary: number } {
  const ongoing = isOngoingEndDate(end);
  const endTs = ongoing ? null : parseResumeDateForSort(end);
  const startTs = parseResumeDateForSort(start);

  if (endTs != null) {
    return { primary: endTs, secondary: startTs ?? 0 };
  }
  if (ongoing) {
    return { primary: PRESENT_PRIMARY, secondary: startTs ?? 0 };
  }
  if (startTs != null) {
    return { primary: startTs, secondary: 0 };
  }
  return { primary: Number.NEGATIVE_INFINITY, secondary: 0 };
}

function compareTimelineNewestFirst(
  a: { startDate?: string; endDate?: string },
  b: { startDate?: string; endDate?: string },
): number {
  const pa = timelineSortParts(a.startDate, a.endDate);
  const pb = timelineSortParts(b.startDate, b.endDate);
  if (pb.primary !== pa.primary) return pb.primary - pa.primary;
  return pb.secondary - pa.secondary;
}

function compareCertificatesNewestFirst(
  a: { issueDate?: string; expirationDate?: string },
  b: { issueDate?: string; expirationDate?: string },
): number {
  const ia = parseResumeDateForSort(a.issueDate) ?? Number.NEGATIVE_INFINITY;
  const ib = parseResumeDateForSort(b.issueDate) ?? Number.NEGATIVE_INFINITY;
  if (ib !== ia) return ib - ia;
  const ea = parseResumeDateForSort(a.expirationDate) ?? Number.NEGATIVE_INFINITY;
  const eb = parseResumeDateForSort(b.expirationDate) ?? Number.NEGATIVE_INFINITY;
  return eb - ea;
}

/**
 * Shallow copy of resume form data with dated sections ordered newest-first for display/PDF.
 * Does not mutate the original object (safe for React Hook Form).
 */
export function withResumeSectionsSortedForDisplay(data: CVFormData): CVFormData {
  return {
    ...data,
    workExperience: [...(data.workExperience ?? [])].sort(compareTimelineNewestFirst),
    education: [...(data.education ?? [])].sort(compareTimelineNewestFirst),
    projects: [...(data.projects ?? [])].sort(compareTimelineNewestFirst),
    certificates: [...(data.certificates ?? [])].sort(compareCertificatesNewestFirst),
  };
}
