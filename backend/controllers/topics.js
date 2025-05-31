const topicService = require('../services/topicService');

/**
 * Get available topics based on filters
 * GET /trivia/topics
 * 
 * Query params:
 * - ageGroup: Filter by age group (kids, teens, adults, mixed)
 * - difficulty: Filter by difficulty (easy, medium, hard, mixed)
 * 
 * Response:
 * - topics: Array of available topics with metadata
 */
const getAvailableTopics = async (req, res) => {
  try {
    const { ageGroup, difficulty } = req.query;
    
    // Get available topics with filters
    const topics = topicService.getAvailableTopics({
      ageGroup,
      difficulty
    });

    res.json({
      success: true,
      data: {
        topics,
        count: topics.length,
        filters: {
          ageGroup: ageGroup || 'all',
          difficulty: difficulty || 'all'
        }
      }
    });

  } catch (error) {
    console.error('Error getting available topics:', error);
    res.status(500).json({
      error: 'Failed to fetch available topics'
    });
  }
};

/**
 * Get recommended topics for an age group
 * GET /trivia/topics/recommended/:ageGroup
 * 
 * Response:
 * - topics: Array of recommended topics for the age group
 */
const getRecommendedTopics = async (req, res) => {
  try {
    const { ageGroup } = req.params;
    
    // Validate age group
    const validAgeGroups = ['kids', 'teens', 'adults', 'mixed'];
    if (!validAgeGroups.includes(ageGroup)) {
      return res.status(400).json({
        error: 'Invalid age group. Must be one of: kids, teens, adults, mixed'
      });
    }

    // Get recommended topics
    const topics = topicService.getRecommendedTopicsForAge(ageGroup);

    res.json({
      success: true,
      data: {
        ageGroup,
        recommendedTopics: topics,
        count: topics.length
      }
    });

  } catch (error) {
    console.error('Error getting recommended topics:', error);
    res.status(500).json({
      error: 'Failed to fetch recommended topics'
    });
  }
};

/**
 * Validate topic selection
 * POST /trivia/topics/validate
 * 
 * Request body:
 * - topics: Array of topic names/IDs to validate
 * - ageGroup: Optional age group constraint
 * - maxTopics: Optional maximum number of topics allowed
 * 
 * Response:
 * - valid: Array of valid topic IDs
 * - warnings: Array of validation warnings
 * - success: Boolean indicating if all topics are valid
 */
const validateTopics = async (req, res) => {
  try {
    const { topics, ageGroup, maxTopics } = req.body;

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({
        error: 'Topics array is required'
      });
    }

    // Validate topic selection
    const validation = topicService.validateTopicSelection(topics, {
      ageGroup,
      maxTopics
    });

    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating topics:', error);
    res.status(500).json({
      error: 'Failed to validate topics'
    });
  }
};

/**
 * Get topics for a specific theme
 * GET /trivia/topics/theme/:theme
 * 
 * Response:
 * - topics: Array of topic IDs for the theme
 */
const getThemeTopics = async (req, res) => {
  try {
    const { theme } = req.params;

    // Get topics for theme
    const topicIds = topicService.getTopicsForTheme(theme);
    
    // Get full topic details
    const topics = topicIds.map(id => ({
      id,
      ...(topicService.availableTopics[id] || {})
    })).filter(topic => topic.displayName);

    res.json({
      success: true,
      data: {
        theme,
        topics,
        count: topics.length
      }
    });

  } catch (error) {
    console.error('Error getting theme topics:', error);
    res.status(500).json({
      error: 'Failed to fetch theme topics'
    });
  }
};

/**
 * Get topic statistics
 * GET /trivia/topics/stats
 * 
 * Response:
 * - Topic statistics including counts by age group and difficulty
 */
const getTopicStats = async (req, res) => {
  try {
    const stats = topicService.getTopicStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting topic stats:', error);
    res.status(500).json({
      error: 'Failed to fetch topic statistics'
    });
  }
};

module.exports = {
  getAvailableTopics,
  getRecommendedTopics,
  validateTopics,
  getThemeTopics,
  getTopicStats
}; 