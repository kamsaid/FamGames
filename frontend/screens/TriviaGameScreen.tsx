// Enhanced trivia game screen with animations, haptics, and improved UX
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Import contexts
import { useGameRoom } from '../contexts/GameRoomContext';
import { useAuth } from '../contexts/AuthContext';

// Import components
import { AnimatedButton } from '../components/AnimatedButton';
import { AnimatedCard } from '../components/AnimatedCard';
import { AnimatedProgress } from '../components/AnimatedProgress';
import { showToast } from '../components/ToastNotification';

// Import UX helpers
import { 
  HapticManager, 
  SoundManager, 
  calculateScore,
  getEncouragingMessage,
  getAchievement,
} from '../utils/uxHelpers';

const { width, height } = Dimensions.get('window');

export default function TriviaGameScreen() {
  // Game state from context
  const {
    gameActive,
    currentQuestion,
    players,
    questionIndex,
    totalQuestions,
    timeRemaining,
    finalScores,
    userScore,
    submitAnswer,
  } = useGameRoom();

  // Local state
  const { user } = useAuth();
  const navigation = useNavigation();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const confettiRef = useRef<any>(null);

  // Animation values
  const questionScale = useSharedValue(0);
  const resultScale = useSharedValue(0);

  // Handle exit game
  const handleExitGame = () => {
    HapticManager.medium();
    // @ts-ignore
    navigation.navigate('MainTabs', { screen: 'Lobby' });
  };

  // Reset local UI state whenever the question index increments.
  // This guarantees previous answer/result visuals are cleared even if the
  // provider re-uses the same question object reference.
  useEffect(() => {
    if (currentQuestion) {
      // Reset states
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setShowResult(false);

      // Animate question entrance
      questionScale.value = 0;
      questionScale.value = withSpring(1, { damping: 15, mass: 1 });

      // Play sound for new question
      // SoundManager.play('timer_tick');
    }
  }, [questionIndex]);

  // Show result after submission
  useEffect(() => {
    if (hasSubmitted && currentQuestion) {
      // Delay to build suspense
      setTimeout(() => {
        setShowResult(true);
        resultScale.value = withSpring(1, { damping: 15, mass: 1 });

        // Check if answer is correct
        const isCorrect = selectedAnswer === currentQuestion.answer;
        
        if (isCorrect) {
          // Update streak and correct answers
          setStreak(prev => prev + 1);
          setCorrectAnswers(prev => prev + 1);
          
          // Play success feedback
          HapticManager.success();
          // SoundManager.play('correct');
          
          // Show achievement if earned
          const achievement = getAchievement(userScore);
          if (achievement) {
            showToast.achievement(achievement, 'Keep up the great work!');
          }
        } else {
          // Reset streak
          setStreak(0);
          
          // Play error feedback
          HapticManager.error();
          // SoundManager.play('incorrect');
        }
      }, 500);
    }
  }, [hasSubmitted, currentQuestion, selectedAnswer, userScore]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (hasSubmitted || !gameActive) return;
    
    setSelectedAnswer(answer);
    HapticManager.selection();
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasSubmitted || !currentQuestion) return;

    // Submit answer
    submitAnswer(selectedAnswer);
    setHasSubmitted(true);
    HapticManager.medium();
  };

  // Get current player info
  const currentPlayer = players.find(p => p.id === user?.id);
  const userHasAnswered = currentPlayer?.hasAnswered || hasSubmitted;

  // Animated styles
  const questionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: questionScale.value }],
  }));

  const resultAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resultScale.value }],
  }));

  // Render game over screen
  if (!gameActive && finalScores) {
    const sortedPlayers = players.sort((a, b) => b.score - a.score);
    const userRank = sortedPlayers.findIndex(p => p.id === user?.id) + 1;
    const isWinner = userRank === 1;

    // Show confetti for winner
    if (isWinner && confettiRef.current) {
      confettiRef.current.start();
      HapticManager.heavy();
      // SoundManager.play('achievement');
    }

    return (
      <SafeAreaView style={styles.container}>
        <AnimatedButton
          onPress={handleExitGame}
          title="Back to Lobby"
          icon={<Ionicons name="arrow-back" size={20} color="#ffffff" />}
          style={styles.backButton}
          size="small"
        />

        <ScrollView 
          contentContainerStyle={styles.gameOverContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.delay(200)}>
            <Text style={styles.gameOverTitle}>
              {isWinner ? '🏆 Victory!' : '🎯 Game Complete!'}
            </Text>
          </Animated.View>

          {/* Final scores */}
          <AnimatedCard
            style={styles.finalScoresCard}
            delay={400}
            entrance="slide"
          >
            <Text style={styles.finalScoresTitle}>Final Leaderboard</Text>
            
            {sortedPlayers.map((player, index) => (
              <Animated.View
                key={player.id}
                entering={SlideInRight.delay(600 + index * 100)}
                style={[
                  styles.finalScoreItem,
                  player.id === user?.id && styles.currentUserScore,
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </Text>
                </View>
                <Text style={styles.playerNameText}>
                  {player.email.split('@')[0]}
                  {player.id === user?.id && ' (You)'}
                </Text>
                <Text style={styles.scoreText}>{player.score} pts</Text>
              </Animated.View>
            ))}
          </AnimatedCard>

          {/* User stats */}
          <AnimatedCard
            style={styles.statsCard}
            delay={800}
            entrance="scale"
          >
            <Text style={styles.statsTitle}>Your Performance</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{userScore}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{correctAnswers}/{totalQuestions}</Text>
                <Text style={styles.statLabel}>Correct</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round((correctAnswers / totalQuestions) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>

            <Text style={styles.encouragingMessage}>
              {getEncouragingMessage(correctAnswers, totalQuestions)}
            </Text>
          </AnimatedCard>

          <AnimatedButton
            onPress={handleExitGame}
            title="Continue"
            size="large"
            style={{ marginTop: 20 }}
          />
        </ScrollView>

        {isWinner && (
          <ConfettiCannon
            ref={confettiRef}
            count={200}
            origin={{ x: width / 2, y: 0 }}
            fadeOut
          />
        )}
      </SafeAreaView>
    );
  }

  // Render waiting screen
  if (!gameActive || !currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <Animated.View
            entering={ZoomIn}
            style={styles.waitingIcon}
          >
            <Ionicons name="hourglass-outline" size={80} color="#3b82f6" />
          </Animated.View>
          <Text style={styles.waitingTitle}>Get Ready!</Text>
          <Text style={styles.waitingSubtitle}>
            The game will start any moment...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main game screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedButton
          onPress={handleExitGame}
          title="Exit"
          variant="ghost"
          size="small"
          icon={<Ionicons name="close" size={20} color="#3b82f6" />}
        />

        {/* Timer with warning animation */}
        <AnimatedProgress
          progress={timeRemaining / 30} // Assuming 30 seconds per question
          variant="circular"
          size="medium"
          color="#3b82f6"
          warning={timeRemaining <= 5}
          showLabel
          label={`${timeRemaining}s`}
        />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress bar */}
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>
            Question {questionIndex + 1} of {totalQuestions}
          </Text>
          <AnimatedProgress
            progress={(questionIndex + 1) / totalQuestions}
            variant="linear"
            size="small"
            color="#3b82f6"
          />
        </View>

        {/* Score and streak */}
        <View style={styles.scoreSection}>
          <AnimatedCard style={styles.scoreCard} entrance="fade">
            <View style={styles.scoreRow}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>{userScore}</Text>
              </View>
              
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streak} streak!</Text>
                </View>
              )}
            </View>
          </AnimatedCard>
        </View>

        {/* Question */}
        <Animated.View style={questionAnimatedStyle}>
          <AnimatedCard style={styles.questionCard} entrance="scale">
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{currentQuestion.category}</Text>
            </View>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
          </AnimatedCard>
        </Animated.View>

        {/* Answer choices */}
        <View style={styles.answersContainer}>
          {currentQuestion.choices.map((choice, index) => {
            const isSelected = selectedAnswer === choice;
            const isCorrect = choice === currentQuestion.answer;
            const showCorrectAnswer = showResult && isCorrect;
            const showIncorrectAnswer = showResult && isSelected && !isCorrect;
            
            return (
              <Animated.View
                key={index}
                entering={SlideInRight.delay(100 * index)}
              >
                <AnimatedButton
                  onPress={() => handleAnswerSelect(choice)}
                  title={choice}
                  variant={
                    showCorrectAnswer ? 'success' :
                    showIncorrectAnswer ? 'danger' :
                    isSelected ? 'primary' : 'secondary'
                  }
                  disabled={hasSubmitted}
                  style={styles.answerButton}
                  icon={
                    <Text style={styles.answerLetter}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  }
                />
              </Animated.View>
            );
          })}
        </View>

        {/* Submit button */}
        {!hasSubmitted && selectedAnswer && (
          <Animated.View entering={FadeIn}>
            <AnimatedButton
              onPress={handleSubmitAnswer}
              title="Submit Answer"
              size="large"
              style={styles.submitButton}
              hapticType="medium"
            />
          </Animated.View>
        )}

        {/* Result feedback */}
        {showResult && (
          <Animated.View style={[styles.resultContainer, resultAnimatedStyle]}>
            <AnimatedCard entrance="scale">
              <Text style={[
                styles.resultText,
                { color: selectedAnswer === currentQuestion.answer ? '#10b981' : '#ef4444' }
              ]}>
                {selectedAnswer === currentQuestion.answer ? '✅ Correct!' : '❌ Incorrect'}
              </Text>
              {selectedAnswer !== currentQuestion.answer && (
                <Text style={styles.correctAnswerText}>
                  The correct answer was: <Text style={styles.boldText}>{currentQuestion.answer}</Text>
                </Text>
              )}
            </AnimatedCard>
          </Animated.View>
        )}

        {/* Live player status */}
        <AnimatedCard style={styles.playersCard} entrance="fade" delay={200}>
          <Text style={styles.playersTitle}>Live Players</Text>
          <View style={styles.playersGrid}>
            {players.slice(0, 4).map((player) => (
              <View key={player.id} style={styles.playerChip}>
                <Text style={styles.playerName}>
                  {player.email.split('@')[0]}
                </Text>
                <View style={[
                  styles.playerIndicator,
                  { backgroundColor: player.hasAnswered ? '#10b981' : '#fbbf24' }
                ]} />
              </View>
            ))}
            {players.length > 4 && (
              <Text style={styles.morePlayersText}>+{players.length - 4} more</Text>
            )}
          </View>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Progress section
  progressSection: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  
  // Score section
  scoreSection: {
    marginBottom: 20,
  },
  scoreCard: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  streakBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  
  // Question styles
  questionCard: {
    marginBottom: 24,
    padding: 24,
  },
  categoryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 28,
  },
  
  // Answer styles
  answersContainer: {
    marginBottom: 24,
  },
  answerButton: {
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    marginRight: 12,
  },
  
  // Submit button
  submitButton: {
    marginBottom: 24,
  },
  
  // Result styles
  resultContainer: {
    marginBottom: 24,
  },
  resultText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  
  // Players card
  playersCard: {
    padding: 16,
  },
  playersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  playerName: {
    fontSize: 12,
    color: '#374151',
  },
  playerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  morePlayersText: {
    fontSize: 12,
    color: '#6b7280',
    alignSelf: 'center',
  },
  
  // Game over styles
  gameOverContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  finalScoresCard: {
    marginBottom: 20,
    padding: 20,
  },
  finalScoresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  finalScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
  },
  currentUserScore: {
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  rankBadge: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: '600',
  },
  playerNameText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  // Stats card
  statsCard: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  encouragingMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Waiting screen
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  waitingIcon: {
    marginBottom: 24,
  },
  waitingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 