const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY // Use anon key for client-side operations
);

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 * Extracts user information from Authorization header and adds to req.user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authorization token required' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    // Add user information to request object
    req.user = {
      id: user.id,
      email: user.email,
      aud: user.aud,
      role: user.role
    };

    next();

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication service error' 
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work with or without authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      // Invalid token, continue without user
      req.user = null;
    } else {
      // Valid token, add user to request
      req.user = {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      };
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without user on error
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
}; 