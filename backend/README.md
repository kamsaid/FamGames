# Family Together Backend API

A Node.js/Express backend for the Family Together trivia application with Supabase integration and real-time WebSocket game rooms.

## Features

- **Authentication**: JWT-based authentication using Supabase Auth
- **Family Management**: Create families, invite members, and manage family relationships
- **Trivia Game Engine**: Start sessions, submit answers, and track scores
- **Real-time Game Rooms**: WebSocket-powered multiplayer trivia sessions
- **Role-based Access**: Admin and member roles with appropriate permissions
- **Secure Invitations**: Token-based family invitations with expiration
- **Database Integration**: Full Supabase integration with Row Level Security (RLS)

## API Endpoints

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-supabase-jwt-token>
```

### Trivia Game

#### POST `/trivia/start-session`
Start a new trivia session for a family. Returns 5 random questions.

**Request Body:**
```json
{
  "family_id": "family-uuid"
}
```

**Response:**
```json
{
  "message": "Trivia session started successfully",
  "session": {
    "id": "session-uuid",
    "family_id": "family-uuid",
    "started_at": "timestamp",
    "questions": [
      {
        "id": "question-uuid",
        "category": "Science",
        "question": "How many legs does a spider have?",
        "choices": ["6", "8", "10", "12"],
        "difficulty": "medium"
      }
    ]
  }
}
```

#### POST `/trivia/submit-answer`
Submit an answer for a trivia question in an active session.

**Request Body:**
```json
{
  "session_id": "session-uuid",
  "question_id": "question-uuid",
  "answer": "8"
}
```

**Response:**
```json
{
  "message": "Answer submitted successfully",
  "correct": true,
  "correct_answer": "8",
  "current_score": 1
}
```

#### POST `/trivia/complete-session`
Complete a trivia session and update the family leaderboard.

**Request Body:**
```json
{
  "session_id": "session-uuid"
}
```

**Response:**
```json
{
  "message": "Session completed successfully",
  "final_scores": {
    "user-uuid-1": 4,
    "user-uuid-2": 3
  },
  "leaderboard": [
    {
      "id": "leaderboard-uuid",
      "family_id": "family-uuid",
      "user_id": "user-uuid",
      "score": 15,
      "streak": 3,
      "last_played_at": "timestamp"
    }
  ]
}
```

### Family Management

#### GET `/families`
Get all families that the authenticated user belongs to.

**Response:**
```json
{
  "success": true,
  "data": {
    "families": [
      {
        "id": "uuid",
        "name": "Family Name",
        "created_by": "uuid",
        "created_at": "timestamp",
        "user_role": "admin|member",
        "joined_at": "timestamp",
        "is_creator": true
      }
    ],
    "count": 1
  }
}
```

#### POST `/families/create`
Create a new family and assign the creator as admin.

**Request Body:**
```json
{
  "name": "My Family Name"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Family created successfully",
  "data": {
    "family": {
      "id": "uuid",
      "name": "My Family Name",
      "created_by": "uuid",
      "created_at": "timestamp"
    },
    "membership": {
      "role": "admin",
      "joined_at": "timestamp"
    }
  }
}
```

#### POST `/families/invite`
Invite a user to join a family by email (admin only).

**Request Body:**
```json
{
  "email": "user@example.com",
  "familyId": "family-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitation": {
      "id": "uuid",
      "email": "user@example.com",
      "family_name": "Family Name",
      "expires_at": "timestamp",
      "invite_link": "https://yourapp.com/join?token=..."
    }
  }
}
```

#### POST `/families/join`
Join a family using an invitation token.

**Request Body:**
```json
{
  "token": "invitation-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined family",
  "data": {
    "family": {
      "id": "uuid",
      "name": "Family Name"
    },
    "membership": {
      "id": "uuid",
      "role": "member",
      "joined_at": "timestamp"
    }
  }
}
```

## WebSocket Real-time Game Rooms

The server provides real-time multiplayer trivia functionality via WebSocket connections using Socket.IO.

### Connection
Connect to the game namespace:
```javascript
const socket = io('http://localhost:3001/game');
```

### Events

#### Client → Server Events

**`join-room`** - Join a family game room
```javascript
socket.emit('join-room', {
  familyId: 'family-uuid',
  userId: 'user-uuid',
  playerName: 'Player Name'
});
```

**`leave-room`** - Leave current game room
```javascript
socket.emit('leave-room');
```

**`start-game`** - Start a trivia game (host only)
```javascript
socket.emit('start-game', {
  familyId: 'family-uuid'
});
```

**`submit-answer`** - Submit answer during game
```javascript
socket.emit('submit-answer', {
  sessionId: 'session-uuid',
  questionId: 'question-uuid',
  answer: 'selected-answer'
});
```

#### Server → Client Events

**`connected`** - Connection acknowledgment
```javascript
socket.on('connected', (data) => {
  // data: { message, socketId, gameStats }
});
```

**`room-joined`** - Successfully joined room
```javascript
socket.on('room-joined', (data) => {
  // data: { room, message }
});
```

**`player-joined`** - Another player joined
```javascript
socket.on('player-joined', (data) => {
  // data: { room, newPlayer, message }
});
```

**`player-left`** - Player left the room
```javascript
socket.on('player-left', (data) => {
  // data: { room, message }
});
```

**`game-started`** - Game session began
```javascript
socket.on('game-started', (data) => {
  // data: { session, questions, gameState }
});
```

**`question-update`** - New question or game state
```javascript
socket.on('question-update', (data) => {
  // data: { currentQuestion, timeRemaining, scores }
});
```

**`answer-received`** - Answer was processed
```javascript
socket.on('answer-received', (data) => {
  // data: { correct, explanation, updatedScores }
});
```

**`game-ended`** - Session completed
```javascript
socket.on('game-ended', (data) => {
  // data: { finalScores, leaderboard, gameStats }
});
```

### Game Room Structure

Each family can have one active game room:

```javascript
{
  familyId: 'family-uuid',
  host: 'socket-id',
  players: [
    {
      socketId: 'socket-id',
      userId: 'user-uuid',
      playerName: 'Player Name',
      isHost: true|false,
      joinedAt: Date
    }
  ],
  gameState: {
    status: 'waiting|playing|finished',
    currentQuestion: { /* question object */ },
    questionIndex: 0,
    scores: { 'user-id': score },
    startedAt: Date|null
  },
  createdAt: Date
}
```

### Game Flow

1. **Room Creation**: First player joins and becomes host
2. **Player Joining**: Other family members join the same room
3. **Game Start**: Host starts the game, triggering question delivery
4. **Question Phase**: Players receive questions and submit answers
5. **Scoring**: Real-time score updates broadcast to all players
6. **Game End**: Final scores and leaderboard updates

### Connection Management

- Automatic reconnection support
- Host migration if original host disconnects
- Room cleanup when all players leave
- Connection statistics and monitoring

### Testing WebSocket

Run the WebSocket test suite:
```bash
node test-websocket.js
```

**Test Coverage:**
- Basic connection and disconnection
- Multiple simultaneous connections
- Server acknowledgment messages
- Game service statistics

**Join-Room Event Testing:**
```bash
node test-join-room.js
```

**Join-Room Test Coverage:**
- Room creation with first player (becomes host)
- Multiple players joining same room
- Real-time player-joined notifications
- Error handling for invalid data
- Host assignment and management
- Socket.IO room management

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file with:
   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Database Setup**
   Apply the schema to your Supabase database:
   ```bash
   # Copy the contents of supabase/schema.sql and run in Supabase SQL editor
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Testing

Run the test scripts to verify endpoints:

**Family Management:**
```bash
node test-families.js
```

**Trivia Functionality:**
```bash
node test-trivia.js
```

**WebSocket Game Rooms:**
```bash
node test-websocket.js
```

**Join-Room Event:**
```bash
node test-join-room.js
```

For complete trivia testing with real data:
1. Ensure questions are seeded: Run `supabase/seed_questions.sql` in Supabase SQL editor
2. Create a family using `/families/create`
3. Get a valid auth token from magic link login
4. Use that token to test trivia endpoints

**Testing WebSocket Integration:**
The WebSocket test verifies:
- Basic connection and disconnection to `/game` namespace
- Multiple simultaneous connections
- Server acknowledgment messages
- Game service statistics tracking
- Proper connection management and cleanup

**Testing Join-Room Event:**
The join-room test verifies:
- Room creation when first player joins
- Multiple players joining the same family room
- Real-time notifications to existing players
- Host assignment and management
- Error handling for missing required fields
- Socket.IO room broadcasting functionality

## Database Schema

The application uses the following main tables:

**Core Tables:**
- `families` - Family information
- `family_members` - User-family relationships with roles
- `family_invites` - Invitation tokens and metadata

**Trivia Tables:**
- `questions` - Trivia questions with categories and difficulty levels
- `trivia_sessions` - Active and completed game sessions
- `leaderboards` - Family member scores, streaks, and statistics

All tables include Row Level Security (RLS) policies for data protection.

## Error Handling

The API returns consistent error responses:
```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error 