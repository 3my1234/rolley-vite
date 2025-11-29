import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { apiClient } from '../lib/api';

interface AuthContextType {
  privyToken: string | null;
  user: any;
  loading: boolean;
  syncUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { getAccessToken, user: privyUser, authenticated, ready } = usePrivy();
  const [privyToken, setPrivyToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  // Check if we're in an OAuth callback (has OAuth params in URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.has('privy_oauth_state') || urlParams.has('privy_oauth_code') || urlParams.has('privy_oauth_provider');
    
    if (hasOAuthParams) {
      console.log('AuthContext: Detected OAuth callback, waiting for Privy to process...');
      setIsOAuthCallback(true);
      // Give Privy extra time to process the OAuth callback
      // Wait a bit before attempting sync
      const timer = setTimeout(() => {
        setIsOAuthCallback(false);
      }, 2000); // Wait 2 seconds for Privy to process callback
      
      return () => clearTimeout(timer);
    }
  }, []);

  const syncUser = async () => {
    try {
      if (!authenticated || !ready) {
        setLoading(false);
        return;
      }

      console.log('AuthContext: Starting sync...');
      
      // Add timeout for getAccessToken to prevent hanging
      const tokenPromise = getAccessToken();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('AuthContext: getAccessToken timeout after 10 seconds');
          resolve(null);
        }, 10000);
      });
      
      const token = await Promise.race([tokenPromise, timeoutPromise]);
      
      console.log('AuthContext: Got Privy token:', token ? 'Yes' : 'No');
      console.log('AuthContext: Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'No token');
      
      if (token) {
        // Get referral code from localStorage if exists
        const referralCode = localStorage.getItem('rolley_referral_code');
        
        console.log('AuthContext: Calling syncUser...');
        try {
          // Add timeout for sync API call
          const syncPromise = apiClient.syncUser(token) as Promise<any>;
          const syncTimeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => {
              console.warn('AuthContext: Sync API timeout after 15 seconds');
              resolve(null);
            }, 15000);
          });
          
          const syncResponse = await Promise.race([syncPromise, syncTimeoutPromise]);
          
          if (!syncResponse) {
            throw new Error('Sync request timed out');
          }
          
          console.log('AuthContext: Sync response:', syncResponse);
          
          // Handle wrapped response from TransformInterceptor
          const responseData = syncResponse.data || syncResponse;
          console.log('AuthContext: Response data:', responseData);
          
          // Use user data directly from sync response (like legacy implementation)
          if (responseData.user) {
            setUser(responseData.user);
            setPrivyToken(token);
            localStorage.setItem('privy_token', token);
            console.log('AuthContext: User data loaded:', responseData.user);
            
            // If we just completed OAuth callback, clean up URL params and redirect
            if (isOAuthCallback) {
              const url = new URL(window.location.href);
              url.searchParams.delete('privy_oauth_state');
              url.searchParams.delete('privy_oauth_code');
              url.searchParams.delete('privy_oauth_provider');
              // Only redirect if we're on the root path with OAuth params
              if (url.pathname === '/' && (window.location.search.includes('privy_oauth'))) {
                window.history.replaceState({}, '', '/dashboard');
                window.location.href = '/dashboard';
              } else {
                window.history.replaceState({}, '', url.toString());
              }
            }
          } else {
            console.log('AuthContext: No user data in sync response');
          }
        } catch (syncError: any) {
          console.error('AuthContext: Sync failed:', syncError);
          if (syncError.message?.includes('401') || syncError.message?.includes('Unauthorized')) {
            console.log('AuthContext: Token expired, clearing stored token');
            localStorage.removeItem('privy_token');
            setPrivyToken(null);
            setUser(null);
          }
        }
      } else {
        console.log('AuthContext: No Privy token available - may be Privy initialization issue');
        // If no token, still clear loading state
      }
    } catch (error) {
      console.error('AuthContext: Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Don't attempt sync immediately if we're processing an OAuth callback
    if (isOAuthCallback) {
      console.log('AuthContext: Waiting for OAuth callback processing...');
      return;
    }

    if (authenticated && ready) {
      // Check if we already have a Privy token
      const existingToken = localStorage.getItem('privy_token');
      if (existingToken) {
        setPrivyToken(existingToken);
        // Try to fetch user profile with existing token
        apiClient.getUserProfile(existingToken)
          .then(userProfile => {
            setUser(userProfile);
            setLoading(false);
          })
          .catch(() => {
            // Token might be expired, sync again
            syncUser();
          });
      } else {
        // No existing token, sync to get one
        syncUser();
      }
    } else if (ready && !authenticated) {
      // User is not authenticated
      setPrivyToken(null);
      setUser(null);
      setLoading(false);
    }
  }, [authenticated, ready, isOAuthCallback]);

  return (
    <AuthContext.Provider value={{ privyToken, user, loading, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
