// Game room context for managing real-time trivia game state
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useFamily } from './FamilyContext';

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
  const [connecting, setConnecting] = useState(false);

  const { user } = useAuth();
  const { currentFamily } = useFamily();

  // Join game room
  const joinRoom = async () => {
    if (!user || !currentFamily || socket?.connected) return;

    try {
      setConnecting(true);
      
      // Create socket connection
      const newSocket = io('http://localhost:3000', {
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

      // Join the family room
      newSocket.emit('join-room', { familyId: currentFamily.id });

      // Listen for room events
      newSocket.on('room-joined', (data) => {
        console.log('Joined room:', data);
        setPlayers(data.players || []);
      });

      newSocket.on('player-joined', (data) => {
        console.log('Player joined:', data);
        setPlayers(data.players || []);
      });

      newSocket.on('player-left', (data) => {
        console.log('Player left:', data);
        setPlayers(data.players || []);
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

      newSocket.on('question', (data) => {
        console.log('New question:', data);
        setCurrentQuestion(data.question);
        setQuestionIndex(data.questionIndex);
        setTimeRemaining(30); // Reset timer for new question
        
        // Reset player answered status
        setPlayers(prev => prev.map(player => ({ ...player, hasAnswered: false })));
      });

      newSocket.on('answer-received', (data) => {
        console.log('Answer received:', data);
        // Update player answered status
        setPlayers(prev => prev.map(player => 
          player.id === data.playerId 
            ? { ...player, hasAnswered: true, score: data.newScore || player.score }
            : player
        ));

        // Update user's own score if it's their answer
        if (data.playerId === user.id) {
          setUserScore(data.newScore || 0);
        }
      });

      newSocket.on('scores-updated', (data) => {
        console.log('Scores updated:', data);
        setPlayers(data.players || []);
      });

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

  // Start game (host only)
  const startGame = () => {
    if (socket && currentFamily) {
      socket.emit('start-game', { familyId: currentFamily.id });
    }
  };

  // Submit answer
  const submitAnswer = (answer: string) => {
    if (socket && currentQuestion && gameActive) {
      socket.emit('submit-answer', {
        questionId: currentQuestion.id,
        answer,
        userId: user?.id,
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