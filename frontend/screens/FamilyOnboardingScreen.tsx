// Family onboarding screen for creating or joining families
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
  ScrollView,
} from 'react-native';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';

type OnboardingMode = 'welcome' | 'create' | 'join';

export default function FamilyOnboardingScreen() {
  // State management for different onboarding flows
  const [mode, setMode] = useState<OnboardingMode>('welcome');
  const [familyName, setFamilyName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Get family and auth context methods
  const { createFamily, joinFamily } = useFamily();
  const { user } = useAuth();

  // Validate family name input
  const isValidFamilyName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 50;
  };

  // Validate invite token/link input
  const isValidInviteToken = (token: string): boolean => {
    return token.trim().length > 0;
  };

  // Handle family creation
  const handleCreateFamily = async () => {
    if (!isValidFamilyName(familyName)) {
      Alert.alert('Error', 'Family name must be between 2 and 50 characters');
      return;
    }

    try {
      setLoading(true);
      // Create family using FamilyContext
      await createFamily(familyName.trim());
      
      Alert.alert(
        'Success!', 
        `Welcome to your new family "${familyName.trim()}"! You can now invite other family members.`,
        [{ text: 'Continue', style: 'default' }]
      );
    } catch (error: any) {
      console.error('Create family error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to create family. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle joining existing family
  const handleJoinFamily = async () => {
    if (!isValidInviteToken(inviteToken)) {
      Alert.alert('Error', 'Please enter a valid invite link or code');
      return;
    }

    try {
      setLoading(true);
      // Join family using FamilyContext
      await joinFamily(inviteToken.trim());
      
      Alert.alert(
        'Welcome!', 
        'You have successfully joined your family. Let the trivia games begin!',
        [{ text: 'Continue', style: 'default' }]
      );
    } catch (error: any) {
      console.error('Join family error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to join family. Please check your invite link and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle back to welcome screen
  const handleBack = () => {
    setMode('welcome');
    setFamilyName('');
    setInviteToken('');
  };

  // Welcome screen - choice between create or join
  if (mode === 'welcome') {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Welcome header */}
          <View style={styles.header}>
            <Text style={styles.welcomeTitle}>Welcome to Family Together!</Text>
            <Text style={styles.welcomeSubtitle}>
              Connect with your family through fun trivia games and shared memories
            </Text>
          </View>

          {/* User info */}
          <View style={styles.userInfo}>
            <Text style={styles.userText}>
              Hello, <Text style={styles.userEmail}>{user?.email}</Text>
            </Text>
          </View>

          {/* Choice buttons */}
          <View style={styles.choiceContainer}>
            <Text style={styles.choiceTitle}>How would you like to get started?</Text>
            
            {/* Create family option */}
            <TouchableOpacity
              style={styles.primaryChoiceButton}
              onPress={() => setMode('create')}
            >
              <Text style={styles.choiceIcon}>👨‍👩‍👧‍👦</Text>
              <Text style={styles.primaryChoiceTitle}>Create a Family</Text>
              <Text style={styles.choiceDescription}>
                Start a new family group and invite your loved ones
              </Text>
            </TouchableOpacity>

            {/* Join family option */}
            <TouchableOpacity
              style={styles.secondaryChoiceButton}
              onPress={() => setMode('join')}
            >
              <Text style={styles.choiceIcon}>🎯</Text>
              <Text style={styles.secondaryChoiceTitle}>Join a Family</Text>
              <Text style={styles.secondaryChoiceDescription}>
                Use an invite link to join an existing family group
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Create family screen
  if (mode === 'create') {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Create Your Family</Text>
            <Text style={styles.screenSubtitle}>
              Choose a name that represents your family
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Family Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="The Awesome Family"
              value={familyName}
              onChangeText={setFamilyName}
              maxLength={50}
              editable={!loading}
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.helpText}>
              This name will be visible to all family members
            </Text>

            {/* Create button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!isValidFamilyName(familyName) || loading) && styles.disabledButton
              ]}
              onPress={handleCreateFamily}
              disabled={!isValidFamilyName(familyName) || loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Create Family</Text>
              )}
            </TouchableOpacity>

            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back to options</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Join family screen
  if (mode === 'join') {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Join Your Family</Text>
            <Text style={styles.screenSubtitle}>
              Enter the invite link or code you received
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Invite Link or Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Paste invite link or enter code"
              value={inviteToken}
              onChangeText={setInviteToken}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              placeholderTextColor="#9ca3af"
            />
            
            <Text style={styles.helpText}>
              Ask a family member to share their invite link with you
            </Text>

            {/* Join button */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                (!isValidInviteToken(inviteToken) || loading) && styles.disabledButton
              ]}
              onPress={handleJoinFamily}
              disabled={!isValidInviteToken(inviteToken) || loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.actionButtonText}>Join Family</Text>
              )}
            </TouchableOpacity>

            {/* Back button */}
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back to options</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  userInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  userEmail: {
    fontWeight: '600',
    color: '#3b82f6',
  },
  choiceContainer: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryChoiceButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryChoiceButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  choiceIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  primaryChoiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  secondaryChoiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  secondaryChoiceDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  choiceDescription: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
  },
}); 