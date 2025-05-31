# Development Bypass Guide

## Overview
This guide explains how to bypass the "waiting for players" screen during development and testing of the trivia app.

## Features Added

### 1. **Automatic Dev Bypass Mode**
When running the app in development mode (`__DEV__` is true), the app will automatically:
- Create a mock user session after 2 seconds if no real authentication exists
- Enable test mode in the TriviaLobbyScreen
- Allow single-player game starts

### 2. **Test Mode in Trivia Lobby**
When dev bypass is active, the TriviaLobbyScreen will:
- Show a "🚧 Dev Test Mode Active" indicator
- Display "Start Test Game 🚧" button that bypasses all player requirements
- Treat the dev user as an admin automatically

### 3. **Mock Game Data**
When starting a game in dev mode:
- Creates a mock player automatically
- Fetches questions from the database if available
- Falls back to mock questions if database is empty or unavailable
- Navigates to TriviaGameScreen when game starts

## How to Use

### Option 1: Automatic Mode (Recommended)
1. Start the app in development mode: `npm start`
2. Wait 2 seconds for automatic dev bypass activation
3. You'll see your mock user (dev@example.com) in the lobby
4. Click "Start Test Game 🚧" to begin testing immediately

### Option 2: Manual Bypass
If automatic bypass doesn't activate:
1. Look for the "🚧 Skip Loading (Dev)" button on the loading screen
2. Click it to activate dev bypass manually

## What Happens in Dev Mode

1. **Mock User Created**: 
   - Email: `dev@example.com`
   - ID: `550e8400-e29b-41d4-a716-446655440000`
   - Role: Admin (automatically)

2. **Skip Requirements**:
   - No need to wait for other players
   - No need for socket connection
   - No need for real authentication

3. **Test Game Flow**:
   - Questions are fetched from Supabase if available
   - Falls back to mock questions if needed
   - Full game navigation works normally

## Disabling Dev Bypass

To disable dev bypass and test normal authentication flow:

1. Edit `frontend/contexts/AuthContext.tsx`
2. Change line 22:
   ```typescript
   const ENABLE_DEV_BYPASS = __DEV__ && false; // Set to false to disable bypass
   ```

## Troubleshooting

### Bypass Not Working?
- Ensure you're running in development mode
- Check console logs for "🚧 Development" messages
- Try the manual bypass button on loading screen

### Game Not Starting?
- Check if questions exist in your Supabase database
- Look for console errors about question fetching
- The app will use mock questions as fallback

### Navigation Issues?
- Ensure TriviaGameScreen component exists
- Check console for navigation errors
- Verify all screens are properly imported in MainNavigator

## Console Messages
Look for these development indicators:
- `🚧 Development Bypass: Creating mock user session`
- `🚧 Dev bypass detected, enabling test mode`
- `🚧 Dev test mode: Starting game immediately`
- `[dev] startGame: triggering local game start`
- `🎮 Game is active, navigating to TriviaGame screen` 