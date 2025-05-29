/**
 * Validates family name input
 * @param {string} name - The family name to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
const validateFamilyName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Family name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Family name cannot be empty' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Family name must be 100 characters or less' };
  }

  // Check for invalid characters (optional - adjust as needed)
  const invalidChars = /[<>]/;
  if (invalidChars.test(trimmedName)) {
    return { valid: false, error: 'Family name contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Validates email format
 * @param {string} email - The email to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
};

/**
 * Validates UUID format
 * @param {string} id - The UUID to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
const validateUUID = (id) => {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID is required' };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return { valid: false, error: 'Invalid ID format' };
  }

  return { valid: true };
};

module.exports = {
  validateFamilyName,
  validateEmail,
  validateUUID
}; 