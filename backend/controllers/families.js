const { createClient } = require('@supabase/supabase-js');
const { validateFamilyName, validateEmail } = require('../utils/validation');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Creates a new family and assigns the creator as admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createFamily = async (req, res) => {
  try {
    const { name } = req.body;
    let userId = req.user?.id; // Assuming auth middleware sets this

    // In development, ensure userId is a valid UUID; fallback to fixed dev UUID if not
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (process.env.NODE_ENV !== 'production' && (!userId || !uuidRegex.test(userId))) {
      console.warn(`[dev] createFamily: invalid userId "${userId}", using default dev UUID`);
      userId = '550e8400-e29b-41d4-a716-446655440000';
      // In dev: ensure this dummy user exists in auth.users
      try {
        await supabase.auth.admin.createUser({
          id: userId,
          email: req.user?.email,
          email_confirm: true,
        });
        console.log(`[dev] Supabase auth user created for fallback id ${userId}`);
      } catch (err) {
        console.warn(`[dev] could not create auth user for fallback id ${userId}:`, err.message);
      }
    }

    // Validate family name using utility function
    const nameValidation = validateFamilyName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ 
        error: nameValidation.error 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'User authentication required' 
      });
    }

    // Create the family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert([
        {
          name: name.trim(),
          created_by: userId
        }
      ])
      .select()
      .single();

    if (familyError) {
      console.error('Error creating family:', familyError);
      return res.status(500).json({ 
        error: 'Failed to create family' 
      });
    }

    // Add creator as admin to family_members table
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .insert([
        {
          user_id: userId,
          family_id: family.id,
          role: 'admin'
        }
      ])
      .select()
      .single();

    if (membershipError) {
      console.error('Error adding family member:', membershipError);
      
      // Cleanup: remove the family if membership creation failed
      await supabase
        .from('families')
        .delete()
        .eq('id', family.id);
      
      return res.status(500).json({ 
        error: 'Failed to create family membership' 
      });
    }

    // Initialize leaderboard entry for the creator
    try {
      await supabase
        .from('leaderboards')
        .insert([
          {
            family_id: family.id,
            user_id: userId,
            total_score: 0,
            current_streak: 0
          }
        ]);
    } catch (leaderboardError) {
      console.error('Error creating leaderboard entry:', leaderboardError);
      // Non-fatal error, continue with success response
    }

    // Return success response with family data
    res.status(201).json({
      success: true,
      message: 'Family created successfully',
      data: {
        family: {
          id: family.id,
          name: family.name,
          created_by: family.created_by,
          created_at: family.created_at
        },
        membership: {
          role: membership.role,
          joined_at: membership.joined_at
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in createFamily:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Invites a user to join a family by email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const inviteToFamily = async (req, res) => {
  try {
    const { email, familyId } = req.body;
    const userId = req.user?.id;

    // Validate inputs
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        error: emailValidation.error 
      });
    }

    if (!familyId) {
      return res.status(400).json({ 
        error: 'Family ID is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'User authentication required' 
      });
    }

    // Check if user is an admin of the family
    const { data: adminCheck, error: adminError } = await supabase
      .from('family_members')
      .select('role')
      .eq('user_id', userId)
      .eq('family_id', familyId)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminCheck) {
      return res.status(403).json({ 
        error: 'Only family admins can invite members' 
      });
    }

    // Check if the family exists
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, name')
      .eq('id', familyId)
      .single();

    if (familyError || !family) {
      return res.status(404).json({ 
        error: 'Family not found' 
      });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', userId);

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('family_invites')
      .select('id, expires_at')
      .eq('family_id', familyId)
      .eq('email', email.toLowerCase())
      .eq('used', false)
      .gte('expires_at', new Date().toISOString());

    if (existingInvite && existingInvite.length > 0) {
      return res.status(400).json({ 
        error: 'An invitation has already been sent to this email' 
      });
    }

    // Generate secure invite token (32 bytes = 64 hex characters)
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Store invitation in database (we'll create this table)
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invites')
      .insert([
        {
          family_id: familyId,
          email: email.toLowerCase(),
          token: inviteToken,
          invited_by: userId,
          expires_at: expiresAt.toISOString(),
          used: false
        }
      ])
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      return res.status(500).json({ 
        error: 'Failed to create invitation' 
      });
    }

    // TODO: Send invitation email (will implement in next step)
    // For now, we'll return the token for testing purposes
    const inviteLink = `${process.env.FRONTEND_URL}/join?token=${inviteToken}`;

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          family_name: family.name,
          expires_at: invitation.expires_at,
          // In production, don't expose the token
          invite_link: inviteLink
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in inviteToFamily:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Joins a family using an invitation token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const joinFamily = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        error: 'Invitation token is required' 
      });
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'User authentication required' 
      });
    }

    // Find valid invitation by token
    const { data: invitation, error: inviteError } = await supabase
      .from('family_invites')
      .select(`
        id,
        family_id,
        email,
        expires_at,
        used,
        families (
          id,
          name,
          created_by
        )
      `)
      .eq('token', token)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ 
        error: 'Invalid or expired invitation' 
      });
    }

    // Get user's email to verify invitation
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return res.status(500).json({ 
        error: 'Failed to verify user information' 
      });
    }

    // Check if invitation email matches user's email
    if (user.email.toLowerCase() !== invitation.email) {
      return res.status(403).json({ 
        error: 'This invitation is for a different email address' 
      });
    }

    // Check if user is already a member of this family
    const { data: existingMembership } = await supabase
      .from('family_members')
      .select('id, role')
      .eq('user_id', userId)
      .eq('family_id', invitation.family_id)
      .single();

    if (existingMembership) {
      return res.status(400).json({ 
        error: 'You are already a member of this family' 
      });
    }

    // Begin transaction: Add user to family and mark invitation as used
    
    // Add user to family_members
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .insert([
        {
          user_id: userId,
          family_id: invitation.family_id,
          role: 'member'
        }
      ])
      .select()
      .single();

    if (membershipError) {
      console.error('Error adding family member:', membershipError);
      return res.status(500).json({ 
        error: 'Failed to join family' 
      });
    }

    // Mark invitation as used
    const { error: updateInviteError } = await supabase
      .from('family_invites')
      .update({
        used: true,
        used_at: new Date().toISOString(),
        used_by: userId
      })
      .eq('id', invitation.id);

    if (updateInviteError) {
      console.error('Error updating invitation:', updateInviteError);
      // Non-fatal error, continue with success
    }

    // Initialize leaderboard entry for the new member
    try {
      await supabase
        .from('leaderboards')
        .insert([
          {
            family_id: invitation.family_id,
            user_id: userId,
            total_score: 0,
            current_streak: 0
          }
        ]);
    } catch (leaderboardError) {
      console.error('Error creating leaderboard entry:', leaderboardError);
      // Non-fatal error, continue with success
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Successfully joined family',
      data: {
        family: {
          id: invitation.families.id,
          name: invitation.families.name
        },
        membership: {
          id: membership.id,
          role: membership.role,
          joined_at: membership.joined_at
        }
      }
    });

  } catch (error) {
    console.error('Unexpected error in joinFamily:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

/**
 * Gets all families that the authenticated user belongs to
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserFamilies = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: 'User authentication required' 
      });
    }

    // Get all families where user is a member
    const { data: memberships, error: membershipError } = await supabase
      .from('family_members')
      .select(`
        id,
        role,
        joined_at,
        families (
          id,
          name,
          created_by,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Error fetching user families:', membershipError);
      return res.status(500).json({ 
        error: 'Failed to fetch families' 
      });
    }

    // Format the response
    const families = memberships.map(membership => ({
      id: membership.families.id,
      name: membership.families.name,
      created_by: membership.families.created_by,
      created_at: membership.families.created_at,
      user_role: membership.role,
      joined_at: membership.joined_at,
      is_creator: membership.families.created_by === userId
    }));

    res.status(200).json({
      success: true,
      data: {
        families,
        count: families.length
      }
    });

  } catch (error) {
    console.error('Unexpected error in getUserFamilies:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

module.exports = {
  createFamily,
  inviteToFamily,
  joinFamily,
  getUserFamilies
}; 