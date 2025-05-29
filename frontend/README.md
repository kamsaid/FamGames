# Family Together - React Native Frontend

A React Native mobile app built with Expo for family trivia games.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- Expo Go app on your phone (for development)

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure Supabase:
   - Open `services/supabase.ts`
   - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase project credentials

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with Expo Go app or press `i` for iOS simulator / `a` for Android emulator

## 📱 Features

- **Magic Link Authentication** - Secure passwordless login
- **Family Management** - Create and join families with invite codes
- **Real-time Trivia** - Live multiplayer trivia games via WebSocket
- **Leaderboards** - Track family scores and streaks
- **Cross-platform** - Works on iOS and Android

## 🏗️ Architecture

```
frontend/
├── assets/          # Images, fonts, etc.
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth, Family, GameRoom)
├── navigation/      # React Navigation setup
├── screens/         # App screens/pages
├── services/        # API calls and Supabase client
├── utils/           # Helper functions
├── App.tsx          # Root component
└── index.js         # Entry point
```

## 🔧 Key Technologies

- **React Native** + **Expo** - Cross-platform mobile development
- **React Navigation** - Screen navigation and routing
- **Supabase** - Authentication and database
- **Socket.io** - Real-time WebSocket communication
- **TypeScript** - Type safety and better DX

## 📋 Development Status

### ✅ Completed (Task 20)
- [x] Project structure setup
- [x] Navigation with React Navigation
- [x] Supabase client configuration
- [x] Authentication context
- [x] Family management context
- [x] Game room context with WebSocket
- [x] Basic screen placeholders

### 🚧 In Progress
- [ ] Login screen with magic link (Task 21)
- [ ] Family onboarding screen (Task 22)
- [ ] Trivia lobby screen (Task 23)
- [ ] Trivia game screen (Task 24)
- [ ] Leaderboard screen (Task 25)

## 🤝 Contributing

This is part of the Family Together MVP build plan. See the main README for the complete development roadmap. 