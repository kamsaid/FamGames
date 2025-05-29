/**
 * Leaderboard Service - Manages game score finalization and leaderboard updates
 * Handles updating player statistics and family leaderboards after game completion
 */

// Mock Supabase for testing when environment variables are not set
const getMockSupabase = () => ({
  from: () => ({
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ 
          data: { id: `mock-session-${Date.now()}`, completed_at: new Date().toISOString() }, 
          error: null 
        }) 
      }) 
    }),
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
      })
    }),
    upsert: () => ({
      select: () => ({
        single: () => Promise.resolve({ 
          data: { id: 'mock-leaderboard-entry' }, 
          error: null 
        })
      })
    })
  })
});

// Try to load Supabase, fallback to mock if not available
let supabase;
try {
  supabase = require('../utils/supabase');
} catch (error) {
  console.warn('⚠️ Supabase not configured, using mock data for testing');
  supabase = getMockSupabase();
}

class LeaderboardService {
  constructor() {
    // In-memory storage for testing when Supabase is not available
    this.mockStorage = {
      sessions: new Map(),
      leaderboards: new Map()
    };
  }

  /**
   * Finalize game session and update leaderboard
   * @param {string} familyId - The family identifier
   * @param {Object} gameState - The final game state with scores and answers
   * @param {Array} players - Array of players who participated
   * @returns {Object} Final results with updated leaderboard
   */
  async finalizeGameSession(familyId, gameState, players) {
    try {
      console.log(`🏆 Finalizing game session for family: ${familyId}`);
      
      // Generate session ID and data
      const sessionId = `session-${familyId}-${Date.now()}`;
      const completedAt = new Date().toISOString();
      
      const sessionData = {
        id: sessionId,
        family_id: familyId,
        started_at: gameState.startedAt,
        completed_at: completedAt,
        total_questions: gameState.questions.length,
        player_scores: gameState.scores,
        game_data: {
          questions: gameState.questions.map(q => ({
            id: q.id,
            category: q.category,
            difficulty: q.difficulty
          })),
          playerAnswers: gameState.playerAnswers
        }
      };

      // Store session (mock for testing)
      this.mockStorage.sessions.set(sessionId, sessionData);
      console.log(`✅ Created trivia session: ${sessionId}`);

      // Update leaderboard for each player
      const playerStats = {};

      for (const player of players) {
        const userId = player.userId;
        const finalScore = gameState.scores[userId] || 0;
        
        // Get current leaderboard entry for this player and family
        const leaderboardKey = `${familyId}-${userId}`;
        const currentEntry = this.mockStorage.leaderboards.get(leaderboardKey);

        let newTotalScore = finalScore;
        let newGamesPlayed = 1;
        let newStreak = 1;

        if (currentEntry) {
          // Update existing entry
          newTotalScore = currentEntry.total_score + finalScore;
          newGamesPlayed = currentEntry.games_played + 1;
          
          // Calculate streak (simple implementation: consecutive games with score > 0)
          newStreak = finalScore > 0 ? currentEntry.streak + 1 : 0;
        }

        const leaderboardData = {
          family_id: familyId,
          user_id: userId,
          total_score: newTotalScore,
          games_played: newGamesPlayed,
          streak: newStreak,
          last_game_score: finalScore,
          last_played_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Store leaderboard entry (mock for testing)
        this.mockStorage.leaderboards.set(leaderboardKey, leaderboardData);

        playerStats[userId] = {
          playerName: player.playerName,
          gameScore: finalScore,
          totalScore: newTotalScore,
          gamesPlayed: newGamesPlayed,
          streak: newStreak,
          isHost: player.isHost
        };

        console.log(`✅ Updated leaderboard for ${player.playerName}: ${finalScore} points this game, ${newTotalScore} total`);
      }

      // Get updated family leaderboard (top players)
      const familyLeaderboard = Array.from(this.mockStorage.leaderboards.values())
        .filter(entry => entry.family_id === familyId)
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 10)
        .map(entry => ({
          ...entry,
          users: { id: entry.user_id, email: `user-${entry.user_id}@example.com` }
        }));

      // Prepare final results
      const finalResults = {
        sessionId,
        familyId,
        completedAt,
        totalQuestions: gameState.questions.length,
        playerStats,
        familyLeaderboard,
        gameAnalytics: this.calculateGameAnalytics(gameState, players)
      };

      console.log(`🎉 Game session finalized successfully for family ${familyId}`);
      return finalResults;

    } catch (error) {
      console.error('❌ Error finalizing game session:', error);
      throw error;
    }
  }

  /**
   * Calculate game analytics and insights
   * @param {Object} gameState - The game state with all answers and scores
   * @param {Array} players - Array of players
   * @returns {Object} Analytics data
   */
  calculateGameAnalytics(gameState, players) {
    const analytics = {
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalCorrectAnswers: 0,
      totalAnswers: 0,
      accuracyRate: 0,
      questionStats: {}
    };

    const scores = Object.values(gameState.scores);
    if (scores.length > 0) {
      analytics.averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      analytics.highestScore = Math.max(...scores);
      analytics.lowestScore = Math.min(...scores);
    }

    // Analyze answers
    const answers = Object.values(gameState.playerAnswers || {});
    analytics.totalAnswers = answers.length;
    analytics.totalCorrectAnswers = answers.filter(answer => answer.isCorrect).length;
    analytics.accuracyRate = analytics.totalAnswers > 0 
      ? Math.round((analytics.totalCorrectAnswers / analytics.totalAnswers) * 100) 
      : 0;

    // Question-level analytics
    gameState.questions.forEach((question, index) => {
      const questionNumber = index + 1;
      const questionAnswers = answers.filter(answer => answer.questionNumber === questionNumber);
      const correctAnswers = questionAnswers.filter(answer => answer.isCorrect);
      
      analytics.questionStats[questionNumber] = {
        category: question.category,
        difficulty: question.difficulty,
        totalAnswers: questionAnswers.length,
        correctAnswers: correctAnswers.length,
        accuracyRate: questionAnswers.length > 0 
          ? Math.round((correctAnswers.length / questionAnswers.length) * 100) 
          : 0
      };
    });

    return analytics;
  }

  /**
   * Get family leaderboard
   * @param {string} familyId - The family identifier
   * @param {number} limit - Number of entries to return (default: 10)
   * @returns {Array} Leaderboard entries
   */
  async getFamilyLeaderboard(familyId, limit = 10) {
    try {
      // Return mock leaderboard for testing
      const familyLeaderboard = Array.from(this.mockStorage.leaderboards.values())
        .filter(entry => entry.family_id === familyId)
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, limit)
        .map(entry => ({
          ...entry,
          users: { id: entry.user_id, email: `user-${entry.user_id}@example.com` }
        }));

      return familyLeaderboard;
    } catch (error) {
      console.error('❌ Error getting family leaderboard:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new LeaderboardService(); 