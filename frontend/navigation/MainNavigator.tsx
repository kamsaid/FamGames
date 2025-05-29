// Main navigation component that handles auth flow and app navigation
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

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

// Loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#6366f1" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280' }}>
      Loading...
    </Text>
  </View>
);

// Main navigator component that handles authentication and family state
export default function MainNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { currentFamily, loading: familyLoading } = useFamily();

  // Show loading screen while auth or family data is loading
  if (authLoading || familyLoading) {
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