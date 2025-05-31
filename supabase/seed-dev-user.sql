-- Seed Development User for Local Testing
-- This script creates a development user in the auth.users table
-- to allow testing without going through the full authentication flow

-- First, we need to use the auth schema
-- Note: This requires running with appropriate permissions (service role)

-- Insert development user into auth.users if it doesn't exist
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
    crypt('not-a-real-password', gen_salt('bf')), -- Encrypted dummy password
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    false,
    'authenticated',
    '00000000-0000-0000-0000-000000000000'::uuid
)
ON CONFLICT (id) DO NOTHING; -- Skip if user already exists

-- Also create a user profile for the development user
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
ON CONFLICT (id) DO NOTHING;

-- Create a test family for development (optional)
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
ON CONFLICT (id) DO NOTHING;

-- Add the dev user as admin of the test family
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
ON CONFLICT (user_id, family_id) DO NOTHING;

-- Initialize leaderboard entry for dev user in test family
INSERT INTO public.leaderboards (
    family_id,
    user_id,
    total_score,
    games_played,
    games_won,
    current_streak,
    best_streak,
    average_score,
    last_played_at,
    updated_at
)
VALUES (
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    0,
    0,
    0,
    0,
    0,
    0.00,
    NULL,
    NOW()
)
ON CONFLICT (family_id, user_id) DO NOTHING;

-- Output confirmation
SELECT 
    'Development user created/verified' as status,
    id,
    email
FROM auth.users
WHERE id = '550e8400-e29b-41d4-a716-446655440000'::uuid; 