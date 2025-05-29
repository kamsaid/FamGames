# 📱 Family Together – System Architecture (v1)

A real-time, single-login trivia hub to strengthen family bonds with nightly 5-minute rituals.

---

## 🗂️ File & Folder Structure

```
family-together/
│
├── frontend/ (React Native)
│   ├── assets/
│   ├── components/
│   ├── contexts/
│   ├── screens/
│   ├── services/
│   ├── navigation/
│   ├── utils/
│   ├── App.tsx
│   └── index.js
│
├── backend/ (Node.js + Express)
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── middlewares/
│   ├── utils/
│   ├── server.js
│   └── .env
│
├── supabase/
│   ├── schema.sql
│   ├── triggers.sql
│   └── policies.sql
│
└── shared/
    └── types/
        ├── trivia.ts
        ├── family.ts
        ├── user.ts
```

---

## 🧩 Breakdown of Each Layer

### 📲 Frontend (React Native)

* **`components/`**: Reusable UI elements (e.g., TriviaCard, ScoreBadge).
* **`screens/`**: Core app views (e.g., Home, TriviaRoom, Leaderboard).
* **`contexts/`**: Global state (Auth, GameRoom, FamilyContext).
* **`services/`**: Handles API requests to backend and Supabase.
* **`navigation/`**: React Navigation stack/tab setup.
* **`utils/`**: Formatters, helpers (e.g., shuffleQuestions, timeUtils).

📦 **Frontend State Management**

* `AuthContext`: user session from Supabase
* `GameRoomContext`: live game status, scoring
* `FamilyContext`: current family, members, invites
* State persists with `AsyncStorage`

---

### 🔧 Backend (Node.js)

* **`controllers/`**: Handle logic for sessions, families, leaderboards.
* **`routes/`**: API route definitions (`/trivia`, `/families`, `/auth`).
* **`services/`**: Business logic (generate trivia, validate magic links).
* **`models/`**: Supabase table representations and helpers.
* **`middlewares/`**: Error handling, auth check, rate limiting.
* **`utils/`**: Trivia difficulty scaler, email generator, token encoder.

🌐 **Backend Responsibilities**

* Magic link generation + validation
* Trivia question serving + scoring
* Leaderboard and streak management
* AI prompt processing for trivia packs (via GPT-4o)

---

### 🗄️ Supabase (DB + Auth)

#### Tables

* `users`: Supabase-managed auth
* `families`: `{ id, name, created_by, created_at }`
* `family_members`: `{ user_id, family_id, role }`
* `trivia_sessions`: `{ id, family_id, started_at, completed, scores }`
* `questions`: `{ id, category, question, choices, answer, difficulty }`
* `leaderboards`: `{ family_id, user_id, score, streak }`

#### Magic Link Auth Flow

* On sign-in request → backend generates secure token
* Sends magic link via email
* Supabase stores session on confirmation

#### Memory Vault (Encrypted Media/Notes)

* Stored in Supabase Storage
* Metadata in `memory_vault` table
* AES-256 encrypted before upload (client-side)

---

### ⚡ Real-time Trivia Game Architecture

#### Game Room Design

* Each family has 1 active room max
* Room state lives in backend memory (Redis or in-process for MVP)
* Node server handles:

  * Game creation
  * Player join/leave
  * Real-time question delivery
  * Score tracking and broadcast via WebSocket

#### Trivia Game Loop

1. Client creates or joins game room
2. Server sends 5 trivia questions with timeouts
3. Players answer live; scores updated in real-time
4. Leaderboard posted after round

🧩 **Sharding Strategy**

* Each game room instance (family ID) = sharded by room key prefix
* Use Redis for managing socket presence + pub/sub across shards

---

## 🤖 GPT-4o Content System

### Trivia Prompt Structure

```prompt
Generate 5 multiple-choice trivia questions suitable for a mixed-age family. Include:
- 1 easy for under-12
- 1 general knowledge
- 1 pop culture
- 1 history or geography
- 1 fun fact or riddle
Return JSON with: question, 4 choices, correct answer, category, difficulty.
```

### Difficulty Tiers

* `easy`: 6–12 years old
* `medium`: teens to adults
* `hard`: expert/family champion mode

Trivia packs can be cached daily or generated on demand with fallback packs.

---

## 🛡️ Security

* **Supabase Auth + RLS (Row-Level Security)** for per-family access
* **Magic link** tokens expire after 10 min; one-time use
* **Memory Vault**: End-to-end encryption using client-generated AES keys
* **Backend rate-limiting + validation** on all inputs

---

## 🧠 Services Connection Overview

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


