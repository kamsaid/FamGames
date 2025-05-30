// Main navigation component that handles auth flow and app navigation
import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';

// Import contexts
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';

// Import screens (we'll create these in the next tasks)
import LoginScreen from '../screens/LoginScreen';
import FamilyOnboardingScreen from '../screens/FamilyOnboardingScreen';
import TriviaLobbyScreen from '../screens/TriviaLobbyScreen';
import TriviaGameScreen from '../screens/TriviaGameScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';

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
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main tabs navigator for authenticated users with families
const MainTabsNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Lobby" 
        component={TriviaLobbyScreen}
        options={{
          tabBarLabel: 'Game Lobby',
        }}
      />
      <Tab.Screen 
        name="Leaderboard" 
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Leaderboard',
        }}
      />
    </Tab.Navigator>
  );
};

// Enhanced loading component with timeout and bypass option
const LoadingScreen = () => {
  const [showTimeout, setShowTimeout] = useState(false);
  const { bypassAuthForDev, isDevBypass } = useAuth();

  useEffect(() => {
    // Show timeout option after 5 seconds
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

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
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: '#6b7280',
        textAlign: 'center',
      }}>
        {isDevBypass ? 'Setting up dev environment...' : 'Loading...'}
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // User not authenticated - show login screen
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : !currentFamily ? (
        // User authenticated but no family - show family onboarding
        <Stack.Screen name="FamilyOnboarding" component={FamilyOnboardingScreen} />
      ) : (
        // User authenticated and has family - show main app
        <>
          <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
          <Stack.Screen 
            name="TriviaGame" 
            component={TriviaGameScreen}
            options={{
              gestureEnabled: false, // Prevent swipe back during game
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
} 