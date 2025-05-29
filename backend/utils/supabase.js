/**
 * Supabase Client Configuration
 * Provides a configured Supabase client for database operations
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Server-side doesn't need session persistence
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

// Test connection on startup (optional)
const testConnection = async () => {
  try {
    // Simple test query to check if connection works
    const { data, error } = await supabase
      .from('questions')
      .select('count(*)')
      .limit(1);
      
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection established successfully');
    }
  } catch (err) {
    console.warn('⚠️ Supabase connection test error:', err.message);
  }
};

// Run connection test
testConnection();

module.exports = supabase; 