// Main App component with navigation and context providers setup
import React, { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from './services/supabase';
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
import WebAuthCallback from './screens/WebAuthCallback';

// Import navigation component
import MainNavigator from './navigation/MainNavigator';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main App component with all providers and navigation setup
export default function App() {
  // Handle web magic-link callback before rendering the app
  if (Platform.OS === 'web') {
    const currentPath = window.location.pathname;
    const hasHash = window.location.hash;
    
    // Check if this is an auth callback URL
    if (currentPath === '/auth/callback' || hasHash.includes('access_token') || hasHash.includes('error')) {
      return <WebAuthCallback />;
    }
  }

  // Listen for deep links (mobile) and handle auth URLs
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        console.log('Deep link received:', url);
        
        // Handle auth callback URLs
        if (url.includes('auth/callback')) {
          supabase.auth.getSessionFromUrl({ url }).catch((error) => {
            console.error('Error handling deep link auth:', error);
          });
        }
      });
      
      return () => subscription.remove();
    }
  }, []);

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