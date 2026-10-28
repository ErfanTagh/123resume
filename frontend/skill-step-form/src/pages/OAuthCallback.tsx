import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { safeRedirect } from '@/lib/safeRedirect';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthState } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error from OAuth provider
        const error = searchParams.get('error');
        if (error) {
          setStatus('error');
          setMessage(`OAuth error: ${error}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Check if tokens are in URL (backend redirects with tokens after processing OAuth)
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const state = searchParams.get('state');

        // If tokens are present, backend has already processed OAuth
        if (accessToken && refreshToken) {
          // Tokens are in URL, fetch user info from backend
          try {
            // Fetch user profile using the access token
            const profileResponse = await fetch('/api/auth/profile/', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (!profileResponse.ok) {
              throw new Error('Failed to fetch user profile');
            }

            const userData = await profileResponse.json();
            
            const user = {
              id: userData.id || 0,
              username: userData.username || '',
              email: userData.email || '',
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
            };

            // Set auth state
            setAuthState({
              user,
              tokens: {
                access: accessToken,
                refresh: refreshToken,
              },
            });

            // Clear OAuth state if it exists
            sessionStorage.removeItem('oauth_state');
            sessionStorage.removeItem('oauth_provider');
            // The page the user wanted before signing in (set by the login page)
            const back = safeRedirect(sessionStorage.getItem('post_login_redirect'));
            sessionStorage.removeItem('post_login_redirect');

            setStatus('success');
            setMessage('Login successful! Redirecting...');

            setTimeout(() => {
              navigate(back || '/resumes');
            }, 1500);
          } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Failed to process login tokens');
            setTimeout(() => navigate('/login'), 3000);
          }
          return;
        }

        // If no tokens, check for code and state (shouldn't happen with current backend flow)
        const code = searchParams.get('code');
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing OAuth parameters');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Verify state matches what we stored
        const storedState = sessionStorage.getItem('oauth_state');
        const storedProvider = sessionStorage.getItem('oauth_provider');

        if (state !== storedState || !storedProvider) {
          setStatus('error');
          setMessage('Invalid OAuth state');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // This code path shouldn't be reached with current backend implementation
        // Backend redirects with tokens directly
        setStatus('error');
        setMessage('OAuth callback completed but tokens not received');
        setTimeout(() => navigate('/login'), 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'OAuth callback failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuthState]);

  return (
    <>
      <SEO
        title="OAuth Callback - 123Resume"
        description="Processing social login"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {status === 'loading' && (
            <Alert>
              <div className="flex items-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                <AlertDescription>Processing your login...</AlertDescription>
              </div>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </>
  );
}

