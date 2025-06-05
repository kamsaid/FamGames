const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /auth/magic-link
 * Send magic link to user's email for authentication
 */
router.post('/magic-link', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email input
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Send magic link using Supabase Auth
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Redirect to frontend after successful login
        emailRedirectTo: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/auth/callback`
      }
    });

    if (error) {
      console.error('Magic link error:', error);
      return res.status(500).json({ 
        error: 'Failed to send magic link' 
      });
    }

    res.status(200).json({
      message: 'Magic link sent successfully',
      email: email
    });

  } catch (error) {
    console.error('Magic link endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

/**
 * GET /auth/verify-link
 * Verify magic link token and return session
 */
router.get('/verify-link', async (req, res) => {
  try {
    const { token, type } = req.query;

    if (!token || type !== 'magiclink') {
      return res.status(400).json({ 
        error: 'Invalid verification parameters' 
      });
    }

    // Verify the magic link token
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'magiclink'
    });

    if (error) {
      console.error('Verification error:', error);
      return res.status(400).json({ 
        error: 'Invalid or expired magic link' 
      });
    }

    res.status(200).json({
      message: 'Authentication successful',
      user: data.user,
      session: data.session
    });

  } catch (error) {
    console.error('Verify link endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

module.exports = router; 