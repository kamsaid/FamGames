// Animated card component with entrance animations and interactive effects
import React, { useEffect } from 'react';
import {
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  SlideInDown,
} from 'react-native-reanimated';
import { HapticManager } from '../utils/uxHelpers';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  delay?: number;
  entrance?: 'fade' | 'slide' | 'scale';
  interactive?: boolean;
  haptic?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  onPress,
  delay = 0,
  entrance = 'fade',
  interactive = true,
  haptic = true,
}) => {
  // Animation values
  const scale = useSharedValue(entrance === 'scale' ? 0.8 : 1);
  const opacity = useSharedValue(entrance === 'fade' ? 0 : 1);
  const shadowOpacity = useSharedValue(0.1);

  useEffect(() => {
    if (entrance === 'scale') {
      scale.value = withDelay(delay, withSpring(1, { damping: 15, mass: 1 }));
    } else if (entrance === 'fade') {
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    }
  }, []);

  // Handle press animations
  const handlePressIn = () => {
    if (!interactive) return;
    scale.value = withSpring(0.98, { damping: 15, mass: 1 });
    shadowOpacity.value = withTiming(0.05, { duration: 100 });
  };

  const handlePressOut = () => {
    if (!interactive) return;
    scale.value = withSpring(1, { damping: 15, mass: 1 });
    shadowOpacity.value = withTiming(0.1, { duration: 100 });
  };

  const handlePress = () => {
    if (onPress) {
      if (haptic) {
        HapticManager.light();
      }
      onPress();
    }
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
      shadowOpacity: shadowOpacity.value,
    };
  });

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  // Get entrance animation
  const getEntranceAnimation = () => {
    switch (entrance) {
      case 'slide':
        return SlideInDown.delay(delay).springify();
      case 'fade':
        return FadeIn.delay(delay).duration(300);
      default:
        return undefined;
    }
  };

  if (onPress) {
    return (
      <AnimatedTouchable
        entering={entrance === 'slide' ? getEntranceAnimation() : undefined}
        style={[styles.card, style, animatedStyle]}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View
      entering={entrance === 'slide' ? getEntranceAnimation() : undefined}
      style={[styles.card, style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 