// Leaderboard screen - displays family member scores, rankings, and statistics
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

// Import contexts and services
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { fetchFamilyLeaderboard, fetchUserLeaderboardPosition, LeaderboardEntry } from '../services/supabase';

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { currentFamily } = useFamily();

  // State management
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userPosition, setUserPosition] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  const fetchLeaderboardData = useCallback(async (showLoading = true) => {
    if (!currentFamily || !user) return;

    try {
      if (showLoading) setLoading(true);
      setError(null);

      // Fetch both family leaderboard and user position
      const [familyLeaderboard, userLeaderboardPosition] = await Promise.all([
        fetchFamilyLeaderboard(currentFamily.id),
        fetchUserLeaderboardPosition(currentFamily.id, user.id),
      ]);

      setLeaderboardData(familyLeaderboard);
      setUserPosition(userLeaderboardPosition);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setError('Failed to load leaderboard data');
      Alert.alert(
        'Error',
        'Failed to load leaderboard data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentFamily, user]);

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchLeaderboardData();
    }, [fetchLeaderboardData])
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeaderboardData(false);
  }, [fetchLeaderboardData]);

  // Retry function for error state
  const handleRetry = useCallback(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Format last played date
  const formatLastPlayed = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Get user display name from email
  const getUserDisplayName = (email: string) => {
    return email.split('@')[0];
  };

  // Get rank color based on position
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#ffd700'; // Gold
      case 2: return '#c0c0c0'; // Silver
      case 3: return '#cd7f32'; // Bronze
      default: return '#6b7280'; // Gray
    }
  };

  // Get rank emoji
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading leaderboard...</Text>
      </View>
    );
  }

  // Error state
  if (error && !leaderboardData.length) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>⚠️ Unable to load leaderboard</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state
  if (!leaderboardData.length) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.emptyTitle}>🎯 No scores yet!</Text>
        <Text style={styles.emptyMessage}>
          Play your first trivia game to see the leaderboard
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Family Leaderboard</Text>
        <Text style={styles.headerSubtitle}>{currentFamily?.name}</Text>
      </View>

      {/* Your Position Card */}
      {userPosition && (
        <View style={styles.yourPositionCard}>
          <Text style={styles.yourPositionTitle}>Your Position</Text>
          <View style={styles.yourPositionContent}>
            <View style={styles.yourPositionStats}>
              <Text style={styles.yourPositionRank}>
                {getRankEmoji(userPosition.rank || 0)} Rank #{userPosition.rank || '—'}
              </Text>
              <Text style={styles.yourPositionScore}>
                {userPosition.score} points
              </Text>
            </View>
            <View style={styles.yourPositionDetails}>
              <Text style={styles.yourPositionDetail}>
                🔥 {userPosition.streak} streak
              </Text>
              <Text style={styles.yourPositionDetail}>
                🎮 {userPosition.total_games || 0} games
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Leaderboard List */}
      <View style={styles.leaderboardContainer}>
        <Text style={styles.leaderboardTitle}>Top Players</Text>
        
        {leaderboardData.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          
          return (
            <View 
              key={entry.user_id}
              style={[
                styles.leaderboardItem,
                isCurrentUser && styles.currentUserItem
              ]}
            >
              {/* Rank and User Info */}
              <View style={styles.playerInfo}>
                <View style={styles.rankContainer}>
                  <Text 
                    style={[
                      styles.rankText, 
                      { color: getRankColor(entry.rank || 0) }
                    ]}
                  >
                    {getRankEmoji(entry.rank || 0)}
                  </Text>
                  <Text style={styles.rankNumber}>#{entry.rank}</Text>
                </View>
                
                <View style={styles.playerDetails}>
                  <Text style={[
                    styles.playerName,
                    isCurrentUser && styles.currentUserName
                  ]}>
                    {getUserDisplayName(entry.user?.email || '')}
                    {isCurrentUser && ' (You)'}
                  </Text>
                  <Text style={styles.lastPlayed}>
                    Last played: {formatLastPlayed(entry.last_played)}
                  </Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{entry.score}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{entry.streak}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{entry.total_games || 0}</Text>
                  <Text style={styles.statLabel}>Games</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Keep playing to climb the leaderboard! 🚀
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  // Your position card styles
  yourPositionCard: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yourPositionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  yourPositionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yourPositionStats: {
    flex: 1,
  },
  yourPositionRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  yourPositionScore: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  yourPositionDetails: {
    alignItems: 'flex-end',
  },
  yourPositionDetail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  // Leaderboard styles
  leaderboardContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  currentUserItem: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  playerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankContainer: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 50,
  },
  rankText: {
    fontSize: 20,
    marginBottom: 2,
  },
  rankNumber: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  currentUserName: {
    color: '#3b82f6',
  },
  lastPlayed: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 16,
    minWidth: 40,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Loading state styles
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  // Error state styles
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Empty state styles
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  // Footer styles
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
}); 