import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle, Mail } from 'lucide-react';
import { SEO } from '@/components/SEO';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const { login, setAuthState } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleResendVerification = async () => {
    if (!userEmail) return;

    try {
      const response = await fetch('/api/auth/resend-verification/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Verification email sent! Please check your inbox.');
        setShowResend(false);
      } else {
        alert(data.error || 'Failed to resend email.');
      }
    } catch (error) {
      alert('Network error. Please try again later.');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'linkedin' | 'github') => {

    setIsSocialLoading(provider);
    setError('');

    try {
      // Get OAuth URL from backend
      const response = await fetch(`/api/auth/social/${provider}/url/?redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/callback')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to initiate ${provider} login`);
      }

      // Store state for callback verification
      if (data.state) {
        sessionStorage.setItem('oauth_state', data.state);
        sessionStorage.setItem('oauth_provider', provider);
      }

      // Redirect to OAuth provider
      window.location.href = data.auth_url;
    } catch (err: any) {
      const errorMessage = err.message || `Failed to login with ${provider}`;
      setError(errorMessage);
      setIsSocialLoading(null);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setIsLoading(true);

    try {
      await login(username, password);

      // Check for redirect or resume saving
      const redirect = searchParams.get('redirect');
      const saveResume = searchParams.get('saveResume');

      // Check for pending resume ID (resume already saved, just need to view it)
      const pendingResumeId = localStorage.getItem('pendingResumeId');

      if (redirect) {
        // Redirect to specified page (e.g., resume page)
        navigate(redirect);
        if (pendingResumeId) {
          localStorage.removeItem('pendingResumeId');
        }
      } else if (pendingResumeId) {
        // Resume already saved, redirect to resumes list
        localStorage.removeItem('pendingResumeId');
        navigate('/resumes');
      } else if (saveResume === 'true') {
        // Save pending resume and redirect to resumes list
        const pendingResume = localStorage.getItem('pendingResume');
        if (pendingResume) {
          try {
            const resumeData = JSON.parse(pendingResume);
            const { resumeAPI } = await import('@/lib/api');
            const savedResume = await resumeAPI.create(resumeData);
            localStorage.removeItem('pendingResume');
            toast({
              title: "Resume Saved!",
              description: "Your resume has been created successfully.",
            });
            setTimeout(() => {
              navigate('/resumes');
            }, 1000);
          } catch (error: any) {
            toast({
              title: "Error Saving Resume",
              description: error.message || "Failed to save your resume. You can create it again from the dashboard.",
              variant: "destructive",
            });
            navigate('/resumes');
          }
        } else {
          navigate('/resumes');
        }
      } else {
        navigate('/resumes');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to login. Please check your credentials.';
      setError(errorMessage);

      // Check if it's an email verification error
      if (errorMessage.toLowerCase().includes('verify') || errorMessage.toLowerCase().includes('email')) {
        setShowResend(true);
        // Try to get user email - you might need to call an API to get this
        // For now, we'll ask them to check their email
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Login - 123Resume"
        description="Login to your 123Resume account to create and manage your professional resumes."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {showResend && (
                  <div className="mt-3 pt-3 border-t border-destructive/20">
                    <p className="text-sm mb-2">Need to verify your email?</p>
                    <div className="space-y-2">
                      <Input
                        type="email"
                        placeholder="Enter your email to resend verification"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleResendVerification}
                        disabled={!userEmail}
                      >
                        <Mail className="mr-2 h-3 w-3" />
                        Resend Verification Email
                      </Button>
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username or email</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Your username or account email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isSocialLoading !== null}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading || isSocialLoading !== null}
            >
              {isSocialLoading === 'google' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#0A66C2] hover:bg-[#0d7bd4] text-white border-[#0A66C2] hover:border-[#0d7bd4] transition-colors"
              onClick={() => handleSocialLogin('linkedin')}
              disabled={isLoading || isSocialLoading !== null}
            >
              {isSocialLoading === 'linkedin' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full bg-[#24292e] hover:bg-[#2d3339] text-white border-[#24292e] hover:border-[#2d3339] transition-colors hover:text-white"
              onClick={() => handleSocialLogin('github')}
              disabled={isLoading || isSocialLoading !== null}
            >
              {isSocialLoading === 'github' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              )}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

