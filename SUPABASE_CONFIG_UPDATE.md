# Supabase Configuration Update Guide

## 1. Update Backend .env File

Add or update these values in your `backend/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://qygifhupmiizivxtmsug.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Nzc3MjQsImV4cCI6MjA2NDA1MzcyNH0.nCBVpLHjc0KZ6-E41kAuPuFLUQ-NgHTA_gFka4iNLzI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ3NzcyNCwiZXhwIjoyMDY0MDUzNzI0fQ.bxK2JybgsLYz2aUhvn8BAbILHNwcXwuB2qfopEtlQ8w

# OpenAI Configuration (if you want AI questions)
OPENAI_API_KEY=<your-openai-api-key>

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

## 2. Get Your Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `qygifhupmiizivxtmsug`
3. Go to Settings → API
4. Copy the `service_role` key (keep this secret!)
5. Replace `<get-from-supabase-dashboard>` in your `.env` file

## 3. Update Supabase Redirect URLs

### For Local Development:

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Authentication → URL Configuration
4. Add these Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000
   http://localhost:19006/auth/callback
   http://localhost:19006
   exp://localhost:19000/--/auth/callback
   exp://localhost:8081/--/auth/callback
   ```

### For Production (when ready):

Add your production URLs:
```
https://yourdomain.com/auth/callback
https://yourdomain.com
```

## 4. Update Site URL

In the same URL Configuration page:
- Set Site URL to: `http://localhost:3000` (for development)
- For production, update to your actual domain

## 5. Update MCP Configuration

Your MCP configuration in `~/.cursor/mcp.json` should be updated to:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb",
      "env": {}
    },
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-postgrest@latest",
        "--apiUrl",
        "https://qygifhupmiizivxtmsug.supabase.co/rest/v1",
        "--apiKey",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Nzc3MjQsImV4cCI6MjA2NDA1MzcyNH0.nCBVpLHjc0KZ6-E41kAuPuFLUQ-NgHTA_gFka4iNLzI",
        "--schema",
        "public"
      ]
    }
  }
}
```

## 6. Verify Configuration

After updating everything:

1. **Test Backend Connection:**
   ```bash
   cd backend
   npm start
   ```
   You should see: `✅ Supabase connection established successfully`

2. **Test Frontend Auth:**
   - Start the frontend: `cd frontend && npm start`
   - Try signing in with magic link
   - Check that the redirect works properly

## 7. Common Issues & Solutions

### Magic Link Not Working?
- Ensure all redirect URLs are added in Supabase
- Check that `FRONTEND_URL` in backend `.env` matches your actual frontend URL
- For web, ensure you're using `http://localhost:3000` not `http://127.0.0.1:3000`

### WebCrypto Issues?
- The app is configured to use `implicit` flow in development to avoid WebCrypto issues
- This is handled automatically in `frontend/services/supabase.ts`

### Mobile Deep Links?
- For Expo Go, the redirect URL should be: `exp://localhost:19000/--/auth/callback`
- For custom dev client, adjust the port accordingly

## 8. Email Templates (Optional)

To customize magic link emails:
1. Go to Authentication → Email Templates in Supabase
2. Customize the "Magic Link" template
3. Ensure the link uses `{{ .ConfirmationURL }}` token

## Next Steps

1. Copy the service role key from Supabase dashboard
2. Update your backend `.env` file
3. Add all redirect URLs in Supabase
4. Restart your backend server
5. Test the authentication flow

Remember to never commit your `.env` file to version control! 


SUPABASE_URL=https://qygifhupmiizivxtmsug.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0Nzc3MjQsImV4cCI6MjA2NDA1MzcyNH0.nCBVpLHjc0KZ6-E41kAuPuFLUQ-NgHTA_gFka4iNLzI
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5Z2lmaHVwbWlpeml2eHRtc3VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODQ3NzcyNCwiZXhwIjoyMDY0MDUzNzI0fQ.bxK2JybgsLYz2aUhvn8BAbILHNwcXwuB2qfopEtlQ8w
