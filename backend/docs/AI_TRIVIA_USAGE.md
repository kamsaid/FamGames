# AI-Powered Trivia Question Generator - Usage Guide

## Overview

The Family Together app now includes an advanced AI-powered trivia question generator that creates personalized questions based on selected topics, family preferences, and performance history.

## Key Features

- **Topic-Based Generation**: Choose from 25+ topics to customize your trivia experience
- **Age-Appropriate Content**: Questions automatically adjust based on age group
- **Adaptive Difficulty**: Questions get harder or easier based on performance
- **Smart Caching**: Reduces API costs by caching personalized questions
- **Theme Support**: Special question packs for holidays and events
- **Performance Tracking**: Learn from family strengths and weaknesses

## API Endpoints

### 1. Get Available Topics

```http
GET /trivia/topics?ageGroup=kids&difficulty=easy
```

**Response:**
```json
{
  "success": true,
  "data": {
    "topics": [
      {
        "id": "animals",
        "displayName": "Animals & Nature",
        "description": "Wildlife, pets, and nature facts",
        "icon": "🦁",
        "ageGroups": ["kids", "teens", "adults", "mixed"],
        "difficulty": ["easy", "medium", "hard"]
      }
    ],
    "count": 8
  }
}
```

### 2. Start AI-Powered Trivia Session

```http
POST /trivia/start-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "family_id": "123e4567-e89b-12d3-a456-426614174000",
  "use_ai": true,
  "topics": ["science", "animals", "space"],
  "difficulty": "intermediate",
  "age_group": "mixed"
}
```

**Response:**
```json
{
  "message": "Trivia session started successfully",
  "session": {
    "id": "session-uuid",
    "family_id": "family-uuid",
    "questions": [
      {
        "id": "q1",
        "category": "science",
        "question": "What planet is known as the Red Planet?",
        "choices": ["Venus", "Mars", "Jupiter", "Saturn"],
        "difficulty": "easy",
        "timeLimit": 20,
        "points": 100,
        "hint": "Think about the color of rust!",
        "funFact": "Mars appears red due to iron oxide on its surface."
      }
    ],
    "metadata": {
      "topics": ["science", "animals", "space"],
      "difficulty": "intermediate",
      "ageGroup": "mixed",
      "aiGenerated": true,
      "generationSource": "ai-personalized"
    }
  }
}
```

### 3. Generate Personalized Questions

```http
POST /trivia/generate-personalized
Authorization: Bearer <token>
Content-Type: application/json

{
  "familyId": "123e4567-e89b-12d3-a456-426614174000",
  "ageGroup": "kids",
  "difficultyLevel": "beginner",
  "categories": ["animals", "cartoons", "science"],
  "familyInterests": ["dinosaurs", "space", "lego"],
  "customPrompt": "Include questions about dinosaurs and space exploration"
}
```

### 4. Get AI Recommendations

```http
GET /trivia/recommendations/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "performance": {
      "totalGamesPlayed": 15,
      "averageScore": 78,
      "currentLevel": "intermediate",
      "strongCategories": ["science", "geography"],
      "improvementAreas": ["history", "literature"]
    },
    "suggestions": {
      "nextDifficulty": "advanced",
      "recommendedCategories": [
        {
          "category": "science",
          "reason": "You excel at this!",
          "weight": 0.3
        },
        {
          "category": "history",
          "reason": "Great opportunity to learn!",
          "weight": 0.4
        }
      ],
      "themes": [
        {
          "theme": "Halloween",
          "daysUntil": 15,
          "description": "Perfect time for Halloween-themed trivia!"
        }
      ],
      "challenges": [
        {
          "name": "Category Master",
          "description": "Score 100% in history category",
          "reward": "Unlock expert questions in this category"
        }
      ]
    }
  }
}
```

## Implementation Best Practices

### 1. Topic Selection

```javascript
// Frontend example
const startTriviaGame = async () => {
  // Get recommended topics for the family's age group
  const topicsResponse = await fetch('/trivia/topics/recommended/mixed');
  const { recommendedTopics } = await topicsResponse.json();
  
  // Let user select up to 5 topics
  const selectedTopics = getUserSelectedTopics(recommendedTopics);
  
  // Validate topic selection
  const validationResponse = await fetch('/trivia/topics/validate', {
    method: 'POST',
    body: JSON.stringify({
      topics: selectedTopics,
      ageGroup: 'mixed',
      maxTopics: 5
    })
  });
  
  const { valid, warnings } = await validationResponse.json();
  
  // Start session with validated topics
  const sessionResponse = await fetch('/trivia/start-session', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      use_ai: true,
      topics: valid,
      difficulty: 'intermediate',
      age_group: 'mixed'
    })
  });
};
```

### 2. Adaptive Difficulty

```javascript
// During gameplay, adjust difficulty based on performance
const adjustDifficulty = async (currentPerformance) => {
  if (currentPerformance.correctRate > 0.9) {
    // Generate harder questions
    const response = await fetch('/trivia/generate-adaptive', {
      method: 'POST',
      body: JSON.stringify({
        familyId: familyId,
        currentPerformance: {
          correctRate: 0.92,
          averageTime: 15
        }
      })
    });
  }
};
```

### 3. Using Themes

```javascript
// Get Halloween-themed questions
const getHalloweenTrivia = async () => {
  // First, get topics for Halloween theme
  const themeResponse = await fetch('/trivia/topics/theme/halloween');
  const { topics } = await themeResponse.json();
  
  // Generate themed questions
  const response = await fetch('/trivia/generate-personalized', {
    method: 'POST',
    body: JSON.stringify({
      theme: 'Halloween',
      ageGroup: 'kids',
      difficultyLevel: 'easy'
    })
  });
};
```

## Topic Categories

### Kids-Friendly Topics
- 🦁 Animals & Nature
- 🎨 Cartoons & Animation
- 🏰 Fairy Tales & Stories
- 🌈 Colors & Shapes
- 🦸 Superheroes
- 🧩 Riddles & Brain Teasers
- 🍕 Food & Cooking

### Educational Topics
- 🔬 Science
- 🚀 Space & Astronomy
- 🔢 Mathematics
- 📚 Books & Literature
- 💻 Technology
- 🎨 Art & Design

### Entertainment Topics
- 🎬 Pop Culture
- 🎥 Movies & TV
- 🎵 Music
- ⚽ Sports
- 🎮 Video Games

### Knowledge Topics
- 🌍 General Knowledge
- 📜 History
- 🗺️ Geography
- 📰 Current Events
- 🌱 Environment & Climate

## Cost Optimization

1. **Enable Caching**: Always use `useCache: true` for regular sessions
2. **Batch Generation**: Generate multiple question sets at once during off-peak
3. **Use Topics Wisely**: Specific topics reduce token usage
4. **Monitor Usage**: Check AI usage logs regularly

```javascript
// Check AI usage
const checkUsage = async () => {
  const response = await fetch('/trivia/ai-usage/stats');
  const stats = await response.json();
  console.log(`Total API calls: ${stats.totalCalls}`);
  console.log(`Cached responses: ${stats.cachedResponses}`);
  console.log(`Estimated cost: $${stats.estimatedCost}`);
};
```

## Error Handling

```javascript
try {
  const response = await fetch('/trivia/start-session', {
    method: 'POST',
    body: JSON.stringify({
      family_id: familyId,
      use_ai: true,
      topics: ['invalid-topic']
    })
  });
  
  if (!response.ok) {
    // Fallback to database questions
    const fallbackResponse = await fetch('/trivia/start-session', {
      method: 'POST',
      body: JSON.stringify({
        family_id: familyId,
        use_ai: false
      })
    });
  }
} catch (error) {
  console.error('Failed to start trivia session:', error);
  // Show error to user
}
```

## Database Schema Updates

To use all AI features, ensure your database has been updated with the enhanced schema:

```sql
-- Run the AI enhancements schema
psql -U your_user -d your_database -f supabase/ai_enhancements_schema.sql
```

## Environment Variables

Ensure these are set in your `.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Frontend Integration Tips

1. **Show Loading States**: AI generation can take 2-5 seconds
2. **Display Hints**: Show hints for younger players after 10 seconds
3. **Celebrate Learning**: Show fun facts after each answer
4. **Track Progress**: Display category performance in real-time
5. **Offline Fallback**: Cache some questions locally for offline play

## Monitoring and Analytics

Track AI performance and usage:

```javascript
// Log AI usage after each session
await fetch('/trivia/ai-usage/log', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: session.id,
    questionsGenerated: 5,
    cached: false,
    generationTime: 3.2
  })
});
```

## Support

For issues or questions:
1. Check error logs in Supabase dashboard
2. Monitor OpenAI API usage
3. Review cached questions in Redis/memory
4. Check family preferences and performance data

Remember: The AI adapts over time, so the more your family plays, the better the questions become! 