import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
import { EmailConfirmationAnimation } from '@/components/EmailConfirmationAnimation';
import { SEO } from '@/components/SEO';

export default function Signup() {
  const [searchParams] = useSearchParams();
  
  // Prefill form with data from URL params (from SignupOverlay)
  const [formData, setFormData] = useState({
    username: '',
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
    firstName: searchParams.get('firstName') || '',
    lastName: searchParams.get('lastName') || '',
  });
  
  // Update form data when search params change
  useEffect(() => {
    const email = searchParams.get('email');
    const firstName = searchParams.get('firstName');
    const lastName = searchParams.get('lastName');
    
    if (email || firstName || lastName) {
      setFormData(prev => ({
        ...prev,
        email: email || prev.email,
        firstName: firstName || prev.firstName,
        lastName: lastName || prev.lastName,
      }));
    }
  }, [searchParams]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

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
        throw new Error(data.error || `Failed to initiate ${provider} signup`);
      }

      // Store state for callback verification
      if (data.state) {
        sessionStorage.setItem('oauth_state', data.state);
        sessionStorage.setItem('oauth_provider', provider);
      }

      // Redirect to OAuth provider
      window.location.href = data.auth_url;
    } catch (err: any) {
      const errorMessage = err.message || `Failed to sign up with ${provider}`;
      setError(errorMessage);
      setIsSocialLoading(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(formData.password)) {
      setError('Password must contain at least one letter');
      return;
    }

    // Check for at least one number
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await register(
        formData.username,
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      );
      
      // Check if there's pending resume data and keep it in localStorage
      const pendingResume = localStorage.getItem('pendingResume');
      if (pendingResume) {
        // Keep it in localStorage - will be used after email verification
      }
      
      // Show success message (user needs to verify email)
      setSuccess(true);
      setSuccessMessage((response as any)?.message || 'Registration successful! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If registration successful, show email verification message
  if (success) {
    return (
      <>
        <SEO
          title="Sign Up - 123Resume"
          description="Create your free 123Resume account to start building professional resumes."
          noindex={true}
        />
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <EmailConfirmationAnimation />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-primary">
              Check Your Email!
            </h1>
            <p className="text-muted-foreground mb-6">
              {successMessage}
            </p>

            <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-left">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                <strong>What's next?</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>✉️ Check your inbox for a verification email</li>
                  <li>🔗 Click the verification link in the email</li>
                  <li>🔐 Log in to start creating your resume</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground mb-6">
              <p>Didn't receive the email? Check your spam folder.</p>
            </div>

            <Link to="/login">
              <Button className="w-full" size="lg">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Sign Up - 123Resume"
        description="Create your free 123Resume account to start building professional resumes."
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <UserPlus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">Sign up to start building your resume</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                placeholder="John"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || isSocialLoading !== null}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Sign Up
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
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Card>
      </div>
    </>
  );
}

