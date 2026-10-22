/** Routes that share the site side rail (Dashboard + marketing pages). */
export const SITE_NAV_PATHS = [
  "/dashboard",
  "/templates",
  "/pricing",
  "/blog",
  "/about",
  "/contact",
] as const;

export function isSiteNavPath(pathname: string): boolean {
  return SITE_NAV_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
