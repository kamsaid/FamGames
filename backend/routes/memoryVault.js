const express = require('express');
const multer = require('multer');
const router = express.Router();

// Import memory vault controller functions
const {
  storeEncryptedMemory,
  retrieveEncryptedMemory,
  listFamilyMemories,
  deleteEncryptedMemory,
  getMemoryVaultStats
} = require('../controllers/memoryVault');

// Import authentication middleware
const { authenticateToken } = require('../middlewares/auth');

// Configure multer for file uploads (in-memory storage for encrypted files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for encrypted files
    fieldSize: 10 * 1024 * 1024  // 10MB limit for form fields
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types since they're encrypted
    cb(null, true);
  }
});

/**
 * POST /memory-vault/store
 * Store encrypted memory item with optional file upload
 * 
 * Request body (multipart/form-data):
 * - family_id: UUID of the family
 * - title: String title for the memory
 * - description: Optional string description
 * - memory_type: String type ('photo', 'video', 'note', 'document')
 * - encryption_key_hint: String hint for the encryption key
 * - metadata: JSON string with additional metadata
 * - iv: String base64 encoded initialization vector
 * - encrypted_data: Base64 encoded encrypted data (for text/note memories)
 * 
 * Files:
 * - encrypted_file: Encrypted file data (for photo/video/document memories)
 * 
 * Response:
 * - Created memory item metadata
 */
router.post('/store', authenticateToken, upload.single('encrypted_file'), storeEncryptedMemory);

/**
 * GET /memory-vault/:memory_id
 * Retrieve encrypted memory item with file data
 * 
 * Response:
 * - Memory metadata and base64 encoded encrypted file data
 */
router.get('/:memory_id', authenticateToken, retrieveEncryptedMemory);

/**
 * GET /memory-vault/family/:family_id
 * List family memory vault items (metadata only, no file data)
 * 
 * Query parameters:
 * - limit: Number of items to return (default: 20, max: 100)
 * 
 * Response:
 * - Array of memory metadata
 */
router.get('/family/:family_id', authenticateToken, listFamilyMemories);

/**
 * GET /memory-vault/family/:family_id/stats
 * Get memory vault statistics for a family
 * 
 * Response:
 * - Statistics about the family's memory vault (total items, size, etc.)
 */
router.get('/family/:family_id/stats', authenticateToken, getMemoryVaultStats);

/**
 * DELETE /memory-vault/:memory_id
 * Delete encrypted memory item and associated file
 * 
 * Response:
 * - Success status
 */
router.delete('/:memory_id', authenticateToken, deleteEncryptedMemory);

module.exports = router; 