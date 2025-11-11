/**
 * Request Deduplicator
 *
 * Prevents duplicate concurrent requests by reusing pending promises.
 * Useful for preventing multiple identical queries when user clicks rapidly.
 */

/**
 * Request Deduplicator (Singleton)
 */
class RequestDeduplicator {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Execute request with automatic deduplication
   * If same request is already pending, reuse that promise
   */
  async execute<T>(key: string, executor: () => Promise<T>): Promise<T> {
    // Check if same request is already pending
    const pending = this.pendingRequests.get(key);

    if (pending) {
      console.log(`🔄 [RequestDeduplicator] Reusing pending request: ${key.substring(0, 50)}...`);
      return pending;
    }

    // Execute new request
    const promise = executor()
      .finally(() => {
        // Clean up after completion
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    console.log(`🚀 [RequestDeduplicator] Started new request: ${key.substring(0, 50)}...`);

    return promise;
  }

  /**
   * Cancel all pending requests
   */
  clear(): void {
    const count = this.pendingRequests.size;
    this.pendingRequests.clear();
    if (count > 0) {
      console.log(`🗑️ [RequestDeduplicator] Cleared ${count} pending requests`);
    }
  }

  /**
   * Get number of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();
