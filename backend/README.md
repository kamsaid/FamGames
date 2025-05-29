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

#### POST `/trivia/generate`
Generate new trivia questions using GPT-4o and store them in the database.

**Request Body:**
```json
{
  "custom_prompt": "Generate questions about space and astronomy" // Optional
}
```

**Response:**
```json
{
  "message": "Trivia questions generated and stored successfully",
  "generation_source": "gpt-4o",
  "questions_count": 5,
  "questions": [
    {
      "id": "question-uuid",
      "category": "science",
      "question": "What is the largest planet in our solar system?",
      "choices": ["Earth", "Jupiter", "Saturn", "Mars"],
      "difficulty": "easy"
    }
  ],
  "gpt_success": true
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
  "family_id": "family-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invite": {
      "id": "invite-uuid",
      "family_id": "family-uuid",
      "email": "user@example.com",
      "token": "secure-invite-token",
      "expires_at": "timestamp",
      "created_at": "timestamp"
    }
  }
}
```

#### POST `/families/join`
Join a family using an invitation token.

**Request Body:**
```json
{
  "token": "secure-invite-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully joined family",
  "data": {
    "family": {
      "id": "family-uuid",
      "name": "Family Name"
    },
    "membership": {
      "role": "member",
      "joined_at": "timestamp"
    }
  }
}
```

### Leaderboard

#### GET `/leaderboard/:familyId`
Get the leaderboard for a specific family.

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "id": "leaderboard-uuid",
        "family_id": "family-uuid",
        "user_id": "user-uuid",
        "score": 25,
        "streak": 5,
        "last_played_at": "timestamp",
        "games_played": 10,
        "user_name": "Player Name"
      }
    ],
    "family": {
      "id": "family-uuid",
      "name": "Family Name"
    }
  }
}
```

## WebSocket Events

The server supports real-time game functionality via Socket.IO on the `/game` namespace.

### Events

#### `join-room`
Join a family game room.

**Payload:**
```json
{
  "familyId": "family-uuid",
  "userId": "user-uuid",
  "playerName": "Player Name"
}
```

**Response Events:**
- `room-joined` - Successfully joined the room
- `player-joined` - Broadcast to other players when someone joins
- `join-room-error` - Error joining the room

#### `start-game`
Start a trivia game (host only).

**Payload:**
```json
{
  "familyId": "family-uuid",
  "hostUserId": "user-uuid"
}
```

**Response Events:**
- `game-started` - Game started with questions
- `start-game-error` - Error starting the game

#### `submit-answer`
Submit an answer during the game.

**Payload:**
```json
{
  "sessionId": "session-uuid",
  "questionIndex": 0,
  "selectedAnswer": 1,
  "userId": "user-uuid"
}
```

**Response Events:**
- `answer-submitted` - Answer recorded
- `submit-answer-error` - Error submitting answer

#### `end-game`
End the current game (host only).

**Payload:**
```json
{
  "sessionId": "session-uuid",
  "familyId": "family-uuid"
}
```

**Response Events:**
- `game-ended` - Game ended with final scores
- `leaderboard-updated` - Updated leaderboard data
- `end-game-error` - Error ending the game

## Game Room Structure

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
   OPENAI_API_KEY=your-openai-api-key
   PORT=3000
   FRONTEND_URL=http://localhost:3000
   ```

3. **Database Setup**
   Apply the schema to your Supabase database:
   ```bash
   # Copy the contents of supabase/schema.sql and run in Supabase SQL editor
   ```

4. **Start Development Server**
   ```bash
   npm start
   ```

## Testing

### End-to-End Testing

Run the comprehensive E2E test that validates the complete trivia game flow:

```bash
# Run the full E2E test suite
node test-e2e-full-flow.js
```

**E2E Test Coverage:**
The automated test validates:
1. **Family Creation** - Create test families
2. **Member Management** - Add family members
3. **WebSocket Connections** - Real-time connectivity
4. **Game Room Join** - Players joining game rooms
5. **Trivia Game Start** - Host starting game sessions
6. **Answer Submission** - Players submitting answers
7. **Game Completion** - Ending games and score calculation
8. **Leaderboard Updates** - Score persistence and ranking
9. **Streak Tracking** - Consecutive game streak validation

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