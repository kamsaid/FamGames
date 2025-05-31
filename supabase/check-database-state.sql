-- Supabase Database State Check
-- Run this in your Supabase SQL Editor to check the current state of your database

-- Check if all expected tables exist
WITH expected_tables AS (
    SELECT unnest(ARRAY[
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
    ]) AS table_name
),
existing_tables AS (
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
)
SELECT 
    'TABLES CHECK' as check_type,
    et.table_name,
    CASE 
        WHEN ext.table_name IS NOT NULL THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY status DESC, et.table_name;

-- Check for auth.users table (special case)
SELECT 
    'AUTH CHECK' as check_type,
    'auth.users' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'users'
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING'
    END as status;

-- Check if development user exists
SELECT 
    'DEV USER CHECK' as check_type,
    'Development User (550e8400-e29b-41d4-a716-446655440000)' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid
        ) THEN '✓ EXISTS'
        ELSE '✗ MISSING - Run seed-dev-user.sql'
    END as status;

-- Check Row Level Security status
SELECT 
    'RLS CHECK' as check_type,
    c.relname as table_name,
    CASE 
        WHEN c.relrowsecurity THEN '✓ ENABLED'
        ELSE '✗ DISABLED'
    END as status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relkind = 'r'
AND c.relname IN (
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
)
ORDER BY c.relname;

-- Check for missing columns in leaderboards table (common issue)
SELECT 
    'LEADERBOARDS COLUMNS CHECK' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'leaderboards'
ORDER BY ordinal_position;

-- Check for foreign key constraints
SELECT 
    'FOREIGN KEY CHECK' as check_type,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Check for any recent errors in families table
SELECT 
    'RECENT ERRORS CHECK' as check_type,
    'Checking last 10 family creation attempts' as description,
    COUNT(*) as total_families
FROM families
WHERE created_at > NOW() - INTERVAL '7 days';

-- Summary of database state
SELECT 
    'SUMMARY' as check_type,
    'Total Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT 
    'SUMMARY',
    'Total Families',
    COUNT(*)::bigint
FROM families
UNION ALL
SELECT 
    'SUMMARY',
    'Total Users',
    COUNT(*)::bigint
FROM auth.users
UNION ALL
SELECT 
    'SUMMARY',
    'Total Questions',
    COUNT(*)::bigint
FROM questions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'questions'); 