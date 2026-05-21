import type { CVFormData } from "@/components/cv-form/types";

/** Recursively sort object keys so JSON.stringify is stable for the same logical data. */
function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysDeep(item));
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}

/** Stable string for comparing “did resume content change?” before re-calling the score API. */
export function stableSerializeCvPayload(data: CVFormData): string {
  return JSON.stringify(sortKeysDeep(data));
}
