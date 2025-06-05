# Expo Magic Link Authentication Fix

## Problem
Magic link redirects to `localhost:3000/?code=...` but shows blank page instead of launching Expo app.

## Solution

### 1. ✅ Updated Code (Already Done)
- Modified `App.tsx` to detect auth code in URL parameters
- Updated `WebAuthCallback.tsx` to handle authorization code flow
- Added proper code exchange logic

### 2. Update Supabase Redirect URLs

Go to [Supabase Dashboard](https://app.supabase.com/) → Authentication → URL Configuration:

**Replace your current redirect URLs with these:**

For Expo Web (when running `npx expo start --web`):
```
http://localhost:19006/
http://localhost:19006/auth/callback
```

For Expo with custom port (if using `--port 3000`):
```
http://localhost:3000/
http://localhost:3000/auth/callback
```

For Expo on different ports:
```
http://localhost:8081/
http://localhost:8081/auth/callback
```

**Set Site URL to:**
```
http://localhost:19006
```
(Or whatever port your Expo web is running on)

### 3. Start Expo on the Correct Port

Option A: Use default Expo port (19006)
```bash
cd frontend
npx expo start --web
```

Option B: Force port 3000 to match current setup
```bash
cd frontend
npx expo start --web --port 3000
```

### 4. Test the Flow

1. Start your backend:
   ```bash
   cd backend
   npm start
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npx expo start --web --port 3000
   ```

3. Open your web app in browser
4. Try to sign in with magic link
5. Check email and click the magic link
6. Should now redirect back to your Expo app properly

### 5. Troubleshooting

**If still getting blank page:**
- Check browser console for errors
- Verify the redirect URL in Supabase matches your Expo port exactly
- Make sure your Expo app is running when you click the magic link

**If getting "Can't connect" error:**
- Your Expo app isn't running
- Port mismatch between Supabase redirect and Expo

**Common Port Configurations:**
- Expo default web: `19006`
- Expo with Metro: `8081` 
- Custom port: `3000` (if specified)

### 6. Update Backend Auth Route (Optional)

If you want to ensure consistency, update your backend auth route in `backend/routes/auth.js`:

```javascript
emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:19006'}/auth/callback`
```

Make sure your backend `.env` has:
```env
FRONTEND_URL=http://localhost:19006
```
(Or whatever port your Expo is running on)

## Next Steps

1. Update Supabase redirect URLs to match your Expo port
2. Restart your Expo app
3. Test magic link authentication
4. Verify successful redirect and login

The authentication should now work properly! 🎉 