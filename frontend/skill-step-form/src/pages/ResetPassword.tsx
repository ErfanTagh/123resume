import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthState } = useAuth();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-red-600 dark:text-red-400">Invalid Reset Link</h1>
            <p className="text-muted-foreground mb-6">
              This password reset link is invalid. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full">Request New Reset Link</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Password strength validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain at least one letter');
      return;
    }

    // Check for at least one number
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.user && data.tokens) {
          setAuthState({ user: data.user, tokens: data.tokens });

          // Match AuthContext.login: save guest draft resume in the background when present.
          const pendingResume = localStorage.getItem('pendingResume');
          if (pendingResume) {
            void (async () => {
              try {
                const resumeData = JSON.parse(pendingResume);
                const { resumeAPI } = await import('@/lib/api');
                await resumeAPI.create(resumeData);
                localStorage.removeItem('pendingResume');
                window.dispatchEvent(new CustomEvent('resumeSaved'));
              } catch {
                /* keep pendingResume for retry */
              }
            })();
          }

          const redirect = searchParams.get('redirect');
          const saveResume = searchParams.get('saveResume');
          const pendingResumeId = localStorage.getItem('pendingResumeId');

          const goAfterLogin = async () => {
            if (redirect) {
              navigate(redirect);
              if (pendingResumeId) localStorage.removeItem('pendingResumeId');
              return;
            }
            if (pendingResumeId) {
              localStorage.removeItem('pendingResumeId');
              navigate('/resumes');
              return;
            }
            if (saveResume === 'true') {
              const pendingResume = localStorage.getItem('pendingResume');
              if (pendingResume) {
                try {
                  const resumeData = JSON.parse(pendingResume);
                  const { resumeAPI } = await import('@/lib/api');
                  await resumeAPI.create(resumeData);
                  localStorage.removeItem('pendingResume');
                  toast({
                    title: 'Resume Saved!',
                    description: 'Your resume has been created successfully.',
                  });
                  navigate('/resumes');
                } catch (err: unknown) {
                  toast({
                    title: 'Error Saving Resume',
                    description:
                      err instanceof Error
                        ? err.message
                        : 'Failed to save your resume. You can create it again from the dashboard.',
                    variant: 'destructive',
                  });
                  navigate('/resumes');
                }
              } else {
                navigate('/resumes');
              }
              return;
            }
            navigate('/resumes');
          };

          await goAfterLogin();
        } else {
          setSuccess(true);
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } else {
        if (data.expired) {
          setError('This reset link has expired. Please request a new one.');
        } else if (data.used) {
          setError('This reset link has already been used. Please request a new one.');
        } else {
          setError(data.error || 'Failed to reset password. Please try again.');
        }
      }
    } catch (err: any) {
      setError('Network error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md p-8 shadow-elevated">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-green-600 dark:text-green-400">
              Password Reset Successful!
            </h1>
            <p className="text-muted-foreground mb-6">
              Your password has been changed successfully.
            </p>

            <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                You can now log in with your new password. Redirecting to login…
              </AlertDescription>
            </Alert>

            <Link to="/login">
              <Button className="w-full" size="lg">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
          <p className="text-muted-foreground">Enter your new password below</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
              <strong>Password requirements:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• At least 6 characters long</li>
                <li>• Use a mix of letters and numbers</li>
                <li>• Avoid common words or patterns</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Resetting password...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Reset Password
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-primary">
            Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
}

