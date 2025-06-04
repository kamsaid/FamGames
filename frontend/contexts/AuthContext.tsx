// Authentication context for managing user session state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, User } from '../services/supabase';
import { Session } from '@supabase/supabase-js';

// Auth context interface
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Development bypass methods
  bypassAuthForDev: () => void;
  isDevBypass: boolean;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Development bypass flag - change this to true to skip auth in development
const ENABLE_DEV_BYPASS = __DEV__ && true; // Set to false to disable bypass

// Auth provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDevBypass, setIsDevBypass] = useState(false);

  // Development bypass function
  const bypassAuthForDev = () => {
    if (!__DEV__) {
      console.warn('Development bypass is only available in development mode');
      return;
    }

    console.log('🚧 Development Bypass: Creating mock user session');
    
    // Create a mock user and session for development
    const mockUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format for development
      email: 'dev@example.com',
      created_at: new Date().toISOString(),
    };

    const mockSession = {
      access_token: 'dev-access-token',
      refresh_token: 'dev-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    } as Session;

    setUser(mockUser);
    setSession(mockSession);
    setIsDevBypass(true);
    setLoading(false);

    console.log('🚧 Development Bypass: Mock session created for user:', mockUser.email);
  };

  // Initialize auth state on component mount
  useEffect(() => {
    console.log('AuthProvider: Initializing auth state...');
    
    // Check for dev bypass in development
    if (ENABLE_DEV_BYPASS && __DEV__) {
      console.log('🚧 Development mode with bypass enabled');
      
      // Auto-bypass after a short delay to allow normal auth to work first
      const bypassTimer = setTimeout(() => {
        if (!session && !user && !isDevBypass) {
          console.log('🚧 No session found, auto-activating development bypass...');
          // Auto-activate bypass to prevent infinite loading
          bypassAuthForDev();
        }
      }, 2000); // Wait 2 seconds for normal auth

      return () => clearTimeout(bypassTimer);
    }
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthProvider: Error getting initial session:', error);
      } else {
        console.log('AuthProvider: Initial session:', session?.user?.email || 'No session');
      }
      
      setSession(session);
      setUser(session?.user as User || null);
      
      // Always clear loading state after checking session
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change:', event, session?.user?.email || 'No user');
        
        // Don't override dev bypass session
        if (isDevBypass) {
          console.log('🚧 Development bypass active, ignoring auth state change');
          return;
        }
        
        setSession(session);
        setUser(session?.user as User || null);
        setLoading(false);

        // Handle different auth events
        if (event === 'SIGNED_IN' && Platform.OS === 'web' && session) {
          console.log('AuthProvider: User signed in successfully');
          
          // Only redirect if we're on the auth callback page
          if (window.location.pathname === '/auth/callback') {
            console.log('AuthProvider: On callback page, will redirect to home');
            // Let WebAuthCallback handle the redirect
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
          setUser(null);
          setSession(null);
          setIsDevBypass(false);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: Token refreshed');
        }
      }
    );

    // Cleanup subscription on unmount
    return () => subscription?.unsubscribe();
  }, [session, user, isDevBypass]);

  // Sign in with magic link
  const signInWithEmail = async (email: string) => {
    try {
      console.log('AuthProvider: Sending magic link to:', email);
      
      // Construct proper redirect URL
      // Web uses the dev-server origin; native uses the custom scheme created
      // in app.json. We rely on Expo's Linking helper to generate it so it
      // works in both development and production builds (handles prefixes
      // like exp://, bare scheme, etc.).
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : Linking.createURL('/auth/callback');

      console.log('AuthProvider: Redirect URL:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: redirectTo,
          // Add additional options for better magic link handling
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('AuthProvider: Magic link send error:', error);
        throw error;
      }

      console.log('AuthProvider: Magic link sent successfully to:', email);
      return data;
    } catch (error) {
      console.error('AuthProvider: signInWithEmail error:', error);
      throw error;
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out user');
      
      // If dev bypass is active, just clear local state
      if (isDevBypass) {
        console.log('🚧 Development bypass: Clearing mock session');
        setUser(null);
        setSession(null);
        setIsDevBypass(false);
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthProvider: Sign out error:', error);
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      console.log('AuthProvider: User signed out successfully');
    } catch (error) {
      console.error('AuthProvider: signOut error:', error);
      throw error;
    }
  };

  // Context value
  const value = {
    user,
    session,
    loading,
    signInWithEmail,
    signOut,
    bypassAuthForDev,
    isDevBypass,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 