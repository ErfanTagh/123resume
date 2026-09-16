import { Link, useParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  Twitter,
  Linkedin
} from "lucide-react";
import { getBlogPost, getBlogPosts } from "@/lib/blogPosts";
import { useLanguage } from "@/contexts/LanguageContext";
import { blogPostAPI, BlogPost } from "@/lib/api";
import { SEO } from "@/components/SEO";

// Medium-style serif stack for article body
const serifStack = "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif";

const BlogPost = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allPosts, setAllPosts] = useState<BlogPost[]>([]);

  // Scroll to top when component mounts or id changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  // Fetch blog post from API with fallback to static
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      setIsLoading(true);
      try {
        const apiPost = await blogPostAPI.getById(id, language);
        setPost(apiPost);
      } catch (error) {
        // Fallback to static posts
        const staticPost = getBlogPost(id, language);
        setPost(staticPost);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id, language]);

  // Get all posts for navigation (try API first, fallback to static)
  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const apiPosts = await blogPostAPI.getAll(language);
        const staticPosts = getBlogPosts(language);
        const apiPostIds = new Set(apiPosts.map(p => p.id));
        const merged = [...apiPosts, ...staticPosts.filter(p => !apiPostIds.has(p.id))];
        setAllPosts(merged);
      } catch {
        setAllPosts(getBlogPosts(language));
      }
    };
    fetchAllPosts();
  }, [language]);

  // Reading progress bar
  const [readingProgress, setReadingProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const height = el.scrollHeight - el.clientHeight;
      setReadingProgress(height > 0 ? Math.min(100, (el.scrollTop / height) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const currentIndex = allPosts.findIndex(p => p.id === id);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  // Get related articles from the same category (excluding current post)
  const relatedArticles = allPosts
    .filter(p => p.id !== id && p.category === post.category)
    .slice(0, 3);

  // Render inline bold (**text**) within a string
  const renderInline = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i} className="font-bold text-[#242424]">{part.replace(/\*\*/g, '')}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  // Simple markdown-like rendering — Medium-style typography
  const renderContent = (content: string) => {
    const lines = content.trim().split('\n');
    const elements: JSX.Element[] = [];
    let listItems: string[] = [];
    let firstParagraphRendered = false;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-6 space-y-2.5 pl-6 list-disc marker:text-[#242424]">
            {listItems.map((item, i) => (
              <li
                key={i}
                className="text-[18px] sm:text-[20px] text-[#242424] leading-[1.7]"
                style={{ fontFamily: serifStack }}
              >
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="scroll-mt-28 text-[24px] sm:text-[28px] font-bold tracking-tight text-[#242424] mt-12 mb-4 leading-snug">
            {trimmed.replace('## ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="scroll-mt-28 text-[20px] sm:text-[22px] font-bold text-[#242424] mt-9 mb-3">
            {trimmed.replace('### ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote
            key={index}
            className="my-8 border-l-[3px] border-[#242424] pl-5 text-[20px] sm:text-[22px] italic text-[#242424] leading-relaxed"
            style={{ fontFamily: serifStack }}
          >
            {renderInline(trimmed.replace('> ', ''))}
          </blockquote>
        );
      } else if (trimmed.startsWith('- ')) {
        listItems.push(trimmed.replace('- ', ''));
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        flushList();
        elements.push(
          <p
            key={index}
            className="mt-6 mb-2 text-[18px] sm:text-[20px] font-bold text-[#242424]"
            style={{ fontFamily: serifStack }}
          >
            {trimmed.replace(/\*\*/g, '')}
          </p>
        );
      } else if (trimmed.length > 0) {
        flushList();
        const isLead = !firstParagraphRendered;
        firstParagraphRendered = true;
        elements.push(
          <p
            key={index}
            className={
              isLead
                ? "mb-8 text-[20px] sm:text-[22px] leading-[1.7] text-[#242424]"
                : "mb-7 text-[18px] sm:text-[20px] leading-[1.75] text-[#242424]"
            }
            style={{ fontFamily: serifStack }}
          >
            {renderInline(trimmed)}
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  const postUrl = `https://123resume.de/blog/${post.id}`;
  const postImage = post.coverImage || post.image || 'https://123resume.de/resume-icon.svg';
  const postDescription = post.excerpt || post.content?.substring(0, 160) || 'Read our latest resume tips and career advice';

  // Structured data for article
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: postDescription,
    image: postImage,
    datePublished: post.publishedAt || post.createdAt || new Date().toISOString(),
    dateModified: post.updatedAt || post.publishedAt || post.createdAt || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: '123Resume',
    },
    publisher: {
      '@type': 'Organization',
      name: '123Resume',
      logo: {
        '@type': 'ImageObject',
        url: 'https://123resume.de/resume-icon.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  return (
    <>
      <SEO
        title={`${post.title} | 123Resume Blog`}
        description={postDescription}
        keywords={`${post.category || 'resume tips'}, career advice, job search, ${post.title}`}
        image={postImage}
        url={postUrl}
        type="article"
        structuredData={articleStructuredData}
        publishedTime={post.publishedAt || post.createdAt}
        modifiedTime={post.updatedAt || post.publishedAt || post.createdAt}
        breadcrumbs={[
          { name: 'Home', url: 'https://123resume.de/' },
          { name: 'Blog', url: 'https://123resume.de/blog' },
          { name: post.title, url: postUrl },
        ]}
      />
      <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logoo.png"
              alt="123Resume Logo"
              className="h-8 w-auto sm:h-10 flex-shrink-0 object-contain"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/blog">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">All Articles</span>
              </Button>
            </Link>
            <Link to="/create/start">
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm">
                <span className="hidden sm:inline">Start Building Free</span>
                <span className="sm:hidden">Start Free</span>
              </Button>
            </Link>
          </div>
        </div>
        {/* Reading progress */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-150 ease-out" style={{ width: `${readingProgress}%` }} />
      </nav>

      {/* Article Header */}
      <header className="pt-24 sm:pt-32 pb-6 sm:pb-8 px-4 sm:px-6 bg-white">
        <div className="container mx-auto max-w-[680px]">
          <Link to="/blog" className="flex w-fit items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </Link>

          {post.category && (
            <span className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full mb-5">
              {post.category}
            </span>
          )}

          <h1 className="text-[32px] sm:text-[42px] font-bold text-[#242424] mb-4 leading-[1.15] tracking-tight">
            {post.title}
          </h1>

          <p className="text-lg sm:text-[22px] text-gray-500 mb-8 leading-relaxed" style={{ fontFamily: serifStack }}>
            {post.excerpt}
          </p>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pb-6 border-b border-gray-200">
            {/* Author byline */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#242424] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                123
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-[#242424]">123Resume Team</div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{post.date}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="hidden sm:inline text-xs uppercase tracking-wider text-gray-400">Share:</span>
              <button aria-label="Share on Twitter" className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </button>
              <button aria-label="Share on LinkedIn" className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-colors">
                <Linkedin className="w-4 h-4" />
              </button>
              <button aria-label="Share" className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 flex items-center justify-center transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Image */}
      {post.image && (
        <div className="px-4 sm:px-6 mb-10 sm:mb-12">
          <div className="container mx-auto max-w-[680px]">
            <div className="rounded-lg overflow-hidden relative">
              <img
                src={post.image}
                alt={`Featured image for blog post: ${post.title}${post.category ? ` about ${post.category}` : ''} on 123Resume`}
                className="w-full h-auto object-cover"
              />
              {/* Watermark */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg shadow-md">
                <img
                  src="/logoo.png"
                  alt="123Resume Logo"
                  className="h-6 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Article Content */}
      <article className="px-4 sm:px-6 pb-16 bg-white">
        <div className="container mx-auto max-w-[680px]">
          <div className="max-w-none">
            {renderContent(post.content)}
          </div>

          {/* Tags at the end of article */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                {post.tags.map((tag, index) => (
                  <span key={index} className="text-sm text-gray-600 bg-gray-100 px-3.5 py-1.5 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* CTA Box */}
      <section className="px-4 sm:px-6 pb-16 bg-white">
        <div className="container mx-auto max-w-[680px]">
          <div className="bg-gray-50 rounded-2xl p-8 sm:p-12 border border-gray-200 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-[#242424] mb-3">
              {t('blog.ctaTitle')}
            </h3>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">
              {t('blog.ctaSubtitle')}
            </p>
            <Link to="/create/start">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl">
                {t('navigation.startBuildingFree')}
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Related Articles Section */}
      {relatedArticles.length > 0 && (
        <section className="px-4 sm:px-6 py-12 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] mb-2">
                Related Articles
              </h2>
              <p className="text-gray-500">
                More articles about {post.category}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((relatedPost) => {
                const hasImage = relatedPost.image && typeof relatedPost.image === 'string';
                return (
                  <Link to={`/blog/${relatedPost.id}`} key={relatedPost.id} className="group">
                    <article className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 h-full">
                      {hasImage && (
                        <div className="aspect-[16/9] relative overflow-hidden">
                          <img
                            src={relatedPost.image}
                            alt={`Featured image for blog post: ${relatedPost.title}${relatedPost.category ? ` about ${relatedPost.category}` : ''} on 123Resume`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {relatedPost.category}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">{relatedPost.readTime}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-[#242424] mb-2 group-hover:underline line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Navigation Between Posts */}
      <section className="px-4 sm:px-6 py-12 bg-white">
        <div className="container mx-auto max-w-[680px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevPost && (
              <Link to={`/blog/${prevPost.id}`} className="group">
                <div className="p-4 sm:p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    {t('common.previous')}
                  </div>
                  <h4 className="font-semibold text-[#242424] line-clamp-2">
                    {prevPost.title}
                  </h4>
                </div>
              </Link>
            )}
            {nextPost && (
              <Link to={`/blog/${nextPost.id}`} className="group sm:ml-auto">
                <div className="p-4 sm:p-6 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-right">
                  <div className="flex items-center justify-end gap-2 text-sm text-gray-500 mb-2">
                    {t('common.next')}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="font-semibold text-[#242424] line-clamp-2">
                    {nextPost.title}
                  </h4>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-gray-200 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logoo.png"
                alt="123Resume Logo"
                className="h-10 w-auto flex-shrink-0 object-contain"
              />
            </Link>
            <p className="text-xs sm:text-sm text-gray-500 text-center">
              © 2025 123Resume. Build your dream career.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
};

export default BlogPost;
