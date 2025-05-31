# Development Environment Setup

## 🚨 Foreign Key Constraint Error Fix

If you're seeing this error:
```
Key (created_by)=(550e8400-e29b-41d4-a716-446655440000) is not present in table "users"
```

This happens because the development bypass creates a mock user that doesn't exist in your Supabase database. 

## 🛠️ Quick Fix

### Option 1: Run the Setup Script (Recommended)

From the backend directory:

```bash
cd backend
npm run setup:dev-user
```

This script will:
- ✅ Create the development user in Supabase auth.users table
- ✅ Create a user profile
- ✅ Create a test family
- ✅ Add the user as an admin of the test family
- ✅ Initialize the leaderboard entry

### Option 2: Run SQL Directly in Supabase

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and run the contents of `supabase/seed-dev-user.sql`

**⚠️ Note**: You need to run this with service role permissions or as a database admin.

## 📝 Development User Details

After setup, you'll have:
- **User ID**: `550e8400-e29b-41d4-a716-446655440000`
- **Email**: `dev@example.com`
- **Test Family ID**: `123e4567-e89b-12d3-a456-426614174000`
- **Test Family Name**: "Dev Test Family"

## 🔐 How Development Authentication Works

1. **Frontend**: The AuthContext has a development bypass that creates a mock session
2. **Backend**: The auth middleware accepts `'dev-access-token'` in non-production environments
3. **Database**: The development user must exist in the database due to foreign key constraints

## 🚀 Using Development Mode

1. The app will automatically use development bypass after 2 seconds if no real auth session exists
2. You can manually trigger it by calling `bypassAuthForDev()` from the auth context
3. The mock session includes:
   - Access token: `'dev-access-token'`
   - User ID: `'550e8400-e29b-41d4-a716-446655440000'`
   - Email: `'dev@example.com'`

## 🔧 Troubleshooting

### Error: User already exists
This is fine! The script uses "upsert" operations, so it's safe to run multiple times.

### Error: Permission denied
Make sure your `.env` file has the correct `SUPABASE_SERVICE_ROLE_KEY` (not just the anon key).

### Error: Cannot find module
Make sure you're in the backend directory and have run `npm install`.

## 🏗️ Architecture Notes

The development setup creates real database records to satisfy foreign key constraints:
- `auth.users` → Core user record (managed by Supabase Auth)
- `user_profiles` → Extended user profile
- `families` → Test family owned by dev user
- `family_members` → Dev user as admin of test family
- `leaderboards` → Initialized scoring record

This ensures all database relationships are valid while maintaining a simple development workflow. 