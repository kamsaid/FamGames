// Game room context for managing real-time trivia game state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';
import getApiUrl from '../utils/getApiUrl';
import { supabase } from '../services/supabase';
import { showToast } from '../components/ToastNotification';

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
  gameMetadata: {
    generationSource?: string;
    topics?: string[];
    difficulty?: string;
    ageGroup?: string;
    aiGenerated?: boolean;
  } | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  startGame: (options?: {
    topics?: string[];
    difficulty?: string;
    ageGroup?: string;
  }) => void;
  submitAnswer: (answer: string) => void;

  lastResult: {
    questionNumber: number;
    isCorrect: boolean;
    correctAnswer: string;
  } | null;
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
  const [lastResult, setLastResult] = useState<{
    questionNumber: number;
    isCorrect: boolean;
    correctAnswer: string;
  } | null>(null);
  // Keep a local list of questions for dev-bypass (solo play)
  const [localQuestions, setLocalQuestions] = useState<GameQuestion[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [connecting, setConnecting] = useState(false);
  const [gameMetadata, setGameMetadata] = useState<{
    generationSource?: string;
    topics?: string[];
    difficulty?: string;
    ageGroup?: string;
    aiGenerated?: boolean;
  } | null>(null);

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
        
        // Store game metadata
        if (data.metadata) {
          setGameMetadata(data.metadata);
          console.log('Game metadata:', data.metadata);
          
          // Show toast notification about question source
          if (data.metadata.aiGenerated) {
            showToast.success('AI-Powered Questions!', `Generated using: ${data.metadata.topics?.join(', ') || 'mixed topics'}`);
          } else if (data.metadata.generationSource === 'database') {
            showToast.info('Classic Questions', 'Playing with curated trivia questions');
          }
        }
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
        const question = data.question;
        
        // Enhanced validation and logging
        if (!question) {
          console.error('ERROR: No question object in delivered data:', data);
          return;
        }
        
        if (!question.question) {
          console.error('ERROR: Question object missing question text:', question);
          console.log('Full question object:', JSON.stringify(question, null, 2));
        }
        
        if (!question.choices || !Array.isArray(question.choices) || question.choices.length === 0) {
          console.error('ERROR: Invalid choices in question:', question.choices);
        }
        
        // Set the question even if some fields are missing, to help debug
        setCurrentQuestion(question);
        setQuestionIndex(index);
        setTimeRemaining(data.timeLimit || question.timeLimit || 30);
        setQuestionStartTime(Date.now());

        // Reset answered flag for all players on new question
        setPlayers(prev => prev.map(player => ({ ...player, hasAnswered: false })));
        
        console.log(`[GameRoom] Question ${index + 1} set:`, {
          questionText: question.question || 'MISSING',
          category: question.category || 'MISSING',
          choices: question.choices || [],
          difficulty: question.difficulty || 'MISSING'
        });
      });

      // Confirmation sent back to the submitting player only
      newSocket.on('answer-submitted', (data) => {
        console.log('Answer submitted (self-confirmation):', data);
        // Update local score if provided
        if (typeof data.newTotalScore === 'number') {
          setUserScore(data.newTotalScore);
        }

        // Store result for current question
        setLastResult({
          questionNumber: data.questionNumber,
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
        });

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
  const startGame = async (options?: {
    topics?: string[];
    difficulty?: string;
    ageGroup?: string;
  }) => {
    // In dev mode, we still want to use the socket connection to get AI-generated questions
    // The only difference is we allow single-player games
    
    if (socket && currentFamily) {
      // Send game options to backend for AI generation
      const gameOptions = {
        familyId: currentFamily.id,
        topics: options?.topics || [],
        difficulty: options?.difficulty || 'mixed',
        ageGroup: options?.ageGroup || 'mixed'
      };
      
      console.log('Starting game with options:', gameOptions);
      socket.emit('start-game', gameOptions);
    } else {
      console.error('[startGame] Cannot start game: socket not connected or no family selected');
      console.log('Socket connected:', socket?.connected, 'Current family:', currentFamily?.id);
      
      // Only show error in non-dev mode
      if (!isDevBypass) {
        showToast.error('Connection Error', 'Please ensure you are connected to the game server');
      }
    }
  };

  // Submit answer (handles both multiplayer and solo dev-bypass modes)
  const submitAnswer = (answer: string) => {
    // Always use socket connection for answer submission
    if (socket && currentQuestion && gameActive && currentFamily) {
      const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000);
      
      console.log('[submitAnswer] Submitting answer:', {
        answer,
        questionNumber: questionIndex + 1,
        timeTaken
      });
      
      socket.emit('submit-answer', {
        familyId: currentFamily.id,
        questionNumber: questionIndex + 1,
        selectedAnswer: answer,
        timeTaken: timeTaken,
      });
    } else {
      console.error('[submitAnswer] Cannot submit answer:', {
        socketConnected: socket?.connected,
        hasQuestion: !!currentQuestion,
        gameActive,
        hasFamily: !!currentFamily
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
    gameMetadata,
    joinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    lastResult,
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