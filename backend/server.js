const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http'); // Added for socket.io integration
const { Server } = require('socket.io'); // Import socket.io server
const path = require('path');
// Load environment variables from backend/.env regardless of current working directory
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import routes
const authRoutes = require('./routes/auth');
const familiesRoutes = require('./routes/families');
const triviaRoutes = require('./routes/trivia');
const memoryVaultRoutes = require('./routes/memoryVault');

// Import game service for WebSocket management
const gameService = require('./services/gameService');
const leaderboardService = require('./services/leaderboardService');

const app = express();
// Use a fixed development port to avoid conflicts (do not rely on external PORT env)
const PORT = 3001;

// Create HTTP server and integrate with socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*", // Configure CORS for WebSocket
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting - basic protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Family Together API is running' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/families', familiesRoutes);
app.use('/trivia', triviaRoutes);
app.use('/memory-vault', memoryVaultRoutes);

// WebSocket connection handling for game rooms
const gameNamespace = io.of('/game'); // Create /game namespace

gameNamespace.on('connection', (socket) => {
  console.log(`🎮 User connected to game room: ${socket.id}`);
  
  // Task 16: Implement join-room event
  socket.on('join-room', (data) => {
    const { familyId, userId, playerName } = data;
    
    // Validate required data
    if (!familyId || !userId || !playerName) {
      socket.emit('join-room-error', {
        error: 'Missing required fields: familyId, userId, and playerName are required'
      });
      return;
    }

    console.log(`👥 Join room request: ${playerName} (${userId}) wants to join family ${familyId}`);

    try {
      // Check if room exists, if not create it
      let room = gameService.getRoom(familyId);
      let isNewRoom = false;

      if (!room) {
        // Create new room with this player as host
        room = gameService.createRoom(familyId, socket.id, { userId, playerName });
        isNewRoom = true;
        console.log(`🏠 Created new room for family: ${familyId}`);
      } else {
        // Join existing room
        room = gameService.joinRoom(familyId, socket.id, { userId, playerName });
        if (!room) {
          socket.emit('join-room-error', {
            error: 'Failed to join room'
          });
          return;
        }
      }

      // Add socket to Socket.IO room for broadcasting
      socket.join(`family-${familyId}`);

      // Send success response to the joining player
      socket.emit('room-joined', {
        success: true,
        room: {
          familyId: room.familyId,
          players: room.players,
          gameState: room.gameState,
          isHost: room.host === socket.id
        },
        message: isNewRoom ? 'Room created and joined successfully' : 'Joined room successfully'
      });

      // Notify other players in the room about the new player (if not a new room)
      if (!isNewRoom) {
        const newPlayer = room.players.find(p => p.socketId === socket.id);
        socket.to(`family-${familyId}`).emit('player-joined', {
          room: {
            familyId: room.familyId,
            players: room.players,
            gameState: room.gameState
          },
          newPlayer,
          message: `${playerName} joined the game`
        });
      }

      console.log(`✅ ${playerName} successfully joined room for family: ${familyId} (${room.players.length} players total)`);

    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('join-room-error', {
        error: 'Internal server error while joining room'
      });
    }
  });

  // Task 17: Implement start-game event
  socket.on('start-game', async (data) => {
    const { familyId, topics = [], difficulty = 'mixed', ageGroup = 'mixed' } = data;
    
    // Validate required data
    if (!familyId) {
      socket.emit('start-game-error', {
        error: 'familyId is required'
      });
      return;
    }

    console.log(`🎮 Start game request for family: ${familyId} from socket: ${socket.id}`);

    try {
      // Get room information
      const room = gameService.getRoom(familyId);
      if (!room) {
        socket.emit('start-game-error', {
          error: 'Game room not found'
        });
        return;
      }

      // Verify that the requester is the host
      if (room.host !== socket.id) {
        socket.emit('start-game-error', {
          error: 'Only the host can start the game'
        });
        return;
      }

      // Check if game is already in progress
      if (room.gameState.status === 'playing') {
        socket.emit('start-game-error', {
          error: 'Game is already in progress'
        });
        return;
      }

      // Ensure we have at least 1 player (the host)
      if (room.players.length < 1) {
        socket.emit('start-game-error', {
          error: 'Need at least 1 player to start the game'
        });
        return;
      }

      // Generate AI-powered questions
      let questions = [];
      let generationSource = 'database';
      
      try {
        const { createClient } = require('@supabase/supabase-js');
        const enhancedGptTriviaService = require('./services/enhancedGptTriviaService');
        const topicService = require('./services/topicService');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey && supabaseUrl !== 'your-supabase-url') {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          // Try AI generation first
          if (topics && topics.length > 0) {
            console.log('🤖 Generating AI questions with topics:', topics);
            
            // Validate and normalize topics
            const validationResult = topicService.validateTopicSelection(topics, {
              ageGroup,
              maxTopics: 5
            });
            
            const validTopics = validationResult.valid;
            
            // Convert topics to category weights
            const categoryWeights = {};
            validTopics.forEach(topic => {
              categoryWeights[topic] = 1.0 / validTopics.length;
            });
            
            // Generate AI questions
            const aiResult = await enhancedGptTriviaService.generatePersonalizedTrivia({
              familyId,
              ageGroup,
              difficultyLevel: difficulty,
              categories: categoryWeights,
              useCache: true
            });
            
            if (aiResult.success && aiResult.data.questions.length > 0) {
              questions = aiResult.data.questions.map(q => ({
                id: q.id,
                category: q.category,
                question: q.question,
                choices: q.choices,
                answer: q.correct_answer,
                difficulty: q.difficulty,
                fun_fact: q.fun_fact,
                hint: q.hint,
                time_limit: q.timeLimit,
                points: q.points
              }));
              generationSource = 'ai-personalized';
              console.log('✅ AI questions generated successfully');
            }
          }
          
          // If no AI questions, try database
          if (questions.length === 0) {
            console.log('📚 Fetching questions from database');
            
            let query = supabase
              .from('questions')
              .select('id, category, question, choices, answer, difficulty, fun_fact, hint, time_limit, points');
            
            // Filter by topics if specified
            if (topics && topics.length > 0) {
              const normalizedTopics = topicService.normalizeTopicNames(topics);
              query = query.in('category', normalizedTopics);
            }
            
            // Filter by difficulty if specified
            if (difficulty && difficulty !== 'mixed') {
              query = query.eq('difficulty', difficulty);
            }
            
            const { data: fetchedQuestions, error: questionsError } = await query.limit(20);
            
            if (!questionsError && fetchedQuestions && fetchedQuestions.length > 0) {
              questions = fetchedQuestions;
              generationSource = 'database';
            }
          }
        }
      } catch (error) {
        console.error('⚠️ Error generating questions:', error);
      }
      
      // Ultimate fallback: use basic test questions if nothing else works
      if (questions.length === 0) {
        console.warn('⚠️ Using fallback test questions');
        
        // Import the enhanced service for fallback questions
        try {
          const enhancedGptTriviaService = require('./services/enhancedGptTriviaService');
          const fallbackResult = await enhancedGptTriviaService.generateSimpleTrivia(ageGroup, difficulty);
          
          if (fallbackResult.success && fallbackResult.data.questions.length > 0) {
            questions = fallbackResult.data.questions;
            generationSource = 'fallback-ai';
          }
        } catch (fallbackError) {
          // Last resort: hardcoded questions
          questions = [
            {
              id: '1',
              category: 'general_knowledge',
              question: 'What is the capital of France?',
              choices: ['London', 'Berlin', 'Paris', 'Madrid'],
              answer: 'Paris',
              difficulty: 'easy',
              time_limit: 20,
              points: 100
            },
            {
              id: '2',
              category: 'science',
              question: 'What is H2O commonly known as?',
              choices: ['Hydrogen', 'Water', 'Oxygen', 'Salt'],
              answer: 'Water',
              difficulty: 'easy',
              time_limit: 20,
              points: 100
            },
            {
              id: '3',
              category: 'animals',
              question: 'How many legs does a spider have?',
              choices: ['6', '8', '10', '12'],
              answer: '8',
              difficulty: 'medium',
              time_limit: 30,
              points: 150
            },
            {
              id: '4',
              category: 'geography',
              question: 'Which is the largest ocean?',
              choices: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
              answer: 'Pacific',
              difficulty: 'medium',
              time_limit: 30,
              points: 150
            },
            {
              id: '5',
              category: 'riddles',
              question: 'What has hands but cannot clap?',
              choices: ['A statue', 'A clock', 'A mannequin', 'A robot'],
              answer: 'A clock',
              difficulty: 'easy',
              time_limit: 20,
              points: 100,
              hint: 'It helps you tell time!'
            }
          ];
          generationSource = 'hardcoded-fallback';
        }
      }

      if (!questions || questions.length === 0) {
        socket.emit('start-game-error', {
          error: 'No trivia questions available. Please add questions to the database.'
        });
        return;
      }

      // Shuffle questions and take only 5
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, 5);
      
      // Prepare questions for clients (without correct answers)
      const questionsForClient = shuffledQuestions.map((q, index) => ({
        id: q.id,
        questionNumber: index + 1,
        category: q.category,
        question: q.question,
        choices: q.choices,
        difficulty: q.difficulty,
        timeLimit: q.time_limit || 30,
        points: q.points || 100,
        ...(q.hint && { hint: q.hint }),
        ...(q.fun_fact && { funFact: q.fun_fact })
      }));

      // Initialize scores for all players
      const initialScores = {};
      room.players.forEach(player => {
        initialScores[player.userId] = 0;
      });

      // Update game state to playing
      const updatedRoom = gameService.updateGameState(familyId, {
        status: 'playing',
        questions: shuffledQuestions, // Store full questions with answers on server
        currentQuestion: 0,
        scores: initialScores,
        startedAt: new Date(),
        questionStartTime: new Date(),
        metadata: {
          generationSource,
          topics: topics || [],
          difficulty,
          ageGroup
        }
      });

      if (!updatedRoom) {
        socket.emit('start-game-error', {
          error: 'Failed to update game state'
        });
        return;
      }

      console.log(`🚀 Game started for family: ${familyId} with ${room.players.length} players (source: ${generationSource})`);

      // Send game started event to all players in the room
      gameNamespace.to(`family-${familyId}`).emit('game-started', {
        success: true,
        gameState: {
          status: 'playing',
          totalQuestions: questionsForClient.length,
          currentQuestion: 0,
          scores: initialScores,
          players: room.players.map(p => ({
            userId: p.userId,
            playerName: p.playerName,
            isHost: p.isHost
          }))
        },
        questions: questionsForClient,
        metadata: {
          generationSource,
          topics: topics || [],
          difficulty,
          ageGroup,
          aiGenerated: generationSource.includes('ai')
        },
        message: `Game started! Get ready for ${questionsForClient.length} trivia questions.`
      });

      // Send the first question to all players
      gameNamespace.to(`family-${familyId}`).emit('question-delivered', {
        questionNumber: 1,
        question: questionsForClient[0],
        timeLimit: questionsForClient[0].timeLimit,
        message: `Question 1 is ready! You have ${questionsForClient[0].timeLimit} seconds to answer.`
      });

    } catch (error) {
      console.error('❌ Error starting game:', error);
      socket.emit('start-game-error', {
        error: 'Internal server error while starting game'
      });
    }
  });

  // Task 18: Implement submit-answer socket event
  socket.on('submit-answer', async (data) => {
    const { familyId, questionNumber, selectedAnswer, timeTaken } = data;
    
    // Validate required data
    if (!familyId || questionNumber === undefined || !selectedAnswer) {
      socket.emit('submit-answer-error', {
        error: 'familyId, questionNumber, and selectedAnswer are required'
      });
      return;
    }

    console.log(`📝 Answer submission for family: ${familyId}, question: ${questionNumber}, answer: ${selectedAnswer} from socket: ${socket.id}`);

    try {
      // Get player info
      const playerInfo = gameService.getPlayerInfo(socket.id);
      if (!playerInfo) {
        socket.emit('submit-answer-error', {
          error: 'Player not found in any room'
        });
        return;
      }

      // Get room information
      const room = gameService.getRoom(familyId);
      if (!room) {
        socket.emit('submit-answer-error', {
          error: 'Game room not found'
        });
        return;
      }

      // Check if game is in progress
      if (room.gameState.status !== 'playing') {
        socket.emit('submit-answer-error', {
          error: 'Game is not currently in progress'
        });
        return;
      }

      // Validate question number
      if (questionNumber < 1 || questionNumber > room.gameState.questions.length) {
        socket.emit('submit-answer-error', {
          error: 'Invalid question number'
        });
        return;
      }

      // Get the current question with correct answer
      const currentQuestionIndex = questionNumber - 1;
      const currentQuestion = room.gameState.questions[currentQuestionIndex];
      
      if (!currentQuestion) {
        socket.emit('submit-answer-error', {
          error: 'Question not found'
        });
        return;
      }

      // Check if player has already answered this question
      if (!room.gameState.playerAnswers) {
        room.gameState.playerAnswers = {};
      }
      
      const answerKey = `${playerInfo.userId}-q${questionNumber}`;
      if (room.gameState.playerAnswers[answerKey]) {
        socket.emit('submit-answer-error', {
          error: 'You have already answered this question'
        });
        return;
      }

      // Check if answer is correct
      const isCorrect = selectedAnswer.trim().toLowerCase() === currentQuestion.answer.trim().toLowerCase();
      
      // Calculate points based on correctness and time
      let pointsEarned = 0;
      const basePoints = currentQuestion.points || 100;
      
      if (isCorrect) {
        // Base points for correct answer adjusted by difficulty
        let difficultyMultiplier = 1;
        switch (currentQuestion.difficulty) {
          case 'easy':
            difficultyMultiplier = 1;
            break;
          case 'medium':
            difficultyMultiplier = 1.5;
            break;
          case 'hard':
            difficultyMultiplier = 2;
            break;
          default:
            difficultyMultiplier = 1;
        }
        
        const adjustedBasePoints = Math.floor(basePoints * difficultyMultiplier);
        
        // Time bonus: Award bonus points for quick answers
        const maxTimeForQuestion = currentQuestion.time_limit || 30;
        const actualTimeTaken = timeTaken || maxTimeForQuestion;
        const timeBonus = Math.max(0, Math.floor((maxTimeForQuestion - actualTimeTaken) * 50 / maxTimeForQuestion));
        
        pointsEarned = adjustedBasePoints + timeBonus;
      }

      // Record the answer
      room.gameState.playerAnswers[answerKey] = {
        userId: playerInfo.userId,
        playerName: playerInfo.playerName,
        questionNumber,
        selectedAnswer,
        correctAnswer: currentQuestion.answer,
        isCorrect,
        pointsEarned,
        timeTaken: timeTaken || 0,
        submittedAt: new Date()
      };

      // Update player's total score
      if (!room.gameState.scores[playerInfo.userId]) {
        room.gameState.scores[playerInfo.userId] = 0;
      }
      room.gameState.scores[playerInfo.userId] += pointsEarned;

      // Update room state
      gameService.updateGameState(familyId, {
        playerAnswers: room.gameState.playerAnswers,
        scores: room.gameState.scores
      });

      console.log(`✅ Answer processed for ${playerInfo.playerName}: ${isCorrect ? 'CORRECT' : 'INCORRECT'} (+${pointsEarned} points)`);

      // Prepare response with fun fact if available
      const responseData = {
        success: true,
        questionNumber,
        isCorrect,
        pointsEarned,
        correctAnswer: currentQuestion.answer,
        yourAnswer: selectedAnswer,
        newTotalScore: room.gameState.scores[playerInfo.userId],
        message: isCorrect ? `Correct! You earned ${pointsEarned} points.` : `Incorrect. The correct answer was: ${currentQuestion.answer}`
      };

      // Include fun fact if available (for AI-generated questions)
      if (currentQuestion.fun_fact) {
        responseData.funFact = currentQuestion.fun_fact;
      }

      // Send confirmation to the submitting player
      socket.emit('answer-submitted', responseData);

      // Prepare updated scores for broadcast (with player names)
      const scoresWithNames = {};
      room.players.forEach(player => {
        scoresWithNames[player.userId] = {
          playerName: player.playerName,
          score: room.gameState.scores[player.userId] || 0,
          isHost: player.isHost
        };
      });

      // Broadcast updated scores to all players in the room
      gameNamespace.to(`family-${familyId}`).emit('scores-updated', {
        questionNumber,
        submittedBy: {
          userId: playerInfo.userId,
          playerName: playerInfo.playerName,
          isCorrect,
          pointsEarned
        },
        currentScores: scoresWithNames,
        totalAnswersReceived: Object.keys(room.gameState.playerAnswers).filter(key => 
          key.includes(`-q${questionNumber}`)
        ).length,
        totalPlayersInRoom: room.players.length,
        message: `${playerInfo.playerName} submitted their answer for question ${questionNumber}`
      });

      // Check if all players have answered this question
      const answersForCurrentQuestion = Object.keys(room.gameState.playerAnswers).filter(key => 
        key.includes(`-q${questionNumber}`)
      ).length;
      
      if (answersForCurrentQuestion === room.players.length) {
        // All players have answered, move to next question or end game
        const nextQuestionNumber = questionNumber + 1;
        
        if (nextQuestionNumber <= room.gameState.questions.length) {
          // Send next question
          const nextQuestion = room.gameState.questions[nextQuestionNumber - 1];
          const questionForClient = {
            id: nextQuestion.id,
            questionNumber: nextQuestionNumber,
            category: nextQuestion.category,
            question: nextQuestion.question,
            choices: nextQuestion.choices,
            difficulty: nextQuestion.difficulty,
            timeLimit: nextQuestion.time_limit || 30,
            points: nextQuestion.points || 100,
            ...(nextQuestion.hint && { hint: nextQuestion.hint }),
            ...(nextQuestion.fun_fact && { funFact: nextQuestion.fun_fact })
          };

          setTimeout(() => {
            gameNamespace.to(`family-${familyId}`).emit('question-delivered', {
              questionNumber: nextQuestionNumber,
              question: questionForClient,
              timeLimit: questionForClient.timeLimit,
              message: `Question ${nextQuestionNumber} is ready! You have ${questionForClient.timeLimit} seconds to answer.`
            });
          }, 5000); // 5 second delay before next question (increased from 3)
          
        } else {
          // Game is complete, trigger end-game processing directly
          setTimeout(async () => {
            try {
              console.log(`🏁 Auto-ending game for family ${familyId} - all questions completed`);

              // End the game and get final room data
              const finalRoomData = gameService.endGame(familyId);
              if (!finalRoomData) {
                console.error('Failed to end game session');
                return;
              }

              // Finalize game session and update leaderboard
              const finalResults = await leaderboardService.finalizeGameSession(
                familyId,
                finalRoomData.gameState,
                finalRoomData.players
              );

              // Prepare comprehensive final results for broadcast
              const gameResults = {
                sessionId: finalResults.sessionId,
                familyId,
                reason: 'all-questions-completed',
                gameStats: {
                  totalQuestions: finalResults.totalQuestions,
                  completedAt: finalResults.completedAt,
                  analytics: finalResults.gameAnalytics
                },
                playerResults: finalResults.playerStats,
                leaderboard: finalResults.familyLeaderboard,
                message: '🎉 Game completed! Here are your final results:'
              };

              // Broadcast final results to all players in the room
              gameNamespace.to(`family-${familyId}`).emit('game-ended', gameResults);

              console.log(`✅ Game auto-ended successfully for family ${familyId}`);

              // Clean up the room after a delay
              setTimeout(() => {
                gameService.cleanupRoom(familyId);
                console.log(`🧹 Game room cleaned up for family ${familyId}`);
              }, 10000); // 10 second delay for cleanup

            } catch (error) {
              console.error('❌ Error auto-ending game:', error);
              gameNamespace.to(`family-${familyId}`).emit('end-game-error', {
                error: 'Internal server error while ending game',
                details: error.message
              });
            }
          }, 3000); // 3 second delay before ending game
        }
      }

    } catch (error) {
      console.error('❌ Error processing answer submission:', error);
      socket.emit('submit-answer-error', {
        error: 'Internal server error while processing answer'
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`🚪 User disconnected from game room: ${socket.id}`);
    
    // Remove player from their game room
    const updatedRoom = gameService.leaveRoom(socket.id);
    if (updatedRoom) {
      // Notify remaining players in the room
      gameNamespace.to(`family-${updatedRoom.familyId}`).emit('player-left', {
        room: updatedRoom,
        message: 'A player has left the game'
      });
    }
  });
  
  // Basic connection acknowledgment with game stats
  const stats = gameService.getStats();
  socket.emit('connected', { 
    message: 'Connected to Family Together game server',
    socketId: socket.id,
    gameStats: stats
  });
  
  // Emit current active rooms for debugging (can be removed in production)
  socket.emit('debug-rooms', {
    activeRooms: Array.from(gameService.getActiveRooms().keys()),
    totalPlayers: stats.totalPlayers
  });

  // Add the end-game event handler
  socket.on('end-game', async (data) => {
    try {
      const playerInfo = gameService.getPlayerInfo(socket.id);
      if (!playerInfo) {
        socket.emit('end-game-error', { error: 'Player not found in any game room' });
        return;
      }

      const { familyId } = playerInfo;
      const room = gameService.getRoom(familyId);
      
      if (!room) {
        socket.emit('end-game-error', { error: 'Game room not found' });
        return;
      }

      // Only host can manually end the game (for cases like timeout or early end)
      const isHost = room.players.find(p => p.socketId === socket.id)?.isHost;
      if (!isHost && data?.reason === 'host-ended') {
        socket.emit('end-game-error', { error: 'Only the host can end the game manually' });
        return;
      }

      console.log(`🏁 Ending game for family ${familyId} - Reason: ${data?.reason || 'unknown'}`);

      // End the game and get final room data
      const finalRoomData = gameService.endGame(familyId);
      if (!finalRoomData) {
        socket.emit('end-game-error', { error: 'Failed to end game session' });
        return;
      }

      // Finalize game session and update leaderboard
      const finalResults = await leaderboardService.finalizeGameSession(
        familyId,
        finalRoomData.gameState,
        finalRoomData.players
      );

      // Prepare comprehensive final results for broadcast
      const gameResults = {
        sessionId: finalResults.sessionId,
        familyId,
        reason: data?.reason || 'completed',
        gameStats: {
          totalQuestions: finalResults.totalQuestions,
          completedAt: finalResults.completedAt,
          analytics: finalResults.gameAnalytics
        },
        playerResults: finalResults.playerStats,
        leaderboard: finalResults.familyLeaderboard,
        message: '🎉 Game completed! Here are your final results:'
      };

      // Broadcast final results to all players in the room
      gameNamespace.to(`family-${familyId}`).emit('game-ended', gameResults);

      console.log(`✅ Game ended successfully for family ${familyId}`);

      // Clean up the room after a short delay to allow clients to process results
      setTimeout(() => {
        gameService.cleanupRoom(familyId);
        console.log(`🧹 Game room cleaned up for family ${familyId}`);
      }, 10000); // 10 second delay for cleanup

    } catch (error) {
      console.error('❌ Error ending game:', error);
      socket.emit('end-game-error', {
        error: 'Internal server error while ending game',
        details: error.message
      });
    }
  });

  // Add timeout handler for games that take too long
  socket.on('force-end-game', async (data) => {
    try {
      const playerInfo = gameService.getPlayerInfo(socket.id);
      if (!playerInfo) {
        socket.emit('end-game-error', { error: 'Player not found in any game room' });
        return;
      }

      const { familyId } = playerInfo;
      const room = gameService.getRoom(familyId);
      
      if (!room) {
        socket.emit('end-game-error', { error: 'Game room not found' });
        return;
      }

      // Only host can force end the game
      const isHost = room.players.find(p => p.socketId === socket.id)?.isHost;
      if (!isHost) {
        socket.emit('end-game-error', { error: 'Only the host can force end the game' });
        return;
      }

      console.log(`⏰ Force ending game for family ${familyId} by host`);

      // Trigger end-game event with force-end reason
      socket.emit('end-game', { reason: 'force-ended-by-host' });

    } catch (error) {
      console.error('❌ Error force ending game:', error);
      socket.emit('end-game-error', {
        error: 'Internal server error while force ending game'
      });
    }
  });
});

// Make io instance available to routes for real-time features
app.set('io', io);
app.set('gameNamespace', gameNamespace);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Handle listen errors (e.g. firewall or permission issues)
server.on('error', (err) => {
  console.error(`Failed to start server on port ${PORT}:`, err.message);
  process.exit(1);
});
// Start HTTP + WebSocket server on all network interfaces
server.listen(PORT, () => {
  console.log(`🚀 Family Together API running on port ${PORT}`);
  console.log(`🎮 WebSocket server listening on /game namespace`);
});