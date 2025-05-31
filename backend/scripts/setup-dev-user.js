/**
 * Setup Development User Script
 * Creates a development user in Supabase for local testing
 * Run this script once to set up your development environment
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const DEV_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEV_USER_EMAIL = 'dev@example.com';
const DEV_FAMILY_ID = '123e4567-e89b-12d3-a456-426614174000';

async function setupDevUser() {
  console.log('🔧 Setting up development user...\n');

  try {
    // Step 1: Check if user already exists
    console.log('1️⃣ Checking if development user exists...');
    const { data: existingUser, error: checkError } = await supabaseAdmin.auth.admin.getUserById(DEV_USER_ID);
    
    if (existingUser) {
      console.log('✅ Development user already exists!');
    } else {
      // Step 2: Create the development user
      console.log('2️⃣ Creating development user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        password: 'dev-password-not-for-production', // This won't be used, just for the record
        email_confirm: true, // Auto-confirm the email
        user_metadata: {
          full_name: 'Dev User'
        }
      });

      if (createError) {
        console.error('❌ Error creating user:', createError);
        process.exit(1);
      }

      console.log('✅ Development user created successfully!');
    }

    // Step 3: Create user profile
    console.log('\n3️⃣ Creating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: DEV_USER_ID,
        display_name: 'Dev User',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', DEV_USER_ID);

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
    } else {
      console.log('✅ User profile created/updated!');
    }

    // Step 4: Create test family
    console.log('\n4️⃣ Creating test family...');
    const { error: familyError } = await supabaseAdmin
      .from('families')
      .upsert({
        id: DEV_FAMILY_ID,
        name: 'Dev Test Family',
        description: 'A test family for development',
        created_by: DEV_USER_ID,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', DEV_FAMILY_ID);

    if (familyError) {
      console.error('❌ Error creating family:', familyError);
    } else {
      console.log('✅ Test family created/updated!');
    }

    // Step 5: Add user to family as admin
    console.log('\n5️⃣ Adding user to family as admin...');
    const { error: memberError } = await supabaseAdmin
      .from('family_members')
      .upsert({
        user_id: DEV_USER_ID,
        family_id: DEV_FAMILY_ID,
        role: 'admin',
        joined_at: new Date().toISOString()
      })
      .eq('user_id', DEV_USER_ID)
      .eq('family_id', DEV_FAMILY_ID);

    if (memberError) {
      console.error('❌ Error adding to family:', memberError);
    } else {
      console.log('✅ User added to family as admin!');
    }

    // Step 6: Initialize leaderboard entry
    console.log('\n6️⃣ Initializing leaderboard entry...');
    const { error: leaderboardError } = await supabaseAdmin
      .from('leaderboards')
      .upsert({
        family_id: DEV_FAMILY_ID,
        user_id: DEV_USER_ID,
        total_score: 0,
        games_played: 0,
        games_won: 0,
        current_streak: 0,
        best_streak: 0,
        average_score: 0.00,
        updated_at: new Date().toISOString()
      })
      .eq('family_id', DEV_FAMILY_ID)
      .eq('user_id', DEV_USER_ID);

    if (leaderboardError) {
      console.error('❌ Error creating leaderboard entry:', leaderboardError);
    } else {
      console.log('✅ Leaderboard entry initialized!');
    }

    console.log('\n🎉 Development environment setup complete!');
    console.log('\n📝 Development User Details:');
    console.log(`   User ID: ${DEV_USER_ID}`);
    console.log(`   Email: ${DEV_USER_EMAIL}`);
    console.log(`   Family ID: ${DEV_FAMILY_ID}`);
    console.log(`   Family Name: Dev Test Family`);
    console.log('\n💡 You can now use the development bypass in your app!');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupDevUser(); 