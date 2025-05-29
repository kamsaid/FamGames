/**
 * Memory Vault Controller - Handles encrypted family memory storage endpoints
 * Provides API endpoints for storing, retrieving, and managing encrypted memories
 */

const memoryVaultService = require('../services/memoryVaultService');
const { validateUUID } = require('../utils/validation');

/**
 * Store encrypted memory item
 * POST /memory-vault/store
 * 
 * Request body:
 * - family_id: UUID of the family
 * - title: String title for the memory
 * - description: Optional string description
 * - memory_type: String type ('photo', 'video', 'note', 'document')
 * - encryption_key_hint: String hint for the encryption key
 * - metadata: Object with additional metadata
 * - iv: String base64 encoded initialization vector
 * 
 * Files:
 * - encrypted_file: Encrypted file data (multipart/form-data)
 */
const storeEncryptedMemory = async (req, res) => {
  try {
    const {
      family_id,
      title,
      description,
      memory_type,
      encryption_key_hint,
      metadata,
      iv
    } = req.body;
    
    const user_id = req.user?.id;

    // Validate required fields
    if (!family_id || !title || !memory_type || !encryption_key_hint || !iv) {
      return res.status(400).json({
        error: 'family_id, title, memory_type, encryption_key_hint, and iv are required'
      });
    }

    // Validate family_id format
    if (!validateUUID(family_id)) {
      return res.status(400).json({
        error: 'Invalid family_id format'
      });
    }

    // Validate memory_type
    const validTypes = ['photo', 'video', 'note', 'document'];
    if (!validTypes.includes(memory_type)) {
      return res.status(400).json({
        error: `memory_type must be one of: ${validTypes.join(', ')}`
      });
    }

    // Get encrypted file data from request
    let encryptedFileData = null;
    if (req.file) {
      encryptedFileData = req.file.buffer;
    } else if (req.body.encrypted_data) {
      // Handle base64 encoded data for text/note memories
      try {
        encryptedFileData = Buffer.from(req.body.encrypted_data, 'base64');
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid base64 encoded encrypted_data'
        });
      }
    }

    // Parse metadata if it's a string
    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid metadata format - must be valid JSON'
        });
      }
    }

    // Prepare memory data
    const memoryData = {
      title: title.trim(),
      description: description?.trim(),
      memoryType: memory_type,
      encryptionKeyHint: encryption_key_hint.trim(),
      metadata: parsedMetadata,
      iv: iv.trim()
    };

    // Store encrypted memory using service
    const createdMemory = await memoryVaultService.storeEncryptedMemory(
      family_id,
      user_id,
      memoryData,
      encryptedFileData
    );

    res.status(201).json({
      success: true,
      message: 'Memory stored successfully',
      data: createdMemory
    });

  } catch (error) {
    console.error('Error in storeEncryptedMemory:', error);
    res.status(500).json({
      error: error.message || 'Failed to store encrypted memory'
    });
  }
};

/**
 * Retrieve encrypted memory item
 * GET /memory-vault/:memory_id
 * 
 * Response:
 * - Memory metadata and encrypted file data
 */
const retrieveEncryptedMemory = async (req, res) => {
  try {
    const { memory_id } = req.params;
    const user_id = req.user?.id;

    // Validate memory_id format
    if (!validateUUID(memory_id)) {
      return res.status(400).json({
        error: 'Invalid memory_id format'
      });
    }

    // Retrieve encrypted memory using service
    const memory = await memoryVaultService.retrieveEncryptedMemory(memory_id, user_id);

    // Convert encrypted file data to base64 for JSON response
    let base64EncryptedData = null;
    if (memory.encryptedFileData) {
      base64EncryptedData = Buffer.from(memory.encryptedFileData).toString('base64');
    }

    res.json({
      success: true,
      data: {
        ...memory,
        encryptedFileData: base64EncryptedData
      }
    });

  } catch (error) {
    console.error('Error in retrieveEncryptedMemory:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({
        error: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to retrieve encrypted memory'
      });
    }
  }
};

/**
 * List family memory vault items
 * GET /memory-vault/family/:family_id
 * 
 * Query parameters:
 * - limit: Number of items to return (default: 20, max: 100)
 * 
 * Response:
 * - Array of memory metadata (no file data)
 */
const listFamilyMemories = async (req, res) => {
  try {
    const { family_id } = req.params;
    const user_id = req.user?.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // Validate family_id format
    if (!validateUUID(family_id)) {
      return res.status(400).json({
        error: 'Invalid family_id format'
      });
    }

    // List family memories using service
    const memories = await memoryVaultService.listFamilyMemories(family_id, user_id, limit);

    res.json({
      success: true,
      data: {
        memories,
        count: memories.length,
        limit
      }
    });

  } catch (error) {
    console.error('Error in listFamilyMemories:', error);
    res.status(500).json({
      error: 'Failed to list family memories'
    });
  }
};

/**
 * Delete encrypted memory item
 * DELETE /memory-vault/:memory_id
 * 
 * Response:
 * - Success status
 */
const deleteEncryptedMemory = async (req, res) => {
  try {
    const { memory_id } = req.params;
    const user_id = req.user?.id;

    // Validate memory_id format
    if (!validateUUID(memory_id)) {
      return res.status(400).json({
        error: 'Invalid memory_id format'
      });
    }

    // Delete encrypted memory using service
    await memoryVaultService.deleteEncryptedMemory(memory_id, user_id);

    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteEncryptedMemory:', error);
    
    if (error.message.includes('not found') || error.message.includes('access denied')) {
      res.status(404).json({
        error: error.message
      });
    } else if (error.message.includes('Insufficient permissions')) {
      res.status(403).json({
        error: error.message
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete encrypted memory'
      });
    }
  }
};

/**
 * Get memory vault statistics for a family
 * GET /memory-vault/family/:family_id/stats
 * 
 * Response:
 * - Statistics about the family's memory vault
 */
const getMemoryVaultStats = async (req, res) => {
  try {
    const { family_id } = req.params;

    // Validate family_id format
    if (!validateUUID(family_id)) {
      return res.status(400).json({
        error: 'Invalid family_id format'
      });
    }

    // Get memory vault statistics using service
    const stats = await memoryVaultService.getMemoryVaultStats(family_id);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error in getMemoryVaultStats:', error);
    res.status(500).json({
      error: 'Failed to get memory vault statistics'
    });
  }
};

module.exports = {
  storeEncryptedMemory,
  retrieveEncryptedMemory,
  listFamilyMemories,
  deleteEncryptedMemory,
  getMemoryVaultStats
}; 