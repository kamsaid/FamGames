# 🏠 Family Together

A real-time, multiplayer trivia application designed to strengthen family bonds through nightly 5-minute gaming rituals.

## 🎯 Project Overview

Family Together is a comprehensive trivia platform that brings families together through:
- **Real-time multiplayer trivia sessions** via WebSocket connections
- **Family management system** with secure invitations
- **Progressive leaderboards** with streak tracking
- **AI-generated trivia content** using GPT-4o
- **Cross-platform support** (Web and React Native planned)

## 🏗️ Architecture

This project follows a modular architecture with:

- **Backend**: Node.js/Express API with Socket.IO for real-time features
- **Database**: Supabase with Row Level Security (RLS)
- **Authentication**: Magic link authentication via Supabase Auth
- **Real-time**: WebSocket game rooms for multiplayer trivia
- **Frontend**: React Native (planned)

## 📁 Project Structure

```
family-together/
├── backend/                    # Node.js API server
│   ├── controllers/           # Business logic controllers
│   ├── routes/               # API route definitions
│   ├── services/             # Core services (GameService, etc.)
│   ├── middlewares/          # Authentication & validation
│   ├── utils/                # Helper utilities
│   └── test-*.js             # Test scripts
├── supabase/                 # Database schema and policies
├── architecture.md          # System architecture documentation
├── tasks.md                 # Development task breakdown
└── README.md                # This file
```

## 🚀 Current Development Status

### ✅ Completed (Phases 1-5)

- **Phase 1**: Supabase database setup with RLS policies
- **Phase 2**: Magic link authentication system
- **Phase 3**: Family management (create, invite, join)
- **Phase 4**: Trivia game engine (start sessions, submit answers, scoring)
- **Phase 5**: WebSocket server with real-time game rooms (**Tasks 15-16 Complete**)
  - ✅ Task 15: WebSocket server setup
  - ✅ Task 16: `join-room` event implementation

### 🔄 In Progress (Phase 5 continued)

- **Task 17**: `start-game` event implementation
- **Task 18**: `submit-answer` socket event
- **Task 19**: `end-game` event

### 📋 Upcoming Phases

- **Phase 6**: React Native frontend
- **Phase 7**: GPT-4o trivia generation
- **Phase 8**: Final touches and Memory Vault

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   Create `.env` file:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

4. **Database setup**
   - Apply schema from `supabase/schema.sql` in Supabase SQL editor
   - Seed questions using `supabase/seed_questions.sql`

5. **Start development server**
   ```bash
   npm run dev
   ```

### Testing

The project includes comprehensive test suites:

```bash
# Test family management
node test-families.js

# Test trivia functionality  
node test-trivia.js

# Test WebSocket connections
node test-websocket.js

# Test join-room event
node test-join-room.js
```

## 🎮 WebSocket Real-time Features

Current WebSocket implementation supports:

- **Connection management** on `/game` namespace
- **Room creation and joining** via `join-room` event
- **Real-time player notifications** when users join/leave
- **Automatic host assignment** and migration
- **Comprehensive error handling** and validation

### Example Usage

```javascript
const socket = io('http://localhost:3001/game');

// Join a family game room
socket.emit('join-room', {
  familyId: 'family-uuid',
  userId: 'user-uuid', 
  playerName: 'Player Name'
});

// Listen for room events
socket.on('room-joined', (data) => {
  console.log('Joined room:', data.room);
});

socket.on('player-joined', (data) => {
  console.log('New player:', data.newPlayer);
});
```

## 📚 Documentation

- **[Backend API Documentation](backend/README.md)** - Complete API reference
- **[Architecture Overview](architecture.md)** - System design and data flow
- **[Development Tasks](tasks.md)** - Phase-by-phase implementation plan

## 🤝 Contributing

This is currently a private development project. For questions or collaboration inquiries, please contact the maintainer.

## 📄 License

Private project - All rights reserved.

---

**Built with ❤️ for families who game together** 