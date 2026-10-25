/**
 * Blog content for the SEO-critical /blog pages.
 * Ported from the SPA (English). German content + locale routing is a follow-up
 * (see MIGRATION_PLAN.md). Each post is server-rendered and added to the sitemap.
 */
export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  /** ISO date for <time> + Article JSON-LD datePublished. */
  isoDate: string;
  image?: string;
  tags?: string[];
  content: string;
}

// The old posts were removed; the blog lives in the Vite app (frontend/skill-step-form).
export const BLOG_POSTS: BlogPost[] = [];

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getPost(id: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.id === id);
}
