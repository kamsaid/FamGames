# 🏠 Family Together

A real-time trivia app that brings families together through nightly 5-minute game sessions.

## 🚀 Features

- **Magic Link Authentication**: Secure, passwordless login
- **Family Management**: Create and join family groups  
- **Real-time Trivia Games**: Live multiplayer trivia sessions
- **Dynamic Leaderboards**: Track scores and streaks
- **Memory Vault**: Encrypted family photos and memories (AES-256)
- **AI-Generated Content**: GPT-4o powered trivia questions

## 📋 Project Status

### ✅ Completed Phases

- **Phase 1**: Supabase Setup ✅
- **Phase 2**: Magic Link Auth ✅  
- **Phase 3**: Family Management ✅
- **Phase 4**: Trivia Game Engine ✅
- **Phase 5**: Real-time Game Rooms (WebSockets) ✅
- **Phase 6**: React Native Frontend ✅
- **Phase 7**: GPT Trivia Generation ✅
- **Phase 8**: Final Touches ✅
  - ✅ Task 28: Streak tracking added to leaderboard
  - ✅ Task 29: Memory Vault with encryption implemented
  - ✅ Task 30: End-to-End testing completed

## 🏗️ Architecture

```
[React Native App]
    │
    ├── Supabase Auth (login, user data)
    ├── REST API (Node.js) – trivia, leaderboard, magic links
    └── WebSocket – real-time game events
          │
       [Node.js Backend]── GPT-4o Prompting
          │
       [Supabase] ←→ [Redis] (realtime, pub/sub, game rooms)
```

## 🛠️ Setup & Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- OpenAI API key (for trivia generation)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm start
```

### Frontend Setup  

```bash
cd frontend
npm install
npx expo start
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

## 🧪 Testing

### End-to-End Testing (Task 30)

Run the comprehensive E2E test that validates the complete family trivia game flow:

```bash
# Automated E2E Test
node run-e2e-test.js

# Show manual testing instructions
node run-e2e-test.js --manual
```

### E2E Test Coverage

The automated E2E test (`test-e2e-full-flow.js`) validates:

1. **Family Creation** - Create a test family
2. **Member Management** - Add family members
3. **WebSocket Connections** - Real-time connectivity
4. **Game Room Join** - Players joining game rooms
5. **Trivia Game Start** - Host starting a game session
6. **Answer Submission** - Players submitting answers
7. **Game Completion** - Ending games and score calculation
8. **Leaderboard Updates** - Score persistence and ranking
9. **Streak Tracking** - Consecutive game streak validation

## 📱 Usage

### Creating a Family

1. Open the app and enter your email
2. Check your email for the magic link
3. Tap "Create Family" and enter a family name
4. Share the invite link with family members

### Playing Trivia

1. Navigate to the trivia lobby
2. Wait for family members to join
3. Host starts the game
4. Answer 5 questions within the time limit
5. View updated leaderboard with scores and streaks

### Memory Vault

1. Navigate to Memory Vault
2. Upload photos or create text memories
3. All content is automatically encrypted (AES-256)
4. Share memories with family members

## 🔒 Security Features

- **Row-Level Security (RLS)** on all Supabase tables
- **Magic Link Authentication** with token expiration
- **End-to-End Encryption** for Memory Vault content
- **Rate Limiting** on all API endpoints
- **Input Validation** and sanitization

## 📊 Leaderboard & Streaks

The app tracks:
- **Total Score**: Cumulative points across all games
- **Current Streak**: Consecutive days with game participation  
- **Best Streak**: Longest recorded consecutive streak
- **Games Played**: Total number of trivia sessions

## 🎯 API Endpoints

### Authentication
- `POST /auth/magic-link` - Generate magic link
- `POST /auth/verify-link` - Validate magic link token

### Family Management  
- `POST /families/create` - Create new family
- `POST /families/invite` - Send family invitation
- `POST /families/join` - Join family via invite

### Trivia Games
- `POST /trivia/start-session` - Start new trivia session
- `POST /trivia/submit-answer` - Submit answer
- `POST /trivia/complete-session` - End trivia session
- `POST /trivia/generate` - Generate AI trivia questions

### Leaderboards
- `GET /leaderboard/:familyId` - Get family leaderboard

### WebSocket Events
- `join-room` - Join game room
- `start-game` - Host starts game
- `submit-answer` - Submit answer in real-time
- `end-game` - End current game

## 🤖 AI Integration

The app uses GPT-4o to generate trivia questions with:
- **Mixed difficulty levels** (easy, medium, hard)
- **Multiple categories** (general knowledge, pop culture, history, etc.)
- **Family-friendly content** suitable for all ages
- **Dynamic question generation** based on family preferences

## 📈 Performance & Scalability

- **WebSocket rooms** for real-time game sessions
- **Supabase connection pooling** for database efficiency
- **Rate limiting** to prevent API abuse
- **Caching** for frequently accessed trivia questions
- **Optimized React Native** performance with proper state management

## 🔧 Development

### Project Structure

```
family-together/
├── frontend/          # React Native app
├── backend/           # Node.js API server
├── supabase/          # Database schema and policies
└── shared/            # Shared TypeScript types
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the E2E tests: `node run-e2e-test.js`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎮 Start bringing your family together with nightly trivia fun!** 