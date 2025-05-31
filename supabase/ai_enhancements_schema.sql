-- AI Enhancement Tables for Family Together

-- Table to track AI usage for analytics and cost management
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  model VARCHAR(50) NOT NULL,
  questions_generated INTEGER NOT NULL,
  personalized BOOLEAN DEFAULT false,
  cached BOOLEAN DEFAULT false,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store family preferences for AI personalization
CREATE TABLE family_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  age_group VARCHAR(20) DEFAULT 'mixed', -- kids, teens, adults, mixed
  preferred_difficulty VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
  preferred_categories JSONB DEFAULT '[]', -- array of category preferences
  family_interests TEXT[], -- array of family interests/hobbies
  excluded_topics TEXT[], -- topics to avoid
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50) DEFAULT 'UTC',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced questions table with AI metadata
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generation_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS fun_fact TEXT,
ADD COLUMN IF NOT EXISTS hint TEXT,
ADD COLUMN IF NOT EXISTS time_limit INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5, 2);

-- Table to track question performance by family
CREATE TABLE question_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  average_time_seconds DECIMAL(5, 2),
  last_shown TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, family_id)
);

-- Table for AI-generated insights and recommendations
CREATE TABLE family_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL, -- performance, recommendation, achievement
  insight_data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  viewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for themed trivia packs
CREATE TABLE trivia_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_name VARCHAR(100) NOT NULL,
  theme_description TEXT,
  available_from DATE,
  available_until DATE,
  question_ids UUID[],
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for family achievements and challenges
CREATE TABLE family_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  progress DECIMAL(5, 2) DEFAULT 0, -- percentage progress
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  reward_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_usage_family_timestamp ON ai_usage_logs(family_id, timestamp DESC);
CREATE INDEX idx_question_performance_family ON question_performance(family_id);
CREATE INDEX idx_family_insights_family_type ON family_insights(family_id, insight_type);
CREATE INDEX idx_questions_metadata ON questions USING GIN (metadata);
CREATE INDEX idx_family_achievements_family_type ON family_achievements(family_id, achievement_type);

-- Row Level Security Policies

-- AI usage logs (read-only for family members)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_usage_family_read ON ai_usage_logs
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family preferences (family members can read, admins can update)
ALTER TABLE family_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY family_prefs_read ON family_preferences
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY family_prefs_update ON family_preferences
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Question performance (read-only for family members)
ALTER TABLE question_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY question_perf_read ON question_performance
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family insights (family members can read and mark as viewed)
ALTER TABLE family_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY insights_read ON family_insights
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY insights_update_viewed ON family_insights
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (viewed = true); -- Can only update to mark as viewed

-- Family achievements (read-only for family members)
ALTER TABLE family_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY achievements_read ON family_achievements
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Functions for AI features

-- Function to update question success rate
CREATE OR REPLACE FUNCTION update_question_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the success rate for the question
  UPDATE questions
  SET success_rate = (
    SELECT 
      CASE 
        WHEN SUM(times_shown) > 0 
        THEN (SUM(times_correct)::DECIMAL / SUM(times_shown)::DECIMAL) * 100
        ELSE 0
      END
    FROM question_performance
    WHERE question_id = NEW.question_id
  )
  WHERE id = NEW.question_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update question success rate
CREATE TRIGGER update_question_stats
AFTER INSERT OR UPDATE ON question_performance
FOR EACH ROW
EXECUTE FUNCTION update_question_success_rate();

-- Function to generate family performance summary
CREATE OR REPLACE FUNCTION get_family_performance_summary(p_family_id UUID)
RETURNS TABLE (
  total_games INTEGER,
  total_questions INTEGER,
  average_score DECIMAL,
  best_category VARCHAR,
  improvement_needed VARCHAR,
  current_streak INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH family_stats AS (
    SELECT 
      COUNT(DISTINCT ts.id) as game_count,
      COUNT(DISTINCT unnest(ts.questions_used)) as question_count,
      AVG(
        CASE 
          WHEN jsonb_typeof(ts.scores) = 'object' 
          THEN (
            SELECT AVG(value::DECIMAL)
            FROM jsonb_each_text(ts.scores)
          )
          ELSE 0
        END
      ) as avg_score
    FROM trivia_sessions ts
    WHERE ts.family_id = p_family_id
    AND ts.completed = true
  ),
  category_performance AS (
    SELECT 
      q.category,
      AVG(qp.times_correct::DECIMAL / NULLIF(qp.times_shown, 0)) as success_rate
    FROM question_performance qp
    JOIN questions q ON q.id = qp.question_id
    WHERE qp.family_id = p_family_id
    AND qp.times_shown > 0
    GROUP BY q.category
  ),
  best_category AS (
    SELECT category
    FROM category_performance
    ORDER BY success_rate DESC
    LIMIT 1
  ),
  worst_category AS (
    SELECT category
    FROM category_performance
    ORDER BY success_rate ASC
    LIMIT 1
  ),
  streak_data AS (
    SELECT MAX(current_streak) as max_streak
    FROM leaderboards
    WHERE family_id = p_family_id
  )
  SELECT 
    fs.game_count::INTEGER,
    fs.question_count::INTEGER,
    ROUND(fs.avg_score, 2),
    bc.category::VARCHAR,
    wc.category::VARCHAR,
    COALESCE(sd.max_streak, 0)::INTEGER
  FROM family_stats fs
  CROSS JOIN best_category bc
  CROSS JOIN worst_category wc
  CROSS JOIN streak_data sd;
END;
$$ LANGUAGE plpgsql; 