#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Family Together - E2E Test Runner');
console.log('====================================\n');

async function runE2ETest() {
  try {
    console.log('📋 Prerequisites Check:');
    console.log('1. ✅ Make sure Supabase is configured and running');
    console.log('2. ✅ Make sure backend server is running on port 3000');
    console.log('3. ✅ Make sure all dependencies are installed\n');

    console.log('⏳ Starting E2E test suite...\n');

    // Run the E2E test from the backend directory
    const testProcess = spawn('node', ['test-e2e-full-flow.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit'
    });

    testProcess.on('error', (error) => {
      console.error('❌ Failed to start E2E test:', error.message);
      process.exit(1);
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 E2E Test completed successfully!');
        console.log('✅ Task 30 completed: One family can play a game and leaderboard updates');
      } else {
        console.log('\n❌ E2E Test failed with exit code:', code);
        console.log('⚠️  Check the error messages above for details');
      }
      process.exit(code);
    });

  } catch (error) {
    console.error('💥 E2E Test runner failed:', error.message);
    process.exit(1);
  }
}

// Instructions for manual testing
function printManualTestingInstructions() {
  console.log('\n📱 Manual Testing Instructions (Alternative):');
  console.log('============================================');
  console.log('1. Start the backend server: cd backend && npm start');
  console.log('2. Start the React Native app: cd frontend && npx expo start');
  console.log('3. Create a family using the app');
  console.log('4. Add a second family member (or test with multiple devices/simulators)');
  console.log('5. Start a trivia game');
  console.log('6. Both players answer questions');
  console.log('7. End the game and verify leaderboard updates');
  console.log('8. Check that streak tracking is working (if implemented)\n');
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node run-e2e-test.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --manual, -m   Show manual testing instructions');
  console.log('');
  printManualTestingInstructions();
  process.exit(0);
}

if (args.includes('--manual') || args.includes('-m')) {
  printManualTestingInstructions();
  process.exit(0);
}

// Run the automated E2E test
runE2ETest(); 