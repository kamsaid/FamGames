// Script to check and fix Supabase database schema
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Expected tables from schema.sql
const expectedTables = [
  'user_profiles',
  'families', 
  'family_members',
  'family_invites',
  'questions',
  'trivia_sessions',
  'trivia_answers',
  'leaderboards',
  'memory_vault',
  'family_achievements'
];

// Expected columns for each table (based on schema.sql)
const expectedColumns = {
  user_profiles: ['id', 'display_name', 'avatar_url', 'created_at', 'updated_at'],
  families: ['id', 'name', 'description', 'invite_code', 'created_by', 'created_at', 'updated_at'],
  family_members: ['id', 'user_id', 'family_id', 'role', 'joined_at'],
  family_invites: ['id', 'family_id', 'email', 'token', 'invited_by', 'expires_at', 'used', 'used_at', 'used_by', 'created_at'],
  questions: ['id', 'category', 'question', 'choices', 'answer', 'difficulty', 'is_active', 'created_at', 'updated_at'],
  trivia_sessions: ['id', 'family_id', 'session_name', 'started_by', 'started_at', 'completed_at', 'completed', 'scores', 'questions_used', 'session_config'],
  trivia_answers: ['id', 'session_id', 'user_id', 'question_id', 'user_answer', 'is_correct', 'time_taken_seconds', 'answered_at'],
  leaderboards: ['id', 'family_id', 'user_id', 'total_score', 'games_played', 'games_won', 'current_streak', 'best_streak', 'average_score', 'last_played_at', 'updated_at'],
  memory_vault: ['id', 'family_id', 'created_by', 'title', 'description', 'memory_type', 'encrypted_file_path', 'file_size_bytes', 'encryption_key_hint', 'metadata', 'is_archived', 'created_at', 'updated_at'],
  family_achievements: ['id', 'family_id', 'achievement_type', 'title', 'description', 'icon', 'earned_by', 'earned_at', 'metadata']
};

// Helper function to execute SQL query
async function executeSQL(sql, description) {
  try {
    console.log(`${colors.blue}Executing: ${description}${colors.reset}`);
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      return { success: false, error };
    }
    
    console.log(`${colors.green}✓ Success${colors.reset}`);
    return { success: true, data };
  } catch (err) {
    console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
    return { success: false, error: err };
  }
}

// Check if a table exists
async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single();
  
  return !error && data !== null;
}

// Get columns for a table
async function getTableColumns(tableName) {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName);
  
  if (error) {
    console.error(`Error getting columns for ${tableName}:`, error);
    return [];
  }
  
  return data.map(col => col.column_name);
}

// Main check function
async function checkAndFixSchema() {
  console.log(`${colors.blue}=== Supabase Schema Check and Fix ===${colors.reset}\n`);
  
  const issues = [];
  const fixes = [];
  
  // Check each expected table
  for (const table of expectedTables) {
    console.log(`${colors.yellow}Checking table: ${table}${colors.reset}`);
    
    const exists = await checkTableExists(table);
    
    if (!exists) {
      console.log(`${colors.red}✗ Table '${table}' does not exist${colors.reset}`);
      issues.push(`Missing table: ${table}`);
      
      // Read the CREATE TABLE statement from schema.sql
      const schemaContent = await fs.readFile(path.join(__dirname, 'supabase', 'schema.sql'), 'utf-8');
      const tableRegex = new RegExp(`CREATE TABLE ${table}[\\s\\S]*?(?=CREATE|ALTER|--|$)`, 'i');
      const createStatement = schemaContent.match(tableRegex);
      
      if (createStatement) {
        fixes.push({
          description: `Create table ${table}`,
          sql: createStatement[0].trim()
        });
      }
    } else {
      console.log(`${colors.green}✓ Table exists${colors.reset}`);
      
      // Check columns
      const actualColumns = await getTableColumns(table);
      const expectedCols = expectedColumns[table] || [];
      
      // Find missing columns
      const missingColumns = expectedCols.filter(col => !actualColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`${colors.red}✗ Missing columns: ${missingColumns.join(', ')}${colors.reset}`);
        issues.push(`Table '${table}' missing columns: ${missingColumns.join(', ')}`);
        
        // Generate ALTER TABLE statements for missing columns
        // This would need the actual column definitions from schema.sql
        // For now, we'll flag it for manual review
        fixes.push({
          description: `Add missing columns to ${table}`,
          sql: `-- TODO: Add missing columns ${missingColumns.join(', ')} to ${table}`,
          manual: true
        });
      }
      
      // Find extra columns (not in schema)
      const extraColumns = actualColumns.filter(col => !expectedCols.includes(col));
      if (extraColumns.length > 0) {
        console.log(`${colors.yellow}⚠ Extra columns found: ${extraColumns.join(', ')}${colors.reset}`);
        issues.push(`Table '${table}' has extra columns: ${extraColumns.join(', ')}`);
      }
    }
    
    console.log();
  }
  
  // Summary
  console.log(`${colors.blue}=== Summary ===${colors.reset}\n`);
  
  if (issues.length === 0) {
    console.log(`${colors.green}✓ All tables and columns match the schema!${colors.reset}`);
  } else {
    console.log(`${colors.red}Found ${issues.length} issues:${colors.reset}`);
    issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    
    // Write fixes to a file
    if (fixes.length > 0) {
      console.log(`\n${colors.yellow}Generating fix script...${colors.reset}`);
      
      let fixScript = `-- Supabase Schema Fixes
-- Generated on ${new Date().toISOString()}
-- Run these statements in your Supabase SQL editor

`;
      
      fixes.forEach(fix => {
        fixScript += `-- ${fix.description}\n`;
        fixScript += `${fix.sql};\n\n`;
      });
      
      const fixPath = path.join(__dirname, 'supabase-schema-fixes.sql');
      await fs.writeFile(fixPath, fixScript);
      
      console.log(`${colors.green}✓ Fix script written to: ${fixPath}${colors.reset}`);
      console.log(`${colors.yellow}Review and run the fix script in your Supabase SQL editor${colors.reset}`);
    }
  }
  
  // Additional checks
  console.log(`\n${colors.blue}=== Additional Checks ===${colors.reset}\n`);
  
  // Check if RLS is enabled
  console.log(`${colors.yellow}Checking Row Level Security (RLS)...${colors.reset}`);
  for (const table of expectedTables) {
    const { data, error } = await supabase
      .rpc('check_rls_enabled', { table_name: table })
      .single();
    
    if (!error && data && !data.rls_enabled) {
      console.log(`${colors.red}✗ RLS not enabled on ${table}${colors.reset}`);
      fixes.push({
        description: `Enable RLS on ${table}`,
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`
      });
    }
  }
  
  // Check for development user
  console.log(`\n${colors.yellow}Checking development user...${colors.reset}`);
  const { data: devUser, error: devUserError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', '550e8400-e29b-41d4-a716-446655440000')
    .single();
  
  if (devUserError || !devUser) {
    console.log(`${colors.red}✗ Development user not found${colors.reset}`);
    console.log(`${colors.yellow}Run the seed-dev-user.sql script to create it${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Development user exists${colors.reset}`);
  }
}

// Function to create a custom RPC function for executing SQL (if not exists)
async function setupSQLExecutor() {
  const setupSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      result json;
    BEGIN
      EXECUTE sql;
      RETURN json_build_object('success', true);
    EXCEPTION WHEN OTHERS THEN
      RETURN json_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
    
    CREATE OR REPLACE FUNCTION check_rls_enabled(table_name text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      rls_enabled boolean;
    BEGIN
      SELECT relrowsecurity INTO rls_enabled
      FROM pg_class
      WHERE relname = table_name
      AND relnamespace = 'public'::regnamespace;
      
      RETURN json_build_object('rls_enabled', COALESCE(rls_enabled, false));
    END;
    $$;
  `;
  
  // This needs to be run manually in Supabase SQL editor with appropriate permissions
  console.log(`${colors.yellow}Note: Helper functions may need to be created. See setup instructions.${colors.reset}\n`);
}

// Run the check
async function main() {
  try {
    // Check if we have required environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`${colors.red}Error: Missing required environment variables${colors.reset}`);
      console.log('Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in backend/.env');
      process.exit(1);
    }
    
    await setupSQLExecutor();
    await checkAndFixSchema();
    
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkAndFixSchema }; 