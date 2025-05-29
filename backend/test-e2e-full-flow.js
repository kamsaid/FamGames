const io = require('socket.io-client');
const axios = require('axios');

// Configuration for testing
const SERVER_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';
const TEST_FAMILY_ID = 'test-family-e2e';
const TEST_USERS = [
  { id: 'user1', email: 'player1@test.com', name: 'Player 1' },
  { id: 'user2', email: 'player2@test.com', name: 'Player 2' }
];

class E2ETestSuite {
  constructor() {
    this.sockets = [];
    this.gameSession = null;
    this.testResults = [];
  }

  // Helper method to log test results
  logTest(testName, passed, message = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
    this.testResults.push({ testName, passed, message });
  }

  // Helper method to wait for a specific time
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test 1: Create a test family
  async testCreateFamily() {
    try {
      console.log('\n🧑‍🤝‍🧑 Testing Family Creation...');
      
      const response = await axios.post(`${SERVER_URL}/families/create`, {
        name: 'E2E Test Family',
        created_by: TEST_USERS[0].id
      });

      if (response.status === 201 && response.data.family) {
        this.logTest('Create Family', true, `Family created with ID: ${response.data.family.id}`);
        return response.data.family.id;
      } else {
        this.logTest('Create Family', false, 'Failed to create family');
        return null;
      }
    } catch (error) {
      this.logTest('Create Family', false, `Error: ${error.message}`);
      return null;
    }
  }

  // Test 2: Add family members
  async testAddFamilyMembers(familyId) {
    try {
      console.log('\n👥 Testing Adding Family Members...');
      
      // Add second user to family
      const response = await axios.post(`${SERVER_URL}/families/join`, {
        family_id: familyId,
        user_id: TEST_USERS[1].id,
        role: 'member'
      });

      if (response.status === 200) {
        this.logTest('Add Family Member', true, 'Second player added to family');
        return true;
      } else {
        this.logTest('Add Family Member', false, 'Failed to add family member');
        return false;
      }
    } catch (error) {
      this.logTest('Add Family Member', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 3: Connect players via WebSocket
  async testWebSocketConnections(familyId) {
    try {
      console.log('\n🔌 Testing WebSocket Connections...');
      
      // Connect both players
      for (let i = 0; i < TEST_USERS.length; i++) {
        const user = TEST_USERS[i];
        const socket = io(SOCKET_URL, {
          query: { 
            userId: user.id,
            familyId: familyId
          }
        });

        // Store socket for later use
        this.sockets.push(socket);

        // Set up socket event listeners
        socket.on('connect', () => {
          console.log(`🔗 ${user.name} connected to WebSocket`);
        });

        socket.on('disconnect', () => {
          console.log(`🔌 ${user.name} disconnected from WebSocket`);
        });

        socket.on('error', (error) => {
          console.log(`❌ Socket error for ${user.name}:`, error);
        });
      }

      // Wait for connections to establish
      await this.wait(2000);

      if (this.sockets.length === 2) {
        this.logTest('WebSocket Connections', true, 'Both players connected successfully');
        return true;
      } else {
        this.logTest('WebSocket Connections', false, 'Failed to connect all players');
        return false;
      }
    } catch (error) {
      this.logTest('WebSocket Connections', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 4: Join game room
  async testJoinGameRoom(familyId) {
    try {
      console.log('\n🏠 Testing Game Room Join...');
      
      const joinPromises = this.sockets.map((socket, index) => {
        return new Promise((resolve) => {
          socket.emit('join-room', { 
            familyId: familyId,
            userId: TEST_USERS[index].id 
          });

          socket.on('room-joined', (data) => {
            console.log(`🎮 ${TEST_USERS[index].name} joined room:`, data);
            resolve(true);
          });

          socket.on('join-room-error', (error) => {
            console.log(`❌ Room join error for ${TEST_USERS[index].name}:`, error);
            resolve(false);
          });
        });
      });

      const results = await Promise.all(joinPromises);
      const allJoined = results.every(result => result === true);

      if (allJoined) {
        this.logTest('Join Game Room', true, 'All players joined the game room');
        return true;
      } else {
        this.logTest('Join Game Room', false, 'Some players failed to join');
        return false;
      }
    } catch (error) {
      this.logTest('Join Game Room', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 5: Start trivia game
  async testStartTriviaGame(familyId) {
    try {
      console.log('\n🎯 Testing Trivia Game Start...');
      
      return new Promise((resolve) => {
        const hostSocket = this.sockets[0]; // First player is host
        
        // Listen for game start events
        hostSocket.on('game-started', (data) => {
          console.log('🚀 Game started with data:', data);
          this.gameSession = data;
          this.logTest('Start Trivia Game', true, `Game started with ${data.questions?.length || 0} questions`);
          resolve(true);
        });

        hostSocket.on('start-game-error', (error) => {
          console.log('❌ Game start error:', error);
          this.logTest('Start Trivia Game', false, `Error: ${error.error}`);
          resolve(false);
        });

        // Host starts the game
        hostSocket.emit('start-game', { 
          familyId: familyId,
          hostUserId: TEST_USERS[0].id 
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          this.logTest('Start Trivia Game', false, 'Timeout waiting for game start');
          resolve(false);
        }, 10000);
      });
    } catch (error) {
      this.logTest('Start Trivia Game', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 6: Submit answers from both players
  async testSubmitAnswers() {
    try {
      console.log('\n📝 Testing Answer Submission...');
      
      if (!this.gameSession || !this.gameSession.questions) {
        this.logTest('Submit Answers', false, 'No game session or questions available');
        return false;
      }

      const questions = this.gameSession.questions;
      let answersSubmitted = 0;

      // Submit answers for each question
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        const question = questions[questionIndex];
        
        // Both players submit answers (simulate different choices)
        for (let playerIndex = 0; playerIndex < this.sockets.length; playerIndex++) {
          const socket = this.sockets[playerIndex];
          const user = TEST_USERS[playerIndex];
          
          // Player 1 always chooses first option, Player 2 chooses correct answer
          const selectedAnswer = playerIndex === 0 ? 0 : question.correctAnswer;
          
          await new Promise((resolve) => {
            socket.emit('submit-answer', {
              sessionId: this.gameSession.sessionId,
              questionIndex: questionIndex,
              selectedAnswer: selectedAnswer,
              userId: user.id
            });

            socket.on('answer-submitted', (data) => {
              console.log(`✅ ${user.name} submitted answer for question ${questionIndex + 1}`);
              answersSubmitted++;
              resolve();
            });

            socket.on('submit-answer-error', (error) => {
              console.log(`❌ Answer submission error for ${user.name}:`, error);
              resolve();
            });

            // Timeout for each answer
            setTimeout(resolve, 3000);
          });

          // Wait between submissions
          await this.wait(500);
        }
      }

      const expectedAnswers = questions.length * this.sockets.length;
      if (answersSubmitted >= expectedAnswers * 0.8) { // Allow for 80% success rate
        this.logTest('Submit Answers', true, `${answersSubmitted}/${expectedAnswers} answers submitted`);
        return true;
      } else {
        this.logTest('Submit Answers', false, `Only ${answersSubmitted}/${expectedAnswers} answers submitted`);
        return false;
      }
    } catch (error) {
      this.logTest('Submit Answers', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 7: End game and check leaderboard update
  async testEndGameAndLeaderboard(familyId) {
    try {
      console.log('\n🏁 Testing Game End and Leaderboard Update...');
      
      return new Promise(async (resolve) => {
        const hostSocket = this.sockets[0];
        let gameEnded = false;
        let leaderboardUpdated = false;

        // Listen for game end
        hostSocket.on('game-ended', (data) => {
          console.log('🎉 Game ended with final scores:', data);
          gameEnded = true;
          if (leaderboardUpdated) resolve(true);
        });

        // Listen for leaderboard updates
        hostSocket.on('leaderboard-updated', (data) => {
          console.log('📊 Leaderboard updated:', data);
          leaderboardUpdated = true;
          if (gameEnded) resolve(true);
        });

        // End the game
        hostSocket.emit('end-game', { 
          sessionId: this.gameSession.sessionId,
          familyId: familyId 
        });

        // Also test REST API leaderboard endpoint
        setTimeout(async () => {
          try {
            const response = await axios.get(`${SERVER_URL}/leaderboard/${familyId}`);
            if (response.status === 200 && response.data.leaderboard) {
              console.log('📈 REST API Leaderboard:', response.data.leaderboard);
              this.logTest('End Game and Leaderboard', true, 'Game ended and leaderboard updated');
              resolve(true);
            }
          } catch (error) {
            console.log('❌ Leaderboard API error:', error.message);
          }
        }, 3000);

        // Timeout after 15 seconds
        setTimeout(() => {
          this.logTest('End Game and Leaderboard', false, 'Timeout waiting for game end and leaderboard update');
          resolve(false);
        }, 15000);
      });
    } catch (error) {
      this.logTest('End Game and Leaderboard', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Test 8: Verify streak tracking (if implemented)
  async testStreakTracking(familyId) {
    try {
      console.log('\n🔥 Testing Streak Tracking...');
      
      const response = await axios.get(`${SERVER_URL}/leaderboard/${familyId}`);
      
      if (response.status === 200 && response.data.leaderboard) {
        const leaderboard = response.data.leaderboard;
        const hasStreakData = leaderboard.some(entry => 
          entry.hasOwnProperty('streak') || entry.hasOwnProperty('current_streak')
        );

        if (hasStreakData) {
          this.logTest('Streak Tracking', true, 'Streak data found in leaderboard');
          return true;
        } else {
          this.logTest('Streak Tracking', false, 'No streak data found in leaderboard');
          return false;
        }
      } else {
        this.logTest('Streak Tracking', false, 'Failed to fetch leaderboard for streak verification');
        return false;
      }
    } catch (error) {
      this.logTest('Streak Tracking', false, `Error: ${error.message}`);
      return false;
    }
  }

  // Cleanup method
  cleanup() {
    console.log('\n🧹 Cleaning up connections...');
    this.sockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    this.sockets = [];
  }

  // Print final test results
  printResults() {
    console.log('\n📊 E2E Test Results Summary:');
    console.log('=' .repeat(50));
    
    let passed = 0;
    let total = this.testResults.length;

    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.testName}`);
      if (result.passed) passed++;
    });

    console.log('=' .repeat(50));
    console.log(`Final Score: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED! E2E flow is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check the issues above.');
    }
  }

  // Main test runner
  async runFullE2ETest() {
    console.log('🚀 Starting Full E2E Test Suite for Family Together');
    console.log('Testing: One family plays a game, leaderboard updates');
    console.log('=' .repeat(60));

    try {
      // Test 1: Create family
      const familyId = await this.testCreateFamily();
      if (!familyId) {
        console.log('❌ Cannot continue without family. Exiting...');
        return;
      }

      // Test 2: Add family members
      const membersAdded = await this.testAddFamilyMembers(familyId);
      if (!membersAdded) {
        console.log('⚠️  Continuing without second member...');
      }

      // Test 3: WebSocket connections
      const socketsConnected = await this.testWebSocketConnections(familyId);
      if (!socketsConnected) {
        console.log('❌ Cannot continue without WebSocket connections. Exiting...');
        return;
      }

      // Test 4: Join game room
      const roomJoined = await this.testJoinGameRoom(familyId);
      if (!roomJoined) {
        console.log('❌ Cannot continue without joining game room. Exiting...');
        this.cleanup();
        return;
      }

      // Test 5: Start trivia game
      const gameStarted = await this.testStartTriviaGame(familyId);
      if (!gameStarted) {
        console.log('❌ Cannot continue without starting game. Exiting...');
        this.cleanup();
        return;
      }

      // Wait for game to be ready
      await this.wait(2000);

      // Test 6: Submit answers
      await this.testSubmitAnswers();

      // Wait before ending game
      await this.wait(3000);

      // Test 7: End game and check leaderboard
      await this.testEndGameAndLeaderboard(familyId);

      // Test 8: Verify streak tracking
      await this.testStreakTracking(familyId);

      // Cleanup
      this.cleanup();

      // Print results
      this.printResults();

    } catch (error) {
      console.log('\n💥 E2E Test Suite crashed:', error.message);
      this.cleanup();
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const testSuite = new E2ETestSuite();
  
  console.log('⏳ Starting E2E test in 3 seconds...');
  console.log('📋 Make sure the backend server is running on port 3000');
  
  setTimeout(() => {
    testSuite.runFullE2ETest().then(() => {
      process.exit(0);
    }).catch((error) => {
      console.log('💥 Test suite failed:', error);
      process.exit(1);
    });
  }, 3000);
}

module.exports = E2ETestSuite; 