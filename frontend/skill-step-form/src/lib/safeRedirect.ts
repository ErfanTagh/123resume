/** Only paths on this site ("/resumes?tab=..."), never another domain ("//evil.com"). */
export function safeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
