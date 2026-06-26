import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "../../lib/seo";
import { SITE } from "../../lib/site";
import { getAllPosts, getPost } from "../../lib/blog";
import { Markdown } from "../../components/Markdown";
import { JsonLd } from "../../components/JsonLd";

interface Params {
  params: { id: string };
}

/** Pre-render every blog post at build time (fully static, fast, crawlable). */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ id: post.id }));
}

export function generateMetadata({ params }: Params): Metadata {
  const post = getPost(params.id);
  if (!post) {
    return pageMetadata({ title: "Article not found", path: `/blog/${params.id}`, noindex: true });
  }
  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.id}`,
  });
}

export default function BlogPostPage({ params }: Params) {
  const post = getPost(params.id);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.isoDate,
    dateModified: post.isoDate,
    image: post.image ? `${SITE.url}${post.image}` : undefined,
    keywords: post.tags?.join(", "),
    author: { "@type": "Organization", name: SITE.name },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: { "@type": "ImageObject", url: `${SITE.url}/resume-icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE.url}/blog/${post.id}` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: `${SITE.url}/blog/${post.id}` },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-body">
        <Link href="/blog" className="hover:text-brand">
          ← Back to blog
        </Link>
      </nav>

      <header className="mt-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand">
          <span className="rounded-full bg-brand-light px-3 py-1">{post.category}</span>
          <span className="text-body">{post.readTime}</span>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-body">{post.excerpt}</p>
        <time dateTime={post.isoDate} className="mt-2 block text-sm text-body">
          {post.date}
        </time>
      </header>

      <div className="mt-8">
        <Markdown content={post.content} />
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs text-body">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl bg-brand-light p-6 text-center">
        <h2 className="text-xl font-bold text-ink">Ready to build your resume?</h2>
        <p className="mt-2 text-sm text-body">
          Put these tips into practice with our free, ATS-friendly resume builder.
        </p>
        <Link
          href="/create/start"
          className="mt-4 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Build my resume
        </Link>
      </div>
    </article>
  );
}
