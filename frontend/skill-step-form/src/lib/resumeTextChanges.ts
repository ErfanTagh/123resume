/**
 * Text that changed between two versions of a resume, e.g. the version that was
 * last scored and the current one. Sent with a re-score so the AI can judge
 * what the edits did instead of scoring from scratch (see the backend's
 * resume_ai_scoring._previous_review_block).
 */

export type ResumeTextChange = { path: string; before: string; after: string };

const MAX_CHANGES = 20;
// Not resume content; changing them shouldn't read as an edit.
const IGNORED_KEYS = new Set(["profileImage", "styling", "template", "sectionOrder", "id", "_id"]);

function flattenText(value: unknown, path: string, out: Map<string, string>): void {
  if (typeof value === "string") {
    const text = value.trim();
    if (text) out.set(path, text);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => flattenText(item, `${path}.${i}`, out));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (!IGNORED_KEYS.has(key)) flattenText(child, path ? `${path}.${key}` : key, out);
    }
  }
}

export function resumeTextChanges(previous: unknown, current: unknown): ResumeTextChange[] {
  const before = new Map<string, string>();
  const after = new Map<string, string>();
  flattenText(previous, "", before);
  flattenText(current, "", after);

  const changes: ResumeTextChange[] = [];
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    const b = before.get(path) ?? "";
    const a = after.get(path) ?? "";
    if (b !== a) changes.push({ path, before: b, after: a });
    if (changes.length >= MAX_CHANGES) break;
  }
  return changes;
}
