// UX Helpers - Haptic feedback, sounds, and animations for enhanced user experience
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Sound effect types for different game events
export type SoundType = 
  | 'correct' 
  | 'incorrect' 
  | 'timer_tick' 
  | 'game_start' 
  | 'game_end' 
  | 'achievement' 
  | 'button_tap'
  | 'level_up'
  | 'countdown';

// Haptic feedback manager for tactile responses
export class HapticManager {
  static isEnabled = true; // Allow users to disable haptics

  /**
   * Light impact for button taps and selections
   */
  static light = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Medium impact for important actions like submitting answers
   */
  static medium = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  /**
   * Heavy impact for major events like game completion
   */
  static heavy = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  /**
   * Success notification for correct answers
   */
  static success = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  /**
   * Error notification for incorrect answers
   */
  static error = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  /**
   * Warning notification for time warnings
   */
  static warning = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  /**
   * Selection changed for scrolling through options
   */
  static selection = () => {
    if (!this.isEnabled || Platform.OS === 'web') return;
    Haptics.selectionAsync();
  };
}

// Sound effects manager for audio feedback
export class SoundManager {
  static isEnabled = true; // Allow users to disable sounds
  static sounds: Map<SoundType, Audio.Sound> = new Map();
  static isInitialized = false;

  /**
   * Initialize all sound effects
   */
  static async initialize() {
    if (this.isInitialized || Platform.OS === 'web') return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load sound effects (you'll need to add these sound files to assets/sounds/)
      const soundFiles: Record<SoundType, any> = {
        correct: require('../assets/sounds/correct.mp3'),
        incorrect: require('../assets/sounds/incorrect.mp3'),
        timer_tick: require('../assets/sounds/tick.mp3'),
        game_start: require('../assets/sounds/game_start.mp3'),
        game_end: require('../assets/sounds/game_end.mp3'),
        achievement: require('../assets/sounds/achievement.mp3'),
        button_tap: require('../assets/sounds/tap.mp3'),
        level_up: require('../assets/sounds/level_up.mp3'),
        countdown: require('../assets/sounds/countdown.mp3'),
      };

      // Pre-load all sounds
      for (const [type, file] of Object.entries(soundFiles)) {
        const { sound } = await Audio.Sound.createAsync(file);
        this.sounds.set(type as SoundType, sound);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize sounds:', error);
    }
  }

  /**
   * Play a sound effect
   */
  static async play(type: SoundType) {
    if (!this.isEnabled || !this.isInitialized || Platform.OS === 'web') return;

    try {
      const sound = this.sounds.get(type);
      if (sound) {
        await sound.replayAsync();
      }
    } catch (error) {
      console.error(`Failed to play sound ${type}:`, error);
    }
  }

  /**
   * Cleanup sounds when component unmounts
   */
  static async cleanup() {
    for (const sound of this.sounds.values()) {
      await sound.unloadAsync();
    }
    this.sounds.clear();
    this.isInitialized = false;
  }
}

// Animation presets for consistent UI animations
export const AnimationPresets = {
  // Spring animation for bouncy effects
  spring: {
    damping: 15,
    mass: 1,
    stiffness: 150,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },

  // Smooth animation for subtle transitions
  smooth: {
    damping: 20,
    mass: 1,
    stiffness: 100,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },

  // Quick animation for responsive feedback
  quick: {
    damping: 25,
    mass: 0.5,
    stiffness: 250,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

// Score calculation with bonus multipliers
export const calculateScore = (
  isCorrect: boolean,
  timeRemaining: number,
  streak: number,
  difficulty: 'easy' | 'medium' | 'hard'
): number => {
  if (!isCorrect) return 0;

  // Base points by difficulty
  const basePoints = {
    easy: 50,
    medium: 100,
    hard: 150,
  };

  // Time bonus (more points for faster answers)
  const timeBonus = Math.floor(timeRemaining * 2);

  // Streak multiplier
  const streakMultiplier = 1 + (streak * 0.1); // 10% bonus per streak

  // Calculate total
  const total = Math.floor(
    (basePoints[difficulty] + timeBonus) * streakMultiplier
  );

  return total;
};

// Format time for display
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get achievement for score milestones
export const getAchievement = (score: number): string | null => {
  if (score >= 10000) return '🏆 Trivia Master';
  if (score >= 5000) return '🥇 Trivia Expert';
  if (score >= 2500) return '🥈 Trivia Pro';
  if (score >= 1000) return '🥉 Trivia Enthusiast';
  if (score >= 500) return '⭐ Rising Star';
  if (score >= 100) return '🌟 Beginner';
  return null;
};

// Generate encouraging messages based on performance
export const getEncouragingMessage = (
  correctAnswers: number,
  totalQuestions: number
): string => {
  const percentage = (correctAnswers / totalQuestions) * 100;

  if (percentage === 100) return 'Perfect! You\'re a trivia genius! 🎉';
  if (percentage >= 80) return 'Excellent work! You\'re on fire! 🔥';
  if (percentage >= 60) return 'Great job! Keep it up! 💪';
  if (percentage >= 40) return 'Good effort! Practice makes perfect! 📚';
  if (percentage >= 20) return 'Nice try! Every game is a learning opportunity! 🌱';
  return 'Don\'t give up! You\'ll do better next time! 💫';
}; 