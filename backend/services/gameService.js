/**
 * Game Service - Manages WebSocket game rooms and real-time trivia sessions
 * Handles game state, player connections, and room management
 */

class GameService {
  constructor() {
    // Store active game rooms: { familyId: { players: [], gameState: {}, host: socketId } }
    this.activeRooms = new Map();
    
    // Store socket to family mapping: { socketId: { familyId, userId, playerName } }
    this.socketToFamily = new Map();
  }

  /**
   * Get all active game rooms
   * @returns {Map} Active rooms map
   */
  getActiveRooms() {
    return this.activeRooms;
  }

  /**
   * Get room information by family ID
   * @param {string} familyId - The family identifier
   * @returns {Object|null} Room data or null if not found
   */
  getRoom(familyId) {
    return this.activeRooms.get(familyId) || null;
  }

  /**
   * Create a new game room for a family
   * @param {string} familyId - The family identifier
   * @param {string} socketId - The host's socket ID
   * @param {Object} hostInfo - Host player information
   * @returns {Object} Created room data
   */
  createRoom(familyId, socketId, hostInfo) {
    const roomData = {
      familyId,
      host: socketId,
      players: [
        {
          socketId,
          userId: hostInfo.userId,
          playerName: hostInfo.playerName,
          isHost: true,
          joinedAt: new Date()
        }
      ],
      gameState: {
        status: 'waiting', // waiting, playing, finished
        currentQuestion: null,
        questionIndex: 0,
        scores: {},
        startedAt: null
      },
      createdAt: new Date()
    };

    this.activeRooms.set(familyId, roomData);
    this.socketToFamily.set(socketId, { familyId, userId: hostInfo.userId, playerName: hostInfo.playerName });

    console.log(`🎮 Created game room for family: ${familyId} with host: ${hostInfo.playerName}`);
    return roomData;
  }

  /**
   * Add a player to an existing game room
   * @param {string} familyId - The family identifier
   * @param {string} socketId - The player's socket ID
   * @param {Object} playerInfo - Player information
   * @returns {Object|null} Updated room data or null if room doesn't exist
   */
  joinRoom(familyId, socketId, playerInfo) {
    const room = this.activeRooms.get(familyId);
    if (!room) {
      return null;
    }

    // Check if player is already in the room
    const existingPlayer = room.players.find(p => p.userId === playerInfo.userId);
    if (existingPlayer) {
      // Update socket ID for reconnection
      existingPlayer.socketId = socketId;
    } else {
      // Add new player
      room.players.push({
        socketId,
        userId: playerInfo.userId,
        playerName: playerInfo.playerName,
        isHost: false,
        joinedAt: new Date()
      });
    }

    this.socketToFamily.set(socketId, { familyId, userId: playerInfo.userId, playerName: playerInfo.playerName });

    console.log(`👥 Player ${playerInfo.playerName} joined room for family: ${familyId}`);
    return room;
  }

  /**
   * Remove a player from game room
   * @param {string} socketId - The socket ID to remove
   * @returns {Object|null} Updated room data or null if not found
   */
  leaveRoom(socketId) {
    const playerData = this.socketToFamily.get(socketId);
    if (!playerData) {
      return null;
    }

    const { familyId } = playerData;
    const room = this.activeRooms.get(familyId);
    if (!room) {
      return null;
    }

    // Remove player from room
    room.players = room.players.filter(p => p.socketId !== socketId);
    this.socketToFamily.delete(socketId);

    // If no players left, remove the room
    if (room.players.length === 0) {
      this.activeRooms.delete(familyId);
      console.log(`🗑️ Removed empty game room for family: ${familyId}`);
      return null;
    }

    // If host left, assign new host
    if (room.host === socketId && room.players.length > 0) {
      room.host = room.players[0].socketId;
      room.players[0].isHost = true;
      console.log(`👑 New host assigned for family ${familyId}: ${room.players[0].playerName}`);
    }

    console.log(`👋 Player left room for family: ${familyId}`);
    return room;
  }

  /**
   * Get player info by socket ID
   * @param {string} socketId - The socket ID
   * @returns {Object|null} Player data or null if not found
   */
  getPlayerInfo(socketId) {
    return this.socketToFamily.get(socketId) || null;
  }

  /**
   * Update game state for a room
   * @param {string} familyId - The family identifier
   * @param {Object} gameStateUpdate - Updates to apply to game state
   * @returns {Object|null} Updated room data or null if not found
   */
  updateGameState(familyId, gameStateUpdate) {
    const room = this.activeRooms.get(familyId);
    if (!room) {
      return null;
    }

    room.gameState = { ...room.gameState, ...gameStateUpdate };
    return room;
  }

  /**
   * End a game session and mark room as finished
   * @param {string} familyId - The family identifier
   * @returns {Object|null} Final room data with game state or null if not found
   */
  endGame(familyId) {
    const room = this.activeRooms.get(familyId);
    if (!room) {
      console.log(`❌ Cannot end game: Room not found for family ${familyId}`);
      return null;
    }

    // Mark game as finished
    room.gameState.status = 'finished';
    room.gameState.finishedAt = new Date().toISOString();

    console.log(`🏁 Game ended for family: ${familyId}`);
    
    // Return final room data for processing
    return {
      familyId: room.familyId,
      players: room.players,
      gameState: room.gameState,
      createdAt: room.createdAt,
      finishedAt: room.gameState.finishedAt
    };
  }

  /**
   * Clean up a finished game room (remove after final processing)
   * @param {string} familyId - The family identifier
   * @returns {boolean} True if room was removed, false if not found
   */
  cleanupRoom(familyId) {
    const wasRemoved = this.activeRooms.delete(familyId);
    
    // Also remove socket mappings for this family
    for (const [socketId, playerData] of this.socketToFamily.entries()) {
      if (playerData.familyId === familyId) {
        this.socketToFamily.delete(socketId);
      }
    }

    if (wasRemoved) {
      console.log(`🧹 Cleaned up game room for family: ${familyId}`);
    }
    
    return wasRemoved;
  }

  /**
   * Get statistics about active rooms
   * @returns {Object} Statistics object
   */
  getStats() {
    const totalRooms = this.activeRooms.size;
    const totalPlayers = Array.from(this.activeRooms.values())
      .reduce((sum, room) => sum + room.players.length, 0);
    
    return {
      totalRooms,
      totalPlayers,
      averagePlayersPerRoom: totalRooms > 0 ? (totalPlayers / totalRooms).toFixed(1) : 0
    };
  }
}

// Export singleton instance
module.exports = new GameService(); 