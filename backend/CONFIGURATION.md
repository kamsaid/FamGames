# Backend Configuration Guide

## Required Environment Variables

To enable AI-powered trivia questions, you need to configure the following environment variables in your `backend/.env` file:

### 1. Create .env file

```bash
cd backend
cp .env.example .env
```

If `.env.example` doesn't exist, create `.env` with the following content:

```env
# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration (Required for AI-powered questions)
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 2. Get Your API Keys

#### OpenAI API Key (Required for AI Questions)
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key and paste it in your `.env` file

**Note**: OpenAI API usage is paid. Make sure you have billing set up.

#### Supabase Keys
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings → API
4. Copy:
   - `URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Test Your Configuration

Start the backend server:

```bash
npm start
```

You should see:
```
🚀 Family Together API running on port 3001
🎮 WebSocket server listening on /game namespace
```

### 4. Verify AI Generation

The AI trivia generation will work when:
1. OpenAI API key is valid
2. Topics are sent when starting a game
3. Supabase is configured (optional, for caching)

## Troubleshooting

### AI Questions Not Working?

1. **Check OpenAI API Key**
   ```bash
   # Test your API key
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

2. **Check Server Logs**
   Look for these messages:
   - `🤖 Generating AI questions with topics: [...]`
   - `✅ AI questions generated successfully`
   - `⚠️ Error generating questions:` (indicates API issues)

3. **Common Issues**
   - Invalid API key: "Incorrect API key provided"
   - No billing: "You exceeded your current quota"
   - Rate limits: "Rate limit reached"

### Fallback Behavior

If AI generation fails, the system will:
1. Try to fetch questions from Supabase database
2. Use fallback AI generation (simpler prompts)
3. Use hardcoded questions as last resort

You'll see in the logs:
- `📚 Fetching questions from database` (database fallback)
- `⚠️ Using fallback test questions` (hardcoded fallback)

## Cost Optimization

To reduce OpenAI API costs:

1. **Enable Caching** (default: on)
   - Questions are cached for 24 hours per family/difficulty combination
   - Reduces API calls by ~80%

2. **Use the Question Generator Script**
   ```bash
   npm run generate:questions
   ```
   This pre-generates questions and stores them in the database.

3. **Monitor Usage**
   - Check OpenAI dashboard for usage
   - Each game typically uses ~1,000-2,000 tokens
   - Cost: ~$0.01-0.02 per game with GPT-4o

## Security Notes

- Never commit your `.env` file to git
- Keep your `service_role` key secret (it bypasses RLS)
- Rotate API keys regularly
- Use environment-specific keys for production 