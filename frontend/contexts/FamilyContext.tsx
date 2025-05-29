// Family context for managing family data and operations
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Family, FamilyMember } from '../services/supabase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();

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

  // Create a new family
  const createFamily = async (familyName: string) => {
    if (!user) throw new Error('User not authenticated');

    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: familyName,
        created_by: user.id,
      })
      .select()
      .single();

    if (familyError) throw familyError;

    // Add creator as admin
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        user_id: user.id,
        family_id: family.id,
        role: 'admin',
      });

    if (memberError) throw memberError;

    await refreshFamily();
  };

  // Join family using invite token
  const joinFamily = async (inviteToken: string) => {
    if (!user) throw new Error('User not authenticated');

    // Call backend API to join family
    const response = await fetch('http://localhost:3000/families/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      },
      body: JSON.stringify({ inviteToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to join family');
    }

    await refreshFamily();
  };

  // Invite a new member to the family
  const inviteMember = async (email: string) => {
    if (!user || !currentFamily) throw new Error('User not authenticated or no family');

    const response = await fetch('http://localhost:3000/families/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        email,
        familyId: currentFamily.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send invitation');
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