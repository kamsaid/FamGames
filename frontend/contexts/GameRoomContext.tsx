// Game room context for managing real-time trivia game state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import getApiUrl from '../utils/getApiUrl';
import { supabase } from '../services/supabase';

// Game room context interface
interface GamePlayer {
  id: string;
  email: string;
  score: number;
  hasAnswered: boolean;
}

interface GameQuestion {
  id: string;
  question: string;
  choices: string[];
  answer: string;
  category: string;
  difficulty: string;
}

interface GameRoomContextType {
  socket: Socket | null;
  gameActive: boolean;
  currentQuestion: GameQuestion | null;
  players: GamePlayer[];
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  finalScores: Record<string, number> | null;
  userScore: number;
  connecting: boolean;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  startGame: () => void;
  submitAnswer: (answer: string) => void;
}

// Create game room context
const GameRoomContext = createContext<GameRoomContextType | undefined>(undefined);

// Game room provider component
export const GameRoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameActive, setGameActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [finalScores, setFinalScores] = useState<Record<string, number> | null>(null);
  const [userScore, setUserScore] = useState(0);
  // Keep a local list of questions for dev-bypass (solo play)
  const [localQuestions, setLocalQuestions] = useState<GameQuestion[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [connecting, setConnecting] = useState(false);

  // Handle client-side countdown each second based on timeRemaining
  useEffect(() => {
    if (!gameActive || !currentQuestion) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive, currentQuestion]);

  const { user, isDevBypass } = useAuth();
  const { currentFamily } = useFamily();

  // Join game room
  const joinRoom = async () => {
    if (!user || !currentFamily || socket?.connected) return;

    try {
      setConnecting(true);
      
      // Create socket connection to the /game namespace
      const apiUrl = getApiUrl();
      const newSocket = io(`${apiUrl}/game`, {
        query: {
          userId: user.id,
          familyId: currentFamily.id,
        },
      });

      // Set up socket event listeners
      newSocket.on('connect', () => {
        console.log('Connected to game server');
        setConnecting(false);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from game server');
        setConnecting(false);
      });

      // Join the family room with required payload expected by server
      newSocket.emit('join-room', {
        familyId: currentFamily.id,
        userId: user.id,
        playerName: user.email?.split('@')[0] || user.email || 'Player',
      });

      // Listen for room events
      const mapServerPlayers = (serverPlayers: any[]): GamePlayer[] =>
        serverPlayers.map(p => ({
          id: p.userId || p.id || p.user_id || p.uid,
          email: p.playerName ? `${p.playerName}@app` : p.email || 'player@app',
          score: p.score || 0,
          hasAnswered: p.hasAnswered || false,
        }));

      newSocket.on('room-joined', (data) => {
        console.log('Joined room:', data);
        if (data.players) {
          setPlayers(mapServerPlayers(data.players));
        }
      });

      newSocket.on('player-joined', (data) => {
        console.log('Player joined:', data);
        if (data.room?.players) {
          setPlayers(mapServerPlayers(data.room.players));
        }
      });

      newSocket.on('player-left', (data) => {
        console.log('Player left:', data);
        if (data.players) {
          setPlayers(mapServerPlayers(data.players));
        }
      });

      // Listen for game events
      newSocket.on('game-started', (data) => {
        console.log('Game started:', data);
        setGameActive(true);
        setQuestionIndex(0);
        setTotalQuestions(data.totalQuestions || 5);
        setFinalScores(null);
        setUserScore(0);
      });

      /**
       * The backend emits a `question-delivered` event containing:
       * {
       *   questionNumber: number,
       *   question: { ... },
       *   timeLimit: number
       * }
       * Align the client listener with this event name.
       */
      newSocket.on('question-delivered', (data) => {
        console.log('Question delivered:', data);

        const index = data.questionNumber ? data.questionNumber - 1 : 0;
        setCurrentQuestion(data.question);
        setQuestionIndex(index);
        setTimeRemaining(data.timeLimit || 30);
        setQuestionStartTime(Date.now());

        // Reset answered flag for all players on new question
        setPlayers(prev => prev.map(player => ({ ...player, hasAnswered: false })));
      });

      // Confirmation sent back to the submitting player only
      newSocket.on('answer-submitted', (data) => {
        console.log('Answer submitted (self-confirmation):', data);
        // Update local score if provided
        if (typeof data.newTotalScore === 'number') {
          setUserScore(data.newTotalScore);
        }

        setPlayers(prev => prev.map(player => {
          if (player.id === (user?.id || '')) {
            return {
              ...player,
              hasAnswered: true,
              score: typeof data.newTotalScore === 'number' ? data.newTotalScore : player.score,
            };
          }
          return player;
        }));
      });

      // Scores (and answered status) broadcast to everyone in the room
      newSocket.on('scores-updated', (data) => {
        console.log('Scores updated:', data);

        if (data.currentScores) {
          setPlayers(prev => {
            const updated: GamePlayer[] = [...prev];

            // Update existing players
            for (const key in data.currentScores) {
              const existingIndex = updated.findIndex(p => p.id === key || p.id === data.currentScores[key]?.userId);
              const scoreInfo = data.currentScores[key];
              if (!scoreInfo) continue;

              if (existingIndex >= 0) {
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  score: scoreInfo.score,
                  hasAnswered: true,
                };
              } else {
                // New player that wasn't previously in list
                updated.push({
                  id: key,
                  email: `${scoreInfo.playerName || 'Player'}@local`,
                  score: scoreInfo.score,
                  hasAnswered: true,
                });
              }
            }
            return updated;
          });
        }
      });

      // (Legacy listener removed: handled above)

      newSocket.on('game-ended', (data) => {
        console.log('Game ended:', data);
        setGameActive(false);
        setCurrentQuestion(null);
        setFinalScores(data.finalScores || {});
        setPlayers(data.players || []);
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Error joining room:', error);
      setConnecting(false);
    }
  };

  // Leave game room
  const leaveRoom = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    // Reset game state
    setGameActive(false);
    setCurrentQuestion(null);
    setPlayers([]);
    setQuestionIndex(0);
    setTimeRemaining(30);
    setFinalScores(null);
    setUserScore(0);
  };

  // Start game (host only; support solo-play in dev bypass)
  const startGame = async () => {
    if (isDevBypass) {
      console.log('[dev] startGame: triggering local game start');
      setGameActive(true);
      
      // Simulate having a player in dev mode
      const mockPlayer: GamePlayer = {
        id: user?.id || 'dev-user',
        email: user?.email || 'dev@example.com',
        score: 0,
        hasAnswered: false,
      };
      setPlayers([mockPlayer]);
      
      // Fetch a question for solo dev testing
      try {
        const { data: questions, error } = await supabase
          .from('questions')
          .select('*')
          .eq('is_active', true)
          .limit(5); // Get 5 questions for a full game
          
        if (!error && questions && questions.length > 0) {
          // Normalise questions from database into GameQuestion[]
          const normalized = questions.map((q: any) => ({
            id: q.id,
            question: q.question,
            choices: [q.choice_a, q.choice_b, q.choice_c, q.choice_d],
            answer: q.correct_answer,
            category: q.category || 'General',
            difficulty: q.difficulty || 'Medium',
          }));

          // Persist locally for solo play progression
          setLocalQuestions(normalized);

          // Set first question
          setCurrentQuestion(normalized[0]);
          setQuestionIndex(0);
          setTotalQuestions(normalized.length);
          setTimeRemaining(30);
          setQuestionStartTime(Date.now());

          console.log('[dev] Game started with', normalized.length, 'questions');
        } else {
          // If no questions in database, create mock questions
          console.log('[dev] No questions found, using mock questions');
          const mockQuestions: GameQuestion[] = [
            {
              id: '1',
              question: 'What is the capital of France?',
              choices: ['London', 'Berlin', 'Paris', 'Madrid'],
              answer: 'Paris',
              category: 'Geography',
              difficulty: 'Easy',
            },
            {
              id: '2',
              question: 'What planet is known as the Red Planet?',
              choices: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
              answer: 'Mars',
              category: 'Science',
              difficulty: 'Easy',
            },
            {
              id: '3',
              question: 'Who wrote "Romeo and Juliet"?',
              choices: ['Mark Twain', 'William Shakespeare', 'Charles Dickens', 'Jane Austen'],
              answer: 'William Shakespeare',
              category: 'Literature',
              difficulty: 'Medium',
            },
          ];

          setLocalQuestions(mockQuestions);
          setCurrentQuestion(mockQuestions[0]);
          setQuestionIndex(0);
          setTotalQuestions(mockQuestions.length);
          setTimeRemaining(30);
          setQuestionStartTime(Date.now());
        }
      } catch (err) {
        console.error('[dev] startGame fetch question error:', err);
        
        // Fallback to mock question on error
        const mockQuestions: GameQuestion[] = [
          {
            id: '1',
            question: 'Test Question: What is 2 + 2?',
            choices: ['3', '4', '5', '6'],
            answer: '4',
            category: 'Math',
            difficulty: 'Easy',
          },
        ];

        setLocalQuestions(mockQuestions);
        setCurrentQuestion(mockQuestions[0]);
        setQuestionIndex(0);
        setTotalQuestions(mockQuestions.length);
        setTimeRemaining(30);
        setQuestionStartTime(Date.now());
      }
      return;
    }
    
    if (socket && currentFamily) {
      socket.emit('start-game', { familyId: currentFamily.id });
    }
  };

  // Submit answer (handles both multiplayer and solo dev-bypass modes)
  const submitAnswer = (answer: string) => {
    // Solo play (dev bypass)
    if (isDevBypass) {
      if (!currentQuestion || !gameActive) return;

      const isCorrect = answer === currentQuestion.answer;
      const pointsEarned = isCorrect ? 100 : 0; // Simple fixed scoring for dev mode

      // Update score locally
      setUserScore(prev => prev + pointsEarned);

      // Mark player answered and update score in players list
      setPlayers(prev => prev.map(player => {
        if (player.id === (user?.id || 'dev-user')) {
          return { ...player, hasAnswered: true, score: player.score + pointsEarned };
        }
        return player;
      }));

      // After short delay, proceed to next question or end game
      setTimeout(() => {
        const nextIndex = questionIndex + 1;

        if (nextIndex < localQuestions.length) {
          setCurrentQuestion(localQuestions[nextIndex]);
          setQuestionIndex(nextIndex);
          setTimeRemaining(30);
          // Reset answered flags
          setPlayers(prev => prev.map(p => ({ ...p, hasAnswered: false })));
        } else {
          // End game locally
          setPlayers(prevPlayers => {
            const final: Record<string, number> = {};
            prevPlayers.forEach(p => {
              final[p.id] = p.score;
            });
            setFinalScores(final);
            setGameActive(false);
            return prevPlayers;
          });
        }
      }, 1500); // 1.5s delay to let user see result

      return;
    }

    // Multiplayer flow
    if (socket && currentQuestion && gameActive) {
      socket.emit('submit-answer', {
        familyId: currentFamily?.id,
        questionNumber: questionIndex + 1,
        selectedAnswer: answer,
        timeTaken: Math.floor((Date.now() - questionStartTime) / 1000),
      });
    }
  };

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Context value
  const value = {
    socket,
    gameActive,
    currentQuestion,
    players,
    questionIndex,
    totalQuestions,
    timeRemaining,
    finalScores,
    userScore,
    connecting,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
  };

  return <GameRoomContext.Provider value={value}>{children}</GameRoomContext.Provider>;
};

// Custom hook to use game room context
export const useGameRoom = () => {
  const context = useContext(GameRoomContext);
  if (context === undefined) {
    throw new Error('useGameRoom must be used within a GameRoomProvider');
  }
  return context;
}; 