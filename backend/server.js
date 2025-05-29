const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http'); // Added for socket.io integration
const { Server } = require('socket.io'); // Import socket.io server
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const familiesRoutes = require('./routes/families');
const triviaRoutes = require('./routes/trivia');

// Import game service for WebSocket management
const gameService = require('./services/gameService');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Update to use server instead of app for listening
server.listen(PORT, () => {
  console.log(`🚀 Family Together API running on port ${PORT}`);
  console.log(`🎮 WebSocket server listening on /game namespace`);
}); 