// Settings screen for user preferences and app configuration
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import components
import { AnimatedCard } from '../components/AnimatedCard';
import { AnimatedButton } from '../components/AnimatedButton';
import { showToast } from '../components/ToastNotification';

// Import UX helpers
import { HapticManager, SoundManager } from '../utils/uxHelpers';
import { useAuth } from '../contexts/AuthContext';
import { useFamily } from '../contexts/FamilyContext';

interface SettingItemProps {
  icon: string;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  delay?: number;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  value,
  onValueChange,
  delay = 0,
}) => {
  const handleToggle = (newValue: boolean) => {
    HapticManager.light();
    onValueChange(newValue);
  };

  return (
    <Animated.View entering={SlideInRight.delay(delay)}>
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={24} color="#3b82f6" />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{title}</Text>
            {description && (
              <Text style={styles.settingDescription}>{description}</Text>
            )}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={handleToggle}
          trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
          thumbColor={value ? '#3b82f6' : '#f3f4f6'}
          ios_backgroundColor="#e5e7eb"
        />
      </View>
    </Animated.View>
  );
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { currentFamily } = useFamily();

  // Settings state
  const [haptics, setHaptics] = useState(HapticManager.isEnabled);
  const [sounds, setSounds] = useState(SoundManager.isEnabled);
  const [notifications, setNotifications] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [autoJoinGames, setAutoJoinGames] = useState(true);

  // Handle settings changes
  const handleHapticsChange = async (enabled: boolean) => {
    HapticManager.isEnabled = enabled;
    setHaptics(enabled);
    await AsyncStorage.setItem('haptics_enabled', enabled.toString());
    
    if (enabled) {
      HapticManager.success();
      showToast.info('Haptic Feedback Enabled');
    } else {
      showToast.info('Haptic Feedback Disabled');
    }
  };

  const handleSoundsChange = async (enabled: boolean) => {
    SoundManager.isEnabled = enabled;
    setSounds(enabled);
    await AsyncStorage.setItem('sounds_enabled', enabled.toString());
    
    if (enabled) {
      // SoundManager.play('button_tap');
      showToast.info('Sound Effects Enabled');
    } else {
      showToast.info('Sound Effects Disabled');
    }
  };

  const handleNotificationsChange = async (enabled: boolean) => {
    setNotifications(enabled);
    await AsyncStorage.setItem('notifications_enabled', enabled.toString());
    
    if (enabled) {
      showToast.info('Notifications Enabled');
    } else {
      showToast.info('Notifications Disabled');
    }
  };

  const handleAnimationsChange = async (enabled: boolean) => {
    setAnimations(enabled);
    await AsyncStorage.setItem('animations_enabled', enabled.toString());
    showToast.info(enabled ? 'Animations Enabled' : 'Animations Disabled');
  };

  const handleAutoJoinChange = async (enabled: boolean) => {
    setAutoJoinGames(enabled);
    await AsyncStorage.setItem('auto_join_games', enabled.toString());
    showToast.info(enabled ? 'Auto-join Enabled' : 'Auto-join Disabled');
  };

  // Handle sign out
  const handleSignOut = async () => {
    HapticManager.medium();
    try {
      await signOut();
      showToast.success('Signed out successfully');
    } catch (error) {
      showToast.error('Failed to sign out', 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn}>
          <Text style={styles.screenTitle}>Settings</Text>
          <Text style={styles.screenSubtitle}>Customize your app experience</Text>
        </Animated.View>

        {/* User Info Card */}
        <AnimatedCard style={styles.userCard} entrance="fade" delay={100}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.email?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.email}</Text>
              <Text style={styles.familyName}>{currentFamily?.name || 'No family'}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Experience Settings */}
        <AnimatedCard style={styles.section} entrance="slide" delay={200}>
          <Text style={styles.sectionTitle}>Experience</Text>
          
          <SettingItem
            icon="phone-portrait-outline"
            title="Haptic Feedback"
            description="Vibration feedback for interactions"
            value={haptics}
            onValueChange={handleHapticsChange}
            delay={250}
          />
          
          <SettingItem
            icon="volume-high-outline"
            title="Sound Effects"
            description="Audio feedback for game events"
            value={sounds}
            onValueChange={handleSoundsChange}
            delay={300}
          />
          
          <SettingItem
            icon="color-wand-outline"
            title="Animations"
            description="Visual transitions and effects"
            value={animations}
            onValueChange={handleAnimationsChange}
            delay={350}
          />
        </AnimatedCard>

        {/* Game Settings */}
        <AnimatedCard style={styles.section} entrance="slide" delay={400}>
          <Text style={styles.sectionTitle}>Game Preferences</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Game Notifications"
            description="Get notified when games start"
            value={notifications}
            onValueChange={handleNotificationsChange}
            delay={450}
          />
          
          <SettingItem
            icon="enter-outline"
            title="Auto-join Games"
            description="Automatically join when family starts a game"
            value={autoJoinGames}
            onValueChange={handleAutoJoinChange}
            delay={500}
          />
        </AnimatedCard>

        {/* About Section */}
        <AnimatedCard style={styles.section} entrance="slide" delay={600}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2024.1</Text>
          </View>
        </AnimatedCard>

        {/* Actions */}
        <View style={styles.actions}>
          <AnimatedButton
            onPress={() => showToast.info('Privacy Policy', 'Coming soon!')}
            title="Privacy Policy"
            variant="ghost"
            size="medium"
            icon={<Ionicons name="shield-outline" size={20} color="#3b82f6" />}
          />
          
          <AnimatedButton
            onPress={() => showToast.info('Terms of Service', 'Coming soon!')}
            title="Terms of Service"
            variant="ghost"
            size="medium"
            icon={<Ionicons name="document-text-outline" size={20} color="#3b82f6" />}
          />
          
          <AnimatedButton
            onPress={handleSignOut}
            title="Sign Out"
            variant="danger"
            size="large"
            style={{ marginTop: 20 }}
            icon={<Ionicons name="log-out-outline" size={20} color="#ffffff" />}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  
  // User card
  userCard: {
    marginBottom: 20,
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  familyName: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // Sections
  section: {
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  
  // Setting items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // About section
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  
  // Actions
  actions: {
    marginTop: 20,
  },
}); 