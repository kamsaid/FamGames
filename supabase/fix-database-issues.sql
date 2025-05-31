-- Comprehensive Supabase Database Fix Script
-- This script addresses common issues with the Family Together app database setup
-- Run this in your Supabase SQL Editor with appropriate permissions

-- =====================================================
-- STEP 1: Ensure auth.users table has required test user
-- =====================================================

-- First check if the dev user exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid) THEN
        -- Insert development user
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            instance_id
        )
        VALUES (
            '550e8400-e29b-41d4-a716-446655440000'::uuid,
            'dev@example.com',
            crypt('dev-password-123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            '{}'::jsonb,
            false,
            'authenticated',
            '00000000-0000-0000-0000-000000000000'::uuid
        );
        
        RAISE NOTICE 'Development user created successfully';
    ELSE
        RAISE NOTICE 'Development user already exists';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Check and fix leaderboards table
-- =====================================================

-- Check if streak columns exist in leaderboards table
DO $$
BEGIN
    -- Add current_streak if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'current_streak'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN current_streak INTEGER DEFAULT 0;
        RAISE NOTICE 'Added current_streak column to leaderboards table';
    END IF;
    
    -- Add best_streak if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'best_streak'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN best_streak INTEGER DEFAULT 0;
        RAISE NOTICE 'Added best_streak column to leaderboards table';
    END IF;
    
    -- Add average_score if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'average_score'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN average_score DECIMAL(5,2) DEFAULT 0.00;
        RAISE NOTICE 'Added average_score column to leaderboards table';
    END IF;
    
    -- Add last_played_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'last_played_at'
    ) THEN
        ALTER TABLE leaderboards ADD COLUMN last_played_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_played_at column to leaderboards table';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Fix column names in leaderboards
-- =====================================================

-- Rename columns if they have different names
DO $$
BEGIN
    -- Check if 'score' column exists and rename to 'total_score'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'score'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'total_score'
    ) THEN
        ALTER TABLE leaderboards RENAME COLUMN score TO total_score;
        RAISE NOTICE 'Renamed score column to total_score in leaderboards table';
    END IF;
    
    -- Check if 'streak' column exists and rename to 'current_streak'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'streak'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leaderboards' 
        AND column_name = 'current_streak'
    ) THEN
        ALTER TABLE leaderboards RENAME COLUMN streak TO current_streak;
        RAISE NOTICE 'Renamed streak column to current_streak in leaderboards table';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Ensure all required functions exist
-- =====================================================

-- Create or replace the helper functions
CREATE OR REPLACE FUNCTION public.is_family_admin(fam_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = fam_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_family_member(fam_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = fam_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        IF NOT EXISTS (SELECT 1 FROM families WHERE invite_code = code) THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 5: Ensure RLS is enabled on all tables
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
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
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        -- Check if table exists before enabling RLS
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'Enabled RLS on table: %', tbl;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- STEP 6: Create missing triggers
-- =====================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for families table
DROP TRIGGER IF EXISTS update_families_updated_at ON families;
CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for user_profiles table
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for leaderboards table
DROP TRIGGER IF EXISTS update_leaderboards_updated_at ON leaderboards;
CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON leaderboards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to set family invite code
CREATE OR REPLACE FUNCTION public.set_family_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code = public.generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_family_invite_code_trigger ON families;
CREATE TRIGGER set_family_invite_code_trigger
    BEFORE INSERT ON families
    FOR EACH ROW EXECUTE FUNCTION public.set_family_invite_code();

-- Create trigger to create leaderboard entry when user joins family
CREATE OR REPLACE FUNCTION public.create_leaderboard_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboards (family_id, user_id)
    VALUES (NEW.family_id, NEW.user_id)
    ON CONFLICT (family_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_leaderboard_entry_trigger ON family_members;
CREATE TRIGGER create_leaderboard_entry_trigger
    AFTER INSERT ON family_members
    FOR EACH ROW EXECUTE FUNCTION public.create_leaderboard_entry();

-- =====================================================
-- STEP 7: Create dev user profile and test family
-- =====================================================

-- Create user profile for dev user
INSERT INTO public.user_profiles (
    id,
    display_name,
    avatar_url,
    created_at,
    updated_at
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'Dev User',
    null,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Create test family
INSERT INTO public.families (
    id,
    name,
    description,
    created_by,
    created_at,
    updated_at
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'Dev Test Family',
    'A test family for development',
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Add dev user as admin of test family
INSERT INTO public.family_members (
    user_id,
    family_id,
    role,
    joined_at
)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    'admin',
    NOW()
)
ON CONFLICT (user_id, family_id) DO UPDATE SET
    role = 'admin';

-- =====================================================
-- STEP 8: Verify the fixes
-- =====================================================

-- Show summary of fixes
SELECT 'VERIFICATION RESULTS' as status;

-- Check dev user
SELECT 
    'Dev User' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
        THEN '✓ Created/Verified'
        ELSE '✗ Failed'
    END as status;

-- Check dev user profile
SELECT 
    'Dev User Profile' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
        THEN '✓ Created/Verified'
        ELSE '✗ Failed'
    END as status;

-- Check test family
SELECT 
    'Test Family' as check_item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM families WHERE id = '123e4567-e89b-12d3-a456-426614174000'::uuid)
        THEN '✓ Created/Verified'
        ELSE '✗ Failed'
    END as status;

-- Check leaderboards columns
SELECT 
    'Leaderboards Columns' as check_item,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'leaderboards'
GROUP BY table_schema, table_name;

-- Final message
SELECT 'Database fixes completed! Please check the verification results above.' as message; 