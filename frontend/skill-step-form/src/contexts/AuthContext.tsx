import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthTokens {
  access: string;
  refresh: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthState: (authData: { user: User; tokens: AuthTokens }) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load auth from localStorage, then verify tokens so we do not show "logged in" with a dead session.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedUser = localStorage.getItem('user');
      const storedTokens = localStorage.getItem('tokens');
      if (!storedUser || !storedTokens) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      let tokensObj: AuthTokens;
      try {
        tokensObj = JSON.parse(storedTokens);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        if (!cancelled) setIsLoading(false);
        return;
      }
      if (!tokensObj?.access || !tokensObj?.refresh) {
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        if (!cancelled) setIsLoading(false);
        return;
      }

      const profileOk = async (access: string) => {
        const res = await fetch('/api/auth/profile/', {
          headers: { Authorization: `Bearer ${access}` },
        });
        return res.ok;
      };

      if (await profileOk(tokensObj.access)) {
        if (!cancelled) {
          setUser(JSON.parse(storedUser));
          setTokens(tokensObj);
        }
        if (!cancelled) setIsLoading(false);
        return;
      }

      const refreshRes = await fetch('/api/auth/token/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: tokensObj.refresh }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        const newTokens: AuthTokens = { ...tokensObj, access: data.access };
        localStorage.setItem('tokens', JSON.stringify(newTokens));
        if (!cancelled) {
          setUser(JSON.parse(storedUser));
          setTokens(newTokens);
        }
        if (!cancelled) setIsLoading(false);
        return;
      }

      localStorage.removeItem('user');
      localStorage.removeItem('tokens');
      if (!cancelled) {
        setUser(null);
        setTokens(null);
      }
      if (!cancelled) setIsLoading(false);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();

      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(`Server returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        // Handle unverified email error (403)
        if (response.status === 403 && data.email_verified === false) {
          throw new Error(data.error || 'Please verify your email before logging in.');
        }
        throw new Error(data.error || data.detail || `Login failed (${response.status})`);
      }

      setUser(data.user);
      setTokens(data.tokens);

      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('tokens', JSON.stringify(data.tokens));

      // After successful login, check for pending resume and save it immediately
      // Tokens are already set synchronously above, so no delay needed
      const pendingResume = localStorage.getItem('pendingResume');
      if (pendingResume) {
        // Save in background - don't block login
        (async () => {
          try {
            const resumeData = JSON.parse(pendingResume);

            // Import API dynamically to avoid circular dependencies
            const { resumeAPI } = await import('@/lib/api');

            await resumeAPI.create(resumeData);

            localStorage.removeItem('pendingResume');

            // Dispatch custom event to notify Resumes page
            window.dispatchEvent(new CustomEvent('resumeSaved'));
          } catch (err: any) {
            // Keep the resume in localStorage so user can try again
          }
        })();
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name: firstName || '',
          last_name: lastName || '',
        }),
      });

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();

      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(`Server returned invalid response. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.detail || `Registration failed (${response.status})`);
      }

      // New flow: Registration doesn't log in immediately
      // User must verify email first, so tokens won't be in response
      // Don't set user/tokens here - they'll need to login after verification

      return data; // Return the response so Signup page can show the message
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (tokens?.refresh) {
        await fetch('/api/auth/logout/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: tokens.refresh }),
        });
      }
    } catch (error) {
      // Silently handle logout errors
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('user');
      localStorage.removeItem('tokens');
    }
  };

  const setAuthState = (authData: { user: User; tokens: AuthTokens }) => {
    setUser(authData.user);
    setTokens(authData.tokens);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('tokens', JSON.stringify(authData.tokens));
  };

  const value = {
    user,
    tokens,
    login,
    register,
    logout,
    setAuthState,
    isAuthenticated: !!user && !!tokens,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

