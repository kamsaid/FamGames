const express = require('express');
const router = express.Router();

// Import trivia controller functions
const {
  startTriviaSession,
  submitAnswer,
  completeSession
} = require('../controllers/trivia');

// Import authentication middleware
const { authenticateToken } = require('../middlewares/auth');

/**
 * POST /trivia/start-session
 * Start a new trivia session for a family
 * 
 * Request body:
 * - family_id: UUID of the family to start session for
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

module.exports = router; 