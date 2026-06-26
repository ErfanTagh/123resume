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

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "resume-mistakes",
    title: "10 Resume Mistakes That Cost You Job Interviews",
    excerpt:
      "Avoid these common pitfalls that hiring managers see every day. Learn what makes recruiters pass on otherwise qualified candidates.",
    category: "Resume Tips",
    readTime: "5 min read",
    date: "Dec 10, 2025",
    isoDate: "2025-12-10",
    image: "/blog-resume-mistakes.png",
    tags: ["Resume Tips", "Job Search", "ATS", "Common Mistakes"],
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

Don't just list what you were responsible for, show what you accomplished. Use numbers and metrics whenever possible.

## 8. Ignoring Keywords

Many companies use ATS (Applicant Tracking Systems) to filter resumes. Include relevant keywords from the job description to make it past the initial screening.

## 9. Including Personal Information

In most countries, including your age, marital status, or photo is unnecessary and can lead to unconscious bias. Focus on your qualifications instead.

## 10. Not Tailoring for Each Application

Sending the same generic resume to every job is a recipe for rejection. Customize your resume to match each position's requirements.

## Conclusion

Avoiding these common mistakes will significantly improve your chances of landing an interview. Take the time to craft a polished, professional resume that showcases your best qualities and achievements.
`,
  },
  {
    id: "ats-friendly-resume",
    title: "How to Write an ATS-Friendly Resume in 2025",
    excerpt:
      "Master the art of getting past Applicant Tracking Systems. Discover the keywords and formatting tricks that get your resume seen.",
    category: "ATS Optimization",
    readTime: "7 min read",
    date: "Dec 8, 2025",
    isoDate: "2025-12-08",
    image: "/ats.png",
    tags: ["ATS", "Resume Optimization", "Keywords", "Formatting"],
    content: `
## What is an ATS?

An Applicant Tracking System (ATS) is software that companies use to collect, sort, scan, and rank job applications. Over 90% of Fortune 500 companies use some form of ATS to manage their hiring process.

## Why ATS Optimization Matters

If your resume isn't ATS-friendly, it might never be seen by human eyes, regardless of how qualified you are. Understanding how these systems work is crucial for modern job searching.

## Key Strategies for ATS Success

### Use Standard Section Headings

Stick to conventional headings like "Work Experience," "Education," and "Skills." Creative alternatives might confuse the system.

### Include Relevant Keywords

Carefully read the job description and incorporate matching keywords naturally throughout your resume. Focus on technical skills mentioned in the posting, industry-specific terminology, and required qualifications and certifications.

### Choose the Right File Format

Unless specified otherwise, submit your resume as a .docx file. While PDFs preserve formatting, some older ATS systems struggle to parse them correctly.

### Use Simple Formatting

Avoid tables and columns, headers and footers, images and graphics, text boxes, and unusual fonts.

### Spell Out Acronyms

Include both the acronym and full name: "Search Engine Optimization (SEO)" instead of just "SEO."

## Testing Your Resume

Use online ATS simulators to test how well your resume performs. Many free tools can give you insights into potential issues.

## The Balance

Remember that your resume ultimately needs to impress humans too. Find the balance between ATS optimization and creating a document that's engaging and easy to read.
`,
  },
  {
    id: "quantifying-achievements",
    title: "The Power of Quantifying Your Achievements",
    excerpt:
      "Learn how to transform vague job descriptions into compelling achievements with numbers and metrics that impress employers.",
    category: "Career Growth",
    readTime: "4 min read",
    date: "Dec 5, 2025",
    isoDate: "2025-12-05",
    image: "/quatifying.png",
    tags: ["Career Growth", "Resume Writing", "Achievements", "Metrics"],
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

Revenue generated, costs reduced, budget managed, and sales increased.

### Scale and Scope

Team size managed, clients served, projects completed, and geographic regions covered.

### Efficiency Gains

Time saved, processes improved, error rates reduced, and productivity increased.

## When You Don't Have Exact Numbers

Estimate conservatively and use ranges or approximations like "approximately 50 clients," "over $100K in sales," or "reduced processing time by ~30%."

## Making It Believable

Be prepared to discuss your metrics in interviews. Keep records of your achievements and be ready to explain the context and methodology behind your numbers.
`,
  },
  {
    id: "remote-job-applications",
    title: "Remote Job Applications: What's Different?",
    excerpt:
      "Tailor your resume for remote positions. Highlight the skills and experiences that remote employers value most.",
    category: "Remote Work",
    readTime: "6 min read",
    date: "Dec 3, 2025",
    isoDate: "2025-12-03",
    image: "/VScode.png",
    tags: ["Remote Work", "Job Search", "Resume Tips"],
    content: `
## The Remote Work Revolution

Remote work has transformed from a perk to a standard option for many industries. But applying for remote positions requires a different approach than traditional office jobs.

## Skills Remote Employers Prioritize

### Self-Management

Demonstrate your ability to work independently, manage your time, and stay productive without supervision.

### Communication

Remote work relies heavily on written communication. Highlight your experience with async communication tools, video conferencing, documentation, and cross-timezone collaboration.

### Technical Proficiency

Show comfort with project management tools, communication platforms, cloud-based collaboration tools, and basic troubleshooting.

## Tailoring Your Resume for Remote

### Mention Remote Experience

If you've worked remotely before, make it prominent with phrases like "fully remote position" or "managed distributed team across 5 time zones."

### Highlight Relevant Achievements

Projects completed independently, successful virtual team leadership, and cross-functional remote collaboration.

## Cover Letter Tips

Use your cover letter to explain why you're suited for remote work. Share specific examples of how you've thrived in remote or independent work situations.
`,
  },
  {
    id: "career-change-resume",
    title: "Career Change Resume: A Complete Guide",
    excerpt:
      "Pivoting to a new industry? Here's how to reframe your experience and skills to make a successful transition.",
    category: "Career Change",
    readTime: "8 min read",
    date: "Nov 30, 2025",
    isoDate: "2025-11-30",
    image: "/career-change.png",
    tags: ["Career Change", "Resume Tips", "Transition", "Skills"],
    content: `
## Making a Successful Career Pivot

Changing careers can feel daunting, but with the right resume strategy, you can successfully transition to a new field. The key is reframing your experience to highlight transferable skills.

## Step 1: Identify Transferable Skills

Every job builds skills that apply across industries: leadership and management, communication, problem-solving, project management, data analysis, and customer service.

## Step 2: Research Your Target Industry

Study job descriptions in your target field, identify common requirements and keywords, understand the industry's priorities and challenges, and connect with people in the field.

## Step 3: Choose the Right Resume Format

Consider a combination/hybrid resume that leads with a skills-based summary, groups experience by skill category rather than chronology, and emphasizes relevant projects and achievements.

## Step 4: Craft a Compelling Summary

Your summary should acknowledge your transition, highlight relevant transferable skills, show enthusiasm for the new field, and mention any relevant training or certifications.

## Step 5: Reframe Your Experience

Translate your past experience into language relevant to your new field. Focus on universal skills, projects that relate to your target role, and results that demonstrate relevant capabilities.

## Step 6: Fill Skill Gaps

Show you're serious about the change: complete relevant certifications, take online courses, build portfolio projects, and volunteer or freelance in the new field.

## The Cover Letter Advantage

Career changers should always include a cover letter. It's your opportunity to tell your story and explain why you're making the transition.
`,
  },
  {
    id: "cover-letter-vs-resume",
    title: "Cover Letter vs Resume: What Matters More?",
    excerpt:
      "Understand when to focus on your cover letter and when your resume does the heavy lifting in the application process.",
    category: "Job Search",
    readTime: "5 min read",
    date: "Nov 28, 2025",
    isoDate: "2025-11-28",
    image: "/cover-letter.png",
    tags: ["Cover Letter", "Job Search", "Application", "Resume Tips"],
    content: `
## The Great Debate

Job seekers often wonder which document deserves more attention: the resume or the cover letter? The answer depends on several factors.

## When the Resume Matters Most

### Highly Technical Roles

For positions requiring specific technical skills, your resume's skills section and experience take precedence.

### ATS-Heavy Applications

Large companies that rely heavily on ATS scanning prioritize resume keywords over cover letters.

## When the Cover Letter Matters Most

### Career Transitions

Cover letters allow you to explain gaps, transitions, and non-linear career paths that resumes can't address.

### Creative Industries

Fields like marketing, writing, and design use cover letters to evaluate creativity and communication skills.

### Competitive Positions

When many candidates have similar qualifications, a compelling cover letter can differentiate you.

## The Ideal Approach

Your resume should stand on its own and clearly communicate your qualifications. Write tailored cover letters for positions where they can make a difference, rather than sending generic ones everywhere. A few well-crafted applications beat dozens of generic submissions.

## The Bottom Line

Both documents serve different purposes. The resume provides facts and figures; the cover letter provides context and personality. Master both to maximize your chances of landing interviews.
`,
  },
];

export function getAllPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getPost(id: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.id === id);
}
