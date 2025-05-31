# WebSocket API Documentation - AI-Enhanced Game Rooms

## Overview

The WebSocket server now supports AI-generated trivia questions with topic selection, personalization, and adaptive difficulty.

## Connection

Connect to the WebSocket server using the `/game` namespace:

```javascript
const socket = io('http://localhost:3001/game', {
  auth: {
    token: 'your-auth-token'
  }
});
```

## Events

### Client → Server Events

#### `join-room`
Join a family game room.

```javascript
socket.emit('join-room', {
  familyId: 'family-uuid',
  userId: 'user-uuid',
  playerName: 'Player Name'
});
```

#### `start-game` (Enhanced with AI)
Start a trivia game with optional AI-generated questions based on topics.

```javascript
// Basic start (uses database questions)
socket.emit('start-game', {
  familyId: 'family-uuid'
});

// AI-powered start with topics
socket.emit('start-game', {
  familyId: 'family-uuid',
  topics: ['science', 'animals', 'space'],     // Optional: specific topics
  difficulty: 'intermediate',                   // Optional: 'beginner', 'intermediate', 'advanced', 'expert'
  ageGroup: 'kids'                            // Optional: 'kids', 'teens', 'adults', 'mixed'
});
```

#### `submit-answer`
Submit an answer during the game.

```javascript
socket.emit('submit-answer', {
  familyId: 'family-uuid',
  questionNumber: 1,
  selectedAnswer: 'Paris',
  timeTaken: 15.5
});
```

#### `end-game`
End the current game.

```javascript
socket.emit('end-game', {
  reason: 'completed'  // or 'timeout', 'host-ended'
});
```

### Server → Client Events

#### `game-started` (Enhanced)
Sent when a game begins, now includes AI-generated questions with metadata.

```javascript
socket.on('game-started', (data) => {
  console.log('Game started:', data);
  // data = {
  //   success: true,
  //   gameState: {
  //     status: 'playing',
  //     totalQuestions: 5,
  //     currentQuestion: 0,
  //     scores: { 'user-id': 0 },
  //     players: [{ userId, playerName, isHost }]
  //   },
  //   questions: [
  //     {
  //       id: 'q1',
  //       questionNumber: 1,
  //       category: 'science',
  //       question: 'What planet is known as the Red Planet?',
  //       choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
  //       difficulty: 'easy',
  //       timeLimit: 20,
  //       points: 100,
  //       hint: 'Think about the color of rust!',        // Optional
  //       funFact: 'Mars appears red due to iron oxide.' // Optional
  //     }
  //   ],
  //   metadata: {
  //     generationSource: 'ai-personalized',  // or 'database', 'fallback-ai'
  //     topics: ['science', 'animals'],
  //     difficulty: 'intermediate',
  //     ageGroup: 'kids',
  //     aiGenerated: true
  //   }
  // }
});
```

#### `question-delivered` (Enhanced)
Sent for each question, now includes time limits and hints.

```javascript
socket.on('question-delivered', (data) => {
  // data = {
  //   questionNumber: 1,
  //   question: {
  //     id: 'q1',
  //     category: 'science',
  //     question: 'What is photosynthesis?',
  //     choices: [...],
  //     difficulty: 'medium',
  //     timeLimit: 30,
  //     points: 150,
  //     hint: 'Plants use this to make food'
  //   },
  //   timeLimit: 30,
  //   message: 'Question 1 is ready! You have 30 seconds to answer.'
  // }
});
```

#### `answer-submitted` (Enhanced)
Sent after submitting an answer, now includes fun facts.

```javascript
socket.on('answer-submitted', (data) => {
  // data = {
  //   success: true,
  //   questionNumber: 1,
  //   isCorrect: true,
  //   pointsEarned: 150,
  //   correctAnswer: 'Photosynthesis',
  //   yourAnswer: 'Photosynthesis',
  //   newTotalScore: 150,
  //   funFact: 'Photosynthesis produces most of Earth\'s oxygen!',
  //   message: 'Correct! You earned 150 points.'
  // }
});
```

## Example Implementation

### Starting an AI-Powered Game

```javascript
// 1. Get available topics first
const topicsResponse = await fetch('/trivia/topics/recommended/kids');
const { data } = await topicsResponse.json();
const availableTopics = data.recommendedTopics;

// 2. Let user select topics (UI implementation)
const selectedTopics = ['animals', 'science', 'space'];

// 3. Join game room
socket.emit('join-room', {
  familyId: 'family-123',
  userId: 'user-456',
  playerName: 'Alice'
});

// 4. Wait for room joined confirmation
socket.once('room-joined', (data) => {
  if (data.room.isHost) {
    // 5. Host starts game with AI questions
    socket.emit('start-game', {
      familyId: 'family-123',
      topics: selectedTopics,
      difficulty: 'beginner',
      ageGroup: 'kids'
    });
  }
});

// 6. Handle game started
socket.on('game-started', (data) => {
  if (data.metadata.aiGenerated) {
    console.log('Playing with AI-generated questions!');
    console.log(`Topics: ${data.metadata.topics.join(', ')}`);
  }
  
  // Display first question
  displayQuestion(data.questions[0]);
});

// 7. Handle questions with enhanced features
socket.on('question-delivered', (data) => {
  const { question } = data;
  
  // Show question
  displayQuestion(question);
  
  // Start timer
  startTimer(question.timeLimit);
  
  // Show hint after 50% of time
  setTimeout(() => {
    if (question.hint) {
      showHint(question.hint);
    }
  }, (question.timeLimit * 1000) / 2);
});

// 8. Submit answer and get feedback
function submitAnswer(answer) {
  socket.emit('submit-answer', {
    familyId: 'family-123',
    questionNumber: currentQuestionNumber,
    selectedAnswer: answer,
    timeTaken: getElapsedTime()
  });
}

socket.on('answer-submitted', (data) => {
  if (data.isCorrect) {
    celebrateCorrectAnswer();
  }
  
  // Show fun fact
  if (data.funFact) {
    displayFunFact(data.funFact);
  }
  
  updateScore(data.newTotalScore);
});
```

## Topic Selection Best Practices

1. **Validate Topics Before Starting**
   ```javascript
   // Validate selected topics
   const validationResponse = await fetch('/trivia/topics/validate', {
     method: 'POST',
     body: JSON.stringify({
       topics: selectedTopics,
       ageGroup: 'kids'
     })
   });
   
   const validation = await validationResponse.json();
   if (validation.data.warnings.length > 0) {
     showWarnings(validation.data.warnings);
   }
   ```

2. **Use Age-Appropriate Topics**
   ```javascript
   // Get recommended topics for age group
   const recommended = await fetch('/trivia/topics/recommended/kids');
   ```

3. **Handle AI Generation Failures**
   ```javascript
   socket.on('game-started', (data) => {
     if (data.metadata.generationSource === 'database') {
       console.log('AI unavailable, using database questions');
     }
   });
   ```

## Error Handling

```javascript
// Connection errors
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
  showConnectionError();
});

// Game errors
socket.on('start-game-error', (error) => {
  console.error('Failed to start game:', error);
  if (error.error === 'No trivia questions available') {
    showNoQuestionsError();
  }
});

// Reconnection handling
socket.on('reconnect', () => {
  // Rejoin room after reconnection
  socket.emit('join-room', {
    familyId: currentFamilyId,
    userId: currentUserId,
    playerName: currentPlayerName
  });
});
```

## Performance Considerations

1. **AI Generation Time**: AI questions can take 2-5 seconds to generate
2. **Caching**: Subsequent games with same topics will be faster due to caching
3. **Topic Limits**: Maximum 5 topics per game for optimal performance
4. **Fallback Strategy**: System falls back to database questions if AI fails

## Debugging

Enable debug mode to see detailed logs:

```javascript
socket.on('debug-rooms', (data) => {
  console.log('Active rooms:', data.activeRooms);
  console.log('Total players:', data.totalPlayers);
});
``` 