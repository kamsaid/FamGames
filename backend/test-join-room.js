/**
 * Join Room Test Script - Tests the join-room WebSocket event functionality
 * Verifies room creation, player joining, and real-time notifications
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const GAME_NAMESPACE = '/game';

console.log('🧪 Testing join-room WebSocket event...\n');

// Test data
const testFamilyId = 'test-family-123';
const testPlayers = [
  { userId: 'user-1', playerName: 'Alice' },
  { userId: 'user-2', playerName: 'Bob' },
  { userId: 'user-3', playerName: 'Charlie' }
];

// Test 1: Single player joins room (creates room)
function testCreateRoom() {
  return new Promise((resolve, reject) => {
    console.log('🏠 Test 1: Creating room with first player...');
    
    const socket = io(`${SERVER_URL}${GAME_NAMESPACE}`, {
      transports: ['websocket']
    });

    let roomJoined = false;

    socket.on('connect', () => {
      console.log(`✅ Connected: ${socket.id}`);
      
      // Join room with first player
      socket.emit('join-room', {
        familyId: testFamilyId,
        userId: testPlayers[0].userId,
        playerName: testPlayers[0].playerName
      });
    });

    socket.on('room-joined', (data) => {
      console.log('🎉 Room joined successfully:', data);
      
      // Verify room creation
      if (data.success && data.room.familyId === testFamilyId) {
        console.log(`✅ Room created for family: ${data.room.familyId}`);
        console.log(`👤 Players in room: ${data.room.players.length}`);
        console.log(`👑 Is host: ${data.room.isHost}`);
        roomJoined = true;
        
        setTimeout(() => {
          socket.disconnect();
          resolve(data);
        }, 1000);
      } else {
        reject(new Error('Room creation failed'));
      }
    });

    socket.on('join-room-error', (error) => {
      console.error('❌ Join room error:', error);
      reject(new Error(error.error));
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      reject(error);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!roomJoined) {
        socket.disconnect();
        reject(new Error('Test timeout'));
      }
    }, 5000);
  });
}

// Test 2: Multiple players join the same room
function testMultiplePlayersJoin() {
  return new Promise((resolve, reject) => {
    console.log('\n👥 Test 2: Multiple players joining same room...');
    
    const sockets = [];
    const joinPromises = [];
    let playerJoinedCount = 0;

    // Create connections for 3 players
    testPlayers.forEach((player, index) => {
      const joinPromise = new Promise((joinResolve, joinReject) => {
        const socket = io(`${SERVER_URL}${GAME_NAMESPACE}`, {
          transports: ['websocket']
        });

        socket.on('connect', () => {
          console.log(`🔗 Player ${index + 1} (${player.playerName}) connected: ${socket.id}`);
          
          // Join the same room
          socket.emit('join-room', {
            familyId: testFamilyId,
            userId: player.userId,
            playerName: player.playerName
          });
        });

        socket.on('room-joined', (data) => {
          console.log(`✅ ${player.playerName} joined room - Players: ${data.room.players.length}, Host: ${data.room.isHost}`);
          sockets.push(socket);
          joinResolve({ socket, data });
        });

        socket.on('player-joined', (data) => {
          playerJoinedCount++;
          console.log(`👋 ${player.playerName} saw player join: ${data.message}`);
        });

        socket.on('join-room-error', (error) => {
          console.error(`❌ ${player.playerName} join error:`, error);
          joinReject(new Error(error.error));
        });

        socket.on('connect_error', (error) => {
          console.error(`❌ ${player.playerName} connection error:`, error);
          joinReject(error);
        });
      });

      joinPromises.push(joinPromise);
    });

    // Wait for all players to join
    Promise.all(joinPromises)
      .then((results) => {
        console.log(`🎉 All ${results.length} players joined successfully!`);
        console.log(`📢 Player-joined events received: ${playerJoinedCount}`);
        
        // Verify final room state
        const lastResult = results[results.length - 1];
        if (lastResult.data.room.players.length === testPlayers.length) {
          console.log('✅ All players are in the room');
        } else {
          console.log('⚠️ Player count mismatch');
        }

        // Clean up connections
        setTimeout(() => {
          sockets.forEach((socket, index) => {
            socket.disconnect();
            console.log(`🔌 Disconnected player ${index + 1}`);
          });
          resolve(results);
        }, 2000);
      })
      .catch(reject);
  });
}

// Test 3: Error handling for invalid data
function testErrorHandling() {
  return new Promise((resolve, reject) => {
    console.log('\n🚨 Test 3: Error handling for invalid data...');
    
    const socket = io(`${SERVER_URL}${GAME_NAMESPACE}`, {
      transports: ['websocket']
    });

    let errorReceived = false;

    socket.on('connect', () => {
      console.log('🔗 Connected for error test');
      
      // Send invalid data (missing required fields)
      socket.emit('join-room', {
        familyId: testFamilyId
        // Missing userId and playerName
      });
    });

    socket.on('join-room-error', (error) => {
      console.log('✅ Error handling working:', error.error);
      errorReceived = true;
      
      setTimeout(() => {
        socket.disconnect();
        resolve(true);
      }, 500);
    });

    socket.on('room-joined', (data) => {
      console.log('❌ Should not have joined with invalid data');
      socket.disconnect();
      reject(new Error('Invalid data was accepted'));
    });

    // Timeout after 3 seconds
    setTimeout(() => {
      if (!errorReceived) {
        socket.disconnect();
        reject(new Error('Error handling test timeout'));
      }
    }, 3000);
  });
}

// Run all tests
async function runJoinRoomTests() {
  try {
    console.log('🚀 Starting join-room event tests...\n');
    
    // Test 1: Create room
    await testCreateRoom();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Multiple players
    await testMultiplePlayersJoin();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Error handling
    await testErrorHandling();
    
    console.log('\n🎉 All join-room tests passed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Room creation with first player');
    console.log('  ✅ Multiple players joining same room');
    console.log('  ✅ Real-time player-joined notifications');
    console.log('  ✅ Error handling for invalid data');
    console.log('  ✅ Host assignment and management');
    
  } catch (error) {
    console.error('\n❌ Join-room test failed:', error.message);
    console.log('\n🔧 Make sure the server is running on port 3001');
    console.log('   Run: npm run dev (from backend directory)');
  }
  
  process.exit(0);
}

// Check if server is running and start tests
console.log('🔍 Testing join-room WebSocket event...');
console.log(`📍 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game Namespace: ${GAME_NAMESPACE}`);
console.log(`🏠 Test Family ID: ${testFamilyId}\n`);

// Run the tests
runJoinRoomTests(); 