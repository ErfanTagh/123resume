import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ResumesSidebarProvider } from "./contexts/ResumesSidebarContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import EmailVerification from "./pages/EmailVerification";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthCallback from "./pages/OAuthCallback";
import Resumes from "./pages/Resumes";
import CreateResume from "./pages/CreateResume";
import CreateResumeGuide from "./pages/CreateResumeGuide";
import ResumeView from "./pages/ResumeView";
import JobMatching from "./pages/JobMatching";
import Profile from "./pages/Profile";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
// Blog editing components - only loaded in development mode
// In production builds, these will be tree-shaken out
const BlogEditor = import.meta.env.DEV
  ? React.lazy(() => import("./pages/BlogEditor"))
  : null;
const BlogManagement = import.meta.env.DEV
  ? React.lazy(() => import("./pages/BlogManagement"))
  : null;
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import Templates from "./pages/Templates";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DataProtection from "./pages/DataProtection";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import HostedProfilePage from "./pages/HostedProfilePage";
import { SiteNavLayout } from "./components/dashboard/SiteNavLayout";

const queryClient = new QueryClient();

// Component to redirect authenticated users from landing to dashboard
const LandingOrRedirect = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
};

// Component to handle conditional rendering (must be inside Router)
const AppRoutes = () => {
  const location = useLocation();
  // Hide header/footer on login, signup, and OAuth callback pages for focused experience
  const hideHeaderFooter =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/oauth/callback' ||
    location.pathname.startsWith('/p/');

  return (
    <div className="flex flex-col min-h-screen">
      {!hideHeaderFooter && <Header />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingOrRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/p/:id" element={<HostedProfilePage />} />
          <Route path="/create/start" element={<CreateResumeGuide />} />
          <Route path="/create" element={<CreateResume />} />
          <Route
            path="/resumes"
            element={
              <ProtectedRoute>
                <Resumes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/job-matching"
            element={
              <ProtectedRoute>
                <JobMatching />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/:id"
            element={
              <ProtectedRoute>
                <ResumeView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* Site rail persists across Dashboard + marketing pages */}
          <Route element={<SiteNavLayout />}>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route path="/templates" element={<Templates />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
          {/* Blog editing routes - only available in development */}
          {import.meta.env.DEV && BlogEditor && (
            <Route
              path="/blog-editor/:id?"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <BlogEditor />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          )}
          {import.meta.env.DEV && BlogManagement && (
            <Route
              path="/blog-management"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div>Loading...</div>}>
                    <BlogManagement />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          )}
          <Route path="/careers" element={<Careers />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/data-protection" element={<DataProtection />} />
          <Route path="/cookies" element={<Cookies />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!hideHeaderFooter && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <ResumesSidebarProvider>
              <ScrollToTop />
              <AppRoutes />
            </ResumesSidebarProvider>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
