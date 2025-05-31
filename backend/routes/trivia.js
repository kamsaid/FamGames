const express = require('express');
const router = express.Router();

// Import trivia controller functions
const {
  startTriviaSession,
  submitAnswer,
  completeSession,
  generateTrivia
} = require('../controllers/trivia');

// Import enhanced AI trivia controller functions
const {
  generatePersonalizedTrivia,
  getTriviaRecommendations,
  generateAdaptiveTrivia
} = require('../controllers/enhancedTrivia');

// Import topic controller functions
const {
  getAvailableTopics,
  getRecommendedTopics,
  validateTopics,
  getThemeTopics,
  getTopicStats
} = require('../controllers/topics');

// Import authentication middleware
const { authenticateToken } = require('../middlewares/auth');

// ===== TOPIC ENDPOINTS =====

/**
 * GET /trivia/topics
 * Get available topics with optional filters
 * 
 * Query params:
 * - ageGroup: Filter by age group
 * - difficulty: Filter by difficulty
 */
router.get('/topics', getAvailableTopics);

/**
 * GET /trivia/topics/recommended/:ageGroup
 * Get recommended topics for a specific age group
 */
router.get('/topics/recommended/:ageGroup', getRecommendedTopics);

/**
 * POST /trivia/topics/validate
 * Validate topic selection
 */
router.post('/topics/validate', validateTopics);

/**
 * GET /trivia/topics/theme/:theme
 * Get topics for a specific theme
 */
router.get('/topics/theme/:theme', getThemeTopics);

/**
 * GET /trivia/topics/stats
 * Get topic statistics
 */
router.get('/topics/stats', getTopicStats);

// ===== TRIVIA GAME ENDPOINTS =====

/**
 * POST /trivia/start-session
 * Start a new trivia session for a family
 * 
 * Request body:
 * - family_id: UUID of the family to start session for
 * - use_ai: Boolean to enable AI-generated questions (optional)
 * - topics: Array of topic IDs to focus on (optional)
 * - difficulty: String difficulty level (optional)
 * - age_group: String age group (optional)
 * 
 * Response:
 * - session: Object containing session details and 5 questions
 */
router.post('/start-session', authenticateToken, startTriviaSession);

/**
 * POST /trivia/submit-answer
 * Submit an answer for a trivia question in an active session
 * 
 * Request body:
 * - session_id: UUID of the trivia session
 * - question_id: UUID of the question being answered
 * - answer: String answer provided by user
 * 
 * Response:
 * - correct: Boolean indicating if answer was correct
 * - correct_answer: String showing the correct answer
 * - current_score: Number showing user's current score in session
 */
router.post('/submit-answer', authenticateToken, submitAnswer);

/**
 * POST /trivia/complete-session
 * Complete a trivia session and update leaderboards
 * 
 * Request body:
 * - session_id: UUID of the trivia session to complete
 * 
 * Response:
 * - final_scores: Object with final scores for all participants
 * - leaderboard: Array of updated leaderboard entries for the family
 */
router.post('/complete-session', authenticateToken, completeSession);

/**
 * POST /trivia/generate
 * Generate new trivia questions using GPT-4o and store them in the database
 * 
 * Request body:
 * - custom_prompt: Optional string to customize the trivia generation
 * 
 * Response:
 * - generation_source: String indicating if questions came from GPT-4o or fallback
 * - questions_count: Number of questions generated
 * - questions: Array of generated questions (without correct answers)
 * - gpt_success: Boolean indicating if GPT generation was successful
 */
router.post('/generate', authenticateToken, generateTrivia);

// ===== AI-POWERED ENDPOINTS =====

/**
 * POST /trivia/generate-personalized
 * Generate personalized trivia questions based on family profile and topic preferences
 * 
 * Request body:
 * - familyId: UUID of the family (optional for personalization)
 * - ageGroup: String - 'kids', 'teens', 'adults', or 'mixed'
 * - difficultyLevel: String - 'beginner', 'intermediate', 'advanced', or 'expert'
 * - categories: Array of category names or weights object
 * - theme: String - special theme like 'Halloween', 'Christmas', etc.
 * - familyInterests: Array of family interests/hobbies
 * - customPrompt: String - additional requirements
 * 
 * Response:
 * - questions: Array of personalized questions with metadata
 * - metadata: Information about personalization applied
 */
router.post('/generate-personalized', authenticateToken, generatePersonalizedTrivia);

/**
 * GET /trivia/recommendations/:familyId
 * Get AI-powered recommendations for trivia based on family performance
 * 
 * Response:
 * - performance: Family performance metrics
 * - suggestions: Recommended difficulty, categories, and themes
 * - insights: AI-generated insights about family strengths and opportunities
 * - challenges: Personalized challenges for the family
 */
router.get('/recommendations/:familyId', authenticateToken, getTriviaRecommendations);

/**
 * POST /trivia/generate-adaptive
 * Generate questions that adapt to current game performance in real-time
 * 
 * Request body:
 * - familyId: UUID of the family
 * - currentPerformance: Object with correctRate and other metrics
 * 
 * Response:
 * - questions: Adaptively generated questions
 * - adaptiveMetadata: Information about difficulty adjustments
 */
router.post('/generate-adaptive', authenticateToken, generateAdaptiveTrivia);

module.exports = router; 