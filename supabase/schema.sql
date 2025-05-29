-- Family Together Database Schema
-- This file contains the core table definitions and RLS policies

-- Users table is automatically created by Supabase Auth
-- We'll extend it with a custom profile table if needed later

-- Families table - core entity for grouping users
CREATE TABLE families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on families table
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Family members table - links users to families with roles
CREATE TABLE family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, family_id)
);

-- Enable RLS on family_members table
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Family invites table - stores pending invitations
CREATE TABLE family_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(128) NOT NULL UNIQUE, -- Secure token for invitation link
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on family_invites table
ALTER TABLE family_invites ENABLE ROW LEVEL SECURITY;

-- Questions table - stores trivia questions
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    choices JSONB NOT NULL, -- Array of 4 answer choices
    answer VARCHAR(255) NOT NULL, -- Correct answer
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on questions table - allow all authenticated users to read
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Trivia sessions table - tracks game sessions for families
CREATE TABLE trivia_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    scores JSONB DEFAULT '{}', -- Object with user_id as key, score as value
    questions_used JSONB NOT NULL -- Array of question IDs used in this session
);

-- Enable RLS on trivia_sessions table
ALTER TABLE trivia_sessions ENABLE ROW LEVEL SECURITY;

-- Leaderboards table - tracks family member scores and streaks
CREATE TABLE leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(family_id, user_id)
);

-- Enable RLS on leaderboards table
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own family memberships
CREATE POLICY "Users can view their own family memberships" ON family_members
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Family admins can view all family memberships
CREATE POLICY "Family admins can view family memberships" ON family_members
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Family admins can add members
CREATE POLICY "Family admins can add members" ON family_members
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Family admins can remove members
CREATE POLICY "Family admins can remove members" ON family_members
    FOR DELETE USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: All authenticated users can read questions
CREATE POLICY "Authenticated users can read questions" ON questions
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policy: Family members can view their family's trivia sessions
CREATE POLICY "Family members can view trivia sessions" ON trivia_sessions
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Family members can create trivia sessions
CREATE POLICY "Family members can create trivia sessions" ON trivia_sessions
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Family members can update their family's trivia sessions
CREATE POLICY "Family members can update trivia sessions" ON trivia_sessions
    FOR UPDATE USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Family members can view their family's leaderboard
CREATE POLICY "Family members can view leaderboard" ON leaderboards
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM family_members WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Family members can update their own leaderboard entry
CREATE POLICY "Users can update their own leaderboard" ON leaderboards
    FOR ALL USING (user_id = auth.uid());

-- Update families RLS policy to include family membership
DROP POLICY "Users can view families they belong to" ON families;

CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (
        created_by = auth.uid() OR 
        id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can create families
CREATE POLICY "Users can create families" ON families
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- RLS Policy: Only family creators can update family details
CREATE POLICY "Family creators can update families" ON families
    FOR UPDATE USING (created_by = auth.uid());

-- RLS Policy: Only family creators can delete families
CREATE POLICY "Family creators can delete families" ON families
    FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for family_invites table

-- RLS Policy: Family admins can view invites for their families
CREATE POLICY "Family admins can view invites" ON family_invites
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Family admins can create invites for their families
CREATE POLICY "Family admins can create invites" ON family_invites
    FOR INSERT WITH CHECK (
        family_id IN (
            SELECT family_id FROM family_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policy: Service can read invites by token (for join process)
CREATE POLICY "Service can read invites by token" ON family_invites
    FOR SELECT USING (true); -- This will be restricted by service key access

-- RLS Policy: Service can update invite usage
CREATE POLICY "Service can update invite usage" ON family_invites
    FOR UPDATE USING (true); -- This will be restricted by service key access 