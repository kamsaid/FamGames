const express = require('express');
const router = express.Router();

// Import controllers
const { createFamily, inviteToFamily, joinFamily, getUserFamilies } = require('../controllers/families');

// Import middleware
const { authenticateToken } = require('../middlewares/auth');

/**
 * GET /families
 * Gets all families that the authenticated user belongs to
 * Requires authentication
 */
router.get('/', authenticateToken, getUserFamilies);

/**
 * POST /families/create
 * Creates a new family and assigns the creator as admin
 * Requires authentication
 * Body: { name: string }
 */
router.post('/create', authenticateToken, createFamily);

/**
 * POST /families/invite
 * Invites a user to join a family by email
 * Requires authentication (family admin only)
 * Body: { email: string, familyId: string }
 */
router.post('/invite', authenticateToken, inviteToFamily);

/**
 * POST /families/join
 * Join a family using an invitation token
 * Requires authentication
 * Body: { token: string }
 */
router.post('/join', authenticateToken, joinFamily);

module.exports = router; 