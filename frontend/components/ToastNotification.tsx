// Toast notification component for user feedback
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Toast, { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { HapticManager } from '../utils/uxHelpers';

const { width } = Dimensions.get('window');

// Custom toast configuration with animations and haptics
export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={[styles.successToast, styles.baseToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      onShow={() => {
        HapticManager.success();
      }}
    />
  ),
  
  error: (props) => (
    <ErrorToast
      {...props}
      style={[styles.errorToast, styles.baseToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      onShow={() => {
        HapticManager.error();
      }}
    />
  ),
  
  info: (props) => (
    <BaseToast
      {...props}
      style={[styles.infoToast, styles.baseToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      onShow={() => {
        HapticManager.light();
      }}
    />
  ),
  
  achievement: ({ text1, text2, onHide }) => (
    <AnimatedToast
      type="achievement"
      title={text1}
      message={text2}
      onHide={onHide}
    />
  ),
  
  gameEvent: ({ text1, text2, onHide }) => (
    <AnimatedToast
      type="gameEvent"
      title={text1}
      message={text2}
      onHide={onHide}
    />
  ),
};

// Animated toast component for special notifications
interface AnimatedToastProps {
  type: 'achievement' | 'gameEvent';
  title?: string;
  message?: string;
  onHide?: () => void;
}

const AnimatedToast: React.FC<AnimatedToastProps> = ({
  type,
  title,
  message,
  onHide,
}) => {
  const scale = useSharedValue(0.3);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, { damping: 15, mass: 1 });
    translateY.value = withSpring(0, { damping: 15, mass: 1 });
    opacity.value = withTiming(1, { duration: 200 });

    // Trigger haptic feedback
    if (type === 'achievement') {
      HapticManager.success();
    } else {
      HapticManager.medium();
    }

    // Auto hide after 3 seconds
    const timer = setTimeout(() => {
      scale.value = withTiming(0.3, { duration: 200 });
      translateY.value = withTiming(-100, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 }, () => {
        if (onHide) {
          runOnJS(onHide)();
        }
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value },
      ],
      opacity: opacity.value,
    };
  });

  const getIcon = () => {
    switch (type) {
      case 'achievement':
        return '🏆';
      case 'gameEvent':
        return '🎯';
      default:
        return '📢';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'achievement':
        return '#fbbf24';
      case 'gameEvent':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <Animated.View
      style={[
        styles.animatedToast,
        { backgroundColor: getBackgroundColor() },
        animatedStyle,
      ]}
    >
      <Text style={styles.icon}>{getIcon()}</Text>
      <View style={styles.textContainer}>
        {title && <Text style={styles.animatedTitle}>{title}</Text>}
        {message && <Text style={styles.animatedMessage}>{message}</Text>}
      </View>
    </Animated.View>
  );
};

// Toast utility functions
export const showToast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  
  error: (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  },
  
  info: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },
  
  achievement: (title: string, message?: string) => {
    Toast.show({
      type: 'achievement',
      text1: title,
      text2: message,
      position: 'top',
    });
  },
  
  gameEvent: (title: string, message?: string) => {
    Toast.show({
      type: 'gameEvent',
      text1: title,
      text2: message,
      position: 'top',
    });
  },
};

const styles = StyleSheet.create({
  baseToast: {
    borderLeftWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    width: width - 32,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  message: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  successToast: {
    backgroundColor: '#10b981',
  },
  errorToast: {
    backgroundColor: '#ef4444',
  },
  infoToast: {
    backgroundColor: '#3b82f6',
  },
  animatedToast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    width: width - 32,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  animatedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  animatedMessage: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
}); 