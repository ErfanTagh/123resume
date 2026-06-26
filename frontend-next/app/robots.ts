import type { MetadataRoute } from "next";
import { SITE } from "./lib/site";

/**
 * Served at /robots.txt. Allows crawling of public pages, disallows the
 * authenticated app areas, and points crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/create", "/resumes", "/dashboard", "/profile", "/login", "/resume/"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
