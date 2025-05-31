// Trivia lobby screen for waiting and starting games
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/MainNavigator';
import { useGameRoom } from '../contexts/GameRoomContext';
import { useFamily } from '../contexts/FamilyContext';
import { useAuth } from '../contexts/AuthContext';

interface FamilyMemberWithStatus {
  id: string;
  email: string;
  role: 'admin' | 'member';
  isOnline: boolean;
  isCurrentUser: boolean;
}

export default function TriviaLobbyScreen() {
  // Navigation hook
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Context hooks for game, family, and auth state
  const { 
    joinRoom, 
    leaveRoom, 
    startGame, 
    players, 
    connecting, 
    gameActive, 
    socket 
  } = useGameRoom();
  const { currentFamily, familyMembers, loading: familyLoading, refreshFamily } = useFamily();
  const { user, isDevBypass } = useAuth();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  
  // Add state for dev testing mode
  const [isDevTestMode, setIsDevTestMode] = useState(false);

  // Enable dev test mode automatically when dev bypass is active
  useEffect(() => {
    if (isDevBypass && __DEV__) {
      console.log('🚧 Dev bypass detected, enabling test mode');
      setIsDevTestMode(true);
    }
  }, [isDevBypass]);

  // Auto-join room when component mounts or family changes
  useEffect(() => {
    if (currentFamily && user && !socket?.connected && !connecting) {
      joinRoom();
    }

    // Clean up when component unmounts
    return () => {
      if (socket?.connected) {
        leaveRoom();
      }
    };
  }, [currentFamily, user]);

  // Navigate to game when game starts
  useEffect(() => {
    if (gameActive) {
      console.log('🎮 Game is active, navigating to TriviaGame screen');
      // Navigate to the trivia game screen
      navigation.navigate('TriviaGame');
    }
  }, [gameActive, navigation]);
  
  // Check if current user is admin (can start games)
  const isAdmin = familyMembers.find(member => 
    member.user_id === user?.id && member.role === 'admin'
  ) || isDevBypass; // In dev mode, always treat user as admin

  // Create combined member list with online status
  const getMembersWithStatus = (): FamilyMemberWithStatus[] => {
    return familyMembers.map(member => {
      const onlinePlayer = players.find(player => player.id === member.user_id);
      return {
        id: member.user_id,
        email: member.user_id, // In real app, you'd fetch user details
        role: member.role,
        isOnline: !!onlinePlayer,
        isCurrentUser: member.user_id === user?.id,
      };
    });
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFamily();
      // Reconnect to room if needed
      if (currentFamily && !socket?.connected && !connecting) {
        await joinRoom();
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle start game (allow single-player in dev bypass)
  const handleStartGame = () => {
    // In dev test mode, start game immediately without checks
    if (isDevTestMode) {
      console.log('🚧 Dev test mode: Starting game immediately');
      startGame();
      return;
    }
    
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only family admins can start games.');
      return;
    }
    const minPlayers = isDevBypass ? 1 : 2;
    if (players.length < minPlayers) {
      Alert.alert(
        'Not Enough Players',
        `You need at least ${minPlayers} player${minPlayers > 1 ? 's' : ''} to start a trivia game. ${
          isDevBypass
            ? 'Dev bypass allows solo play; adjust your settings.'
            : 'Wait for more family members to join!'
        }`
      );
      return;
    }

    Alert.alert(
      'Start Game?',
      `Start a trivia game with ${players.length} player${players.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Game', onPress: startGame, style: 'default' }
      ]
    );
  };
  
  // Add dev test bypass button
  const handleDevTestBypass = () => {
    Alert.alert(
      '🚧 Development Test Mode',
      'This will start the game immediately for testing purposes.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Test Game', 
          onPress: () => {
            console.log('🚧 Starting test game immediately');
            startGame();
          },
          style: 'default' 
        }
      ]
    );
  };

  // Render individual family member
  const renderFamilyMember = ({ item }: { item: FamilyMemberWithStatus }) => (
    <View style={[
      styles.memberCard,
      item.isCurrentUser && styles.currentUserCard
    ]}>
      <View style={styles.memberInfo}>
        <View style={styles.memberHeader}>
          <Text style={[
            styles.memberEmail,
            item.isCurrentUser && styles.currentUserText
          ]}>
            {item.email}{item.isCurrentUser ? ' (You)' : ''}
          </Text>
          {item.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>
        
        {/* Online status indicator */}
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusDot,
            item.isOnline ? styles.onlineStatus : styles.offlineStatus
          ]} />
          <Text style={[
            styles.statusText,
            item.isOnline ? styles.onlineText : styles.offlineText
          ]}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
    </View>
  );

  // Show loading state
  if (familyLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading family...</Text>
      </View>
    );
  }

  // Show error state if no family
  if (!currentFamily) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>No Family Found</Text>
        <Text style={styles.errorText}>
          You need to create or join a family before playing trivia games.
        </Text>
      </View>
    );
  }

  const membersWithStatus = getMembersWithStatus();
  const onlineCount = players.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.familyName}>{currentFamily.name}</Text>
        <Text style={styles.subtitle}>Trivia Lobby</Text>
        
        {/* Connection status */}
        <View style={styles.connectionStatus}>
          {connecting ? (
            <View style={styles.connectingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.connectingText}>Connecting...</Text>
            </View>
          ) : socket?.connected ? (
            <View style={styles.connectedContainer}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.reconnectButton} onPress={joinRoom}>
              <Text style={styles.reconnectText}>Reconnect</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Dev test mode indicator */}
        {isDevTestMode && (
          <View style={styles.devModeIndicator}>
            <Text style={styles.devModeText}>🚧 Dev Test Mode Active</Text>
          </View>
        )}
      </View>

      {/* Players count */}
      <View style={styles.playersHeader}>
        <Text style={styles.playersCount}>
          {onlineCount} of {membersWithStatus.length} members online
        </Text>
        {(onlineCount >= (isDevBypass ? 1 : 2) || isDevTestMode) && (
          <Text style={styles.readyText}>Ready to play! 🎯</Text>
        )}
      </View>

      {/* Family members list */}
      <FlatList
        data={membersWithStatus}
        renderItem={renderFamilyMember}
        keyExtractor={(item) => item.id}
        style={styles.membersList}
        contentContainerStyle={styles.membersListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No family members found</Text>
          </View>
        }
      />

      {/* Game actions */}
      <View style={styles.actionsContainer}>
      {isAdmin || isDevTestMode ? (
        <>
          <TouchableOpacity
            style={[
              styles.startButton,
              (!(isDevBypass || socket?.connected || isDevTestMode) || (onlineCount < (isDevBypass ? 1 : 2) && !isDevTestMode) || (connecting && !isDevTestMode)) && styles.disabledButton
            ]}
            onPress={handleStartGame}
            disabled={!isDevTestMode && (!(isDevBypass || socket?.connected) || onlineCount < (isDevBypass ? 1 : 2) || connecting)}
          >
            <Text style={styles.startButtonText}>
              {isDevTestMode
                ? 'Start Test Game 🚧'
                : onlineCount < (isDevBypass ? 1 : 2)
                ? 'Waiting for players...'
                : 'Start Trivia Game'}
            </Text>
          </TouchableOpacity>
          
          {/* Show bypass button in dev mode */}
          {isDevBypass && !isDevTestMode && (
            <TouchableOpacity
              style={styles.devBypassButton}
              onPress={handleDevTestBypass}
            >
              <Text style={styles.devBypassButtonText}>🚧 Enable Test Mode</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>
            Waiting for admin to start the game...
          </Text>
          <Text style={styles.waitingSubtext}>
            {onlineCount >= (isDevBypass ? 1 : 2)
              ? 'Ready to play!'
              : `Need ${(isDevBypass ? 1 : 2) - onlineCount} more player(s)`}
          </Text>
        </View>
      )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  familyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  connectionStatus: {
    alignItems: 'center',
    marginTop: 12,
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#3b82f6',
  },
  connectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  connectedText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  reconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  reconnectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  playersHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  playersCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  readyText: {
    fontSize: 14,
    color: '#10b981',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  membersList: {
    flex: 1,
  },
  membersListContent: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentUserCard: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  memberEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  currentUserText: {
    color: '#3b82f6',
  },
  adminBadge: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  onlineStatus: {
    backgroundColor: '#10b981',
  },
  offlineStatus: {
    backgroundColor: '#6b7280',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  onlineText: {
    color: '#10b981',
  },
  offlineText: {
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  actionsContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  waitingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  devModeIndicator: {
    marginTop: 8,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'center',
  },
  devModeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  devBypassButton: {
    marginTop: 12,
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  devBypassButtonText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
});