// Animated button component with haptic feedback and press animations
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { HapticManager } from '../utils/uxHelpers';

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticType?: 'light' | 'medium' | 'heavy';
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  hapticType = 'light',
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Handle press in animation
  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, mass: 1 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  // Handle press out animation
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, mass: 1 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  // Handle press with haptic feedback
  const handlePress = () => {
    if (disabled || loading) return;
    
    // Trigger haptic feedback based on type
    switch (hapticType) {
      case 'medium':
        HapticManager.medium();
        break;
      case 'heavy':
        HapticManager.heavy();
        break;
      default:
        HapticManager.light();
    }
    
    onPress();
  };

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(
        opacity.value,
        [0.8, 1],
        [disabled ? 0.5 : 0.8, disabled ? 0.5 : 1]
      ),
    };
  });

  // Get button styles based on variant
  const getButtonStyles = (): ViewStyle => {
    const baseStyle = styles.button;
    const sizeStyle = styles[`${size}Button` as keyof typeof styles] as ViewStyle;
    const variantStyle = styles[`${variant}Button` as keyof typeof styles] as ViewStyle;
    
    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      ...(disabled && styles.disabled),
      ...style,
    };
  };

  // Get text styles based on variant
  const getTextStyles = (): TextStyle => {
    const sizeStyle = styles[`${size}Text` as keyof typeof styles] as TextStyle;
    const variantStyle = styles[`${variant}Text` as keyof typeof styles] as TextStyle;
    
    return {
      ...styles.buttonText,
      ...sizeStyle,
      ...variantStyle,
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
    >
      <Animated.View style={[getButtonStyles(), animatedStyle]}>
        {loading ? (
          <ActivityIndicator 
            size={size === 'small' ? 'small' : 'small'} 
            color={variant === 'primary' ? '#ffffff' : '#3b82f6'} 
          />
        ) : (
          <>
            {icon && <>{icon}</>}
            <Text style={getTextStyles()}>{title}</Text>
          </>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base button style
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  
  // Size variants
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mediumButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  largeButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  
  // Color variants
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  
  // Text base style
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Text size variants
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Text color variants
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: '#374151',
  },
  successText: {
    color: '#ffffff',
  },
  dangerText: {
    color: '#ffffff',
  },
  ghostText: {
    color: '#3b82f6',
  },
  
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
}); 