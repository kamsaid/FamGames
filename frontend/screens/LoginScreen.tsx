// Login screen with magic link authentication
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  // State for form management
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Get auth methods from context
  const { signInWithEmail, bypassAuthForDev, isDevBypass } = useAuth();

  // Check for auth errors from URL parameters (from WebAuthCallback)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const urlParams = new URLSearchParams(window.location.search);
      const authErrorParam = urlParams.get('auth_error');
      
      if (authErrorParam) {
        let errorMessage = '';
        switch (authErrorParam) {
          case 'expired':
            errorMessage = 'Your magic link has expired. Please request a new one.';
            break;
          case 'session':
            errorMessage = 'Failed to establish session. Please try again.';
            break;
          case 'invalid':
            errorMessage = 'Invalid authentication. Please try again.';
            break;
          case 'unexpected':
            errorMessage = 'An unexpected error occurred. Please try again.';
            break;
          default:
            errorMessage = 'Authentication failed. Please try again.';
        }
        
        setAuthError(errorMessage);
        
        // Clear the error from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Clear error after showing it
        setTimeout(() => {
          setAuthError(null);
        }, 5000);
      }
    }
  }, []);

  // Email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle magic link send
  const handleSendMagicLink = async () => {
    // Validate email before sending
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!isValidEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      setAuthError(null); // Clear any previous errors
      
      // Send magic link using AuthContext
      await signInWithEmail(email.trim());
      
      // Show success state
      setShowSuccess(true);
    } catch (error: any) {
      // Handle errors and show user-friendly messages
      console.error('Magic link error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send magic link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle development bypass
  const handleDevBypass = () => {
    if (!__DEV__) return;
    
    Alert.alert(
      '🚧 Development Bypass',
      'This will skip authentication and create a mock user session for testing purposes.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Bypass Auth',
          style: 'destructive',
          onPress: () => {
            bypassAuthForDev();
            console.log('🚧 Development bypass activated');
          },
        },
      ]
    );
  };

  // Handle try again action
  const handleTryAgain = () => {
    setShowSuccess(false);
    setEmail('');
    setAuthError(null);
  };

  // Success state UI
  if (showSuccess) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>Check your email!</Text>
          <Text style={styles.successMessage}>
            We've sent a magic link to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
          <Text style={styles.instructionText}>
            Tap the link in your email to sign in to Family Together.
          </Text>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleTryAgain}
          >
            <Text style={styles.secondaryButtonText}>Use different email</Text>
          </TouchableOpacity>

          {/* Development bypass button in success state */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.devBypassButton} 
              onPress={handleDevBypass}
            >
              <Text style={styles.devBypassButtonText}>🚧 Skip Auth (Dev)</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Main login form UI
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        {/* App header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Family Together</Text>
          <Text style={styles.appSubtitle}>
            Connect with your family through fun trivia games
          </Text>
        </View>

        {/* Show auth error if present */}
        {authError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {authError}</Text>
          </View>
        )}

        {/* Development bypass indicator */}
        {__DEV__ && isDevBypass && (
          <View style={styles.devBypassIndicator}>
            <Text style={styles.devBypassIndicatorText}>
              🚧 Development Bypass Active
            </Text>
          </View>
        )}

        {/* Email input form */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            placeholderTextColor="#9ca3af"
          />

          {/* Send magic link button */}
          <TouchableOpacity
            style={[
              styles.magicLinkButton,
              (!email.trim() || !isValidEmail(email.trim()) || loading) && styles.disabledButton
            ]}
            onPress={handleSendMagicLink}
            disabled={!email.trim() || !isValidEmail(email.trim()) || loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.magicLinkButtonText}>Send Magic Link</Text>
            )}
          </TouchableOpacity>

          {/* Help text */}
          <Text style={styles.helpText}>
            We'll send you a secure link to sign in without a password.
          </Text>

          {/* Development bypass button */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.devBypassButton} 
              onPress={handleDevBypass}
            >
              <Text style={styles.devBypassButtonText}>🚧 Skip Auth for Testing</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  devBypassIndicator: {
    backgroundColor: '#fefce8',
    borderColor: '#fed7aa',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  devBypassIndicatorText: {
    color: '#92400e',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emailInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 24,
  },
  magicLinkButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  magicLinkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  devBypassButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  devBypassButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  emailText: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
}); 