/**
 * Test script for Family Management endpoints
 * This demonstrates how to use the family APIs
 * 
 * Make sure your server is running and you have:
 * - SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env
 * - The schema has been applied to your Supabase database
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Example usage (you would get this token from Supabase auth)
const EXAMPLE_TOKEN = 'your-supabase-jwt-token-here';

const headers = {
  'Authorization': `Bearer ${EXAMPLE_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testFamilyEndpoints() {
  console.log('🧪 Testing Family Management Endpoints\n');

  try {
    // Test 1: Create a family
    console.log('1. Creating a new family...');
    const createResponse = await axios.post(`${BASE_URL}/families/create`, {
      name: 'The Smith Family'
    }, { headers });
    
    console.log('✅ Family created:', createResponse.data);
    const familyId = createResponse.data.data.family.id;
    console.log('');

    // Test 2: Get user's families
    console.log('2. Getting user families...');
    const familiesResponse = await axios.get(`${BASE_URL}/families`, { headers });
    console.log('✅ User families:', familiesResponse.data);
    console.log('');

    // Test 3: Invite a user to the family
    console.log('3. Inviting a user to the family...');
    const inviteResponse = await axios.post(`${BASE_URL}/families/invite`, {
      email: 'newmember@example.com',
      familyId: familyId
    }, { headers });
    
    console.log('✅ Invitation sent:', inviteResponse.data);
    const inviteToken = inviteResponse.data.data.invitation.invite_link.split('token=')[1];
    console.log('');

    // Test 4: Join family using token (this would be done by the invitee)
    console.log('4. Joining family with invitation token...');
    // Note: In reality, this would be called by a different user with their own token
    // For demo purposes, we're showing the API structure
    console.log('Would call POST /families/join with:', {
      token: inviteToken,
      headers: 'Bearer [invitee-jwt-token]'
    });
    console.log('');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Uncomment the line below to run the tests
// testFamilyEndpoints();

console.log(`
📋 Family Management API Endpoints:

🏠 GET /families
   - Get all families for authenticated user
   - Headers: Authorization: Bearer [jwt-token]

🏠 POST /families/create
   - Create a new family
   - Body: { name: "Family Name" }
   - Headers: Authorization: Bearer [jwt-token]

📧 POST /families/invite
   - Invite user to family (admin only)
   - Body: { email: "user@example.com", familyId: "uuid" }
   - Headers: Authorization: Bearer [jwt-token]

🤝 POST /families/join
   - Join family using invitation token
   - Body: { token: "invitation-token" }
   - Headers: Authorization: Bearer [jwt-token]

To test these endpoints:
1. Set up your .env file with Supabase credentials
2. Apply the schema.sql to your Supabase database
3. Start the server: npm run dev
4. Use a tool like Postman or curl to test the endpoints
5. Get JWT tokens from Supabase Auth for testing
`); 