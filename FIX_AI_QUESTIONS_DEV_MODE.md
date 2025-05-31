# Fix AI Questions in Dev Mode

## Issue
The AI generated questions feature shows mock questions in dev test mode because the frontend bypasses the socket connection and uses hardcoded mock questions.

## Solution Applied

### Code Changes Made
1. **Modified `frontend/contexts/GameRoomContext.tsx`**:
   - Removed the dev bypass logic in `startGame` function that was fetching local questions
   - Removed the dev bypass logic in `submitAnswer` function that was handling answers locally
   - Now both functions use the socket connection regardless of dev mode
   - This ensures AI generation is triggered through the backend

### 1. Configure OpenAI API Key
Create a `.env` file in the `backend` directory with your OpenAI API key:

```bash
# backend/.env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
OPENAI_API_KEY=your-actual-openai-api-key
NODE_ENV=development
PORT=5000
```

### 2. Modify Frontend to Use Socket Connection in Dev Mode

The frontend has been modified to always use the socket connection for game questions, even in dev mode.

### 3. Ensure Backend is Running
Make sure your backend server is running and can connect to OpenAI:

```bash
cd backend
npm start
```

Check the server logs for:
- "🤖 Generating AI questions with topics:"
- "✅ AI questions generated successfully"

### 4. Test the Feature

1. Start the app in dev mode
2. Join the trivia lobby
3. Click "Start Test Game" (or "Start Game" if you have multiple players)
4. Watch the backend logs - you should see AI generation attempts
5. The game should now show AI-generated questions instead of mock questions

## Troubleshooting

If you still see mock questions:

1. **Check OpenAI API Key**: Ensure it's valid and has credits
2. **Check Backend Logs**: Look for error messages about AI generation
3. **Check Network Tab**: Ensure socket events are being sent/received
4. **Database Fallback**: If AI fails, it will try to fetch from database
5. **Ultimate Fallback**: If all else fails, hardcoded questions are used

## Quick Fix for Testing

If you want to quickly test AI questions without modifying code, you can:

1. Populate your database with AI-generated questions using the script:
   ```bash
   cd backend
   node scripts/generate-initial-questions.js
   ```

2. The game will then fetch these AI-generated questions from the database even if real-time AI generation fails.

## Expected Behavior

When AI generation works correctly:
- Backend logs show "🤖 Generating AI questions"
- Questions will be personalized based on topics/age group/difficulty
- Questions will have fun facts and hints
- Generation source will be "ai-personalized" in the game metadata
- You'll see a toast notification saying "AI-Powered Questions!" 