/**
 * Session Manager
 * Manages user session timeout and idle detection
 * Automatically logs out users after inactivity
 */

import { secureStorage } from './secureStorage';

// ================================
// Configuration
// ================================

const SESSION_CONFIG = {
  // Session timeout duration (30 minutes)
  TIMEOUT_DURATION: 30 * 60 * 1000,

  // Warning before timeout (2 minutes before)
  WARNING_BEFORE: 2 * 60 * 1000,

  // Interval to check for timeout (every 10 seconds)
  CHECK_INTERVAL: 10 * 1000,

  // Storage key for last activity
  STORAGE_KEY: 'session_last_activity',

  // Events that reset the idle timer
  ACTIVITY_EVENTS: ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'],
} as const;

// ================================
// Types
// ================================

export interface SessionState {
  lastActivity: number;
  isActive: boolean;
}

export interface SessionCallbacks {
  onWarning?: (remainingSeconds: number) => void;
  onTimeout?: () => void;
  onActivity?: () => void;
}

// ================================
// Session Manager Class
// ================================

class SessionManager {
  private lastActivity: number;
  private checkInterval: NodeJS.Timeout | null = null;
  private callbacks: SessionCallbacks = {};
  private warningShown: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    this.lastActivity = Date.now();
  }

  /**
   * Initialize session manager with callbacks
   */
  init(callbacks: SessionCallbacks): void {
    this.callbacks = callbacks;
    this.isEnabled = true;
    this.lastActivity = Date.now();
    this.warningShown = false;

    // Load last activity from storage
    const savedActivity = secureStorage.getItem<number>(SESSION_CONFIG.STORAGE_KEY);
    if (savedActivity && Date.now() - savedActivity < SESSION_CONFIG.TIMEOUT_DURATION) {
      this.lastActivity = savedActivity;
    }

    // Set up activity listeners
    this.setupActivityListeners();

    // Start checking for timeout
    this.startTimeoutChecker();

    console.log('✅ [SessionManager] Initialized with timeout:', SESSION_CONFIG.TIMEOUT_DURATION / 60000, 'minutes');
  }

  /**
   * Set up event listeners for user activity
   */
  private setupActivityListeners(): void {
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  /**
   * Remove activity listeners
   */
  private removeActivityListeners(): void {
    SESSION_CONFIG.ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });
  }

  /**
   * Handle user activity
   */
  private handleActivity = (): void => {
    if (!this.isEnabled) return;

    const now = Date.now();
    this.lastActivity = now;
    this.warningShown = false;

    // Save to storage
    secureStorage.setItem(SESSION_CONFIG.STORAGE_KEY, now);

    // Call activity callback
    if (this.callbacks.onActivity) {
      this.callbacks.onActivity();
    }
  };

  /**
   * Start the timeout checker interval
   */
  private startTimeoutChecker(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkTimeout();
    }, SESSION_CONFIG.CHECK_INTERVAL);
  }

  /**
   * Check if session has timed out
   */
  private checkTimeout(): void {
    if (!this.isEnabled) return;

    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;

    // Check if session has timed out
    if (timeSinceActivity >= SESSION_CONFIG.TIMEOUT_DURATION) {
      console.warn('⏰ [SessionManager] Session timeout - logging out');
      this.handleTimeout();
      return;
    }

    // Check if we should show warning
    const timeUntilTimeout = SESSION_CONFIG.TIMEOUT_DURATION - timeSinceActivity;
    if (timeUntilTimeout <= SESSION_CONFIG.WARNING_BEFORE && !this.warningShown) {
      this.warningShown = true;
      const remainingSeconds = Math.ceil(timeUntilTimeout / 1000);

      console.warn(`⚠️ [SessionManager] Session warning - ${remainingSeconds}s remaining`);

      if (this.callbacks.onWarning) {
        this.callbacks.onWarning(remainingSeconds);
      }
    }
  }

  /**
   * Handle session timeout
   */
  private handleTimeout(): void {
    this.destroy();

    if (this.callbacks.onTimeout) {
      this.callbacks.onTimeout();
    }
  }

  /**
   * Reset session timer (user activity)
   */
  reset(): void {
    this.handleActivity();
    console.log('🔄 [SessionManager] Session reset');
  }

  /**
   * Get remaining session time in milliseconds
   */
  getRemainingTime(): number {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return Math.max(0, SESSION_CONFIG.TIMEOUT_DURATION - timeSinceActivity);
  }

  /**
   * Get session state
   */
  getState(): SessionState {
    return {
      lastActivity: this.lastActivity,
      isActive: this.isEnabled && this.getRemainingTime() > 0,
    };
  }

  /**
   * Destroy session manager
   */
  destroy(): void {
    this.isEnabled = false;

    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Remove listeners
    this.removeActivityListeners();

    // Clear storage
    secureStorage.removeItem(SESSION_CONFIG.STORAGE_KEY);

    console.log('🗑️ [SessionManager] Destroyed');
  }

  /**
   * Pause session timeout (for maintenance windows, etc.)
   */
  pause(): void {
    this.isEnabled = false;
    console.log('⏸️ [SessionManager] Paused');
  }

  /**
   * Resume session timeout
   */
  resume(): void {
    this.isEnabled = true;
    this.reset();
    console.log('▶️ [SessionManager] Resumed');
  }
}

// ================================
// Singleton Instance
// ================================

export const sessionManager = new SessionManager();

// ================================
// Export Configuration
// ================================

export const getSessionConfig = () => ({
  timeoutMinutes: SESSION_CONFIG.TIMEOUT_DURATION / 60000,
  warningMinutes: SESSION_CONFIG.WARNING_BEFORE / 60000,
  checkIntervalSeconds: SESSION_CONFIG.CHECK_INTERVAL / 1000,
});
