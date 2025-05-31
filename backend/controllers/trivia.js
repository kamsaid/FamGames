const { createClient } = require('@supabase/supabase-js');
// Import GPT trivia generation service
const { generateTriviaPack, getFallbackTriviaPack } = require('../services/gptTriviaService');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Start a new trivia session for a family
 * - Fetches 5 random questions from the database
 * - Creates a new trivia_session record
 * - Returns session details with questions
 */
const startTriviaSession = async (req, res) => {
  try {
    const { family_id } = req.body;
    const user_id = req.user.id; // From auth middleware

    // Validate required fields
    if (!family_id) {
      return res.status(400).json({ 
        error: 'family_id is required' 
      });
    }

    // Verify user is a member of the family
    const { data: familyMember, error: memberError } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', family_id)
      .eq('user_id', user_id)
      .single();

    if (memberError || !familyMember) {
      return res.status(403).json({ 
        error: 'You are not a member of this family' 
      });
    }

    // Check if family has an active session already
    const { data: activeSession, error: activeSessionError } = await supabase
      .from('trivia_sessions')
      .select('*')
      .eq('family_id', family_id)
      .eq('completed', false)
      .maybeSingle();

    if (activeSessionError) {
      console.error('Error checking active session:', activeSessionError);
      return res.status(500).json({ 
        error: 'Failed to check for active sessions' 
      });
    }

    if (activeSession) {
      return res.status(409).json({ 
        error: 'Family already has an active trivia session',
        session_id: activeSession.id
      });
    }

    // Fetch 5 random questions from different categories if possible
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, category, question, choices, difficulty')
      .limit(5);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch trivia questions' 
      });
    }

    if (!questions || questions.length === 0) {
      return res.status(404).json({ 
        error: 'No trivia questions available. Please add questions to the database.' 
      });
    }

    // Shuffle questions and take only 5 (in case we have more than 5)
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, 5);
    const questionIds = shuffledQuestions.map(q => q.id);

    // Create new trivia session
    const { data: session, error: sessionError } = await supabase
      .from('trivia_sessions')
      .insert({
        family_id,
        questions_used: questionIds,
        scores: {}, // Initialize empty scores object
        completed: false
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating trivia session:', sessionError);
      return res.status(500).json({ 
        error: 'Failed to create trivia session' 
      });
    }

    // Return session with questions (without correct answers)
    const questionsForClient = shuffledQuestions.map(q => ({
      id: q.id,
      category: q.category,
      question: q.question,
      choices: q.choices,
      difficulty: q.difficulty
    }));

    res.status(201).json({
      message: 'Trivia session started successfully',
      session: {
        id: session.id,
        family_id: session.family_id,
        started_at: session.started_at,
        questions: questionsForClient
      }
    });

  } catch (error) {
    console.error('Unexpected error in startTriviaSession:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Submit an answer for a trivia question
 * - Validates the session and question
 * - Updates the session scores
 * - Returns whether the answer was correct
 */
const submitAnswer = async (req, res) => {
  try {
    const { session_id, question_id, answer } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!session_id || !question_id || !answer) {
      return res.status(400).json({ 
        error: 'session_id, question_id, and answer are required' 
      });
    }

    // Fetch the session and verify it belongs to user's family
    const { data: session, error: sessionError } = await supabase
      .from('trivia_sessions')
      .select(`
        *,
        families!inner(
          family_members!inner(user_id)
        )
      `)
      .eq('id', session_id)
      .eq('families.family_members.user_id', user_id)
      .eq('completed', false)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ 
        error: 'Session not found or you do not have access' 
      });
    }

    // Verify question is part of this session
    if (!session.questions_used.includes(question_id)) {
      return res.status(400).json({ 
        error: 'Question is not part of this session' 
      });
    }

    // Get the correct answer for this question
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('answer')
      .eq('id', question_id)
      .single();

    if (questionError || !question) {
      return res.status(404).json({ 
        error: 'Question not found' 
      });
    }

    // Check if answer is correct
    const isCorrect = answer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    
    // Update session scores
    const currentScores = session.scores || {};
    if (!currentScores[user_id]) {
      currentScores[user_id] = 0;
    }
    
    if (isCorrect) {
      currentScores[user_id] += 1;
    }

    // Update the session with new scores
    const { error: updateError } = await supabase
      .from('trivia_sessions')
      .update({ scores: currentScores })
      .eq('id', session_id);

    if (updateError) {
      console.error('Error updating session scores:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update scores' 
      });
    }

    res.json({
      message: 'Answer submitted successfully',
      correct: isCorrect,
      correct_answer: question.answer,
      current_score: currentScores[user_id]
    });

  } catch (error) {
    console.error('Unexpected error in submitAnswer:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Complete a trivia session
 * - Marks session as completed
 * - Updates family leaderboard
 * - Returns final scores and updated leaderboard
 */
const completeSession = async (req, res) => {
  try {
    const { session_id } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!session_id) {
      return res.status(400).json({ 
        error: 'session_id is required' 
      });
    }

    // Fetch the session and verify it belongs to user's family
    const { data: session, error: sessionError } = await supabase
      .from('trivia_sessions')
      .select(`
        *,
        families!inner(
          family_members!inner(user_id, role)
        )
      `)
      .eq('id', session_id)
      .eq('families.family_members.user_id', user_id)
      .eq('completed', false)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ 
        error: 'Session not found or you do not have access' 
      });
    }

    // Mark session as completed
    const { error: completeError } = await supabase
      .from('trivia_sessions')
      .update({ 
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (completeError) {
      console.error('Error completing session:', completeError);
      return res.status(500).json({ 
        error: 'Failed to complete session' 
      });
    }

    // Update leaderboard for all participants
    const scores = session.scores || {};
    const family_id = session.family_id;

    for (const [participant_user_id, score] of Object.entries(scores)) {
      // Get current leaderboard entry
      const { data: currentEntry, error: leaderboardError } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('family_id', family_id)
        .eq('user_id', participant_user_id)
        .maybeSingle();

      if (leaderboardError) {
        console.error('Error fetching leaderboard entry:', leaderboardError);
        continue;
      }

      const newScore = (currentEntry?.total_score || 0) + score;
      const newStreak = score > 0 ? (currentEntry?.current_streak || 0) + 1 : 0;

      if (currentEntry) {
        // Update existing entry
        await supabase
          .from('leaderboards')
          .update({
            total_score: newScore,
            current_streak: newStreak,
            last_played_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentEntry.id);
      } else {
        // Create new entry
        await supabase
          .from('leaderboards')
          .insert({
            family_id,
            user_id: participant_user_id,
            total_score: newScore,
            current_streak: newStreak,
            last_played_at: new Date().toISOString()
          });
      }
    }

    // Fetch updated leaderboard
    const { data: leaderboard, error: leaderboardFetchError } = await supabase
      .from('leaderboards')
      .select(
        `*,auth.users(email)`
      )
      .eq('family_id', family_id)
      .order('total_score', { ascending: false });

    if (leaderboardFetchError) {
      console.error('Error fetching updated leaderboard:', leaderboardFetchError);
    }

    res.json({
      message: 'Session completed successfully',
      final_scores: scores,
      leaderboard: leaderboard || []
    });

  } catch (error) {
    console.error('Unexpected error in completeSession:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Generate new trivia questions using GPT-4o and store them in the database
 * - Uses GPT-4o API to generate 5 family-friendly trivia questions
 * - Stores generated questions in the questions table
 * - Falls back to predefined questions if GPT generation fails
 */
const generateTrivia = async (req, res) => {
  try {
    const { custom_prompt } = req.body;
    const user_id = req.user.id; // From auth middleware

    // Check if user has permission to generate trivia (optional: could be admin-only)
    // For now, any authenticated user can generate trivia

    console.log('Starting GPT trivia generation...');
    
    // Generate trivia pack using GPT-4o
    const result = await generateTriviaPack(custom_prompt);

    let questionsToStore;
    let generationSource;

    if (result.success) {
      questionsToStore = result.data.questions;
      generationSource = 'gpt-4o';
      console.log('GPT generation successful, storing questions...');
    } else {
      // Fall back to predefined questions if GPT fails
      console.warn('GPT generation failed, using fallback questions:', result.error);
      const fallbackResult = getFallbackTriviaPack();
      questionsToStore = fallbackResult.data.questions;
      generationSource = 'fallback';
    }

    // Prepare questions for database insertion
    const questionsForDB = questionsToStore.map(q => ({
      category: q.category,
      question: q.question,
      choices: q.choices,
      answer: q.correct_answer,
      difficulty: q.difficulty,
      created_by: user_id,
      generation_source: generationSource
    }));

    // Insert questions into the database
    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsForDB)
      .select();

    if (insertError) {
      console.error('Error inserting generated questions:', insertError);
      return res.status(500).json({ 
        error: 'Failed to store generated questions in database',
        details: insertError.message
      });
    }

    // Success response
    res.status(201).json({
      message: 'Trivia questions generated and stored successfully',
      generation_source: generationSource,
      questions_count: insertedQuestions.length,
      questions: insertedQuestions.map(q => ({
        id: q.id,
        category: q.category,
        question: q.question,
        choices: q.choices,
        difficulty: q.difficulty
      })),
      gpt_success: result.success,
      ...(result.error && { gpt_error: result.error })
    });

  } catch (error) {
    console.error('Unexpected error in generateTrivia:', error);
    res.status(500).json({ 
      error: 'Internal server error during trivia generation',
      details: error.message
    });
  }
};

module.exports = {
  startTriviaSession,
  submitAnswer,
  completeSession,
  generateTrivia
}; 