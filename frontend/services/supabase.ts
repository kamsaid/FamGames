// Supabase client configuration for React Native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Supabase configuration - replace with your actual values
const supabaseUrl = 'https://qygifhupmiizivxtmsug.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Nzc3MjQsImV4cCI6MjA2NDA1MzcyNH0.nCBVpLHjc0KZ6-E41kAuPuFLUQ-NgHTA_gFka4iNLzI';

// Check if WebCrypto API is available
const isWebCryptoAvailable = () => {
  if (Platform.OS === 'web') {
    return !!(window.crypto && window.crypto.subtle);
  }
  return true; // Native platforms should support crypto
};

// Determine the appropriate flow type based on WebCrypto availability
const getFlowType = () => {
  // In development, always use implicit flow to avoid WebCrypto issues
  if (__DEV__) {
    console.log('Development mode: Using implicit flow to avoid WebCrypto issues');
    return 'implicit';
  }
  
  if (Platform.OS === 'web' && !isWebCryptoAvailable()) {
    console.warn('WebCrypto API not available, using implicit flow for better compatibility');
    return 'implicit';
  }
  return 'pkce';
};

// Create Supabase client with improved configuration for magic links
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage on native, localStorage on web for session persistence
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    // Enable automatic token refresh
    autoRefreshToken: true,
    // Persist sessions across app restarts
    persistSession: true,
    // Enable URL session detection only on web
    detectSessionInUrl: Platform.OS === 'web',
    // Use appropriate flow type based on WebCrypto availability
    flowType: getFlowType(),
    // Add debug mode for development (remove in production)
    debug: __DEV__,
  },
  // Additional global options
  global: {
    headers: {
      'X-Client-Info': 'family-together-app',
    },
  },
});

// Log the configuration for debugging
if (__DEV__) {
  console.log('Supabase client initialized with:', {
    platform: Platform.OS,
    flowType: getFlowType(),
    webCryptoAvailable: isWebCryptoAvailable(),
    detectSessionInUrl: Platform.OS === 'web',
  });
}

// Types for our database tables
export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  user_id: string;
  family_id: string;
  role: 'admin' | 'member';
}

export interface TriviaSession {
  id: string;
  family_id: string;
  started_at: string;
  completed: boolean;
  scores: Record<string, number>;
}

export interface Question {
  id: string;
  category: string;
  question: string;
  choices: string[];
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface LeaderboardEntry {
  family_id: string;
  user_id: string;
  score: number;
  streak: number;
  // Additional fields for display
  user?: {
    email: string;
  };
  rank?: number;
  total_games?: number;
  last_played?: string;
}

// API Services

/**
 * Fetch leaderboard data for a specific family
 * @param familyId - The family ID to fetch leaderboard for
 * @returns Promise with leaderboard entries
 */
export const fetchFamilyLeaderboard = async (familyId: string): Promise<LeaderboardEntry[]> => {
  try {
    // Fetch leaderboard data with user information joined
    const { data, error } = await supabase
      .from('leaderboards')
      .select(`
        family_id,
        user_id,
        score,
        streak,
        total_games,
        last_played,
        users:user_id (
          email
        )
      `)
      .eq('family_id', familyId)
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }

    // Transform and rank the data with proper type handling
    const rankedLeaderboard: LeaderboardEntry[] = (data || []).map((entry, index) => ({
      family_id: entry.family_id,
      user_id: entry.user_id,
      score: entry.score || 0,
      streak: entry.streak || 0,
      total_games: entry.total_games || 0,
      last_played: entry.last_played,
      // Handle the joined user data properly - users is an array, take first element
      user: Array.isArray(entry.users) && entry.users.length > 0 
        ? { email: entry.users[0].email } 
        : { email: 'Unknown' },
      rank: index + 1,
    }));

    return rankedLeaderboard;
  } catch (error) {
    console.error('Failed to fetch family leaderboard:', error);
    throw error;
  }
};

/**
 * Fetch user's position in family leaderboard
 * @param familyId - The family ID
 * @param userId - The user ID
 * @returns Promise with user's leaderboard entry
 */
export const fetchUserLeaderboardPosition = async (
  familyId: string, 
  userId: string
): Promise<LeaderboardEntry | null> => {
  try {
    const { data, error } = await supabase
      .from('leaderboards')
      .select(`
        family_id,
        user_id,
        score,
        streak,
        total_games,
        last_played,
        users:user_id (
          email
        )
      `)
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No leaderboard entry found for this user
        return null;
      }
      console.error('Error fetching user leaderboard position:', error);
      throw error;
    }

    return {
      family_id: data.family_id,
      user_id: data.user_id,
      score: data.score || 0,
      streak: data.streak || 0,
      total_games: data.total_games || 0,
      last_played: data.last_played,
      // Handle the joined user data properly - users is an array, take first element
      user: Array.isArray(data.users) && data.users.length > 0 
        ? { email: data.users[0].email } 
        : { email: 'Unknown' },
    };
  } catch (error) {
    console.error('Failed to fetch user leaderboard position:', error);
    throw error;
  }
}; 