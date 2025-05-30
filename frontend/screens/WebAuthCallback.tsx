import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { supabase } from '../services/supabase';

/**
 * Web OAuth callback handler for Supabase magic link flow.
 * Handles both PKCE and implicit flows with comprehensive debugging.
 */
export default function WebAuthCallback() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we're on web platform
        if (Platform.OS !== 'web') {
          console.warn('WebAuthCallback should only be used on web platform');
          setError('This component is for web platform only');
          return;
        }

        const currentUrl = window.location.href;
        console.log('WebAuthCallback: Starting authentication process');
        console.log('Current URL:', currentUrl);
        
        setDebugInfo(`Processing URL: ${currentUrl.substring(0, 100)}...`);

        // Parse URL fragments (Supabase uses # for auth parameters in implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        console.log('Hash params:', Object.fromEntries(hashParams));
        console.log('Search params:', Object.fromEntries(searchParams));
        
        setDebugInfo('Parsing URL parameters...');

        // Check for errors in either hash or search params
        const errorFromHash = hashParams.get('error');
        const errorFromSearch = searchParams.get('error');
        const hasError = errorFromHash || errorFromSearch;
        
        if (hasError) {
          // Handle authentication errors
          const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
          const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
          
          console.error('Auth callback error:', {
            error: hasError,
            code: errorCode,
            description: errorDescription
          });

          // Set user-friendly error message
          if (errorCode === 'otp_expired') {
            setError('Your magic link has expired. Please request a new one.');
          } else if (hasError === 'access_denied') {
            setError('Access denied. The link may be invalid or expired.');
          } else {
            setError('Authentication failed. Please try again.');
          }

          // Redirect to login with error after showing message
          setTimeout(() => {
            window.location.replace('/?auth_error=expired');
          }, 3000);
          return;
        }

        // Check for successful authentication tokens
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const tokenType = hashParams.get('token_type');
        const expiresIn = hashParams.get('expires_in');
        
        console.log('Auth tokens found:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          tokenType,
          expiresIn
        });

        if (accessToken) {
          console.log('WebAuthCallback: Tokens found in URL, setting session...');
          setDebugInfo('Setting up session with tokens...');
          
          // For implicit flow, we might not have refresh token
          const sessionData: any = {
            access_token: accessToken,
            token_type: tokenType || 'bearer',
          };

          // Only add refresh token if it exists (PKCE flow)
          if (refreshToken) {
            sessionData.refresh_token = refreshToken;
          }

          if (expiresIn) {
            sessionData.expires_in = parseInt(expiresIn);
          }

          // Set the session using the tokens from URL
          const { data, error: sessionError } = await supabase.auth.setSession(sessionData);

          if (sessionError) {
            console.error('Session set error:', sessionError);
            setError('Failed to establish session. Please try logging in again.');
            setTimeout(() => {
              window.location.replace('/?auth_error=session');
            }, 2000);
            return;
          }

          if (data.session) {
            console.log('WebAuthCallback: Session established successfully');
            console.log('User:', data.session.user.email);
            setDebugInfo('Authentication successful! Redirecting...');
            
            // Clear the hash from URL before redirecting
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Wait a moment for auth state to propagate, then redirect
            setTimeout(() => {
              window.location.replace('/');
            }, 1500);
            return;
          } else {
            console.error('Session data missing after setSession');
            setError('Session could not be established. Please try again.');
            setTimeout(() => {
              window.location.replace('/?auth_error=session');
            }, 2000);
            return;
          }
        }

        // If no tokens in URL, try alternative session handling
        console.log('WebAuthCallback: No direct tokens found, trying session retrieval...');
        setDebugInfo('No tokens in URL, checking current session...');
        
        const { data: sessionData, error: getSessionError } = await supabase.auth.getSession();
        
        if (getSessionError) {
          console.error('Get session error:', getSessionError);
          setError('Failed to retrieve session. Please try logging in again.');
          setTimeout(() => {
            window.location.replace('/?auth_error=session');
          }, 2000);
          return;
        }

        if (sessionData.session) {
          console.log('WebAuthCallback: Existing session found, redirecting...');
          setDebugInfo('Found existing session, redirecting...');
          window.location.replace('/');
          return;
        }

        // If we get here, no valid authentication was found
        console.log('WebAuthCallback: No valid authentication found');
        console.log('URL hash:', window.location.hash);
        console.log('URL search:', window.location.search);
        
        setError('No valid authentication found. Please try logging in again.');
        setTimeout(() => {
          window.location.replace('/?auth_error=invalid');
        }, 3000);

      } catch (err) {
        console.error('Auth callback handler error:', err);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => {
          window.location.replace('/?auth_error=unexpected');
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.redirectText}>Redirecting to login...</Text>
        <Text style={styles.debugText}>Debug: {debugInfo}</Text>
      </View>
    );
  }

  // Show loading state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Completing sign in...</Text>
      <Text style={styles.debugText}>{debugInfo}</Text>
      {__DEV__ && (
        <Text style={styles.devText}>
          Dev Mode: Check console for detailed logs
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  debugText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    maxWidth: '90%',
  },
  devText: {
    marginTop: 12,
    fontSize: 10,
    color: '#f59e0b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  redirectText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
});