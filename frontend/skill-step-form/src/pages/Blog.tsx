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

// Legacy export for backwards compatibility (will be removed)
export const blogPosts = [
  {
    id: "resume-mistakes",
    title: "10 Resume Mistakes That Cost You Job Interviews",
    excerpt: "Avoid these common pitfalls that hiring managers see every day. Learn what makes recruiters pass on otherwise qualified candidates.",
    category: "Resume Tips",
    readTime: "5 min read",
    date: "Dec 10, 2025",
    gradient: "from-rose-500/20 via-orange-500/10 to-amber-500/5",
    iconColor: "text-rose-500",
    image: "/blog-resume-mistakes.png",
    content: `
## Introduction

Your resume is your first impression, and unfortunately, many job seekers unknowingly sabotage their chances before they even get an interview. After reviewing thousands of resumes, hiring managers consistently see the same mistakes that immediately land applications in the rejection pile.

## 1. Typos and Grammatical Errors

Nothing screams "I don't pay attention to details" louder than a resume riddled with spelling mistakes. Always proofread multiple times and have someone else review your resume before sending.

## 2. Using an Unprofessional Email Address

Still using that email from high school? Time to upgrade. Create a professional email with your name, like firstname.lastname@email.com.

## 3. Including Irrelevant Work Experience

That summer job at the ice cream shop from 10 years ago? Leave it off unless you're applying for food service. Focus on relevant experience that demonstrates transferable skills.

## 4. Writing a Generic Objective Statement

"Seeking a challenging position where I can utilize my skills" tells employers nothing. Instead, write a targeted summary that highlights your specific value proposition.

## 5. Making It Too Long

Unless you're a senior executive with decades of experience, keep your resume to one page. Recruiters spend an average of 7 seconds on initial resume scans.

## 6. Poor Formatting

Inconsistent fonts, cramped text, and confusing layouts make your resume hard to read. Use clean formatting with adequate white space.

## 7. Listing Duties Instead of Achievements

Don't just list what you were responsible for—show what you accomplished. Use numbers and metrics whenever possible.

## 8. Ignoring Keywords

Many companies use ATS (Applicant Tracking Systems) to filter resumes. Include relevant keywords from the job description to make it past the initial screening.

## 9. Including Personal Information

In most countries, including your age, marital status, or photo is unnecessary and can lead to unconscious bias. Focus on your qualifications instead.

## 10. Not Tailoring for Each Application

Sending the same generic resume to every job is a recipe for rejection. Customize your resume to match each position's requirements.

## Conclusion

Avoiding these common mistakes will significantly improve your chances of landing an interview. Take the time to craft a polished, professional resume that showcases your best qualities and achievements.
    `
  },
  {
    id: "ats-friendly-resume",
    title: "How to Write an ATS-Friendly Resume in 2025",
    excerpt: "Master the art of getting past Applicant Tracking Systems. Discover the keywords and formatting tricks that get your resume seen.",
    category: "ATS Optimization",
    readTime: "7 min read",
    date: "Dec 8, 2025",
    gradient: "from-blue-500/20 via-cyan-500/10 to-teal-500/5",
    iconColor: "text-blue-500",
    image: "/ats.png",
    content: `
## What is an ATS?

An Applicant Tracking System (ATS) is software that companies use to collect, sort, scan, and rank job applications. Over 90% of Fortune 500 companies use some form of ATS to manage their hiring process.

## Why ATS Optimization Matters

If your resume isn't ATS-friendly, it might never be seen by human eyes—regardless of how qualified you are. Understanding how these systems work is crucial for modern job searching.

## Key Strategies for ATS Success

### Use Standard Section Headings

Stick to conventional headings like "Work Experience," "Education," and "Skills." Creative alternatives might confuse the system.

### Include Relevant Keywords

Carefully read the job description and incorporate matching keywords naturally throughout your resume. Focus on:
- Technical skills mentioned in the posting
- Industry-specific terminology
- Required qualifications and certifications

### Choose the Right File Format

Unless specified otherwise, submit your resume as a .docx file. While PDFs preserve formatting, some older ATS systems struggle to parse them correctly.

### Use Simple Formatting

Avoid:
- Tables and columns
- Headers and footers
- Images and graphics
- Text boxes
- Unusual fonts

### Spell Out Acronyms

Include both the acronym and full name: "Search Engine Optimization (SEO)" instead of just "SEO."

## Testing Your Resume

Use online ATS simulators to test how well your resume performs. Many free tools can give you insights into potential issues.

## The Balance

Remember that your resume ultimately needs to impress humans too. Find the balance between ATS optimization and creating a document that's engaging and easy to read.
    `
  },
  {
    id: "quantifying-achievements",
    title: "The Power of Quantifying Your Achievements",
    excerpt: "Learn how to transform vague job descriptions into compelling achievements with numbers and metrics that impress employers.",
    category: "Career Growth",
    readTime: "4 min read",
    date: "Dec 5, 2025",
    gradient: "from-emerald-500/20 via-green-500/10 to-lime-500/5",
    iconColor: "text-emerald-500",
    image: "/quatifying.png",
    content: `
## Why Numbers Matter

Hiring managers are drawn to concrete evidence of success. Numbers provide proof of your capabilities and help employers visualize the impact you could have on their organization.

## The Formula for Achievement Statements

Use this structure: **Action Verb + Task + Result with Numbers**

### Before and After Examples

**Weak:** "Responsible for managing social media accounts"
**Strong:** "Grew Instagram following by 150% (10K to 25K followers) in 6 months, increasing engagement rate from 2% to 8%"

**Weak:** "Helped improve customer satisfaction"
**Strong:** "Implemented new customer service protocols that increased satisfaction scores from 72% to 94%"

## Types of Metrics to Include

### Financial Impact
- Revenue generated
- Costs reduced
- Budget managed
- Sales increased

### Scale and Scope
- Team size managed
- Clients served
- Projects completed
- Geographic regions covered

### Efficiency Gains
- Time saved
- Processes improved
- Error rates reduced
- Productivity increased

### Growth Metrics
- Percentage improvements
- Year-over-year comparisons
- Market share gains

## When You Don't Have Exact Numbers

Estimate conservatively and use ranges or approximations:
- "Approximately 50 clients"
- "Over $100K in sales"
- "Reduced processing time by ~30%"

## Making It Believable

Be prepared to discuss your metrics in interviews. Keep records of your achievements and be ready to explain the context and methodology behind your numbers.
    `
  },
  {
    id: "remote-job-applications",
    title: "Remote Job Applications: What's Different?",
    excerpt: "Tailor your resume for remote positions. Highlight the skills and experiences that remote employers value most.",
    category: "Remote Work",
    readTime: "6 min read",
    date: "Dec 3, 2025",
    gradient: "from-violet-500/20 via-purple-500/10 to-fuchsia-500/5",
    iconColor: "text-violet-500",
    image: "/VScode.png",
    content: `
## The Remote Work Revolution

Remote work has transformed from a perk to a standard option for many industries. But applying for remote positions requires a different approach than traditional office jobs.

## Skills Remote Employers Prioritize

### Self-Management
Demonstrate your ability to work independently, manage your time, and stay productive without supervision.

### Communication
Remote work relies heavily on written communication. Highlight your experience with:
- Async communication tools (Slack, email)
- Video conferencing
- Documentation
- Cross-timezone collaboration

### Technical Proficiency
Show comfort with:
- Project management tools (Asana, Trello, Jira)
- Communication platforms
- Cloud-based collaboration tools
- Basic troubleshooting

## Tailoring Your Resume for Remote

### Mention Remote Experience
If you've worked remotely before, make it prominent. Include phrases like:
- "Fully remote position"
- "Managed distributed team across 5 time zones"
- "Collaborated with global stakeholders"

### Highlight Relevant Achievements
- Projects completed independently
- Successful virtual team leadership
- Cross-functional remote collaboration

### Address the Logistics
Consider mentioning:
- Your home office setup
- Reliable internet connection
- Flexibility with meeting times

## Cover Letter Tips

Use your cover letter to explain why you're suited for remote work. Share specific examples of how you've thrived in remote or independent work situations.

## Red Flags to Avoid

Don't suggest that you want remote work for convenience or to avoid commuting. Focus on how remote work helps you deliver your best results.
    `
  },
  {
    id: "career-change-resume",
    title: "Career Change Resume: A Complete Guide",
    excerpt: "Pivoting to a new industry? Here's how to reframe your experience and skills to make a successful transition.",
    category: "Career Change",
    readTime: "8 min read",
    date: "Nov 30, 2025",
    gradient: "from-amber-500/20 via-yellow-500/10 to-orange-500/5",
    iconColor: "text-amber-500",
    image: "/career-change.png",
    content: `
## Making a Successful Career Pivot

Changing careers can feel daunting, but with the right resume strategy, you can successfully transition to a new field. The key is reframing your experience to highlight transferable skills.

## Step 1: Identify Transferable Skills

Every job builds skills that apply across industries:
- Leadership and management
- Communication
- Problem-solving
- Project management
- Data analysis
- Customer service

## Step 2: Research Your Target Industry

Before writing your resume:
- Study job descriptions in your target field
- Identify common requirements and keywords
- Understand the industry's priorities and challenges
- Connect with people in the field

## Step 3: Choose the Right Resume Format

Consider a combination/hybrid resume that:
- Leads with a skills-based summary
- Groups experience by skill category rather than chronology
- Emphasizes relevant projects and achievements

## Step 4: Craft a Compelling Summary

Your summary should:
- Acknowledge your transition
- Highlight relevant transferable skills
- Show enthusiasm for the new field
- Mention any relevant training or certifications

### Example:
"Marketing professional with 8 years of experience transitioning to UX design. Combines deep understanding of user psychology and behavior with newly completed UX certification. Proven track record of creating user-centered campaigns that drive engagement."

## Step 5: Reframe Your Experience

Translate your past experience into language relevant to your new field. Focus on:
- Universal skills used in any context
- Projects that relate to your target role
- Results that demonstrate relevant capabilities

## Step 6: Fill Skill Gaps

Show you're serious about the change:
- Complete relevant certifications
- Take online courses
- Build portfolio projects
- Volunteer or freelance in the new field

## The Cover Letter Advantage

Career changers should always include a cover letter. It's your opportunity to tell your story and explain why you're making the transition.
    `
  },
  {
    id: "cover-letter-vs-resume",
    title: "Cover Letter vs Resume: What Matters More?",
    excerpt: "Understand when to focus on your cover letter and when your resume does the heavy lifting in the application process.",
    category: "Job Search",
    readTime: "5 min read",
    date: "Nov 28, 2025",
    gradient: "from-pink-500/20 via-rose-500/10 to-red-500/5",
    iconColor: "text-pink-500",
    image: "/cover-letter.png",
    content: `
## The Great Debate

Job seekers often wonder which document deserves more attention: the resume or the cover letter? The answer depends on several factors.

## When the Resume Matters Most

### Highly Technical Roles
For positions requiring specific technical skills, your resume's skills section and experience take precedence.

### ATS-Heavy Applications
Large companies that rely heavily on ATS scanning prioritize resume keywords over cover letters.

### When Cover Letters Are Optional
If a cover letter isn't required, employers are signaling that the resume carries more weight.

## When the Cover Letter Matters Most

### Career Transitions
Cover letters allow you to explain gaps, transitions, and non-linear career paths that resumes can't address.

### Creative Industries
Fields like marketing, writing, and design use cover letters to evaluate creativity and communication skills.

### Competitive Positions
When many candidates have similar qualifications, a compelling cover letter can differentiate you.

### When Specifically Requested
If a job posting emphasizes the cover letter or asks specific questions, take it seriously.

## The Ideal Approach

### Strong Resume Foundation
Your resume should stand on its own and clearly communicate your qualifications.

### Strategic Cover Letters
Write tailored cover letters for positions where they can make a difference, rather than sending generic ones everywhere.

### Quality Over Quantity
A few well-crafted applications beat dozens of generic submissions.

## Tips for Both Documents

- Customize for each application
- Use consistent formatting and branding
- Proofread thoroughly
- Focus on the employer's needs, not just your wants

## The Bottom Line

Both documents serve different purposes. The resume provides facts and figures; the cover letter provides context and personality. Master both to maximize your chances of landing interviews.
    `
  }
];

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
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-accent border border-border text-xs sm:text-sm font-medium text-accent-foreground mb-4">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('blog.badge')}
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
            {t('blog.title')}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('blog.subtitle')}
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder={t('blog.searchPlaceholder')} 
              className="pl-10 rounded-full bg-background border-border"
            />
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading blog posts...</p>
            </div>
          ) : blogPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No blog posts available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              {blogPosts.map((post) => {
                const hasImage = post.image && typeof post.image === 'string';
                return (
                  <Link to={`/blog/${post.id}`} key={post.id} className="h-full">
                    <article className="group relative bg-card rounded-2xl border border-border overflow-hidden hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] hover:border-primary/40 transition-all duration-500 cursor-pointer hover:-translate-y-2 h-full flex flex-col">
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
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 hover:bg-primary/15 transition-colors">
                            {post.category}
                          </span>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                                  {tag}
                                </span>
                              ))}
                              {post.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{post.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-5 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground pt-5 border-t border-border/50">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            {post.readTime}
                          </div>
                          <span className="font-medium">{post.date}</span>
                        </div>
                      </div>
                      {/* Hover arrow indicator */}
                      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <ArrowRight className="w-4 h-4 text-primary" />
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
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
            {t('blog.ctaTitle')}
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
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

