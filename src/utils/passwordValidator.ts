/**
 * Password Validator
 * Validates password strength and provides feedback
 * Enforces strong password policies
 */

// ================================
// Configuration
// ================================

export const PASSWORD_POLICY = {
  // Minimum length
  MIN_LENGTH: 8,

  // Maximum length
  MAX_LENGTH: 128,

  // Require uppercase letter
  REQUIRE_UPPERCASE: true,

  // Require lowercase letter
  REQUIRE_LOWERCASE: true,

  // Require number
  REQUIRE_NUMBER: true,

  // Require special character
  REQUIRE_SPECIAL: true,

  // Special characters allowed
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',

  // Common passwords to reject (subset)
  COMMON_PASSWORDS: [
    'password',
    '12345678',
    'qwerty123',
    'admin123',
    'password123',
    'letmein',
    'welcome',
    'monkey123',
  ],
} as const;

// ================================
// Types
// ================================

export interface PasswordValidationResult {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface PasswordRequirement {
  met: boolean;
  label: string;
  description: string;
}

// ================================
// Validation Functions
// ================================

/**
 * Check if password meets minimum length
 */
const checkLength = (password: string): boolean => {
  return password.length >= PASSWORD_POLICY.MIN_LENGTH && password.length <= PASSWORD_POLICY.MAX_LENGTH;
};

/**
 * Check if password contains uppercase letter
 */
const checkUppercase = (password: string): boolean => {
  return /[A-Z]/.test(password);
};

/**
 * Check if password contains lowercase letter
 */
const checkLowercase = (password: string): boolean => {
  return /[a-z]/.test(password);
};

/**
 * Check if password contains number
 */
const checkNumber = (password: string): boolean => {
  return /[0-9]/.test(password);
};

/**
 * Check if password contains special character
 */
const checkSpecialChar = (password: string): boolean => {
  const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
  return specialCharsRegex.test(password);
};

/**
 * Check if password is a common password
 */
const isCommonPassword = (password: string): boolean => {
  const lowerPassword = password.toLowerCase();
  return PASSWORD_POLICY.COMMON_PASSWORDS.some((common) => lowerPassword.includes(common));
};

/**
 * Check for sequential characters
 */
const hasSequentialChars = (password: string): boolean => {
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);

    // Check for ascending sequence
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return true;
    }

    // Check for descending sequence
    if (char2 === char1 - 1 && char3 === char2 - 1) {
      return true;
    }
  }
  return false;
};

/**
 * Check for repeated characters
 */
const hasRepeatedChars = (password: string): boolean => {
  return /(.)\1{2,}/.test(password);
};

/**
 * Calculate password entropy (randomness)
 */
const calculateEntropy = (password: string): number => {
  let charsetSize = 0;

  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (checkSpecialChar(password)) charsetSize += PASSWORD_POLICY.SPECIAL_CHARS.length;

  return Math.log2(Math.pow(charsetSize, password.length));
};

// ================================
// Main Validation Function
// ================================

/**
 * Validate password and return detailed result
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Basic checks
  if (!password) {
    errors.push('Password is required');
    return {
      isValid: false,
      strength: 'weak',
      score: 0,
      errors,
      warnings,
      suggestions: ['Enter a password'],
    };
  }

  // Length check
  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`);
  }

  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
  }

  // Character type checks
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !checkUppercase(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !checkLowercase(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (PASSWORD_POLICY.REQUIRE_NUMBER && !checkNumber(password)) {
    errors.push('Password must contain at least one number');
  }

  if (PASSWORD_POLICY.REQUIRE_SPECIAL && !checkSpecialChar(password)) {
    errors.push(`Password must contain at least one special character (${PASSWORD_POLICY.SPECIAL_CHARS})`);
  }

  // Common password check
  if (isCommonPassword(password)) {
    errors.push('Password is too common - please choose a more unique password');
  }

  // Pattern checks (warnings)
  if (hasSequentialChars(password)) {
    warnings.push('Avoid sequential characters (e.g., abc, 123)');
  }

  if (hasRepeatedChars(password)) {
    warnings.push('Avoid repeated characters (e.g., aaa, 111)');
  }

  // Calculate score
  let score = 0;

  // Length score (0-30 points)
  score += Math.min(30, (password.length / 16) * 30);

  // Character variety (0-40 points)
  if (checkUppercase(password)) score += 10;
  if (checkLowercase(password)) score += 10;
  if (checkNumber(password)) score += 10;
  if (checkSpecialChar(password)) score += 10;

  // Entropy score (0-30 points)
  const entropy = calculateEntropy(password);
  score += Math.min(30, (entropy / 100) * 30);

  // Deduct points for weaknesses
  if (isCommonPassword(password)) score -= 20;
  if (hasSequentialChars(password)) score -= 10;
  if (hasRepeatedChars(password)) score -= 10;

  score = Math.max(0, Math.min(100, score));

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  if (score < 40) {
    strength = 'weak';
  } else if (score < 60) {
    strength = 'medium';
  } else if (score < 80) {
    strength = 'strong';
  } else {
    strength = 'very-strong';
  }

  // Add suggestions
  if (password.length < 12) {
    suggestions.push('Use at least 12 characters for better security');
  }

  if (!checkSpecialChar(password)) {
    suggestions.push('Add special characters to make it stronger');
  }

  if (!/[0-9]/.test(password)) {
    suggestions.push('Include numbers in your password');
  }

  return {
    isValid: errors.length === 0,
    strength,
    score,
    errors,
    warnings,
    suggestions,
  };
};

/**
 * Get password requirements status
 */
export const getPasswordRequirements = (password: string): PasswordRequirement[] => {
  return [
    {
      met: checkLength(password),
      label: 'Length',
      description: `At least ${PASSWORD_POLICY.MIN_LENGTH} characters`,
    },
    {
      met: checkUppercase(password),
      label: 'Uppercase',
      description: 'Contains uppercase letter (A-Z)',
    },
    {
      met: checkLowercase(password),
      label: 'Lowercase',
      description: 'Contains lowercase letter (a-z)',
    },
    {
      met: checkNumber(password),
      label: 'Number',
      description: 'Contains number (0-9)',
    },
    {
      met: checkSpecialChar(password),
      label: 'Special Character',
      description: `Contains special character (${PASSWORD_POLICY.SPECIAL_CHARS})`,
    },
    {
      met: !isCommonPassword(password),
      label: 'Not Common',
      description: 'Not a commonly used password',
    },
  ];
};

/**
 * Get strength color for UI display
 */
export const getStrengthColor = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return '#ff4d4f';
    case 'medium':
      return '#faad14';
    case 'strong':
      return '#52c41a';
    case 'very-strong':
      return '#1890ff';
    default:
      return '#d9d9d9';
  }
};

/**
 * Get strength label for UI display
 */
export const getStrengthLabel = (strength: string): string => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    case 'very-strong':
      return 'Very Strong';
    default:
      return 'Unknown';
  }
};
