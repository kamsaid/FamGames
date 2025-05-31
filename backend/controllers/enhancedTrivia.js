const { createClient } = require('@supabase/supabase-js');
const enhancedGptTriviaService = require('../services/enhancedGptTriviaService');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Enhanced trivia generation with AI personalization
 * Generates questions based on family profile and performance history
 */
const generatePersonalizedTrivia = async (req, res) => {
  try {
    const {
      familyId,
      ageGroup,
      difficultyLevel,
      categories,
      theme,
      familyInterests,
      customPrompt
    } = req.body;
    const userId = req.user.id;

    // Validate family membership
    if (familyId) {
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .eq('user_id', userId)
        .single();

      if (memberError || !member) {
        return res.status(403).json({
          error: 'You are not a member of this family'
        });
      }
    }

    // Get family performance data if available
    let familyProfile = null;
    if (familyId) {
      // Fetch family's trivia history for better personalization
      const { data: history } = await supabase
        .from('trivia_sessions')
        .select('scores, questions_used, completed_at')
        .eq('family_id', familyId)
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(10);

      // Get recently used questions to avoid repeats
      const recentQuestionIds = history?.flatMap(session => 
        session.questions_used || []
      ) || [];

      // Analyze performance
      if (history && history.length > 0) {
        familyProfile = await enhancedGptTriviaService.analyzeFamilyPerformance(familyId);
      }
    }

    // Generate personalized trivia
    let result;
    
    if (theme) {
      // Generate themed trivia for special occasions
      result = await enhancedGptTriviaService.generateThemedTrivia(theme, {
        ageGroup,
        difficultyLevel,
        customRequirements: customPrompt
      });
    } else {
      // Generate regular personalized trivia
      result = await enhancedGptTriviaService.generatePersonalizedTrivia({
        familyId,
        ageGroup: ageGroup || familyProfile?.recommendedAgeGroup || 'mixed',
        difficultyLevel: difficultyLevel || familyProfile?.recommendedDifficulty || 'intermediate',
        categories: categories || familyProfile?.preferredCategories,
        excludeUsedQuestions: familyProfile?.recentQuestionIds || [],
        customPrompt,
        familyInterests: familyInterests || []
      });
    }

    if (!result.success) {
      throw new Error('Failed to generate trivia questions');
    }

    // Store generated questions in database
    const questionsForDB = result.data.questions.map(q => ({
      category: q.category,
      question: q.question,
      choices: q.choices,
      answer: q.correct_answer,
      difficulty: q.difficulty,
      created_by: userId,
      generation_source: 'enhanced-gpt-4o',
      metadata: {
        fun_fact: q.fun_fact,
        hint: q.hint,
        points: q.points,
        time_limit: q.timeLimit,
        personalized: true,
        theme: theme || null
      }
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsForDB)
      .select();

    if (insertError) {
      console.error('Error storing questions:', insertError);
      // Continue with response even if storage fails
    }

    // Log AI usage for analytics
    await logAIUsage({
      familyId,
      userId,
      questionsGenerated: result.data.questions.length,
      model: result.data.metadata.aiModel || 'gpt-4o',
      personalized: result.data.metadata.personalized || false,
      cached: result.data.metadata.cached || false
    });

    res.status(201).json({
      success: true,
      message: 'Personalized trivia questions generated successfully',
      data: {
        questions: result.data.questions.map(q => ({
          id: q.id,
          category: q.category,
          question: q.question,
          choices: q.choices,
          difficulty: q.difficulty,
          timeLimit: q.timeLimit,
          points: q.points,
          funFact: q.fun_fact,
          hint: q.hint
        })),
        metadata: {
          ...result.data.metadata,
          personalizationApplied: !!familyProfile,
          familyProfile: familyProfile ? {
            recommendedDifficulty: familyProfile.recommendedDifficulty,
            strongCategories: familyProfile.strongCategories,
            weakCategories: familyProfile.weakCategories
          } : null
        }
      }
    });

  } catch (error) {
    console.error('Error in generatePersonalizedTrivia:', error);
    res.status(500).json({
      error: 'Failed to generate personalized trivia',
      details: error.message
    });
  }
};

/**
 * Get AI-powered trivia recommendations based on family history
 */
const getTriviaRecommendations = async (req, res) => {
  try {
    const { familyId } = req.params;
    const userId = req.user.id;

    // Verify family membership
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single();

    if (memberError || !member) {
      return res.status(403).json({
        error: 'You are not a member of this family'
      });
    }

    // Analyze family performance
    const performance = await enhancedGptTriviaService.analyzeFamilyPerformance(familyId);

    // Get family statistics
    const { data: stats } = await supabase
      .from('trivia_sessions')
      .select('*')
      .eq('family_id', familyId)
      .eq('completed', true);

    const totalGames = stats?.length || 0;
    const averageScore = stats?.reduce((sum, session) => {
      const scores = Object.values(session.scores || {});
      return sum + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
    }, 0) / Math.max(totalGames, 1);

    // Generate recommendations
    const recommendations = {
      performance: {
        totalGamesPlayed: totalGames,
        averageScore: Math.round(averageScore),
        currentLevel: performance.recommendedDifficulty,
        strongCategories: performance.strongCategories,
        improvementAreas: performance.weakCategories
      },
      suggestions: {
        nextDifficulty: getNextDifficultyLevel(performance.recommendedDifficulty, averageScore),
        recommendedCategories: getRecommendedCategories(performance),
        themes: getUpcomingThemes(),
        challenges: generateChallenges(performance)
      },
      insights: {
        familyStrengths: generateInsights(performance, 'strengths'),
        learningOpportunities: generateInsights(performance, 'opportunities'),
        funFacts: generateFunFacts(stats)
      }
    };

    res.json({
      success: true,
      data: recommendations
    });

  } catch (error) {
    console.error('Error getting trivia recommendations:', error);
    res.status(500).json({
      error: 'Failed to get trivia recommendations'
    });
  }
};

/**
 * Generate adaptive trivia that adjusts difficulty in real-time
 */
const generateAdaptiveTrivia = async (req, res) => {
  try {
    const { familyId, currentPerformance } = req.body;
    const userId = req.user.id;

    // This would generate questions that adapt based on how well
    // the family is doing in the current session
    
    // Placeholder for adaptive logic
    const adaptiveDifficulty = calculateAdaptiveDifficulty(currentPerformance);
    
    const result = await enhancedGptTriviaService.generatePersonalizedTrivia({
      familyId,
      difficultyLevel: adaptiveDifficulty,
      useCache: false // Don't cache adaptive questions
    });

    res.json({
      success: true,
      data: result.data,
      adaptiveMetadata: {
        adjustedDifficulty: adaptiveDifficulty,
        performanceScore: currentPerformance
      }
    });

  } catch (error) {
    console.error('Error generating adaptive trivia:', error);
    res.status(500).json({
      error: 'Failed to generate adaptive trivia'
    });
  }
};

// Helper functions

/**
 * Log AI usage for analytics and cost tracking
 */
async function logAIUsage(data) {
  try {
    await supabase
      .from('ai_usage_logs')
      .insert({
        ...data,
        timestamp: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging AI usage:', error);
  }
}

/**
 * Determine next difficulty level based on performance
 */
function getNextDifficultyLevel(currentLevel, averageScore) {
  const progressionThresholds = {
    'beginner': { advance: 80, maintain: 60 },
    'intermediate': { advance: 85, maintain: 65, regress: 50 },
    'advanced': { advance: 90, maintain: 70, regress: 55 },
    'expert': { maintain: 75, regress: 60 }
  };

  const thresholds = progressionThresholds[currentLevel];
  
  if (averageScore >= (thresholds.advance || 100)) {
    return getNextLevel(currentLevel);
  } else if (averageScore < (thresholds.regress || 0)) {
    return getPreviousLevel(currentLevel);
  }
  
  return currentLevel;
}

/**
 * Get recommended categories based on performance
 */
function getRecommendedCategories(performance) {
  const balanced = [];
  
  // Mix strong categories for confidence
  performance.strongCategories.slice(0, 2).forEach(cat => {
    balanced.push({
      category: cat,
      reason: 'You excel at this!',
      weight: 0.3
    });
  });
  
  // Add improvement areas for growth
  performance.weakCategories.slice(0, 2).forEach(cat => {
    balanced.push({
      category: cat,
      reason: 'Great opportunity to learn!',
      weight: 0.4
    });
  });
  
  return balanced;
}

/**
 * Get upcoming theme suggestions
 */
function getUpcomingThemes() {
  const now = new Date();
  const themes = [];
  
  // Check for nearby holidays/events
  const holidays = [
    { name: 'Halloween', date: new Date(now.getFullYear(), 9, 31) },
    { name: 'Thanksgiving', date: new Date(now.getFullYear(), 10, 23) },
    { name: 'Christmas', date: new Date(now.getFullYear(), 11, 25) },
    { name: 'New Year', date: new Date(now.getFullYear() + 1, 0, 1) }
  ];
  
  holidays.forEach(holiday => {
    const daysUntil = Math.floor((holiday.date - now) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 30) {
      themes.push({
        theme: holiday.name,
        daysUntil,
        description: `Perfect time for ${holiday.name}-themed trivia!`
      });
    }
  });
  
  return themes;
}

/**
 * Generate personalized challenges
 */
function generateChallenges(performance) {
  return [
    {
      name: 'Category Master',
      description: `Score 100% in ${performance.weakCategories[0]} category`,
      reward: 'Unlock expert questions in this category'
    },
    {
      name: 'Streak Builder',
      description: 'Play 5 games in a row',
      reward: 'Special badge and bonus questions'
    },
    {
      name: 'Family Champion',
      description: 'Everyone scores above 80% in one game',
      reward: 'Unlock family celebration theme pack'
    }
  ];
}

/**
 * Generate insights based on performance
 */
function generateInsights(performance, type) {
  if (type === 'strengths') {
    return [
      `Your family shows exceptional knowledge in ${performance.strongCategories.join(' and ')}!`,
      'Quick response times indicate great teamwork',
      'Consistent participation shows strong family engagement'
    ];
  } else {
    return [
      `Exploring ${performance.weakCategories[0]} topics could be a fun learning adventure`,
      'Try discussing questions after each round for better retention',
      'Mixed difficulty levels keep everyone engaged'
    ];
  }
}

/**
 * Generate fun facts from game statistics
 */
function generateFunFacts(stats) {
  if (!stats || stats.length === 0) return [];
  
  return [
    `Your family has answered ${stats.length * 5} questions together!`,
    'Your favorite time to play is evening (based on game timestamps)',
    'Science questions have the highest success rate in your family'
  ];
}

/**
 * Calculate adaptive difficulty based on current performance
 */
function calculateAdaptiveDifficulty(currentPerformance) {
  if (currentPerformance.correctRate > 0.9) return 'advanced';
  if (currentPerformance.correctRate > 0.75) return 'intermediate';
  if (currentPerformance.correctRate > 0.5) return 'beginner';
  return 'beginner';
}

/**
 * Get next difficulty level
 */
function getNextLevel(current) {
  const progression = ['beginner', 'intermediate', 'advanced', 'expert'];
  const index = progression.indexOf(current);
  return progression[Math.min(index + 1, progression.length - 1)];
}

/**
 * Get previous difficulty level
 */
function getPreviousLevel(current) {
  const progression = ['beginner', 'intermediate', 'advanced', 'expert'];
  const index = progression.indexOf(current);
  return progression[Math.max(index - 1, 0)];
}

module.exports = {
  generatePersonalizedTrivia,
  getTriviaRecommendations,
  generateAdaptiveTrivia
}; 