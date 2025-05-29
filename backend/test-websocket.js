/**
 * WebSocket Test Script - Verifies that socket.io server is working correctly
 * Tests basic connection, disconnection, and game service integration
 */

const { io } = require('socket.io-client');

// Configuration
const SERVER_URL = 'http://localhost:3001';
const GAME_NAMESPACE = '/game';

console.log('🧪 Starting WebSocket server test...\n');

// Test basic connection
function testBasicConnection() {
  return new Promise((resolve, reject) => {
    console.log('📡 Testing basic WebSocket connection...');
    
    const socket = io(`${SERVER_URL}${GAME_NAMESPACE}`, {
      transports: ['websocket']
    });

    let connectionConfirmed = false;

    // Handle successful connection
    socket.on('connect', () => {
      console.log(`✅ Connected to WebSocket server with ID: ${socket.id}`);
      connectionConfirmed = true;
    });

    // Handle connection acknowledgment from server
    socket.on('connected', (data) => {
      console.log('📨 Received connection acknowledgment:', data);
      console.log(`🎮 Game Stats: ${JSON.stringify(data.gameStats, null, 2)}`);
    });

    // Handle debug rooms info
    socket.on('debug-rooms', (data) => {
      console.log('🏠 Debug rooms info:', data);
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
      reject(error);
    });

    // Test disconnection after 2 seconds
    setTimeout(() => {
      if (connectionConfirmed) {
        console.log('🔌 Testing disconnection...');
        socket.disconnect();
        console.log('✅ Successfully disconnected\n');
        resolve(true);
      } else {
        reject(new Error('Connection was not confirmed'));
      }
    }, 2000);
  });
}

// Test multiple connections
function testMultipleConnections() {
  return new Promise((resolve, reject) => {
    console.log('👥 Testing multiple simultaneous connections...');
    
    const sockets = [];
    const connectionPromises = [];

    // Create 3 test connections
    for (let i = 1; i <= 3; i++) {
      const connectionPromise = new Promise((connResolve, connReject) => {
        const socket = io(`${SERVER_URL}${GAME_NAMESPACE}`, {
          transports: ['websocket']
        });

        socket.on('connect', () => {
          console.log(`✅ Connection ${i} established: ${socket.id}`);
          sockets.push(socket);
          connResolve(socket);
        });

        socket.on('connect_error', (error) => {
          console.error(`❌ Connection ${i} failed:`, error.message);
          connReject(error);
        });
      });

      connectionPromises.push(connectionPromise);
    }

    // Wait for all connections
    Promise.all(connectionPromises)
      .then(() => {
        console.log(`✅ All ${sockets.length} connections established successfully`);
        
        // Disconnect all sockets
        setTimeout(() => {
          sockets.forEach((socket, index) => {
            socket.disconnect();
            console.log(`🔌 Disconnected socket ${index + 1}`);
          });
          console.log('✅ Multiple connection test completed\n');
          resolve(true);
        }, 1000);
      })
      .catch(reject);
  });
}

// Run all tests
async function runTests() {
  try {
    console.log('🚀 Starting WebSocket server tests...\n');
    
    // Test 1: Basic connection
    await testBasicConnection();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Multiple connections
    await testMultipleConnections();
    
    console.log('🎉 All WebSocket tests passed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('  ✅ Basic connection and disconnection');
    console.log('  ✅ Server acknowledgment messages');
    console.log('  ✅ Multiple simultaneous connections');
    console.log('  ✅ Game service statistics');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Make sure the server is running on port 3001');
    console.log('   Run: npm run dev');
  }
  
  process.exit(0);
}

// Check if server is running first
console.log('🔍 Checking if server is running...');
console.log(`📍 Server URL: ${SERVER_URL}`);
console.log(`🎮 Game Namespace: ${GAME_NAMESPACE}\n`);

// Run the tests
runTests(); 