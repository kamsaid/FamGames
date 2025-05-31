const { OpenAI } = require('openai');
const crypto = require('crypto');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory cache for generated questions (in production, use Redis)
const questionCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Enhanced AI Trivia Service with personalization, caching, and adaptive difficulty
 */
class EnhancedGptTriviaService {
  constructor() {
    // Category weights for different age groups
    this.ageGroupPreferences = {
      'kids': {
        'animals': 0.25,
        'cartoons': 0.25,
        'science': 0.15,
        'riddles': 0.15,
        'colors_shapes': 0.10,
        'fairy_tales': 0.10
      },
      'teens': {
        'pop_culture': 0.30,
        'technology': 0.20,
        'sports': 0.15,
        'science': 0.15,
        'history': 0.10,
        'geography': 0.10
      },
      'adults': {
        'history': 0.20,
        'geography': 0.20,
        'science': 0.15,
        'literature': 0.15,
        'current_events': 0.15,
        'trivia': 0.15
      },
      'mixed': {
        'general_knowledge': 0.20,
        'pop_culture': 0.20,
        'science': 0.15,
        'history': 0.15,
        'geography': 0.15,
        'riddles': 0.15
      }
    };

    // Difficulty progression based on performance
    this.difficultyProgression = {
      'beginner': { easy: 0.6, medium: 0.3, hard: 0.1 },
      'intermediate': { easy: 0.3, medium: 0.5, hard: 0.2 },
      'advanced': { easy: 0.1, medium: 0.4, hard: 0.5 },
      'expert': { easy: 0.0, medium: 0.3, hard: 0.7 }
    };
  }

  /**
   * Generate personalized trivia questions based on family profile
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Generated trivia pack
   */
  async generatePersonalizedTrivia(options = {}) {
    const {
      familyId,
      ageGroup = 'mixed',
      difficultyLevel = 'intermediate',
      categories = null,
      excludeUsedQuestions = [],
      customPrompt = '',
      useCache = true,
      familyInterests = []
    } = options;

    try {
      // Check cache first
      if (useCache) {
        const cachedQuestions = this.getCachedQuestions(familyId, ageGroup, difficultyLevel);
        if (cachedQuestions) {
          console.log('🎯 Returning cached trivia questions');
          return cachedQuestions;
        }
      }

      // Build dynamic prompt based on family profile
      const prompt = this.buildPersonalizedPrompt({
        ageGroup,
        difficultyLevel,
        categories,
        familyInterests,
        customPrompt
      });

      // Call GPT-4o with enhanced prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: this.getTemperatureForDifficulty(difficultyLevel),
        response_format: { type: "json_object" }
      });

      const triviaData = JSON.parse(completion.choices[0].message.content);
      
      // Validate and enhance questions
      const enhancedQuestions = await this.enhanceQuestions(triviaData.questions, {
        excludeUsedQuestions,
        familyId
      });

      // Cache the results
      if (useCache) {
        this.cacheQuestions(familyId, ageGroup, difficultyLevel, enhancedQuestions);
      }

      // Track question usage
      await this.trackQuestionUsage(familyId, enhancedQuestions);

      return {
        success: true,
        data: {
          questions: enhancedQuestions,
          metadata: {
            ageGroup,
            difficultyLevel,
            generatedAt: new Date().toISOString(),
            aiModel: 'gpt-4o',
            personalized: true
          }
        }
      };

    } catch (error) {
      console.error('Error generating personalized trivia:', error);
      
      // Try simpler generation as fallback
      return this.generateSimpleTrivia(ageGroup, difficultyLevel);
    }
  }

  /**
   * Build personalized prompt based on family preferences
   */
  buildPersonalizedPrompt({ ageGroup, difficultyLevel, categories, familyInterests, customPrompt }) {
    const categoryPrefs = categories || this.ageGroupPreferences[ageGroup] || this.ageGroupPreferences.mixed;
    const difficultyMix = this.difficultyProgression[difficultyLevel] || this.difficultyProgression.intermediate;

    let prompt = `Generate 5 engaging trivia questions for a family game night.

Family Profile:
- Primary Age Group: ${ageGroup}
- Skill Level: ${difficultyLevel}
${familyInterests.length > 0 ? `- Family Interests: ${familyInterests.join(', ')}` : ''}

Question Requirements:
1. Create questions that will spark conversation and learning
2. Include fun facts or explanations with each answer
3. Make incorrect choices plausible but clearly distinguishable
4. Ensure cultural sensitivity and inclusivity

Difficulty Distribution:
- Easy questions (${Math.round(difficultyMix.easy * 5)}): Simple, confidence-building
- Medium questions (${Math.round(difficultyMix.medium * 5)}): Thought-provoking but fair
- Hard questions (${Math.round(difficultyMix.hard * 5)}): Challenging but not frustrating

Category Distribution:`;

    // Add category requirements
    Object.entries(categoryPrefs).forEach(([category, weight]) => {
      if (weight > 0) {
        prompt += `\n- ${category}: ${Math.round(weight * 5)} question(s)`;
      }
    });

    if (customPrompt) {
      prompt += `\n\nAdditional Requirements: ${customPrompt}`;
    }

    prompt += `\n\nReturn JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "choices": ["A", "B", "C", "D"],
      "correct_answer": "Correct choice",
      "category": "category_name",
      "difficulty": "easy|medium|hard",
      "fun_fact": "Interesting explanation or additional information",
      "hint": "Optional hint for younger players"
    }
  ]
}`;

    return prompt;
  }

  /**
   * Get system prompt for AI model
   */
  getSystemPrompt() {
    return `You are an expert family game night host and educational content creator. 
Your goal is to create trivia questions that:
1. Bring families together through shared learning experiences
2. Are accessible to multiple age groups when played together
3. Include educational value without being boring
4. Promote positive interactions and discussions
5. Avoid controversial topics or potentially divisive content
6. Include diverse perspectives and cultural awareness
7. Make learning fun and memorable

Always provide accurate information and cite-worthy facts.`;
  }

  /**
   * Get temperature setting based on difficulty level
   */
  getTemperatureForDifficulty(difficultyLevel) {
    const temperatureMap = {
      'beginner': 0.5,      // More predictable, standard questions
      'intermediate': 0.7,  // Balanced creativity
      'advanced': 0.8,      // More creative questions
      'expert': 0.9         // Highly creative, unique questions
    };
    return temperatureMap[difficultyLevel] || 0.7;
  }

  /**
   * Enhance questions with additional features
   */
  async enhanceQuestions(questions, { excludeUsedQuestions, familyId }) {
    return questions.map((q, index) => ({
      ...q,
      id: this.generateQuestionId(q),
      order: index + 1,
      timeLimit: this.getTimeLimitForDifficulty(q.difficulty),
      points: this.getPointsForDifficulty(q.difficulty),
      used: excludeUsedQuestions.includes(q.id) || false
    })).filter(q => !q.used);
  }

  /**
   * Generate unique question ID
   */
  generateQuestionId(question) {
    const content = `${question.question}-${question.correct_answer}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  /**
   * Get time limit based on difficulty
   */
  getTimeLimitForDifficulty(difficulty) {
    const timeLimits = {
      'easy': 20,
      'medium': 30,
      'hard': 45
    };
    return timeLimits[difficulty] || 30;
  }

  /**
   * Get points based on difficulty
   */
  getPointsForDifficulty(difficulty) {
    const points = {
      'easy': 100,
      'medium': 150,
      'hard': 200
    };
    return points[difficulty] || 100;
  }

  /**
   * Cache questions for reuse
   */
  cacheQuestions(familyId, ageGroup, difficultyLevel, questions) {
    const cacheKey = `${familyId}-${ageGroup}-${difficultyLevel}`;
    questionCache.set(cacheKey, {
      questions,
      timestamp: Date.now()
    });

    // Clean old cache entries
    this.cleanCache();
  }

  /**
   * Get cached questions if available
   */
  getCachedQuestions(familyId, ageGroup, difficultyLevel) {
    const cacheKey = `${familyId}-${ageGroup}-${difficultyLevel}`;
    const cached = questionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return {
        success: true,
        data: {
          questions: cached.questions,
          metadata: {
            cached: true,
            cachedAt: new Date(cached.timestamp).toISOString()
          }
        }
      };
    }

    return null;
  }

  /**
   * Clean expired cache entries
   */
  cleanCache() {
    const now = Date.now();
    for (const [key, value] of questionCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        questionCache.delete(key);
      }
    }
  }

  /**
   * Track question usage for avoiding repeats
   */
  async trackQuestionUsage(familyId, questions) {
    // In production, store this in database
    // For now, just log it
    console.log(`📊 Tracking ${questions.length} questions for family ${familyId}`);
  }

  /**
   * Generate simple trivia as fallback
   */
  async generateSimpleTrivia(ageGroup, difficultyLevel) {
    try {
      const simplePrompt = `Generate 5 ${ageGroup}-appropriate trivia questions at ${difficultyLevel} difficulty level. 
      Mix different categories. Return JSON with question, choices array, correct_answer, category, and difficulty fields.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a trivia question generator. Create family-friendly questions." },
          { role: "user", content: simplePrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      const data = JSON.parse(completion.choices[0].message.content);
      
      return {
        success: true,
        data: {
          questions: data.questions || data,
          metadata: {
            fallback: true,
            generatedAt: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      // Ultimate fallback to predefined questions
      return this.getPredefinedQuestions(ageGroup, difficultyLevel);
    }
  }

  /**
   * Get predefined questions as ultimate fallback
   */
  getPredefinedQuestions(ageGroup, difficultyLevel) {
    // Implementation would include a large bank of pre-written questions
    // categorized by age group and difficulty
    return {
      success: true,
      data: {
        questions: [
          // Fallback questions here
        ],
        metadata: {
          predefined: true
        }
      }
    };
  }

  /**
   * Analyze family performance to adjust difficulty
   */
  async analyzeFamilyPerformance(familyId) {
    // This would query the database for historical performance
    // and return insights for difficulty adjustment
    // Placeholder implementation
    return {
      averageScore: 0.75,
      recommendedDifficulty: 'intermediate',
      strongCategories: ['science', 'geography'],
      weakCategories: ['history', 'literature']
    };
  }

  /**
   * Generate themed trivia packs (special events, holidays, etc.)
   */
  async generateThemedTrivia(theme, options = {}) {
    const themedPrompt = `Create 5 trivia questions themed around "${theme}". 
    Make them engaging and educational while staying family-friendly.
    ${options.customRequirements || ''}`;

    // Similar implementation to generatePersonalizedTrivia
    // but with theme-specific prompts
  }
}

// Export singleton instance
module.exports = new EnhancedGptTriviaService(); 