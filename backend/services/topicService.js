/**
 * Topic Service - Manages available topics/categories for trivia questions
 * Provides topic recommendations and mappings
 */

class TopicService {
  constructor() {
    // Define available topics with metadata
    this.availableTopics = {
      // General Knowledge Topics
      'general_knowledge': {
        displayName: 'General Knowledge',
        description: 'A mix of various topics',
        icon: '🌍',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      
      // Science & Nature
      'science': {
        displayName: 'Science',
        description: 'Physics, chemistry, biology, and more',
        icon: '🔬',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'animals': {
        displayName: 'Animals & Nature',
        description: 'Wildlife, pets, and nature facts',
        icon: '🦁',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'space': {
        displayName: 'Space & Astronomy',
        description: 'Planets, stars, and the universe',
        icon: '🚀',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      
      // History & Geography
      'history': {
        displayName: 'History',
        description: 'Historical events and figures',
        icon: '📜',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['medium', 'hard']
      },
      'geography': {
        displayName: 'Geography',
        description: 'Countries, capitals, and landmarks',
        icon: '🗺️',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      
      // Entertainment
      'pop_culture': {
        displayName: 'Pop Culture',
        description: 'Movies, music, and celebrities',
        icon: '🎬',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'movies': {
        displayName: 'Movies & TV',
        description: 'Films, shows, and actors',
        icon: '🎥',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'music': {
        displayName: 'Music',
        description: 'Songs, artists, and instruments',
        icon: '🎵',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'cartoons': {
        displayName: 'Cartoons & Animation',
        description: 'Animated shows and characters',
        icon: '🎨',
        ageGroups: ['kids', 'teens', 'mixed'],
        difficulty: ['easy', 'medium']
      },
      
      // Sports & Games
      'sports': {
        displayName: 'Sports',
        description: 'Athletes, teams, and competitions',
        icon: '⚽',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'games': {
        displayName: 'Video Games',
        description: 'Gaming characters and franchises',
        icon: '🎮',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      
      // Learning & Education
      'literature': {
        displayName: 'Books & Literature',
        description: 'Authors, novels, and poetry',
        icon: '📚',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['medium', 'hard']
      },
      'technology': {
        displayName: 'Technology',
        description: 'Computers, internet, and innovations',
        icon: '💻',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['medium', 'hard']
      },
      'math': {
        displayName: 'Mathematics',
        description: 'Numbers, puzzles, and calculations',
        icon: '🔢',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      
      // Fun & Creative
      'riddles': {
        displayName: 'Riddles & Brain Teasers',
        description: 'Puzzles and mind-bending questions',
        icon: '🧩',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium', 'hard']
      },
      'food': {
        displayName: 'Food & Cooking',
        description: 'Cuisines, recipes, and ingredients',
        icon: '🍕',
        ageGroups: ['kids', 'teens', 'adults', 'mixed'],
        difficulty: ['easy', 'medium']
      },
      'art': {
        displayName: 'Art & Design',
        description: 'Artists, paintings, and creativity',
        icon: '🎨',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['medium', 'hard']
      },
      
      // Kid-Friendly Topics
      'fairy_tales': {
        displayName: 'Fairy Tales & Stories',
        description: 'Classic tales and storybook characters',
        icon: '🏰',
        ageGroups: ['kids'],
        difficulty: ['easy']
      },
      'colors_shapes': {
        displayName: 'Colors & Shapes',
        description: 'Basic learning for young minds',
        icon: '🌈',
        ageGroups: ['kids'],
        difficulty: ['easy']
      },
      'superheroes': {
        displayName: 'Superheroes',
        description: 'Comic book heroes and powers',
        icon: '🦸',
        ageGroups: ['kids', 'teens', 'mixed'],
        difficulty: ['easy', 'medium']
      },
      
      // Current Events & Modern Topics
      'current_events': {
        displayName: 'Current Events',
        description: 'Recent news and happenings',
        icon: '📰',
        ageGroups: ['adults'],
        difficulty: ['medium', 'hard']
      },
      'environment': {
        displayName: 'Environment & Climate',
        description: 'Ecology and sustainability',
        icon: '🌱',
        ageGroups: ['teens', 'adults', 'mixed'],
        difficulty: ['medium', 'hard']
      }
    };

    // Topic aliases for flexible matching
    this.topicAliases = {
      'animals': ['nature', 'wildlife', 'pets'],
      'science': ['biology', 'chemistry', 'physics'],
      'pop_culture': ['entertainment', 'celebrities', 'trends'],
      'movies': ['films', 'cinema', 'tv'],
      'sports': ['athletics', 'olympics', 'football', 'basketball'],
      'technology': ['tech', 'computers', 'internet', 'ai'],
      'food': ['cooking', 'cuisine', 'recipes'],
      'space': ['astronomy', 'planets', 'universe']
    };

    // Topic combinations for themes
    this.themeTopicMappings = {
      'halloween': ['fairy_tales', 'movies', 'riddles'],
      'christmas': ['general_knowledge', 'music', 'food'],
      'summer': ['sports', 'geography', 'nature'],
      'back_to_school': ['science', 'math', 'literature'],
      'family_night': ['general_knowledge', 'movies', 'riddles']
    };
  }

  /**
   * Get all available topics
   * @param {Object} filters - Optional filters (ageGroup, difficulty)
   * @returns {Array} Array of topic objects
   */
  getAvailableTopics(filters = {}) {
    const { ageGroup, difficulty } = filters;
    
    return Object.entries(this.availableTopics)
      .filter(([key, topic]) => {
        // Filter by age group if specified
        if (ageGroup && !topic.ageGroups.includes(ageGroup)) {
          return false;
        }
        
        // Filter by difficulty if specified
        if (difficulty && difficulty !== 'mixed' && !topic.difficulty.includes(difficulty)) {
          return false;
        }
        
        return true;
      })
      .map(([key, topic]) => ({
        id: key,
        ...topic
      }));
  }

  /**
   * Get topics recommended for a specific age group
   * @param {string} ageGroup - Age group identifier
   * @returns {Array} Array of recommended topics
   */
  getRecommendedTopicsForAge(ageGroup) {
    const ageRecommendations = {
      'kids': [
        'animals', 'cartoons', 'fairy_tales', 'colors_shapes', 
        'superheroes', 'riddles', 'science', 'food'
      ],
      'teens': [
        'pop_culture', 'technology', 'sports', 'games', 
        'music', 'movies', 'science', 'riddles'
      ],
      'adults': [
        'history', 'geography', 'current_events', 'literature',
        'technology', 'science', 'art', 'environment'
      ],
      'mixed': [
        'general_knowledge', 'science', 'geography', 'movies',
        'sports', 'animals', 'riddles', 'food'
      ]
    };

    const recommendedIds = ageRecommendations[ageGroup] || ageRecommendations.mixed;
    
    return recommendedIds
      .map(id => ({
        id,
        ...this.availableTopics[id]
      }))
      .filter(topic => topic.displayName); // Filter out any invalid topics
  }

  /**
   * Convert topic names to valid category identifiers
   * @param {Array} topicNames - Array of topic names (can be display names or aliases)
   * @returns {Array} Array of valid topic IDs
   */
  normalizeTopicNames(topicNames) {
    return topicNames.map(name => {
      const lowerName = name.toLowerCase().trim();
      
      // Check if it's already a valid topic ID
      if (this.availableTopics[lowerName]) {
        return lowerName;
      }
      
      // Check display names
      const topicByDisplayName = Object.entries(this.availableTopics)
        .find(([id, topic]) => topic.displayName.toLowerCase() === lowerName);
      if (topicByDisplayName) {
        return topicByDisplayName[0];
      }
      
      // Check aliases
      for (const [topicId, aliases] of Object.entries(this.topicAliases)) {
        if (aliases.includes(lowerName)) {
          return topicId;
        }
      }
      
      // Default to general_knowledge if not found
      console.warn(`Topic "${name}" not recognized, defaulting to general_knowledge`);
      return 'general_knowledge';
    });
  }

  /**
   * Get topics for a specific theme
   * @param {string} theme - Theme name
   * @returns {Array} Array of topic IDs for the theme
   */
  getTopicsForTheme(theme) {
    const lowerTheme = theme.toLowerCase();
    return this.themeTopicMappings[lowerTheme] || ['general_knowledge'];
  }

  /**
   * Validate topic selection
   * @param {Array} topics - Array of topic IDs to validate
   * @param {Object} constraints - Constraints like ageGroup, difficulty
   * @returns {Object} Validation result with valid topics and warnings
   */
  validateTopicSelection(topics, constraints = {}) {
    const { ageGroup, maxTopics = 5 } = constraints;
    const normalizedTopics = this.normalizeTopicNames(topics);
    const validTopics = [];
    const warnings = [];

    normalizedTopics.forEach(topicId => {
      const topic = this.availableTopics[topicId];
      
      if (!topic) {
        warnings.push(`Topic "${topicId}" is not available`);
        return;
      }
      
      if (ageGroup && !topic.ageGroups.includes(ageGroup)) {
        warnings.push(`Topic "${topic.displayName}" may not be suitable for age group "${ageGroup}"`);
      }
      
      validTopics.push(topicId);
    });

    // Limit number of topics
    if (validTopics.length > maxTopics) {
      warnings.push(`Too many topics selected. Using first ${maxTopics} topics.`);
      validTopics.splice(maxTopics);
    }

    // Add default topic if none are valid
    if (validTopics.length === 0) {
      validTopics.push('general_knowledge');
      warnings.push('No valid topics selected. Using General Knowledge.');
    }

    return {
      valid: validTopics,
      warnings,
      success: warnings.length === 0
    };
  }

  /**
   * Get topic statistics for analytics
   * @returns {Object} Topic statistics
   */
  getTopicStats() {
    const stats = {
      totalTopics: Object.keys(this.availableTopics).length,
      byAgeGroup: {},
      byDifficulty: {}
    };

    // Count topics by age group
    ['kids', 'teens', 'adults', 'mixed'].forEach(ageGroup => {
      stats.byAgeGroup[ageGroup] = this.getAvailableTopics({ ageGroup }).length;
    });

    // Count topics by difficulty
    ['easy', 'medium', 'hard'].forEach(difficulty => {
      stats.byDifficulty[difficulty] = this.getAvailableTopics({ difficulty }).length;
    });

    return stats;
  }
}

// Export singleton instance
module.exports = new TopicService(); 