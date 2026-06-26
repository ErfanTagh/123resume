import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "../lib/seo";
import { getAllPosts } from "../lib/blog";

export const metadata: Metadata = pageMetadata({
  title: "Resume & Career Blog",
  description:
    "Expert resume tips, ATS optimization guides, and career advice to help you land more interviews. Fresh insights from the 123Resume team.",
  path: "/blog",
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-content px-4 py-16 sm:px-6 sm:py-20">
      <header className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Resume & career advice
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-body">
          Practical tips on resumes, ATS optimization, and job searching — written to help
          you get more interviews.
        </p>
      </header>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <article
            key={post.id}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-brand">
              <span className="rounded-full bg-brand-light px-3 py-1">{post.category}</span>
              <span className="text-body">{post.readTime}</span>
            </div>
            <h2 className="mt-3 text-xl font-bold text-ink">
              <Link href={`/blog/${post.id}`} className="hover:text-brand">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-sm text-body">{post.excerpt}</p>
            <div className="mt-4 flex items-center justify-between">
              <time dateTime={post.isoDate} className="text-xs text-body">
                {post.date}
              </time>
              <Link
                href={`/blog/${post.id}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Read more →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
