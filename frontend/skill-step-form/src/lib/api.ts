/**
 * API Service for Resume Backend
 * Handles all HTTP requests to the Django backend
 */

import type { PublicProfileSections } from "@/lib/publicProfileSections";
import type { PublicProfileThemeId } from "@/lib/publicProfileTheme";

// Use environment variable if available, otherwise use relative path for Vite proxy
// Remove trailing slash if present to avoid double slashes
const getApiBaseUrl = () => {
  // In development mode, always use relative path to leverage Vite proxy
  // In production, use the environment variable if provided
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Production: use env var or default to /api
  const url = import.meta.env.VITE_API_URL || '/api';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
const API_BASE_URL = getApiBaseUrl();

// Helper function to convert camelCase to snake_case
const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Helper function to convert snake_case to camelCase
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

// Helper function to convert object keys from camelCase to snake_case recursively
const camelToSnakeObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => camelToSnakeObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = camelToSnake(key);
      acc[snakeKey] = camelToSnakeObject(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Helper function to convert object keys from snake_case to camelCase recursively
const snakeToCamelObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamelObject(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = snakeToCamel(key);
      acc[camelKey] = snakeToCamelObject(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Get tokens from localStorage
const getTokens = () => {
  const tokens = localStorage.getItem('tokens');
  return tokens ? JSON.parse(tokens) : null;
};

// Get access token
const getAccessToken = () => {
  const tokens = getTokens();
  return tokens?.access || null;
};

// Create headers with authentication
const createHeaders = (includeAuth = true, noCache = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add cache control headers to prevent caching (especially important for mobile browsers)
  if (noCache) {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['Expires'] = '0';
  }

  if (includeAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Try to refresh token if expired
const tryRefreshToken = async (): Promise<boolean> => {
  try {
    const tokens = getTokens();
    if (!tokens?.refresh) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: tokens.refresh }),
    });

    if (response.ok) {
      const data = await response.json();
      // Update access token
      const newTokens = { ...tokens, access: data.access };
      localStorage.setItem('tokens', JSON.stringify(newTokens));
      return true;
    }
    
    // Refresh token also expired, clear everything
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
    return false;
  } catch (error) {
    return false;
  }
};

// Handle API errors with automatic token refresh
const handleResponse = async (response: Response, retryFn?: () => Promise<Response>) => {
  if (!response.ok) {
    // Try to parse error response, but handle non-JSON responses
    let error: any = {};
    try {
      const text = await response.text();
      error = text ? JSON.parse(text) : {};
    } catch (e) {
      error = { detail: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // Special handling for authentication errors
    if (response.status === 401 && retryFn) {
      // Try to refresh the token
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry the original request with new token
        const retryResponse = await retryFn();
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return snakeToCamelObject(data);
        }
      }
      // If refresh failed or retry failed, throw error
      throw new Error('Your session has expired. Please log in again.');
    }
    
    if (response.status === 401) {
      throw new Error('Your session has expired. Please log in again.');
    }
    
    // Provide more detailed error message
    const errorMessage = error.error || error.detail || error.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(errorMessage);
  }
  const data = await response.json();
  // Convert snake_case response to camelCase
  return snakeToCamelObject(data);
};

// ============================================
// Authentication APIs
// ============================================

export const authAPI = {
  /**
   * Register a new user
   */
  register: async (data: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: createHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Login user
   */
  login: async (data: { username: string; password: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: createHeaders(false),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Logout user
   */
  logout: async (refreshToken: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify({ refresh: refreshToken }),
    });
    return handleResponse(response);
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: createHeaders(false),
      body: JSON.stringify({ refresh: refreshToken }),
    });
    return handleResponse(response);
  },

  /**
   * Get user profile
   */
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
      headers: createHeaders(true),
    });
    return handleResponse(response);
  },

};

// ============================================
// Feedback / Contact APIs
// ============================================

export const feedbackAPI = {
  /**
   * Send feedback or support request to 123Resume support inbox.
   * Authentication is optional; we send without auth headers so guests can contact us.
   */
  sendFeedback: async (data: {
    name?: string;
    email: string;
    message: string;
    context?: string;
  }) => {
    const payload = camelToSnakeObject(data);
    const doFetch = () =>
      fetch(`${API_BASE_URL}/feedback/`, {
        method: "POST",
        headers: createHeaders(false, true),
        body: JSON.stringify(payload),
      });

    const response = await doFetch();
    return handleResponse(response);
  },
};

// ============================================
// AI (DeepSeek resume assistant — backend; requires login)
// ============================================

export const aiAPI = {
  /**
   * Ask the server-side resume assistant (DeepSeek). Returns { reply: string }.
   * 401 if not logged in; 503 if DEEPSEEK_API_KEY is not set on the server.
   */
  resumeAssistant: async (message: string): Promise<{ reply: string }> => {
    const payload = camelToSnakeObject({ message });
    const doFetch = () =>
      fetch(`${API_BASE_URL}/ai/resume-assistant/`, {
        method: "POST",
        headers: createHeaders(true, true),
        body: JSON.stringify(payload),
      });
    const response = await doFetch();
    return handleResponse(response, doFetch) as Promise<{ reply: string }>;
  },

  /**
   * AI resume score (DeepSeek). Body sends { resume, outputLanguage }. Returns camelCase:
   * overallScore, estimatedPages?, overallFeedback?, categories[{name,score,maxScore,feedback}], suggestions
   */
  scoreResume: async (
    resume: Record<string, unknown>,
    options?: { outputLanguage?: "en" | "de" },
  ): Promise<{
    overallScore: number;
    estimatedPages?: number;
    overallFeedback?: string;
    categories: Array<{
      name: string;
      score: number;
      maxScore: number;
      feedback: string;
    }>;
    suggestions: string[];
  }> => {
    const payload: Record<string, unknown> = { resume };
    if (options?.outputLanguage === "de" || options?.outputLanguage === "en") {
      payload.outputLanguage = options.outputLanguage;
    }
    const doFetch = () =>
      fetch(`${API_BASE_URL}/ai/resume-score/`, {
        method: "POST",
        headers: createHeaders(true, true),
        body: JSON.stringify(payload),
      });
    const response = await doFetch();
    return handleResponse(response, doFetch) as Promise<{
      overallScore: number;
      estimatedPages?: number;
      overallFeedback?: string;
      categories: Array<{
        name: string;
        score: number;
        maxScore: number;
        feedback: string;
      }>;
      suggestions: string[];
    }>;
  },

  /**
   * Suggest one new work-experience bullet (DeepSeek). Returns { bullet: string }.
   */
  suggestWorkBullet: async (input: {
    position?: string;
    company?: string;
    description?: string;
    existingBullets?: string[];
    technologies?: string[];
    outputLanguage?: "en" | "de";
  }): Promise<{ bullet: string }> => {
    const payload = camelToSnakeObject({
      position: input.position ?? "",
      company: input.company ?? "",
      description: input.description ?? "",
      existingBullets: input.existingBullets ?? [],
      technologies: input.technologies ?? [],
      ...(input.outputLanguage === "de" || input.outputLanguage === "en"
        ? { outputLanguage: input.outputLanguage }
        : {}),
    });
    const doFetch = () =>
      fetch(`${API_BASE_URL}/ai/work-bullet-suggest/`, {
        method: "POST",
        headers: createHeaders(true, true),
        body: JSON.stringify(payload),
      });
    const response = await doFetch();
    return handleResponse(response, doFetch) as Promise<{ bullet: string }>;
  },
};

// ============================================
// Resume APIs
// ============================================

export interface ResumeData {
  name?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    professionalTitle?: string;
    profileImage?: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    summary?: string;
    interests?: Array<{ interest: string }>;
  };
  workExperience?: Array<{
    position: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    responsibilities?: Array<{ responsibility: string }>;
    technologies?: Array<{ technology: string }>;
    competencies?: Array<{ competency: string }>;
    link?: string;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    field?: string;
    keyCourses?: Array<{ course: string }>;
    descriptions?: Array<{ description: string }>;
    link?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    highlights?: Array<{ highlight: string }>;
    technologies?: Array<{ technology: string }>;
    startDate?: string;
    endDate?: string;
    link?: string;
  }>;
  certificates?: Array<{
    name?: string;
    organization?: string;
    issueDate?: string;
    expirationDate?: string;
    credentialId?: string;
    url?: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
  skills?: Array<{
    skill: string;
  }>;
  skillGroups?: Array<{
    name?: string;
    skills?: Array<{ skill?: string }>;
  }>;
  sectionOrder?: string[];
  template?: "modern" | "classic" | "minimal" | "creative" | "latex" | "starRover" | "slateCopper";
  styling?: {
    fontFamily?: string;
    fontSize?: "small" | "medium" | "large";
    titleColor?: string;
    titleBold?: boolean;
    headingColor?: string;
    headingBold?: boolean;
    textColor?: string;
    linkColor?: string;
    sectionStyling?: Record<string, {
      titleColor?: string;
      titleSize?: "small" | "medium" | "large";
      bodyColor?: string;
      bodySize?: "small" | "medium" | "large";
    }>;
  };
  // Score fields (calculated on frontend, stored on backend)
  completenessScore?: number;
  clarityScore?: number;
  formattingScore?: number;
  impactScore?: number;
  overallScore?: number;
}

export interface Resume extends ResumeData {
  id: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  completenessScore?: number;
  clarityScore?: number;
  formattingScore?: number;
  impactScore?: number;
  overallScore?: number;
  /** When true, resume is available at /p/:id without login */
  publicProfileEnabled?: boolean;
  /** Which hosted-profile blocks are shown at /p/:id (defaults all true if omitted). */
  publicProfileSections?: PublicProfileSections;
  /** Accent palette for the hosted page (orange | blue | green | violet). */
  publicProfileTheme?: PublicProfileThemeId;
}

/** Sort resumes for “My resumes”: newest created first, then newest updated. */
export function compareResumesNewestFirst(a: Resume, b: Resume): number {
  const ts = (v: string | undefined) => {
    const t = new Date(v || 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const ca = ts(a.createdAt);
  const cb = ts(b.createdAt);
  if (cb !== ca) return cb - ca;
  return ts(b.updatedAt) - ts(a.updatedAt);
}

export const resumeAPI = {
  /**
   * Get all resumes for the authenticated user
   */
  getAll: async (): Promise<Resume[]> => {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const makeRequest = () => fetch(`${API_BASE_URL}/resumes/?_t=${timestamp}`, {
      headers: createHeaders(true, true), // Enable no-cache headers
      cache: 'no-store', // Explicitly disable fetch cache
    });
    const response = await makeRequest();
    const data = await handleResponse(response, makeRequest);
    // Newest-created resume first; tie-break by most recently updated (immutable copy)
    if (Array.isArray(data)) {
      return [...(data as Resume[])].sort(compareResumesNewestFirst);
    }
    return data;
  },

  /**
   * Get a specific resume by ID
   */
  getById: async (id: string): Promise<Resume> => {
    const makeRequest = () => fetch(`${API_BASE_URL}/resumes/${id}/`, {
      headers: createHeaders(true),
    });
    const response = await makeRequest();
    return handleResponse(response, makeRequest);
  },

  /**
   * Public hosted profile payload (no auth). 404 if not enabled or missing.
   */
  getPublicById: async (id: string): Promise<Resume> => {
    const response = await fetch(`${API_BASE_URL}/public/resume/${id}/`, {
      headers: createHeaders(false),
      cache: 'no-store',
    });
    return handleResponse(response);
  },

  /**
   * Enable or disable public hosted profile for a resume (owner only).
   */
  setPublicProfile: async (
    id: string,
    enabled: boolean,
    sections?: PublicProfileSections,
    theme?: PublicProfileThemeId,
  ): Promise<{
    id: string;
    publicProfileEnabled: boolean;
    publicProfileSections: PublicProfileSections;
    publicProfileTheme: PublicProfileThemeId;
  }> => {
    const body: {
      enabled: boolean;
      sections?: PublicProfileSections;
      theme?: PublicProfileThemeId;
    } = { enabled };
    if (sections !== undefined) {
      body.sections = sections;
    }
    if (theme !== undefined) {
      body.theme = theme;
    }
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/public-profile/`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  /**
   * Create a new resume
   */
  create: async (data: ResumeData): Promise<Resume> => {
    // Convert camelCase to snake_case for backend
    const snakeCaseData = camelToSnakeObject(data);
    const fullUrl = `${API_BASE_URL}/resumes/`;
    const makeRequest = () => fetch(fullUrl, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify(snakeCaseData),
    });
    const response = await makeRequest();
    return handleResponse(response, makeRequest);
  },

  /**
   * Update an existing resume
   */
  update: async (id: string, data: ResumeData): Promise<Resume> => {
    // Convert camelCase to snake_case for backend
    const snakeCaseData = camelToSnakeObject(data);
    
    const makeRequest = () => fetch(`${API_BASE_URL}/resumes/${id}/`, {
      method: 'PUT',
      headers: createHeaders(true),
      body: JSON.stringify(snakeCaseData),
    });
    const response = await makeRequest();
    return handleResponse(response, makeRequest);
  },

  /**
   * Delete a resume
   */
  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/`, {
      method: 'DELETE',
      headers: createHeaders(true),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to delete resume');
    }
  },

  /**
   * Parse uploaded resume (PDF or text) and return structured data
   * @deprecated Use parseResumeText for better PDF extraction quality
   */
  parseResume: async (file: File | FormData): Promise<ResumeData> => {
    // Store original file to recreate FormData if retry is needed
    // Note: If FormData is passed, retry won't work (FormData can only be read once)
    const originalFile = file instanceof File ? file : null;
    const isFile = file instanceof File;
    
    const makeRequest = () => {
      // Recreate FormData for each request (FormData can only be read once)
      // If File was passed, recreate FormData; otherwise use the FormData as-is (no retry possible)
      const formData = isFile && originalFile ? (() => {
        const fd = new FormData();
        fd.append('file', originalFile);
        return fd;
      })() : file as FormData;
      
      return fetch(`${API_BASE_URL}/resumes/parse/`, {
        method: 'POST',
        headers: {
          // Don't set Content-Type - let browser set it with boundary for FormData
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: formData,
      });
    };
    
    const response = await makeRequest();
    // Use handleResponse with retry function for automatic token refresh (retry only works if File was passed)
    const parsedData = await handleResponse(response, isFile ? makeRequest : undefined);
    
    // Convert snake_case back to camelCase
    return snakeToCamelObject(parsedData);
  },

  /**
   * Generate PDF from HTML content using server-side Puppeteer
   */
  generatePDF: async (id: string, htmlContent: string): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/pdf/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createHeaders(true),
      },
      body: JSON.stringify({ html: htmlContent }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to generate PDF');
    }

    return await response.blob();
  },

  /**
   * Match resume to a single job description using AI semantic similarity
   */
  matchToJob: async (resumeId: string, jobTitle: string, jobDescription: string): Promise<{
    resume_id: string;
    job_title: string;
    job_description: string;
    similarity: number;
    match_percentage: number;
    resume_summary: string;
  }> => {
    const makeRequest = () => fetch(`${API_BASE_URL}/resumes/${resumeId}/match/`, {
      method: 'POST',
      headers: createHeaders(true),
      body: JSON.stringify({ title: jobTitle, description: jobDescription }),
    });
    const response = await makeRequest();
    const raw = (await handleResponse(response, makeRequest)) as Record<
      string,
      unknown
    >;
    // handleResponse camelCases keys; normalize for callers that expect snake_case
    return {
      resume_id: String(raw.resumeId ?? raw.resume_id ?? ""),
      job_title: String(raw.jobTitle ?? raw.job_title ?? ""),
      job_description: String(raw.jobDescription ?? raw.job_description ?? ""),
      similarity: Number(raw.similarity ?? 0),
      match_percentage: Number(raw.matchPercentage ?? raw.match_percentage ?? 0),
      resume_summary: String(raw.resumeSummary ?? raw.resume_summary ?? ""),
    };
  },

  /**
   * Parse resume text (extracted from PDF on frontend) and return structured data
   * This uses better PDF extraction (react-pdftotext) on the frontend
   */
  parseResumeText: async (text: string): Promise<ResumeData> => {
    const makeRequest = () => fetch(`${API_BASE_URL}/resumes/parse/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    
    const response = await makeRequest();
    const parsedData = await handleResponse(response, makeRequest);
    
    // Convert snake_case back to camelCase
    return snakeToCamelObject(parsedData);
  },
};

// ============================================
// Blog Post API - Using @123resume/react-blog-system
// ============================================

import { createBlogClient, BlogPost } from '@123resume/react-blog-system';

// Re-export BlogPost type for backwards compatibility
export type { BlogPost };

// Create blog client instance
export const blogPostAPI = createBlogClient({
  apiBaseUrl: API_BASE_URL,
  getAuthToken: () => getAccessToken(),
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'de'],
});

// ============================================
// Health Check
// ============================================

export const healthAPI = {
  /**
   * Check if API is running
   */
  check: async () => {
    const response = await fetch(`${API_BASE_URL}/health/`, {
      headers: createHeaders(false),
    });
    return handleResponse(response);
  },
};

// Export everything as default for convenience
export default {
  auth: authAPI,
  resume: resumeAPI,
  blogPost: blogPostAPI,
  health: healthAPI,
};

