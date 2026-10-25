import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Clock, 
  ArrowRight,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { getBlogPosts } from "@/lib/blogPosts";
import { blogPostAPI, BlogPost } from "@/lib/api";
import { SEO } from "@/components/SEO";

const Blog = () => {
  const { language, t } = useLanguage();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fallback to static posts
  const staticPosts = useMemo(() => getBlogPosts(language), [language]);
  
  // Fetch blog posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const apiPosts = await blogPostAPI.getAll(language);
        // Merge API posts with static posts, prioritizing API posts
        const apiPostIds = new Set(apiPosts.map(p => p.id));
        const mergedPosts = [...apiPosts, ...staticPosts.filter(p => !apiPostIds.has(p.id))];
        setBlogPosts(mergedPosts);
      } catch (error) {
        // If API fails, use static posts as fallback
        console.warn('Failed to fetch blog posts from API, using static posts:', error);
        setBlogPosts(staticPosts);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPosts();
  }, [language, staticPosts]);
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <SEO
        title="Resume Tips & Career Advice Blog | 123Resume"
        description="Expert resume tips, career advice, and job search strategies. Learn how to create ATS-friendly resumes and land your dream job."
        keywords="resume tips, career advice, job search, ATS resume, resume writing, career development, job interview tips"
        url="https://123resume.de/blog"
      />
      <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 bg-white border-b border-gray-200">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gray-100 text-xs sm:text-sm font-medium text-gray-600 mb-4">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('blog.badge')}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-[#242424] mb-4">
            {t('blog.title')}
          </h1>
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            {t('blog.subtitle')}
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={t('blog.searchPlaceholder')}
              className="pl-10 rounded-full bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading blog posts...</p>
            </div>
          ) : blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No blog posts available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {blogPosts.map((post) => {
                const hasImage = post.image && typeof post.image === 'string';
                return (
                  <Link to={`/blog/${post.id}`} key={post.id} className="h-full">
                    <article className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer hover:-translate-y-1 h-full flex flex-col">
                      {/* Hero Image or Decorative background pattern */}
                      {hasImage ? (
                        <div className="aspect-[16/9] relative overflow-hidden">
                          <img
                            src={post.image}
                            alt={`Featured image for blog post: ${post.title}${post.category ? ` about ${post.category}` : ''} on 123Resume`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              // Image failed to load, fallback to gradient design
                            }}
                          />
                          {/* Watermark */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-white px-1.5 py-1 rounded-md shadow-sm">
                            <img
                              src="/logoo.png"
                              alt="123Resume Logo"
                              className="h-5 w-auto object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className={`aspect-[16/9] bg-gradient-to-br ${post.gradient} relative overflow-hidden`}>
                          <div className="absolute inset-0 opacity-30">
                            <div className="absolute top-4 right-4 w-20 h-20 border border-current rounded-full opacity-20" />
                            <div className="absolute bottom-4 left-4 w-12 h-12 border border-current rounded-lg rotate-12 opacity-20" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-current rounded-full opacity-10" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                              <BookOpen className={`w-8 h-8 sm:w-10 sm:h-10 ${post.iconColor} group-hover:scale-110 transition-transform duration-300`} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="p-6 sm:p-8 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                            {post.category}
                          </span>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                                  {tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{post.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-[#242424] mb-4 group-hover:underline line-clamp-2 leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-5 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between text-xs text-gray-400 pt-5 border-t border-gray-100">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime}
                          </div>
                          <span className="font-medium">{post.date}</span>
                        </div>
                      </div>
                      {/* Hover arrow indicator */}
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="w-4 h-4 text-gray-700" />
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-[#242424] mb-4">
            {t('blog.ctaTitle')}
          </h2>
          <p className="text-base sm:text-lg text-gray-500 mb-8">
            {t('blog.ctaSubtitle')}
          </p>
          <Link to="/create/start">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl">
              {t('navigation.startBuildingFree')}
              <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
    </>
  );
};

export default Blog;

