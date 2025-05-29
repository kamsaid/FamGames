// Trivia game screen - displays questions, handles answers, shows progress and results
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useGameRoom } from '../contexts/GameRoomContext';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function TriviaGameScreen() {
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

  const { user } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Reset state when new question arrives
  useEffect(() => {
    if (currentQuestion) {
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setShowResult(false);
    }
  }, [currentQuestion]);

  // Show result after user submits answer
  useEffect(() => {
    if (hasSubmitted && currentQuestion) {
      setShowResult(true);
    }
  }, [hasSubmitted, currentQuestion]);

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (hasSubmitted || !gameActive) return;
    setSelectedAnswer(answer);
  };

  // Handle answer submission
  const handleSubmitAnswer = () => {
    if (!selectedAnswer || hasSubmitted || !currentQuestion) return;

    // Submit answer through context
    submitAnswer(selectedAnswer);
    setHasSubmitted(true);
  };

  // Get current user's answer status
  const currentPlayer = players.find(p => p.id === user?.id);
  const userHasAnswered = currentPlayer?.hasAnswered || hasSubmitted;

  // Render game over screen
  if (!gameActive && finalScores) {
    const sortedPlayers = players.sort((a, b) => b.score - a.score);
    
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.gameOverTitle}>🎉 Game Complete!</Text>
          
          <View style={styles.finalScoresContainer}>
            <Text style={styles.finalScoresTitle}>Final Scores</Text>
            {sortedPlayers.map((player, index) => (
              <View key={player.id} style={styles.finalScoreItem}>
                <Text style={styles.rankText}>#{index + 1}</Text>
                <Text style={styles.playerNameText}>
                  {player.email.split('@')[0]}
                  {player.id === user?.id && ' (You)'}
                </Text>
                <Text style={styles.scoreText}>{player.score} pts</Text>
              </View>
            ))}
          </View>

          <View style={styles.yourScoreContainer}>
            <Text style={styles.yourScoreTitle}>Your Score</Text>
            <Text style={styles.yourScoreValue}>{userScore} points</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Render waiting screen if no active game
  if (!gameActive || !currentQuestion) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingTitle}>Waiting for game to start...</Text>
        <Text style={styles.waitingSubtitle}>
          The host will start the trivia game shortly
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress and Timer Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Question {questionIndex + 1} of {totalQuestions}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${((questionIndex + 1) / totalQuestions) * 100}%` }
                ]} 
              />
            </View>
          </View>
          
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timeRemaining}s</Text>
          </View>
        </View>

        {/* Current Score */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Your Score:</Text>
          <Text style={styles.scoreValue}>{userScore} pts</Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.categoryText}>{currentQuestion.category}</Text>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Answer Choices */}
        <View style={styles.answersContainer}>
          {currentQuestion.choices.map((choice, index) => {
            const isSelected = selectedAnswer === choice;
            const isCorrect = choice === currentQuestion.answer;
            const showCorrectAnswer = showResult && isCorrect;
            const showIncorrectAnswer = showResult && isSelected && !isCorrect;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerButton,
                  isSelected && styles.selectedAnswer,
                  showCorrectAnswer && styles.correctAnswer,
                  showIncorrectAnswer && styles.incorrectAnswer,
                ]}
                onPress={() => handleAnswerSelect(choice)}
                disabled={hasSubmitted || !gameActive}
              >
                <Text style={styles.answerLetter}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={[
                  styles.answerText,
                  isSelected && styles.selectedAnswerText,
                  showCorrectAnswer && styles.correctAnswerText,
                  showIncorrectAnswer && styles.incorrectAnswerText,
                ]}>
                  {choice}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        {!hasSubmitted && selectedAnswer && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitAnswer}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        )}

        {/* Result Message */}
        {showResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultText}>
              {selectedAnswer === currentQuestion.answer 
                ? '🎉 Correct!' 
                : '❌ Incorrect'
              }
            </Text>
            <Text style={styles.correctAnswerText}>
              The correct answer was: {currentQuestion.answer}
            </Text>
          </View>
        )}

        {/* Players Status */}
        <View style={styles.playersContainer}>
          <Text style={styles.playersTitle}>Players</Text>
          {players.map((player) => (
            <View key={player.id} style={styles.playerItem}>
              <Text style={styles.playerName}>
                {player.email.split('@')[0]}
                {player.id === user?.id && ' (You)'}
              </Text>
              <View style={styles.playerStatus}>
                <Text style={styles.playerScore}>{player.score} pts</Text>
                <Text style={[
                  styles.playerAnswered,
                  { color: player.hasAnswered ? '#10b981' : '#6b7280' }
                ]}>
                  {player.hasAnswered ? '✓' : '⏳'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flex: 1,
    marginRight: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  timerContainer: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Score styles
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  // Question styles
  questionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    color: '#1f2937',
    fontWeight: '600',
    lineHeight: 26,
  },
  // Answer styles
  answersContainer: {
    marginBottom: 24,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedAnswer: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  correctAnswer: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  incorrectAnswer: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    width: 30,
    textAlign: 'center',
  },
  answerText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  selectedAnswerText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  correctAnswerText: {
    color: '#10b981',
    fontWeight: '600',
  },
  incorrectAnswerText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  // Submit button styles
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Result styles
  resultContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // Players status styles
  playersContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  playerName: {
    fontSize: 14,
    color: '#374151',
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerScore: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  playerAnswered: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Game over styles
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  finalScoresContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  finalScoresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  finalScoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    width: 40,
  },
  playerNameText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  yourScoreContainer: {
    backgroundColor: '#3b82f6',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  yourScoreTitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  yourScoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  // Waiting screen styles
  waitingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 