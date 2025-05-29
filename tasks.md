# 🧱 MVP Build Plan: *Family Together*

## 🏁 Phase 1: Supabase Setup

### 1. Create Supabase project

* **Start:** Log into Supabase
* **End:** New project with database initialized

### 2. Define `users` and `families` tables

* **Start:** Access Supabase SQL editor
* **End:** `users`, `families` tables created with RLS enabled

### 3. Create `family_members` table

* **Start:** Add table linking users to families
* **End:** Table with `user_id`, `family_id`, `role` added

### 4. Create `trivia_sessions` and `leaderboards` tables

* **Start:** Write SQL schema
* **End:** Both tables exist with RLS

### 5. Seed `questions` table with 10 test questions

* **Start:** Insert SQL rows
* **End:** 10 questions across categories available

---

## 🔐 Phase 2: Magic Link Auth

### 6. Enable magic link sign-in in Supabase

* **Start:** Go to Supabase Auth settings
* **End:** Magic link enabled + tested via UI

### 7. Create backend endpoint: `/auth/magic-link`

* **Start:** Write Express route
* **End:** Generates + sends magic link email

### 8. Implement magic link validator route

* **Start:** Build `/auth/verify-link`
* **End:** Validates token, returns session token

---

## 🧑‍🤝‍🧑 Phase 3: Family Management

### 9. Create `/families/create` endpoint

* **Start:** Define POST route
* **End:** Creates a family, assigns creator as admin

### 10. Create `/families/invite` endpoint

* **Start:** Accept `email`, generate invite token
* **End:** Sends invitation email with secure token

### 11. Build `/families/join` route

* **Start:** Accepts invite token + joins user
* **End:** Adds user to `family_members`

---

## 🕹 Phase 4: Trivia Game Engine

### 12. Create `/trivia/start-session` route

* **Start:** Accept `family_id`, return 5 questions
* **End:** New `trivia_session` record created with questions

### 13. Build `/trivia/submit-answer` route

* **Start:** Accept answer submission
* **End:** Store answer + update score in session object

### 14. Build `/trivia/complete-session` route

* **Start:** Finalize session, compute scores
* **End:** Updates leaderboard and session record

---

## 🧩 Phase 5: Real-time Game Rooms (WebSockets)

### 15. Setup WebSocket server on backend

* **Start:** Initialize socket.io server
* **End:** Server listening on `/game`

### 16. Implement `join-room` event

* **Start:** Accept `family_id`
* **End:** Adds socket to room

### 17. Implement `start-game` event

* **Start:** Host emits event to room
* **End:** Sends questions to all sockets in room

### 18. Implement `submit-answer` socket event

* **Start:** Accepts answer and user ID
* **End:** Broadcast updated scores to all players

### 19. Implement `end-game` event

* **Start:** Timer ends or all answers received
* **End:** Scores finalized, broadcast to room

---

## 📱 Phase 6: React Native Frontend

### 20. Setup project with navigation + Supabase client

* **Start:** Bootstrap RN project
* **End:** Tabs/screens setup, Supabase initialized

### 21. Build login screen with magic link input

* **Start:** Form with email input
* **End:** Sends magic link, shows success message

### 22. Build family onboarding screen

* **Start:** Option to create or join family
* **End:** Calls `/families/create` or join via link

### 23. Build trivia lobby screen

* **Start:** List family members, start button
* **End:** Connects to socket, waits for host

### 24. Build trivia game screen

* **Start:** Shows question + 4 answers
* **End:** Sends answer, shows result

### 25. Build leaderboard screen

* **Start:** Fetch from `/leaderboard`
* **End:** Displays current family scores

---

## 🧠 Phase 7: GPT Trivia Generation

### 26. Create `generateTriviaPack(prompt)` GPT-4o function

* **Start:** Define prompt and completion logic
* **End:** Returns JSON with 5 questions

### 27. Build `/trivia/generate` route

* **Start:** Uses GPT-4o API to generate trivia
* **End:** Stores in `questions` table

---

## 🎯 Phase 8: Final Touches

### 28. Add streak tracking to leaderboard

* **Start:** Compute streaks per user
* **End:** Displayed alongside score

### 29. Encrypt and upload one sample Memory Vault item

* **Start:** Use AES to encrypt JSON object
* **End:** Stored in Supabase storage

### 30. Test E2E: One family plays a game, leaderboard updates

* **Start:** Start app and backend
* **End:** Full flow works with 2+ players

---

