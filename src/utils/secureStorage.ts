/**
 * Secure Storage Utility
 * Encrypts sensitive data before storing in localStorage
 * Uses AES encryption with crypto-js
 */

import CryptoJS from 'crypto-js';

// ================================
// Configuration
// ================================

/**
 * Generate encryption key from browser fingerprint
 * In production, this should be more sophisticated
 * For now, we use a combination of:
 * - User agent
 * - Screen resolution
 * - Timezone
 * - Language
 */
const generateEncryptionKey = (): string => {
  const fingerprint = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.language,
    'shelftag-snap-secret-key', // App-specific secret
  ].join('|');

  // Hash the fingerprint to get consistent key
  return CryptoJS.SHA256(fingerprint).toString();
};

// Cache the encryption key
const ENCRYPTION_KEY = generateEncryptionKey();

// ================================
// Encryption Functions
// ================================

/**
 * Encrypt data using AES
 */
const encrypt = (data: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error('❌ [SecureStorage] Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data using AES
 */
const decrypt = (encryptedData: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedStr) {
      throw new Error('Decryption failed - invalid data or key');
    }

    return decryptedStr;
  } catch (error) {
    console.error('❌ [SecureStorage] Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// ================================
// Secure Storage Interface
// ================================

export interface SecureStorageInterface {
  /**
   * Store data securely in localStorage
   * Data is automatically encrypted
   */
  setItem: (key: string, value: any) => void;

  /**
   * Retrieve and decrypt data from localStorage
   * Returns null if key doesn't exist or decryption fails
   */
  getItem: <T = any>(key: string) => T | null;

  /**
   * Remove item from localStorage
   */
  removeItem: (key: string) => void;

  /**
   * Clear all secure storage items
   * Only removes items with our prefix
   */
  clear: () => void;

  /**
   * Check if key exists in storage
   */
  hasItem: (key: string) => boolean;
}

// ================================
// Implementation
// ================================

const STORAGE_PREFIX = '__secure__';

/**
 * Get the actual storage key with prefix
 */
const getStorageKey = (key: string): string => {
  return `${STORAGE_PREFIX}${key}`;
};

/**
 * Secure Storage implementation
 */
export const secureStorage: SecureStorageInterface = {
  /**
   * Store encrypted data
   */
  setItem: (key: string, value: any): void => {
    try {
      // Convert value to JSON string
      const jsonString = JSON.stringify(value);

      // Encrypt the JSON string
      const encrypted = encrypt(jsonString);

      // Store in localStorage with prefix
      const storageKey = getStorageKey(key);
      localStorage.setItem(storageKey, encrypted);

      console.log(`🔐 [SecureStorage] Stored encrypted data for key: ${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to store ${key}:`, error);
      throw error;
    }
  },

  /**
   * Retrieve and decrypt data
   */
  getItem: <T = any>(key: string): T | null => {
    try {
      const storageKey = getStorageKey(key);
      const encrypted = localStorage.getItem(storageKey);

      if (!encrypted) {
        return null;
      }

      // Decrypt the data
      const decrypted = decrypt(encrypted);

      // Parse JSON
      const value = JSON.parse(decrypted);

      console.log(`🔓 [SecureStorage] Retrieved decrypted data for key: ${key}`);
      return value as T;
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to retrieve ${key}:`, error);
      // If decryption fails, remove the corrupted data
      secureStorage.removeItem(key);
      return null;
    }
  },

  /**
   * Remove item from storage
   */
  removeItem: (key: string): void => {
    try {
      const storageKey = getStorageKey(key);
      localStorage.removeItem(storageKey);
      console.log(`🗑️ [SecureStorage] Removed key: ${key}`);
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to remove ${key}:`, error);
    }
  },

  /**
   * Clear all secure storage items
   */
  clear: (): void => {
    try {
      // Get all keys
      const keys = Object.keys(localStorage);

      // Remove only our prefixed keys
      const secureKeys = keys.filter((key) => key.startsWith(STORAGE_PREFIX));

      secureKeys.forEach((key) => {
        localStorage.removeItem(key);
      });

      console.log(`🗑️ [SecureStorage] Cleared ${secureKeys.length} secure items`);
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to clear storage:', error);
    }
  },

  /**
   * Check if key exists
   */
  hasItem: (key: string): boolean => {
    const storageKey = getStorageKey(key);
    return localStorage.getItem(storageKey) !== null;
  },
};

// ================================
// Migration Helper
// ================================

/**
 * Migrate existing unencrypted data to encrypted storage
 * Should be called once during app initialization
 */
export const migrateToSecureStorage = (keys: string[]): void => {
  console.log('🔄 [SecureStorage] Starting migration to encrypted storage...');

  keys.forEach((key) => {
    try {
      // Check if already migrated (has prefix)
      if (secureStorage.hasItem(key)) {
        console.log(`✅ [SecureStorage] ${key} already migrated`);
        return;
      }

      // Get unencrypted data
      const oldData = localStorage.getItem(key);

      if (oldData) {
        // Parse and store encrypted
        const parsed = JSON.parse(oldData);
        secureStorage.setItem(key, parsed);

        // Remove old unencrypted data
        localStorage.removeItem(key);

        console.log(`✅ [SecureStorage] Migrated ${key} to encrypted storage`);
      }
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to migrate ${key}:`, error);
    }
  });

  console.log('✅ [SecureStorage] Migration completed');
};

// ================================
// Backward Compatibility Helper
// ================================

/**
 * Get item from either secure or legacy storage
 * Used during migration period
 */
export const getItemCompat = <T = any>(key: string): T | null => {
  // Try secure storage first
  const secureData = secureStorage.getItem<T>(key);
  if (secureData) {
    return secureData;
  }

  // Fallback to legacy storage
  try {
    const legacyData = localStorage.getItem(key);
    if (legacyData) {
      console.warn(`⚠️ [SecureStorage] Found legacy data for ${key}, migrating...`);
      const parsed = JSON.parse(legacyData);

      // Migrate to secure storage
      secureStorage.setItem(key, parsed);
      localStorage.removeItem(key);

      return parsed as T;
    }
  } catch (error) {
    console.error(`❌ [SecureStorage] Failed to read legacy data for ${key}:`, error);
  }

  return null;
};

// ================================
// Export Default
// ================================

export default secureStorage;
