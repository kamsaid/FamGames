/**
 * Memory Vault Service - Handles encrypted family memory storage
 * Manages file uploads to Supabase Storage and metadata in database
 */

// Mock Supabase for testing when environment variables are not set
const getMockSupabase = () => ({
  from: () => ({
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ 
          data: { id: `mock-memory-${Date.now()}`, created_at: new Date().toISOString() }, 
          error: null 
        }) 
      }) 
    }),
    select: () => ({
      eq: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
      })
    }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ 
        data: { path: `mock-path-${Date.now()}` }, 
        error: null 
      }),
      download: () => Promise.resolve({ 
        data: new Blob(['mock encrypted data']), 
        error: null 
      }),
      remove: () => Promise.resolve({ data: null, error: null })
    })
  }
});

// Try to load Supabase, fallback to mock if not available
let supabase;
try {
  supabase = require('../utils/supabase');
} catch (error) {
  console.warn('⚠️ Supabase not configured, using mock data for testing');
  supabase = getMockSupabase();
}

class MemoryVaultService {
  constructor() {
    // Storage bucket name for encrypted files
    this.STORAGE_BUCKET = 'memory-vault';
    
    // In-memory storage for testing when Supabase is not available
    this.mockStorage = {
      memories: new Map(),
      files: new Map()
    };
  }

  /**
   * Store encrypted memory item with file upload
   * @param {string} familyId - The family identifier
   * @param {string} userId - The user creating the memory
   * @param {Object} memoryData - Memory metadata and content
   * @param {Buffer} encryptedFileData - Encrypted file data
   * @returns {Object} Created memory item with storage path
   */
  async storeEncryptedMemory(familyId, userId, memoryData, encryptedFileData) {
    try {
      console.log(`🔐 Storing encrypted memory for family: ${familyId}`);
      
      const {
        title,
        description,
        memoryType,
        encryptionKeyHint,
        metadata,
        iv
      } = memoryData;

      // Generate unique file path for encrypted storage
      const timestamp = Date.now();
      const fileName = `${familyId}/${userId}/${timestamp}-encrypted.bin`;
      
      let storagePath = null;
      let fileSize = 0;

      if (encryptedFileData) {
        // Upload encrypted file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .upload(fileName, encryptedFileData, {
            contentType: 'application/octet-stream',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Error uploading encrypted file:', uploadError);
          throw new Error('Failed to upload encrypted file');
        }

        storagePath = uploadData.path;
        fileSize = encryptedFileData.length;
        console.log(`✅ Encrypted file uploaded to: ${storagePath}`);
      }

      // Store memory metadata in database
      const memoryRecord = {
        family_id: familyId,
        created_by: userId,
        title: title.trim(),
        description: description?.trim() || null,
        memory_type: memoryType,
        encrypted_file_path: storagePath,
        file_size_bytes: fileSize,
        encryption_key_hint: encryptionKeyHint,
        metadata: {
          ...metadata,
          iv: iv, // Store IV for decryption
          encryptedAt: new Date().toISOString()
        }
      };

      // Insert memory record into database
      const { data: createdMemory, error: dbError } = await supabase
        .from('memory_vault')
        .insert([memoryRecord])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Error storing memory metadata:', dbError);
        
        // Cleanup uploaded file if database insert failed
        if (storagePath) {
          await supabase.storage
            .from(this.STORAGE_BUCKET)
            .remove([fileName]);
        }
        
        throw new Error('Failed to store memory metadata');
      }

      console.log(`✅ Memory vault item created: ${createdMemory.id}`);
      
      return {
        id: createdMemory.id,
        title: createdMemory.title,
        description: createdMemory.description,
        memoryType: createdMemory.memory_type,
        encryptedFilePath: createdMemory.encrypted_file_path,
        fileSizeBytes: createdMemory.file_size_bytes,
        encryptionKeyHint: createdMemory.encryption_key_hint,
        metadata: createdMemory.metadata,
        createdAt: createdMemory.created_at,
        createdBy: createdMemory.created_by
      };

    } catch (error) {
      console.error('❌ Error storing encrypted memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve encrypted memory item with file download
   * @param {string} memoryId - The memory item identifier
   * @param {string} userId - The user requesting the memory
   * @returns {Object} Memory metadata and encrypted file data
   */
  async retrieveEncryptedMemory(memoryId, userId) {
    try {
      console.log(`🔍 Retrieving encrypted memory: ${memoryId}`);

      // Get memory metadata from database
      const { data: memory, error: dbError } = await supabase
        .from('memory_vault')
        .select(`
          *,
          families!inner(
            family_members!inner(user_id)
          )
        `)
        .eq('id', memoryId)
        .eq('families.family_members.user_id', userId)
        .single();

      if (dbError || !memory) {
        console.error('❌ Memory not found or access denied:', dbError);
        throw new Error('Memory not found or access denied');
      }

      let encryptedFileData = null;

      // Download encrypted file if it exists
      if (memory.encrypted_file_path) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .download(memory.encrypted_file_path);

        if (downloadError) {
          console.error('❌ Error downloading encrypted file:', downloadError);
          throw new Error('Failed to download encrypted file');
        }

        encryptedFileData = await fileData.arrayBuffer();
        console.log(`✅ Downloaded encrypted file: ${memory.encrypted_file_path}`);
      }

      return {
        id: memory.id,
        title: memory.title,
        description: memory.description,
        memoryType: memory.memory_type,
        encryptionKeyHint: memory.encryption_key_hint,
        metadata: memory.metadata,
        encryptedFileData,
        fileSizeBytes: memory.file_size_bytes,
        createdAt: memory.created_at,
        createdBy: memory.created_by
      };

    } catch (error) {
      console.error('❌ Error retrieving encrypted memory:', error);
      throw error;
    }
  }

  /**
   * List family memory vault items (metadata only)
   * @param {string} familyId - The family identifier
   * @param {string} userId - The user requesting the list
   * @param {number} limit - Number of items to return (default: 20)
   * @returns {Array} Array of memory metadata
   */
  async listFamilyMemories(familyId, userId, limit = 20) {
    try {
      console.log(`📋 Listing memories for family: ${familyId}`);

      // Get family memories (metadata only, no file data)
      const { data: memories, error: dbError } = await supabase
        .from('memory_vault')
        .select(`
          id,
          title,
          description,
          memory_type,
          encryption_key_hint,
          file_size_bytes,
          created_at,
          created_by,
          metadata,
          auth.users!created_by(email)
        `)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError) {
        console.error('❌ Error listing family memories:', dbError);
        throw new Error('Failed to list family memories');
      }

      // Transform data for response
      const transformedMemories = (memories || []).map(memory => ({
        id: memory.id,
        title: memory.title,
        description: memory.description,
        memoryType: memory.memory_type,
        encryptionKeyHint: memory.encryption_key_hint,
        fileSizeBytes: memory.file_size_bytes,
        metadata: memory.metadata,
        createdAt: memory.created_at,
        createdBy: memory.created_by,
        createdByEmail: memory.users?.email
      }));

      console.log(`✅ Found ${transformedMemories.length} memories for family`);
      return transformedMemories;

    } catch (error) {
      console.error('❌ Error listing family memories:', error);
      throw error;
    }
  }

  /**
   * Delete encrypted memory item and file
   * @param {string} memoryId - The memory item identifier
   * @param {string} userId - The user requesting deletion
   * @returns {boolean} Success status
   */
  async deleteEncryptedMemory(memoryId, userId) {
    try {
      console.log(`🗑️ Deleting encrypted memory: ${memoryId}`);

      // Get memory metadata first to check permissions and get file path
      const { data: memory, error: fetchError } = await supabase
        .from('memory_vault')
        .select(`
          *,
          families!inner(
            family_members!inner(user_id, role)
          )
        `)
        .eq('id', memoryId)
        .eq('families.family_members.user_id', userId)
        .single();

      if (fetchError || !memory) {
        console.error('❌ Memory not found or access denied:', fetchError);
        throw new Error('Memory not found or access denied');
      }

      // Check if user can delete (creator or family admin)
      const canDelete = memory.created_by === userId || 
                       memory.families.family_members.some(member => 
                         member.user_id === userId && member.role === 'admin'
                       );

      if (!canDelete) {
        throw new Error('Insufficient permissions to delete this memory');
      }

      // Delete encrypted file from storage if it exists
      if (memory.encrypted_file_path) {
        const { error: deleteFileError } = await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([memory.encrypted_file_path]);

        if (deleteFileError) {
          console.error('❌ Error deleting encrypted file:', deleteFileError);
          // Continue with metadata deletion even if file deletion fails
        } else {
          console.log(`✅ Deleted encrypted file: ${memory.encrypted_file_path}`);
        }
      }

      // Delete memory metadata from database
      const { error: deleteDbError } = await supabase
        .from('memory_vault')
        .delete()
        .eq('id', memoryId);

      if (deleteDbError) {
        console.error('❌ Error deleting memory metadata:', deleteDbError);
        throw new Error('Failed to delete memory metadata');
      }

      console.log(`✅ Memory vault item deleted: ${memoryId}`);
      return true;

    } catch (error) {
      console.error('❌ Error deleting encrypted memory:', error);
      throw error;
    }
  }

  /**
   * Get memory vault statistics for a family
   * @param {string} familyId - The family identifier
   * @returns {Object} Statistics about the family's memory vault
   */
  async getMemoryVaultStats(familyId) {
    try {
      // Get basic statistics
      const { data: stats, error: statsError } = await supabase
        .from('memory_vault')
        .select('memory_type, file_size_bytes, created_at')
        .eq('family_id', familyId);

      if (statsError) {
        console.error('❌ Error getting memory vault stats:', statsError);
        throw new Error('Failed to get memory vault statistics');
      }

      const totalItems = stats.length;
      const totalSizeBytes = stats.reduce((sum, item) => sum + (item.file_size_bytes || 0), 0);
      
      // Count by type
      const typeStats = stats.reduce((acc, item) => {
        acc[item.memory_type] = (acc[item.memory_type] || 0) + 1;
        return acc;
      }, {});

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentItems = stats.filter(item => 
        new Date(item.created_at) > thirtyDaysAgo
      ).length;

      return {
        totalItems,
        totalSizeBytes,
        totalSizeMB: Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100,
        typeBreakdown: typeStats,
        recentActivity: recentItems
      };

    } catch (error) {
      console.error('❌ Error getting memory vault stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new MemoryVaultService(); 