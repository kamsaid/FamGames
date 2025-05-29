// Supabase client configuration for React Native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - replace with your actual values
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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

    // Transform and rank the data
    const rankedLeaderboard: LeaderboardEntry[] = (data || []).map((entry, index) => ({
      family_id: entry.family_id,
      user_id: entry.user_id,
      score: entry.score || 0,
      streak: entry.streak || 0,
      total_games: entry.total_games || 0,
      last_played: entry.last_played,
      user: entry.users,
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
      user: data.users,
    };
  } catch (error) {
    console.error('Failed to fetch user leaderboard position:', error);
    throw error;
  }
}; 