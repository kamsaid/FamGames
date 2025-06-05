// Main App component with navigation and context providers setup
import React, { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from './services/supabase';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

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

// Import UX helpers and toast config
import { SoundManager } from './utils/uxHelpers';
import { toastConfig } from './components/ToastNotification';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main App component with all providers and navigation setup
export default function App() {
  // Handle web magic-link callback before rendering the app
  if (Platform.OS === 'web') {
    const currentPath = window.location.pathname;
    const hasHash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const hasAuthCode = searchParams.has('code');
    const hasError = searchParams.has('error');
    
    // Check if this is an auth callback URL
    if (currentPath === '/auth/callback' || hasHash.includes('access_token') || hasHash.includes('error') || hasAuthCode || hasError) {
      return <WebAuthCallback />;
    }
  }

  // Initialize sound effects on app start
  useEffect(() => {
    // Initialize sounds for better UX (comment out if sound files not added yet)
    // SoundManager.initialize();

    // Cleanup on unmount
    return () => {
      // SoundManager.cleanup();
    };
  }, []);

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FamilyProvider>
            <GameRoomProvider>
              <NavigationContainer>
                <MainNavigator />
              </NavigationContainer>
              <StatusBar style="auto" />
              <Toast config={toastConfig} />
            </GameRoomProvider>
          </FamilyProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 