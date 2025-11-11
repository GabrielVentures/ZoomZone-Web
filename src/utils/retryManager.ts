/**
 * Retry Manager for Network Error Handling
 *
 * Implements automatic retry logic with exponential backoff for network errors.
 * Handles transient Firestore errors gracefully.
 */

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,     // Start with 1 second
  maxDelayMs: 10000,        // Cap at 10 seconds
  backoffMultiplier: 2,     // Double delay each time
};

/**
 * Retry Manager (Singleton)
 *
 * Handles automatic retry logic for network and transient errors.
 */
class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';

    // Firestore retryable error codes
    const retryableErrorCodes = [
      'unavailable',
      'deadline-exceeded',
      'internal',
      'resource-exhausted',
    ];

    // Network-related errors
    const networkErrors = [
      'offline',
      'network',
      'timeout',
      'ECONNRESET',
      'ETIMEDOUT',
    ];

    // Check error code
    if (retryableErrorCodes.includes(errorCode)) {
      return true;
    }

    // Check error message
    if (networkErrors.some(keyword => errorMessage.toLowerCase().includes(keyword))) {
      return true;
    }

    // Check if browser is offline
    if (!navigator.onLine) {
      return true;
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute function with automatic retry
   *
   * @param executor - Function to execute
   * @param onRetry - Optional callback when retry happens
   * @returns Result with success status and data/error
   */
  async execute<T>(
    executor: () => Promise<T>,
    onRetry?: (attempt: number, error: Error, delayMs: number) => void
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let attempts = 0;

    for (let i = 0; i <= this.config.maxRetries; i++) {
      attempts = i + 1;

      try {
        const data = await executor();

        if (i > 0) {
          console.log(`✅ [RetryManager] Succeeded after ${attempts} attempts`);
        }

        return {
          success: true,
          data,
          attempts,
        };
      } catch (error: any) {
        lastError = error;

        // If this is the last attempt or error is not retryable, give up
        if (i >= this.config.maxRetries || !this.isRetryableError(error)) {
          console.error(`❌ [RetryManager] Failed after ${attempts} attempts:`, error);
          return {
            success: false,
            error: lastError,
            attempts,
          };
        }

        // Calculate delay and wait
        const delayMs = this.calculateDelay(i);
        console.warn(
          `⚠️ [RetryManager] Attempt ${attempts} failed, retrying in ${delayMs}ms...`,
          error?.code || error?.message
        );

        // Call onRetry callback if provided
        if (onRetry) {
          try {
            onRetry(attempts, error, delayMs);
          } catch (callbackError) {
            console.warn('[RetryManager] onRetry callback error:', callbackError);
          }
        }

        await this.sleep(delayMs);
      }
    }

    // Should never reach here, but TypeScript needs it
    return {
      success: false,
      error: lastError,
      attempts,
    };
  }

  /**
   * Execute function with retry and throw error on failure
   * Useful when you want to maintain error-throwing behavior
   */
  async executeOrThrow<T>(
    executor: () => Promise<T>,
    onRetry?: (attempt: number, error: Error, delayMs: number) => void
  ): Promise<T> {
    const result = await this.execute(executor, onRetry);

    if (!result.success) {
      throw result.error || new Error('Unknown error');
    }

    return result.data!;
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[RetryManager] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const retryManager = new RetryManager();
