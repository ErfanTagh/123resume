import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

/** Canonical host for SEO (apex only — www redirects here in nginx). */
const CANONICAL_ORIGIN = 'https://123resume.de';

function toCanonicalPublicUrl(href: string): string {
  try {
    const u = new URL(href, CANONICAL_ORIGIN);
    if (u.hostname === 'www.123resume.de') {
      u.hostname = '123resume.de';
    }
    u.protocol = 'https:';
    u.hash = '';
    return u.toString();
  } catch {
    return href;
  }
}

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  structuredData?: object;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  faqs?: Array<{ question: string; answer: string }>;
}

export const SEO = ({
  title = '123Resume - Professional CV Builder | Create Your Resume Online',
  description = 'Build your professional CV with our easy-to-use multi-step form. Create ATS-friendly resumes with multiple templates. Free CV builder with PDF export.',
  keywords = 'CV builder, resume builder, create CV, professional resume, ATS resume, CV templates, resume templates, online CV maker',
  image = 'https://123resume.de/resume-icon.svg',
  url,
  type = 'website',
  noindex = false,
  structuredData,
  author,
  publishedTime,
  modifiedTime,
  breadcrumbs,
  faqs,
}: SEOProps) => {
  const location = useLocation();
  const { language } = useLanguage();
  const rawUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const canonicalUrl = toCanonicalPublicUrl(rawUrl || `${CANONICAL_ORIGIN}/`);
  
  // Generate breadcrumbs from pathname if not provided
  const generateBreadcrumbsFromPath = (pathname: string): Array<{ name: string; url: string }> => {
    const baseUrl = 'https://123resume.de';
    const crumbs: Array<{ name: string; url: string }> = [
      { name: 'Home', url: `${baseUrl}/` },
    ];

    // Skip breadcrumbs for private pages (they have noindex anyway)
    if (noindex) {
      return crumbs;
    }

    const pathParts = pathname.split('/').filter(Boolean);
    
    if (pathParts.length === 0) {
      return crumbs;
    }

    // Map path segments to friendly names
    const pathMap: Record<string, string> = {
      'blog': 'Blog',
      'templates': 'Templates',
      'pricing': 'Pricing',
      'about': 'About',
      'contact': 'Contact',
      'careers': 'Careers',
      'privacy': 'Privacy Policy',
      'terms': 'Terms of Service',
      'data-protection': 'Data Protection',
      'cookies': 'Cookie Policy',
      'resumes': 'My Resumes',
      'create': 'Create Resume',
      'resume': 'Resume',
    };

    let currentPath = '';
    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      // For dynamic routes like /blog/:id or /resume/:id, use the last part as the name
      if (index === pathParts.length - 1 && (part.match(/^[a-f0-9-]{24,}$/i) || part.length > 20)) {
        // It's likely an ID, use a generic name
        const parentPath = pathParts[index - 1];
        if (parentPath === 'blog') {
          crumbs.push({ name: 'Blog Post', url: `${baseUrl}${currentPath}` });
        } else if (parentPath === 'resume' || pathParts[0] === 'resume') {
          crumbs.push({ name: 'Resume', url: `${baseUrl}${currentPath}` });
        }
      } else {
        const friendlyName = pathMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
        crumbs.push({ name: friendlyName, url: `${baseUrl}${currentPath}` });
      }
    });

    return crumbs;
  };

  const finalBreadcrumbs = breadcrumbs || generateBreadcrumbsFromPath(location.pathname);

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', canonicalUrl, true);
    updateMetaTag('og:site_name', '123Resume', true);
    // Update og:locale based on current language
    updateMetaTag('og:locale', language === 'de' ? 'de_DE' : 'en_US', true);
    // Add alternate locales for both languages
    updateMetaTag('og:locale:alternate', language === 'de' ? 'en_US' : 'de_DE', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Hreflang tags for multi-language support (German/English)
    // Since we use client-side language switching, same URL serves both languages
    const updateHreflangTag = (lang: string, href: string) => {
      let hreflang = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement;
      if (!hreflang) {
        hreflang = document.createElement('link');
        hreflang.setAttribute('rel', 'alternate');
        hreflang.setAttribute('hreflang', lang);
        document.head.appendChild(hreflang);
      }
      hreflang.setAttribute('href', href);
    };

    // Add hreflang tags for English, German, and x-default (fallback)
    updateHreflangTag('en', canonicalUrl);
    updateHreflangTag('de', canonicalUrl);
    updateHreflangTag('x-default', canonicalUrl); // Default/fallback language

    // Robots meta tag
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Language attribute - update based on current language
    const html = document.documentElement;
    html.setAttribute('lang', language);

    // Article-specific meta tags
    if (type === 'article') {
      if (author) updateMetaTag('article:author', author, true);
      if (publishedTime) updateMetaTag('article:published_time', publishedTime, true);
      if (modifiedTime) updateMetaTag('article:modified_time', modifiedTime, true);
    }

    // BreadcrumbList structured data
    const breadcrumbListData = finalBreadcrumbs.length > 1 ? {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: finalBreadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    } : null;

    // FAQPage structured data
    const faqPageData = faqs && faqs.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    } : null;

    // Structured Data (JSON-LD)
    let structuredDataScript = document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      if (!structuredDataScript) {
        structuredDataScript = document.createElement('script');
        structuredDataScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(structuredDataScript);
      }
      structuredDataScript.textContent = JSON.stringify(structuredData);
      
      // Add breadcrumbs and FAQs separately if custom structuredData is provided
      if (breadcrumbListData) {
        let breadcrumbScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
        if (!breadcrumbScript) {
          breadcrumbScript = document.createElement('script');
          breadcrumbScript.setAttribute('type', 'application/ld+json');
          breadcrumbScript.setAttribute('data-breadcrumb', 'true');
          document.head.appendChild(breadcrumbScript);
        }
        breadcrumbScript.textContent = JSON.stringify(breadcrumbListData);
      }
      
      if (faqPageData) {
        let faqScript = document.querySelector('script[type="application/ld+json"][data-faq]');
        if (!faqScript) {
          faqScript = document.createElement('script');
          faqScript.setAttribute('type', 'application/ld+json');
          faqScript.setAttribute('data-faq', 'true');
          document.head.appendChild(faqScript);
        }
        faqScript.textContent = JSON.stringify(faqPageData);
      }
    } else {
      // Default Organization, Website, SoftwareApplication, and Service structured data
      const defaultStructuredData = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://123resume.de/#organization',
            name: '123Resume',
            url: 'https://123resume.de',
            logo: {
              '@type': 'ImageObject',
              url: 'https://123resume.de/resume-icon.svg',
              width: 512,
              height: 512,
            },
            sameAs: [],
          },
          {
            '@type': 'WebSite',
            '@id': 'https://123resume.de/#website',
            url: 'https://123resume.de',
            name: '123Resume - Professional CV Builder',
            description: description,
            publisher: {
              '@id': 'https://123resume.de/#organization',
            },
          },
          {
            '@type': 'SoftwareApplication',
            '@id': 'https://123resume.de/#software',
            name: '123Resume',
            applicationCategory: 'WebApplication',
            operatingSystem: 'Web',
            browserRequirements: 'Requires JavaScript. Requires HTML5.',
            softwareVersion: '1.0',
            description: 'Professional CV and resume builder with multiple ATS-friendly templates. Create, edit, and export your resume as PDF.',
            url: 'https://123resume.de',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
            },
            featureList: [
              'Multiple resume templates',
              'ATS-friendly format',
              'PDF export',
              'Multi-step form',
              'Real-time preview',
              'Free to use',
            ],
            screenshot: 'https://123resume.de/resume-icon.svg',
            applicationSubCategory: 'Productivity Software',
            creator: {
              '@id': 'https://123resume.de/#organization',
            },
          },
          {
            '@type': 'Service',
            '@id': 'https://123resume.de/#service',
            serviceType: 'Resume Builder',
            name: 'Professional Resume Building Service',
            description: 'Create professional, ATS-friendly resumes and CVs with our easy-to-use online builder. Multiple templates available with PDF export.',
            provider: {
              '@id': 'https://123resume.de/#organization',
            },
            areaServed: {
              '@type': 'Place',
              name: 'Worldwide',
            },
            serviceOutput: {
              '@type': 'CreativeWork',
              name: 'Professional Resume',
              fileFormat: 'application/pdf',
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              availability: 'https://schema.org/InStock',
              description: 'Free resume builder with unlimited templates and PDF export',
            },
            category: 'Career Services',
            audience: {
              '@type': 'Audience',
              audienceType: 'Job Seekers',
            },
          },
        ],
      };

      if (!structuredDataScript) {
        structuredDataScript = document.createElement('script');
        structuredDataScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(structuredDataScript);
      }
      
      // Combine default structured data with breadcrumbs and FAQs if available
      const combinedData = {
        ...defaultStructuredData,
        '@graph': [
          ...defaultStructuredData['@graph'],
          ...(breadcrumbListData ? [breadcrumbListData] : []),
          ...(faqPageData ? [faqPageData] : []),
        ],
      };
      
      structuredDataScript.textContent = JSON.stringify(combinedData);
    }
  }, [title, description, keywords, image, canonicalUrl, type, noindex, location.pathname, structuredData, author, publishedTime, modifiedTime, language, finalBreadcrumbs, faqs]);

  return null;
};

