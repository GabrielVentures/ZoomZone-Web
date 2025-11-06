/**
 * Login Throttling Utility
 * Prevents brute force attacks by limiting login attempts
 * Uses sliding window algorithm with exponential backoff
 */

import { secureStorage } from './secureStorage';

// ================================
// Configuration
// ================================

const THROTTLE_CONFIG = {
  // Maximum login attempts within the time window
  MAX_ATTEMPTS: 5,

  // Time window in milliseconds (15 minutes)
  TIME_WINDOW: 15 * 60 * 1000,

  // Lockout duration after max attempts (30 minutes)
  LOCKOUT_DURATION: 30 * 60 * 1000,

  // Progressive delays (in seconds) for failed attempts
  PROGRESSIVE_DELAYS: [0, 2, 5, 10, 30],

  // Storage key for tracking attempts
  STORAGE_KEY: 'login_attempts',
} as const;

// ================================
// Types
// ================================

interface LoginAttempt {
  timestamp: number;
  success: boolean;
  email?: string;
}

interface ThrottleState {
  attempts: LoginAttempt[];
  lockedUntil?: number;
}

interface ThrottleResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfter?: number; // Milliseconds until next attempt allowed
  message?: string;
}

// ================================
// Storage Functions
// ================================

/**
 * Get current throttle state from storage
 */
const getThrottleState = (): ThrottleState => {
  const state = secureStorage.getItem<ThrottleState>(THROTTLE_CONFIG.STORAGE_KEY);

  if (!state) {
    return { attempts: [] };
  }

  // Clean up old attempts outside the time window
  const now = Date.now();
  const windowStart = now - THROTTLE_CONFIG.TIME_WINDOW;

  return {
    ...state,
    attempts: state.attempts.filter((attempt) => attempt.timestamp > windowStart),
  };
};

/**
 * Save throttle state to storage
 */
const saveThrottleState = (state: ThrottleState): void => {
  secureStorage.setItem(THROTTLE_CONFIG.STORAGE_KEY, state);
};

/**
 * Clear throttle state
 */
export const clearThrottleState = (): void => {
  secureStorage.removeItem(THROTTLE_CONFIG.STORAGE_KEY);
  console.log('🔓 [LoginThrottle] Throttle state cleared');
};

// ================================
// Throttle Logic
// ================================

/**
 * Check if login attempt is allowed
 * Returns throttle result with status and timing information
 */
export const checkLoginAttempt = (): ThrottleResult => {
  const state = getThrottleState();
  const now = Date.now();

  // Check if account is currently locked
  if (state.lockedUntil && now < state.lockedUntil) {
    const retryAfter = state.lockedUntil - now;
    const minutes = Math.ceil(retryAfter / 60000);

    console.warn(`🔒 [LoginThrottle] Account locked. Retry after ${minutes} minutes`);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter,
      message: `Too many failed login attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
    };
  }

  // Clear lockout if expired
  if (state.lockedUntil && now >= state.lockedUntil) {
    state.lockedUntil = undefined;
    state.attempts = [];
    saveThrottleState(state);
  }

  // Count failed attempts within time window
  const failedAttempts = state.attempts.filter((attempt) => !attempt.success);
  const attemptCount = failedAttempts.length;

  // Check if max attempts exceeded
  if (attemptCount >= THROTTLE_CONFIG.MAX_ATTEMPTS) {
    // Lock the account
    state.lockedUntil = now + THROTTLE_CONFIG.LOCKOUT_DURATION;
    saveThrottleState(state);

    const minutes = Math.ceil(THROTTLE_CONFIG.LOCKOUT_DURATION / 60000);

    console.error(`🔒 [LoginThrottle] Max attempts exceeded. Locked for ${minutes} minutes`);

    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfter: THROTTLE_CONFIG.LOCKOUT_DURATION,
      message: `Too many failed login attempts. Account locked for ${minutes} minutes.`,
    };
  }

  // Calculate progressive delay for current attempt
  const delayIndex = Math.min(attemptCount, THROTTLE_CONFIG.PROGRESSIVE_DELAYS.length - 1);
  const requiredDelay = THROTTLE_CONFIG.PROGRESSIVE_DELAYS[delayIndex] * 1000;

  // Check if enough time has passed since last failed attempt
  if (failedAttempts.length > 0) {
    const lastFailedAttempt = failedAttempts[failedAttempts.length - 1];
    const timeSinceLastAttempt = now - lastFailedAttempt.timestamp;

    if (timeSinceLastAttempt < requiredDelay) {
      const retryAfter = requiredDelay - timeSinceLastAttempt;
      const seconds = Math.ceil(retryAfter / 1000);

      console.warn(`⏱️ [LoginThrottle] Must wait ${seconds} seconds before next attempt`);

      return {
        allowed: false,
        remainingAttempts: THROTTLE_CONFIG.MAX_ATTEMPTS - attemptCount,
        retryAfter,
        message: `Please wait ${seconds} second${seconds > 1 ? 's' : ''} before trying again.`,
      };
    }
  }

  // Attempt is allowed
  const remainingAttempts = THROTTLE_CONFIG.MAX_ATTEMPTS - attemptCount;

  console.log(`✅ [LoginThrottle] Login attempt allowed. ${remainingAttempts} attempts remaining`);

  return {
    allowed: true,
    remainingAttempts,
  };
};

/**
 * Record a login attempt (success or failure)
 */
export const recordLoginAttempt = (success: boolean, email?: string): void => {
  const state = getThrottleState();

  // Add new attempt
  state.attempts.push({
    timestamp: Date.now(),
    success,
    email,
  });

  // If successful, clear the throttle state
  if (success) {
    state.attempts = [];
    state.lockedUntil = undefined;
    console.log('✅ [LoginThrottle] Successful login - throttle state reset');
  } else {
    const failedCount = state.attempts.filter((a) => !a.success).length;
    const remaining = THROTTLE_CONFIG.MAX_ATTEMPTS - failedCount;
    console.warn(`⚠️ [LoginThrottle] Failed login attempt. ${remaining} attempts remaining`);
  }

  saveThrottleState(state);
};

/**
 * Get current throttle status (for UI display)
 */
export const getThrottleStatus = (): {
  isLocked: boolean;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil?: number;
} => {
  const state = getThrottleState();
  const now = Date.now();

  const failedAttempts = state.attempts.filter((a) => !a.success).length;
  const remainingAttempts = Math.max(0, THROTTLE_CONFIG.MAX_ATTEMPTS - failedAttempts);
  const isLocked = Boolean(state.lockedUntil && now < state.lockedUntil);

  return {
    isLocked,
    failedAttempts,
    remainingAttempts,
    lockedUntil: state.lockedUntil,
  };
};

/**
 * Check if a specific email is being rate limited
 * (Optional: For more granular per-email throttling)
 */
export const isEmailThrottled = (email: string): boolean => {
  const state = getThrottleState();

  // Count failed attempts for this specific email
  const emailAttempts = state.attempts.filter(
    (attempt) => !attempt.success && attempt.email?.toLowerCase() === email.toLowerCase()
  );

  return emailAttempts.length >= THROTTLE_CONFIG.MAX_ATTEMPTS;
};

// ================================
// Export Configuration (for testing/display)
// ================================

export const getThrottleConfig = () => ({
  maxAttempts: THROTTLE_CONFIG.MAX_ATTEMPTS,
  timeWindowMinutes: THROTTLE_CONFIG.TIME_WINDOW / 60000,
  lockoutDurationMinutes: THROTTLE_CONFIG.LOCKOUT_DURATION / 60000,
});
