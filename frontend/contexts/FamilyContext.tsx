// Family context for managing family data and operations
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Family, FamilyMember } from '../services/supabase';
import { useAuth } from './AuthContext';
import getApiUrl from '../utils/getApiUrl';

// Family context interface
interface FamilyContextType {
  currentFamily: Family | null;
  familyMembers: FamilyMember[];
  loading: boolean;
  createFamily: (familyName: string) => Promise<void>;
  joinFamily: (inviteToken: string) => Promise<void>;
  inviteMember: (email: string) => Promise<void>;
  refreshFamily: () => Promise<void>;
}

// Create family context
const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// Family provider component
export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth(); // Get both user and session

  // Load user's family on user change
  useEffect(() => {
    if (user) {
      loadUserFamily();
    } else {
      setCurrentFamily(null);
      setFamilyMembers([]);
      setLoading(false);
    }
  }, [user]);

  // Load user's current family from database
  const loadUserFamily = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's family membership
      const { data: membership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id, role')
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        setCurrentFamily(null);
        setFamilyMembers([]);
        return;
      }

      // Get family details
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('*')
        .eq('id', membership.family_id)
        .single();

      if (familyError || !family) {
        setCurrentFamily(null);
        setFamilyMembers([]);
        return;
      }

      // Get all family members
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', family.id);

      setCurrentFamily(family);
      setFamilyMembers(members || []);
    } catch (error) {
      console.error('Error loading family:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get authorization header
  const getAuthHeader = () => {
    if (!session?.access_token) {
      throw new Error('No valid session token available');
    }
    return `Bearer ${session.access_token}`;
  };

  // Create a new family via backend API
  const createFamily = async (familyName: string) => {
    if (!user || !session) throw new Error('User not authenticated');

    // Create via backend API; getApiUrl() resolves host for web vs. native
    const response = await fetch(`${getApiUrl()}/families/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ name: familyName }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create family');
    }
    const result = await response.json();
    const newFamily = result.data?.family;
    if (newFamily) {
      // Immediately update context so MainNavigator can proceed
      setCurrentFamily(newFamily);
      setFamilyMembers([
        { user_id: user.id, family_id: newFamily.id, role: 'admin', joined_at: new Date().toISOString() },
      ]);
    } else {
      // Fallback to full refresh if no payload
      await refreshFamily();
    }
  };

  // Join family using invite token
  const joinFamily = async (inviteToken: string) => {
    if (!user || !session) throw new Error('User not authenticated');

    // Call backend API to join family
    const response = await fetch(`${getApiUrl()}/families/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({ token: inviteToken }), // Use 'token' instead of 'inviteToken'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to join family');
    }

    await refreshFamily();
  };

  // Invite a new member to the family
  const inviteMember = async (email: string) => {
    if (!user || !currentFamily || !session) throw new Error('User not authenticated or no family');

    const response = await fetch(`${getApiUrl()}/families/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': getAuthHeader(),
      },
      body: JSON.stringify({
        email,
        familyId: currentFamily.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send invitation');
    }
  };

  // Refresh family data
  const refreshFamily = async () => {
    await loadUserFamily();
  };

  // Context value
  const value = {
    currentFamily,
    familyMembers,
    loading,
    createFamily,
    joinFamily,
    inviteMember,
    refreshFamily,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};

// Custom hook to use family context
export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}; 