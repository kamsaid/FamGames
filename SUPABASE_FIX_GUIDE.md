# Supabase Database Fix Guide

This guide will help you fix common issues with your Supabase database setup, including UUID errors and missing tables/columns.

## 🚨 Common Issues and Solutions

### Issue 1: "invalid input syntax for type uuid"
This error occurs when:
- The auth.users table doesn't have the required development user
- Foreign key constraints are violated
- UUIDs are not properly formatted

### Issue 2: Missing Tables or Columns
- Tables from schema.sql haven't been created
- Columns are missing (especially in leaderboards table)
- RLS policies are not enabled

## 📋 Step-by-Step Fix Process

### Step 1: Check Current Database State

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the **check-database-state.sql** script:
   ```sql
   -- Copy and paste the contents of supabase/check-database-state.sql
   ```
4. Review the results to identify what's missing

### Step 2: Run the Initial Schema (if needed)

If tables are missing:

1. In SQL Editor, run the **schema.sql** file:
   ```sql
   -- Copy and paste the contents of supabase/schema.sql
   ```
2. This creates all necessary tables with proper structure

### Step 3: Fix Common Issues

Run the **fix-database-issues.sql** script:

1. In SQL Editor, paste the contents of `supabase/fix-database-issues.sql`
2. This script will:
   - ✅ Create the development user in auth.users
   - ✅ Fix missing columns in leaderboards table
   - ✅ Rename any incorrectly named columns
   - ✅ Create all required functions and triggers
   - ✅ Enable RLS on all tables
   - ✅ Create dev user profile and test family
   - ✅ Verify all fixes

### Step 4: Verify Everything Works

After running the fix script, you should see verification results showing:
- Dev User: ✓ Created/Verified
- Dev User Profile: ✓ Created/Verified
- Test Family: ✓ Created/Verified
- Leaderboards Columns: (list of all columns)

### Step 5: Test in Your App

1. Make sure your backend `.env` file has:
   ```
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. Run the Node.js check script (optional):
   ```bash
   cd /path/to/your/project
   node check-and-fix-supabase.js
   ```

3. Test creating a family in your app - it should work now!

## 🔍 Troubleshooting

### Still Getting UUID Errors?

1. **Check auth.users exists:**
   ```sql
   SELECT * FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid;
   ```

2. **Check foreign key constraints:**
   ```sql
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY' 
   AND table_schema = 'public';
   ```

### Permission Errors?

Make sure you're using the **service role key** (not anon key) when running admin operations.

### RLS Policy Errors?

Check that RLS is enabled and policies exist:
```sql
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 📝 Quick Reference

### Key Database Components:

1. **Tables:**
   - user_profiles
   - families
   - family_members
   - family_invites
   - questions
   - trivia_sessions
   - trivia_answers
   - leaderboards
   - memory_vault
   - family_achievements

2. **Important Functions:**
   - is_family_admin()
   - is_family_member()
   - generate_invite_code()
   - update_updated_at_column()

3. **Development IDs:**
   - Dev User ID: `550e8400-e29b-41d4-a716-446655440000`
   - Test Family ID: `123e4567-e89b-12d3-a456-426614174000`

## 🚀 Next Steps

Once your database is fixed:

1. Test all CRUD operations work correctly
2. Verify authentication flows
3. Check that RLS policies are working as expected
4. Run your test suite to ensure everything functions properly

## 💡 Pro Tips

- Always backup your database before running fix scripts
- Use transactions when possible for complex operations
- Monitor Supabase logs for any SQL errors
- Keep your schema.sql file updated with any changes

If you continue to have issues after following this guide, check:
- Supabase service status
- Your network connectivity
- API rate limits
- Database connection limits 