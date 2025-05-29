// Main App component with navigation and context providers setup
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import context providers
import { AuthProvider } from './contexts/AuthContext';
import { FamilyProvider } from './contexts/FamilyContext';
import { GameRoomProvider } from './contexts/GameRoomContext';

// Import screens (we'll create these next)
import LoginScreen from './screens/LoginScreen';
import FamilyOnboardingScreen from './screens/FamilyOnboardingScreen';
import TriviaLobbyScreen from './screens/TriviaLobbyScreen';
import TriviaGameScreen from './screens/TriviaGameScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

// Import navigation component
import MainNavigator from './navigation/MainNavigator';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main App component with all providers and navigation setup
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FamilyProvider>
          <GameRoomProvider>
            <NavigationContainer>
              <MainNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </GameRoomProvider>
        </FamilyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
} 