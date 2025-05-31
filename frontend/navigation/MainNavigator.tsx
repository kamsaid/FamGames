// Main navigation component that handles auth flow and app navigation
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Import contexts
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';
import { useGameRoom } from '../contexts/GameRoomContext';

// Import screens (we'll create these in the next tasks)
import LoginScreen from '../screens/LoginScreen';
import FamilyOnboardingScreen from '../screens/FamilyOnboardingScreen';
import TriviaLobbyScreen from '../screens/TriviaLobbyScreen';
import TriviaGameScreen from '../screens/TriviaGameScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Import components
import { HapticManager } from '../utils/uxHelpers';

// Navigation type definitions
export type RootStackParamList = {
  Login: undefined;
  FamilyOnboarding: undefined;
  MainTabs: undefined;
  TriviaGame: undefined;
};

export type MainTabParamList = {
  Lobby: undefined;
  Leaderboard: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Animated tab bar icon component
interface AnimatedTabIconProps {
  focused: boolean;
  color: string;
  size: number;
  iconName: string;
  badge?: number;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({ 
  focused, 
  color, 
  size, 
  iconName,
  badge 
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      // Bounce animation when tab becomes active
      scale.value = withSpring(1.2, { damping: 15, mass: 1 });
      rotation.value = withSpring(10, { damping: 15, mass: 1 });
      
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, mass: 1 });
        rotation.value = withSpring(0, { damping: 15, mass: 1 });
      }, 200);
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={animatedStyle}>
        <Ionicons name={iconName} size={size} color={color} />
      </Animated.View>
      {badge !== undefined && badge > 0 && (
        <View style={{
          position: 'absolute',
          top: -5,
          right: -10,
          backgroundColor: '#ef4444',
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
};

// Main tabs navigator for authenticated users with families
const MainTabsNavigator = () => {
  const { players } = useGameRoom();
  const onlineCount = players.length;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 80 : 60,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
      screenListeners={{
        tabPress: () => {
          // Haptic feedback on tab press
          HapticManager.light();
        },
      }}
    >
      <Tab.Screen 
        name="Lobby" 
        component={TriviaLobbyScreen}
        options={{
          tabBarLabel: 'Game Lobby',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              size={size}
              iconName={focused ? 'game-controller' : 'game-controller-outline'}
              badge={onlineCount > 0 ? onlineCount : undefined}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              size={size}
              iconName={focused ? 'trophy' : 'trophy-outline'}
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color, size }) => (
            <AnimatedTabIcon
              focused={focused}
              color={color}
              size={size}
              iconName={focused ? 'settings' : 'settings-outline'}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Enhanced loading component with animations
const LoadingScreen = () => {
  const [showTimeout, setShowTimeout] = useState(false);
  const { bypassAuthForDev, isDevBypass } = useAuth();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Spinning animation for loader
    rotation.value = withTiming(360, { duration: 1000 }, () => {
      rotation.value = 0;
      rotation.value = withTiming(360, { duration: 1000 });
    });

    // Scale animation
    scale.value = withSpring(1, { damping: 15, mass: 1 });

    // Show timeout option after 5 seconds
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const handleBypass = () => {
    if (__DEV__) {
      console.log('🚧 Loading timeout - activating bypass');
      bypassAuthForDev();
    }
  };

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      paddingHorizontal: 24,
    }}>
      <Animated.View style={animatedStyle}>
        <Ionicons name="game-controller" size={60} color="#3b82f6" />
      </Animated.View>
      <Text style={{ 
        marginTop: 24, 
        fontSize: 18, 
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
      }}>
        Family Together
      </Text>
      <Text style={{ 
        fontSize: 14, 
        color: '#6b7280',
        textAlign: 'center',
      }}>
        {isDevBypass ? 'Setting up dev environment...' : 'Loading your trivia experience...'}
      </Text>
      
      {__DEV__ && (
        <Text style={{ 
          marginTop: 8, 
          fontSize: 12, 
          color: '#9ca3af',
          textAlign: 'center',
        }}>
          Development Mode - Check console for logs
        </Text>
      )}

      {/* Show bypass button after timeout or if stuck loading */}
      {__DEV__ && showTimeout && !isDevBypass && (
        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: '#f59e0b',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={handleBypass}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: 14,
            fontWeight: '600',
          }}>
            🚧 Skip Loading (Dev)
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Main navigator component that handles authentication and family state
export default function MainNavigator() {
  const { user, loading: authLoading, isDevBypass } = useAuth();
  const { currentFamily, loading: familyLoading } = useFamily();
  const [initializationTimeout, setInitializationTimeout] = useState(false);

  // Handle initialization timeout
  useEffect(() => {
    if (authLoading || familyLoading) {
      const timer = setTimeout(() => {
        console.warn('Navigation initialization timeout - showing loading screen with bypass');
        setInitializationTimeout(true);
      }, 8000); // 8 second timeout

      return () => clearTimeout(timer);
    } else {
      setInitializationTimeout(false);
    }
  }, [authLoading, familyLoading]);

  // Log current state for debugging
  useEffect(() => {
    console.log('MainNavigator state:', {
      user: user?.email || 'No user',
      authLoading,
      familyLoading,
      currentFamily: currentFamily?.name || 'No family',
      isDevBypass,
      initializationTimeout
    });
  }, [user, authLoading, familyLoading, currentFamily, isDevBypass, initializationTimeout]);

  // Show loading screen while auth or family data is loading
  if ((authLoading || familyLoading) && !initializationTimeout) {
    return <LoadingScreen />;
  }

  // Show loading screen with bypass if timeout occurred
  if (initializationTimeout && (authLoading || familyLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // Add default transition animations
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress,
          },
        }),
      }}
    >
      {!user ? (
        // User not authenticated - show login screen
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : !currentFamily ? (
        // User authenticated but no family - show family onboarding
        <Stack.Screen 
          name="FamilyOnboarding" 
          component={FamilyOnboardingScreen}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : (
        // User authenticated and has family - show main app
        <>
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabsNavigator}
            options={{
              animationEnabled: true,
            }}
          />
          <Stack.Screen 
            name="TriviaGame" 
            component={TriviaGameScreen}
            options={{
              gestureEnabled: false, // Prevent swipe back during game
              presentation: 'modal',
              cardStyleInterpolator: ({ current: { progress } }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [600, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
} 