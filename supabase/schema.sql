-- Family Together Database Schema
-- This file contains the core table definitions and RLS policies

-- Users table is automatically created by Supabase Auth
-- We'll extend it with a custom profile table if needed later

-- User profiles table - extends Supabase auth.users with additional info
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name VARCHAR(100),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Families table - core entity for grouping users
CREATE TABLE families (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    invite_code VARCHAR(8) UNIQUE, -- Short code for easy family joining
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- Helper function to check if the current user is an admin of the given family
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

-- Helper function to check if the current user is a member of the given family
CREATE OR REPLACE FUNCTION public.is_family_member(fam_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = fam_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to generate unique invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    done BOOLEAN := FALSE;
BEGIN
    WHILE NOT done LOOP
        -- Generate 8-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        -- Check if code already exists
        IF NOT EXISTS (SELECT 1 FROM families WHERE invite_code = code) THEN
            done := TRUE;
        END IF;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

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
    is_active BOOLEAN DEFAULT true, -- For soft deletion/disabling questions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on questions table - allow all authenticated users to read
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Trivia sessions table - tracks game sessions for families
CREATE TABLE trivia_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    session_name VARCHAR(100), -- Optional name for the session
    started_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    scores JSONB DEFAULT '{}', -- Object with user_id as key, score as value
    questions_used JSONB NOT NULL, -- Array of question IDs used in this session
    session_config JSONB DEFAULT '{"question_count": 10, "time_limit": 30}' -- Session configuration
);

-- Enable RLS on trivia_sessions table
ALTER TABLE trivia_sessions ENABLE ROW LEVEL SECURITY;

-- Individual trivia answers table - tracks each answer given during sessions
CREATE TABLE trivia_answers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES trivia_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    user_answer VARCHAR(255) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER, -- Time taken to answer in seconds
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id, user_id, question_id)
);

-- Enable RLS on trivia_answers table
ALTER TABLE trivia_answers ENABLE ROW LEVEL SECURITY;

-- Leaderboards table - tracks family member scores and streaks
CREATE TABLE leaderboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    last_played_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(family_id, user_id)
);

-- Enable RLS on leaderboards table
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- Memory Vault table - stores encrypted family memories and media
CREATE TABLE memory_vault (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('photo', 'video', 'note', 'document')),
    encrypted_file_path TEXT, -- Path to encrypted file in Supabase Storage
    file_size_bytes INTEGER,
    encryption_key_hint VARCHAR(255), -- Hint for family members to remember the key
    metadata JSONB DEFAULT '{}', -- Additional metadata (tags, date taken, etc.)
    is_archived BOOLEAN DEFAULT false, -- For soft deletion
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on memory_vault table
ALTER TABLE memory_vault ENABLE ROW LEVEL SECURITY;

-- Family achievements table - track family milestones and achievements
CREATE TABLE family_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL, -- 'games_played', 'streak', 'perfect_score', etc.
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier
    earned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who earned it (null for family achievements)
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}' -- Additional achievement data
);

-- Enable RLS on family_achievements table
ALTER TABLE family_achievements ENABLE ROW LEVEL SECURITY;

-- INDEXES FOR PERFORMANCE
-- Family members indexes
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_role ON family_members(family_id, role);

-- Questions indexes
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_active ON questions(is_active);
CREATE INDEX idx_questions_category_difficulty ON questions(category, difficulty, is_active);

-- Trivia sessions indexes
CREATE INDEX idx_trivia_sessions_family_id ON trivia_sessions(family_id);
CREATE INDEX idx_trivia_sessions_started_by ON trivia_sessions(started_by);
CREATE INDEX idx_trivia_sessions_completed ON trivia_sessions(completed);
CREATE INDEX idx_trivia_sessions_started_at ON trivia_sessions(started_at);

-- Trivia answers indexes
CREATE INDEX idx_trivia_answers_session_id ON trivia_answers(session_id);
CREATE INDEX idx_trivia_answers_user_id ON trivia_answers(user_id);
CREATE INDEX idx_trivia_answers_question_id ON trivia_answers(question_id);

-- Leaderboards indexes
CREATE INDEX idx_leaderboards_family_id ON leaderboards(family_id);
CREATE INDEX idx_leaderboards_total_score ON leaderboards(family_id, total_score DESC);
CREATE INDEX idx_leaderboards_current_streak ON leaderboards(family_id, current_streak DESC);

-- Memory vault indexes
CREATE INDEX idx_memory_vault_family_id ON memory_vault(family_id);
CREATE INDEX idx_memory_vault_created_by ON memory_vault(created_by);
CREATE INDEX idx_memory_vault_type ON memory_vault(memory_type);
CREATE INDEX idx_memory_vault_archived ON memory_vault(is_archived);

-- Family invites indexes
CREATE INDEX idx_family_invites_token ON family_invites(token);
CREATE INDEX idx_family_invites_email ON family_invites(email);
CREATE INDEX idx_family_invites_family_id ON family_invites(family_id);
CREATE INDEX idx_family_invites_expires_at ON family_invites(expires_at);

-- Family achievements indexes
CREATE INDEX idx_family_achievements_family_id ON family_achievements(family_id);
CREATE INDEX idx_family_achievements_type ON family_achievements(achievement_type);
CREATE INDEX idx_family_achievements_earned_by ON family_achievements(earned_by);

-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_families_updated_at
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memory_vault_updated_at
    BEFORE UPDATE ON memory_vault
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaderboards_updated_at
    BEFORE UPDATE ON leaderboards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- TRIGGER TO AUTOMATICALLY SET FAMILY INVITE CODE
CREATE OR REPLACE FUNCTION public.set_family_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code = public.generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_family_invite_code_trigger
    BEFORE INSERT ON families
    FOR EACH ROW EXECUTE FUNCTION public.set_family_invite_code();

-- TRIGGER TO AUTOMATICALLY CREATE LEADERBOARD ENTRY WHEN USER JOINS FAMILY
CREATE OR REPLACE FUNCTION public.create_leaderboard_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leaderboards (family_id, user_id)
    VALUES (NEW.family_id, NEW.user_id)
    ON CONFLICT (family_id, user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_leaderboard_entry_trigger
    AFTER INSERT ON family_members
    FOR EACH ROW EXECUTE FUNCTION public.create_leaderboard_entry();

-- RLS POLICIES

-- User Profiles Policies
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR ALL USING (id = auth.uid());

-- RLS Policy: Users can view their own family memberships
CREATE POLICY "Users can view their own family memberships" ON family_members
    FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Family admins can view all family memberships
CREATE POLICY "Family admins can view family memberships" ON family_members
    FOR SELECT USING (is_family_admin(family_id));

-- RLS Policy: Family admins can add members
CREATE POLICY "Family admins can add members" ON family_members
    FOR INSERT WITH CHECK (is_family_admin(family_id));

-- RLS Policy: Family admins can remove members
CREATE POLICY "Family admins can remove members" ON family_members
    FOR DELETE USING (is_family_admin(family_id));

-- RLS Policy: All authenticated users can read active questions
CREATE POLICY "Authenticated users can read questions" ON questions
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policy: Family members can view their family's trivia sessions
CREATE POLICY "Family members can view trivia sessions" ON trivia_sessions
    FOR SELECT USING (is_family_member(family_id));

-- RLS Policy: Family members can create trivia sessions
CREATE POLICY "Family members can create trivia sessions" ON trivia_sessions
    FOR INSERT WITH CHECK (is_family_member(family_id));

-- RLS Policy: Family members can update their family's trivia sessions
CREATE POLICY "Family members can update trivia sessions" ON trivia_sessions
    FOR UPDATE USING (is_family_member(family_id));

-- RLS Policy: Family members can view trivia answers for their sessions
CREATE POLICY "Family members can view trivia answers" ON trivia_answers
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM trivia_sessions 
            WHERE is_family_member(family_id)
        )
    );

-- RLS Policy: Users can insert their own trivia answers
CREATE POLICY "Users can insert their own trivia answers" ON trivia_answers
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policy: Family members can view their family's leaderboard
CREATE POLICY "Family members can view leaderboard" ON leaderboards
    FOR SELECT USING (is_family_member(family_id));

-- RLS Policy: System can update leaderboard entries (for game results)
CREATE POLICY "System can update leaderboard" ON leaderboards
    FOR ALL USING (is_family_member(family_id));

-- Update families RLS policy to include family membership
CREATE POLICY "Users can view families they belong to" ON families
    FOR SELECT USING (
        created_by = auth.uid() OR is_family_member(id)
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
-- Family admins can view invites for their families
CREATE POLICY "Family admins can view invites" ON family_invites
    FOR SELECT USING (is_family_admin(family_id));

-- Family admins can create invites for their families
CREATE POLICY "Family admins can create invites" ON family_invites
    FOR INSERT WITH CHECK (is_family_admin(family_id));

-- Service can read invites by token (for join process)
CREATE POLICY "Service can read invites by token" ON family_invites
    FOR SELECT USING (true);

-- Service can update invite usage
CREATE POLICY "Service can update invite usage" ON family_invites
    FOR UPDATE USING (true);

-- Memory Vault RLS Policies
-- Family members can view their family's memory vault items
CREATE POLICY "Family members can view their family memory vault" ON memory_vault
    FOR SELECT USING (is_family_member(family_id) AND is_archived = false);

-- Family members can insert memory vault items for their family
CREATE POLICY "Family members can create memory vault items" ON memory_vault
    FOR INSERT WITH CHECK (is_family_member(family_id));

-- Only the creator or family admin can update memory vault items
CREATE POLICY "Creator or admin can update memory vault items" ON memory_vault
    FOR UPDATE USING (
        created_by = auth.uid() OR is_family_admin(family_id)
    );

-- Only the creator or family admin can delete memory vault items
CREATE POLICY "Creator or admin can delete memory vault items" ON memory_vault
    FOR DELETE USING (
        created_by = auth.uid() OR is_family_admin(family_id)
    );

-- Family Achievements RLS Policies
-- Family members can view their family's achievements
CREATE POLICY "Family members can view achievements" ON family_achievements
    FOR SELECT USING (is_family_member(family_id));

-- System can create achievements (typically done by triggers or functions)
CREATE POLICY "System can create achievements" ON family_achievements
    FOR INSERT WITH CHECK (is_family_member(family_id));

-- UTILITY FUNCTIONS

-- Function to get family statistics
CREATE OR REPLACE FUNCTION public.get_family_stats(fam_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_members', (SELECT COUNT(*) FROM family_members WHERE family_id = fam_id),
        'total_games_played', (SELECT COUNT(*) FROM trivia_sessions WHERE family_id = fam_id AND completed = true),
        'total_questions_answered', (
            SELECT COUNT(*) 
            FROM trivia_answers ta 
            JOIN trivia_sessions ts ON ta.session_id = ts.id 
            WHERE ts.family_id = fam_id
        ),
        'average_score', (
            SELECT COALESCE(AVG(total_score), 0) 
            FROM leaderboards 
            WHERE family_id = fam_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update leaderboard after a game
CREATE OR REPLACE FUNCTION public.update_leaderboard_after_game(
    p_session_id UUID,
    p_user_id UUID,
    p_score INTEGER,
    p_total_questions INTEGER
)
RETURNS VOID AS $$
DECLARE
    fam_id UUID;
    is_winner BOOLEAN := false;
    current_streak INTEGER := 0;
BEGIN
    -- Get family_id from session
    SELECT family_id INTO fam_id FROM trivia_sessions WHERE id = p_session_id;
    
    -- Check if this user won (has highest score in this session)
    SELECT CASE 
        WHEN p_score = (
            SELECT MAX((scores->>user_key)::INTEGER)
            FROM trivia_sessions ts, 
                 json_each_text(ts.scores) AS scores(user_key, score)
            WHERE ts.id = p_session_id
        ) THEN true ELSE false
    END INTO is_winner;
    
    -- Update leaderboard
    INSERT INTO leaderboards (family_id, user_id, total_score, games_played, games_won, current_streak, average_score)
    VALUES (fam_id, p_user_id, p_score, 1, CASE WHEN is_winner THEN 1 ELSE 0 END, CASE WHEN is_winner THEN 1 ELSE 0 END, p_score)
    ON CONFLICT (family_id, user_id) 
    DO UPDATE SET
        total_score = leaderboards.total_score + p_score,
        games_played = leaderboards.games_played + 1,
        games_won = leaderboards.games_won + CASE WHEN is_winner THEN 1 ELSE 0 END,
        current_streak = CASE 
            WHEN is_winner THEN leaderboards.current_streak + 1 
            ELSE 0 
        END,
        best_streak = GREATEST(
            leaderboards.best_streak, 
            CASE WHEN is_winner THEN leaderboards.current_streak + 1 ELSE leaderboards.current_streak END
        ),
        average_score = (leaderboards.total_score + p_score) / (leaderboards.games_played + 1),
        last_played_at = now(),
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SEED DATA FOR QUESTIONS (you can expand this)
INSERT INTO questions (category, question, choices, answer, difficulty) VALUES
('General Knowledge', 'What is the capital of France?', '["Paris", "London", "Berlin", "Madrid"]', 'Paris', 'easy'),
('Science', 'What is the chemical symbol for gold?', '["Go", "Gd", "Au", "Ag"]', 'Au', 'medium'),
('History', 'In which year did World War II end?', '["1944", "1945", "1946", "1947"]', '1945', 'medium'),
('Geography', 'Which is the largest ocean on Earth?', '["Atlantic", "Indian", "Arctic", "Pacific"]', 'Pacific', 'easy'),
('Sports', 'How many players are there in a basketball team on the court?', '["4", "5", "6", "7"]', '5', 'easy'),
('Literature', 'Who wrote "Romeo and Juliet"?', '["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"]', 'William Shakespeare', 'easy'),
('Science', 'What is the hardest natural substance on Earth?', '["Gold", "Iron", "Diamond", "Quartz"]', 'Diamond', 'medium'),
('Movies', 'Which movie won the Academy Award for Best Picture in 2020?', '["Parasite", "1917", "Joker", "Once Upon a Time in Hollywood"]', 'Parasite', 'hard'),
('Music', 'Which instrument has 88 keys?', '["Guitar", "Violin", "Piano", "Flute"]', 'Piano', 'easy'),
('Food', 'Which spice is derived from the Crocus flower?', '["Turmeric", "Saffron", "Paprika", "Cinnamon"]', 'Saffron', 'hard'); 