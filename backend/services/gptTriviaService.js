const { OpenAI } = require('openai');

// Initialize OpenAI client with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generates a trivia pack using GPT-4o based on the provided prompt
 * @param {string} customPrompt - Optional custom prompt to modify trivia generation
 * @returns {Promise<Object>} - Returns JSON with 5 trivia questions
 */
const generateTriviaPack = async (customPrompt = '') => {
  try {
    // Base prompt structure for family-friendly trivia
    const basePrompt = `Generate 5 multiple-choice trivia questions suitable for a mixed-age family. Include:
- 1 easy question for under-12 years old
- 1 general knowledge question
- 1 pop culture question
- 1 history or geography question  
- 1 fun fact or riddle

${customPrompt ? `Additional requirements: ${customPrompt}` : ''}

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is the largest planet in our solar system?",
      "choices": ["Earth", "Jupiter", "Saturn", "Mars"],
      "correct_answer": "Jupiter",
      "category": "science",
      "difficulty": "easy"
    }
  ]
}

Each question should have exactly 4 choices. Make sure the JSON is properly formatted and valid.`;

    // Call GPT-4o API with the constructed prompt
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "You are a trivia expert who creates engaging, family-friendly questions. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: basePrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7, // Balance between creativity and consistency
      response_format: { type: "json_object" } // Ensure JSON response
    });

    // Parse the response content
    const responseContent = completion.choices[0].message.content;
    const triviaData = JSON.parse(responseContent);

    // Validate the response structure
    if (!triviaData.questions || !Array.isArray(triviaData.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    // Validate each question has required fields
    triviaData.questions.forEach((question, index) => {
      if (!question.question || !question.choices || !question.correct_answer || !question.category || !question.difficulty) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      
      if (!Array.isArray(question.choices) || question.choices.length !== 4) {
        throw new Error(`Question ${index + 1} must have exactly 4 choices`);
      }
      
      if (!question.choices.includes(question.correct_answer)) {
        throw new Error(`Question ${index + 1}: correct answer not found in choices`);
      }
    });

    // Return the validated trivia pack
    return {
      success: true,
      data: triviaData,
      generated_at: new Date().toISOString(),
      total_questions: triviaData.questions.length
    };

  } catch (error) {
    console.error('Error generating trivia pack:', error);
    
    // Return error response with fallback
    return {
      success: false,
      error: error.message,
      fallback_needed: true
    };
  }
};

/**
 * Gets fallback trivia questions when GPT generation fails
 * @returns {Object} - Returns pre-defined trivia questions
 */
const getFallbackTriviaPack = () => {
  return {
    success: true,
    data: {
      questions: [
        {
          question: "What color do you get when you mix red and yellow?",
          choices: ["Purple", "Orange", "Green", "Pink"],
          correct_answer: "Orange",
          category: "art",
          difficulty: "easy"
        },
        {
          question: "What is the capital of France?",
          choices: ["London", "Berlin", "Paris", "Madrid"],
          correct_answer: "Paris",
          category: "geography",
          difficulty: "medium"
        },
        {
          question: "Which movie features the song 'Let It Go'?",
          choices: ["Moana", "Tangled", "Frozen", "Encanto"],
          correct_answer: "Frozen",
          category: "pop_culture",
          difficulty: "easy"
        },
        {
          question: "In which year did World War II end?",
          choices: ["1944", "1945", "1946", "1947"],
          correct_answer: "1945",
          category: "history",
          difficulty: "medium"
        },
        {
          question: "What has hands but cannot clap?",
          choices: ["A statue", "A clock", "A mannequin", "A robot"],
          correct_answer: "A clock",
          category: "riddle",
          difficulty: "easy"
        }
      ]
    },
    generated_at: new Date().toISOString(),
    total_questions: 5,
    is_fallback: true
  };
};

module.exports = {
  generateTriviaPack,
  getFallbackTriviaPack
}; 