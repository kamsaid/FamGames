/**
 * Test script for Trivia functionality
 * Tests the /trivia/start-session endpoint
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3001';

/**
 * Test the trivia start-session functionality
 * This test assumes you have:
 * 1. A running server on port 3001
 * 2. Valid Supabase credentials in .env
 * 3. Questions seeded in the database
 * 4. A valid family and user token
 */
async function testTriviaStartSession() {
  console.log('🧪 Testing Trivia Start Session...\n');

  try {
    // Step 1: Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data.message);

    // Step 2: Test start-session without authentication (should fail)
    console.log('\n2. Testing start-session without auth (should fail)...');
    try {
      await axios.post(`${BASE_URL}/trivia/start-session`, {
        family_id: 'test-family-id'
      });
      console.log('❌ Should have failed without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request without auth token');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 3: Test start-session with invalid token (should fail)
    console.log('\n3. Testing start-session with invalid token (should fail)...');
    try {
      await axios.post(`${BASE_URL}/trivia/start-session`, {
        family_id: 'test-family-id'
      }, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request with invalid token');
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Step 4: Test start-session without family_id (should fail)
    console.log('\n4. Testing start-session without family_id (should fail)...');
    console.log('⚠️  Note: This requires a valid user token to test properly');
    console.log('   You can manually test this with a real token');

    console.log('\n✅ Basic trivia route tests completed');
    console.log('\n📝 To test with real data:');
    console.log('1. Ensure questions are seeded in database (run seed_questions.sql)');
    console.log('2. Create a family using /families/create');
    console.log('3. Get a valid auth token from magic link login');
    console.log('4. Use that token to test /trivia/start-session');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the server is running on port 3001');
  }
}

/**
 * Example of how to test with real credentials
 * Replace with actual values when testing
 */
async function testWithRealCredentials() {
  console.log('\n🔐 Example test with real credentials (replace values):');
  
  const EXAMPLE_TOKEN = 'your-actual-jwt-token-here';
  const EXAMPLE_FAMILY_ID = 'your-actual-family-id-here';

  if (EXAMPLE_TOKEN === 'your-actual-jwt-token-here') {
    console.log('⚠️  Replace EXAMPLE_TOKEN and EXAMPLE_FAMILY_ID with real values to test');
    return;
  }

  try {
    const response = await axios.post(`${BASE_URL}/trivia/start-session`, {
      family_id: EXAMPLE_FAMILY_ID
    }, {
      headers: {
        'Authorization': `Bearer ${EXAMPLE_TOKEN}`
      }
    });

    console.log('✅ Session created successfully!');
    console.log('Session ID:', response.data.session.id);
    console.log('Questions count:', response.data.session.questions.length);
    console.log('First question:', response.data.session.questions[0].question);

  } catch (error) {
    console.error('❌ Real credentials test failed:', error.response?.data || error.message);
  }
}

// Run the tests
if (require.main === module) {
  testTriviaStartSession()
    .then(() => testWithRealCredentials())
    .then(() => {
      console.log('\n🎯 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testTriviaStartSession,
  testWithRealCredentials
}; 