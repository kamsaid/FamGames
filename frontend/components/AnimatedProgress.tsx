// Animated progress bar component for showing game progress and timers
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';

interface AnimatedProgressProps {
  progress: number; // 0 to 1
  variant?: 'linear' | 'circular';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  style?: ViewStyle;
  warning?: boolean; // Show warning animation when true
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  progress,
  variant = 'linear',
  size = 'medium',
  color = '#3b82f6',
  backgroundColor = '#e5e7eb',
  showLabel = false,
  label,
  animated = true,
  style,
  warning = false,
}) => {
  // Animation values
  const animatedProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const warningOpacity = useSharedValue(1);

  // Update progress with animation
  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated]);

  // Warning animation (pulse and flash)
  useEffect(() => {
    if (warning) {
      // Pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
      
      // Flash animation
      warningOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      warningOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [warning]);

  // Get size dimensions
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { height: 4, labelSize: 12, circularSize: 40 };
      case 'large':
        return { height: 12, labelSize: 18, circularSize: 80 };
      default:
        return { height: 8, labelSize: 14, circularSize: 60 };
    }
  };

  const dimensions = getDimensions();

  if (variant === 'circular') {
    const AnimatedCircle = Animated.createAnimatedComponent(Circle);
    const radius = dimensions.circularSize / 2 - 5;
    const circumference = 2 * Math.PI * radius;

    const animatedCircleStyle = useAnimatedStyle(() => {
      const strokeDashoffset = interpolate(
        animatedProgress.value,
        [0, 1],
        [circumference, 0]
      );

      return {
        strokeDashoffset,
      };
    });

    const containerStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pulseScale.value }],
        opacity: warningOpacity.value,
      };
    });

    return (
      <Animated.View style={[styles.circularContainer, style, containerStyle]}>
        <Svg width={dimensions.circularSize} height={dimensions.circularSize}>
          {/* Background circle */}
          <Circle
            cx={dimensions.circularSize / 2}
            cy={dimensions.circularSize / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={4}
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx={dimensions.circularSize / 2}
            cy={dimensions.circularSize / 2}
            r={radius}
            stroke={warning ? '#ef4444' : color}
            strokeWidth={4}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedCircleStyle}
            strokeLinecap="round"
            transform={`rotate(-90 ${dimensions.circularSize / 2} ${dimensions.circularSize / 2})`}
          />
        </Svg>
        {showLabel && (
          <View style={styles.circularLabelContainer}>
            <Text style={[
              styles.circularLabel,
              { fontSize: dimensions.labelSize, color: warning ? '#ef4444' : '#374151' }
            ]}>
              {label || `${Math.round(progress * 100)}%`}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  // Linear progress bar
  const animatedBarStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value * 100}%`,
      transform: [{ scale: pulseScale.value }],
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: warningOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, style, containerStyle]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: dimensions.labelSize }]}>
            {label || `${Math.round(progress * 100)}%`}
          </Text>
        </View>
      )}
      <View style={[
        styles.progressBackground,
        { height: dimensions.height, backgroundColor }
      ]}>
        <Animated.View
          style={[
            styles.progressBar,
            { 
              height: dimensions.height, 
              backgroundColor: warning ? '#ef4444' : color 
            },
            animatedBarStyle
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    color: '#374151',
    fontWeight: '500',
  },
  progressBackground: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    borderRadius: 999,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularLabel: {
    fontWeight: '600',
  },
}); 