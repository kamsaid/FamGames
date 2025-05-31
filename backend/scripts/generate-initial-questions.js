/**
 * Generate Initial Questions Script
 * Populates the database with AI-generated questions for all topics
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const enhancedGptTriviaService = require('../services/enhancedGptTriviaService');
const topicService = require('../services/topicService');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Generate questions for a specific topic and age group
 */
async function generateQuestionsForTopic(topic, ageGroup, difficulty) {
  console.log(`\n🎯 Generating questions for ${topic.displayName} (${ageGroup}, ${difficulty})...`);
  
  try {
    // Generate personalized questions
    const result = await enhancedGptTriviaService.generatePersonalizedTrivia({
      ageGroup,
      difficultyLevel: difficulty,
      categories: { [topic.id]: 1.0 }, // Focus on single topic
      useCache: false // Don't cache during initial generation
    });

    if (result.success && result.data.questions.length > 0) {
      // Prepare questions for database
      const questionsForDB = result.data.questions.map(q => ({
        category: topic.id,
        question: q.question,
        choices: q.choices,
        answer: q.correct_answer,
        difficulty: q.difficulty,
        fun_fact: q.fun_fact,
        hint: q.hint,
        time_limit: q.timeLimit,
        points: q.points,
        generation_source: 'ai-initial-setup',
        metadata: {
          ai_generated: true,
          topic_display_name: topic.displayName,
          age_group: ageGroup,
          initial_generation: true
        }
      }));

      // Insert into database
      const { data: inserted, error } = await supabase
        .from('questions')
        .insert(questionsForDB)
        .select('id');

      if (error) {
        console.error(`❌ Error inserting questions:`, error);
        return 0;
      }

      console.log(`✅ Successfully generated ${inserted.length} questions for ${topic.displayName}`);
      return inserted.length;
    } else {
      console.error(`❌ Failed to generate questions for ${topic.displayName}`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Error generating questions for ${topic.displayName}:`, error.message);
    return 0;
  }
}

/**
 * Main function to generate questions for all topics
 */
async function generateAllQuestions() {
  console.log('🚀 Starting AI Question Generation for All Topics\n');
  console.log('⚠️  This will use your OpenAI API credits. Continue? (Ctrl+C to cancel)\n');
  
  // Wait 5 seconds for user to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  const stats = {
    totalGenerated: 0,
    byTopic: {},
    byAgeGroup: {},
    byDifficulty: {},
    errors: []
  };

  // Define generation strategy
  const generationPlan = [
    // Kids content
    { ageGroup: 'kids', difficulty: 'beginner', topics: ['animals', 'cartoons', 'fairy_tales', 'colors_shapes'] },
    { ageGroup: 'kids', difficulty: 'intermediate', topics: ['science', 'riddles', 'superheroes', 'food'] },
    
    // Teens content
    { ageGroup: 'teens', difficulty: 'intermediate', topics: ['pop_culture', 'technology', 'sports', 'games'] },
    { ageGroup: 'teens', difficulty: 'advanced', topics: ['science', 'music', 'movies', 'riddles'] },
    
    // Adults content
    { ageGroup: 'adults', difficulty: 'intermediate', topics: ['history', 'geography', 'current_events', 'literature'] },
    { ageGroup: 'adults', difficulty: 'advanced', topics: ['technology', 'science', 'art', 'environment'] },
    
    // Mixed/Family content
    { ageGroup: 'mixed', difficulty: 'intermediate', topics: ['general_knowledge', 'movies', 'animals', 'geography'] },
    { ageGroup: 'mixed', difficulty: 'intermediate', topics: ['sports', 'riddles', 'food', 'science'] }
  ];

  // Execute generation plan
  for (const plan of generationPlan) {
    console.log(`\n📋 Processing ${plan.ageGroup} content at ${plan.difficulty} level...`);
    
    for (const topicId of plan.topics) {
      const topic = {
        id: topicId,
        ...topicService.availableTopics[topicId]
      };
      
      if (!topic.displayName) {
        console.warn(`⚠️  Topic ${topicId} not found, skipping...`);
        continue;
      }

      const count = await generateQuestionsForTopic(topic, plan.ageGroup, plan.difficulty);
      
      // Update statistics
      stats.totalGenerated += count;
      stats.byTopic[topicId] = (stats.byTopic[topicId] || 0) + count;
      stats.byAgeGroup[plan.ageGroup] = (stats.byAgeGroup[plan.ageGroup] || 0) + count;
      stats.byDifficulty[plan.difficulty] = (stats.byDifficulty[plan.difficulty] || 0) + count;
      
      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Display final statistics
  console.log('\n' + '='.repeat(60));
  console.log('📊 GENERATION COMPLETE - STATISTICS');
  console.log('='.repeat(60));
  console.log(`\n🎯 Total Questions Generated: ${stats.totalGenerated}`);
  
  console.log('\n📚 By Topic:');
  Object.entries(stats.byTopic)
    .sort(([,a], [,b]) => b - a)
    .forEach(([topic, count]) => {
      const topicData = topicService.availableTopics[topic];
      console.log(`   ${topicData?.icon || '•'} ${topicData?.displayName || topic}: ${count} questions`);
    });
  
  console.log('\n👥 By Age Group:');
  Object.entries(stats.byAgeGroup).forEach(([ageGroup, count]) => {
    console.log(`   • ${ageGroup}: ${count} questions`);
  });
  
  console.log('\n📈 By Difficulty:');
  Object.entries(stats.byDifficulty).forEach(([difficulty, count]) => {
    console.log(`   • ${difficulty}: ${count} questions`);
  });

  // Check current question count in database
  const { data: totalQuestions, error: countError } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n✅ Total questions in database: ${totalQuestions || 0}`);
  }

  console.log('\n🎉 Initial question generation complete!');
  console.log('💡 You can now start trivia games with AI-powered questions.\n');
}

// Run the script
if (require.main === module) {
  generateAllQuestions()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { generateAllQuestions }; 