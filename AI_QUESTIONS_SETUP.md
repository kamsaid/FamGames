# AI-Powered Questions Setup Guide

## What We've Implemented

The app now supports AI-generated trivia questions using OpenAI's GPT-4o model. When you start a game, it will:

1. **Send Topics to Backend**: The frontend now sends topics, difficulty, and age group when starting a game
2. **Generate AI Questions**: If configured, the backend will use OpenAI to generate personalized questions
3. **Show Question Source**: The app will notify you whether questions are AI-generated or from the database

## Current Status

### ✅ Frontend Changes
- Updated `GameRoomContext` to send game options (topics, difficulty, age group)
- Updated `TriviaLobbyScreen` to send hardcoded topics when starting a game:
  - Topics: `['science', 'animals', 'pop_culture', 'geography', 'riddles']`
  - Difficulty: `'intermediate'`
  - Age Group: `'mixed'`
- Added metadata tracking to show question source

### ✅ Backend Implementation
- AI service is fully implemented with:
  - Topic-based question generation
  - Age-appropriate content
  - Difficulty adjustment
  - Smart caching (24-hour cache)
  - Multiple fallback options

## To Enable AI Questions

### 1. Backend Configuration Required

You need to create a `.env` file in the `backend` directory with:

```env
# OpenAI Configuration (REQUIRED for AI questions)
OPENAI_API_KEY=your-actual-openai-api-key-here

# Supabase Configuration (optional but recommended)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 2. Get Your OpenAI API Key

1. Go to [https://platform.openai.com/](https://platform.openai.com/)
2. Sign up or log in
3. Go to [API Keys](https://platform.openai.com/api-keys)
4. Create a new secret key
5. Copy and paste it into your `.env` file

**Important**: OpenAI API usage costs money. Each game costs approximately $0.01-0.02.

### 3. Restart Your Backend

```bash
cd backend
npm start
```

## How It Works

When you click "Start Test Game" in the app:

1. **Frontend sends**: Topics, difficulty, and age group to the backend
2. **Backend tries**:
   - First: Generate AI questions using OpenAI (if API key is configured)
   - Second: Fetch questions from Supabase database (if configured)
   - Third: Use simpler AI generation as fallback
   - Last: Use hardcoded questions if everything fails

3. **You'll see**:
   - "AI-Powered Questions!" toast if AI generation succeeds
   - "Classic Questions" if using database questions
   - Hardcoded test questions if no API key is configured

## Verifying It Works

1. **Check Backend Logs**:
   ```
   🤖 Generating AI questions with topics: [ 'science', 'animals', 'pop_culture', 'geography', 'riddles' ]
   ✅ AI questions generated successfully
   ```

2. **Check Frontend**:
   - You should see a toast notification about the question source
   - Questions should be relevant to the topics sent
   - Questions should include fun facts and hints

## Troubleshooting

### Still Seeing Mock Questions?

1. **No .env file**: Create `backend/.env` with your OpenAI API key
2. **Invalid API key**: Check if your key is correct
3. **No OpenAI billing**: Ensure you have billing set up on OpenAI
4. **Check logs**: Look for error messages in the backend console

### Common Errors

- `⚠️ Error generating questions: Error: Incorrect API key provided`
  → Your OpenAI API key is invalid

- `⚠️ Using fallback test questions`
  → AI generation failed, using hardcoded questions

- `📚 Fetching questions from database`
  → No AI key, trying database instead

## Next Steps

1. **Add Topic Selection UI**: Currently topics are hardcoded, you could add a selection screen
2. **Configure Supabase**: Set up database for question caching
3. **Run Question Generator**: Use `npm run generate:questions` to pre-populate database
4. **Monitor Costs**: Check OpenAI dashboard for API usage

## Cost Optimization

- Questions are cached for 24 hours per family/difficulty combination
- Reusing the same topics/difficulty won't make new API calls
- Consider pre-generating questions with the script to avoid runtime costs 