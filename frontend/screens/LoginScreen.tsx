// Login screen with magic link authentication
import React, { useState } from 'react';
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

  // Get auth methods from context
  const { signInWithEmail } = useAuth();

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

  // Handle try again action
  const handleTryAgain = () => {
    setShowSuccess(false);
    setEmail('');
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
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '600',
  },
}); 