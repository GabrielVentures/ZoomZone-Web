/**
 * Preload Manager for Next-Page Preloading
 *
 * Implements intelligent next-page preloading to improve user experience.
 * Preloads next page in background when user is likely to navigate forward.
 */

import { CrudFilter } from '@refinedev/core';
import { cursorManager } from './cursorManager';
import { requestDeduplicator } from './requestDeduplicator';

/**
 * Preload strategy configuration
 */
export interface PreloadConfig {
  enabled: boolean;
  delayMs: number;              // Delay before starting preload
  onlyOnIdle: boolean;          // Only preload when browser is idle
  maxConcurrentPreloads: number; // Max simultaneous preload operations
}

/**
 * Preload task
 */
interface PreloadTask {
  sessionId: string;
  pageNumber: number;
  filters?: CrudFilter[];
  sorters?: Array<{ field: string; order: 'asc' | 'desc' }>;
  pageSize: number;
  startedAt: number;
}

/**
 * Default preload configuration
 */
const DEFAULT_CONFIG: PreloadConfig = {
  enabled: true,
  delayMs: 500,                 // Wait 500ms before preloading
  onlyOnIdle: true,             // Only preload when browser is idle
  maxConcurrentPreloads: 2,     // Max 2 concurrent preloads
};

/**
 * Preload Manager (Singleton)
 *
 * Intelligently preloads next pages to improve navigation speed.
 */
class PreloadManager {
  private config: PreloadConfig;
  private activeTasks: Map<string, PreloadTask> = new Map();
  private preloadTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate task ID
   */
  private getTaskId(sessionId: string, pageNumber: number): string {
    return `${sessionId}__page_${pageNumber}`;
  }

  /**
   * Check if browser is idle (using requestIdleCallback if available)
   */
  private async waitForIdle(): Promise<void> {
    if (!this.config.onlyOnIdle) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => resolve(), { timeout: 2000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(resolve, this.config.delayMs);
      }
    });
  }

  /**
   * Check if page is already cached
   */
  private isPageCached(sessionId: string, pageNumber: number): boolean {
    const cursor = cursorManager.getCursor(sessionId, pageNumber);
    return cursor !== null;
  }

  /**
   * Check if should preload (not too many active tasks)
   */
  private canPreload(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.activeTasks.size >= this.config.maxConcurrentPreloads) {
      console.log(`⏸️ [PreloadManager] Max concurrent preloads reached (${this.activeTasks.size})`);
      return false;
    }

    return true;
  }

  /**
   * Schedule next page preload
   *
   * @param sessionId - Current session ID
   * @param currentPage - Current page number
   * @param pageSize - Page size
   * @param filters - Query filters
   * @param sorters - Query sorters
   * @param dataFetcher - Function to fetch data (should return QueryDocumentSnapshot[])
   */
  schedulePreload(
    sessionId: string,
    currentPage: number,
    pageSize: number,
    filters: CrudFilter[] | undefined,
    sorters: Array<{ field: string; order: 'asc' | 'desc' }> | undefined,
    dataFetcher: (page: number) => Promise<any>
  ): void {
    if (!this.canPreload()) {
      return;
    }

    const nextPage = currentPage + 1;
    const taskId = this.getTaskId(sessionId, nextPage);

    // Cancel existing preload for this page
    this.cancelPreload(taskId);

    // Check if next page is already cached
    if (this.isPageCached(sessionId, nextPage)) {
      console.log(`✅ [PreloadManager] Page ${nextPage} already cached, skipping preload`);
      return;
    }

    // Check if current page has next page
    const currentCursor = cursorManager.getCursor(sessionId, currentPage);
    if (currentCursor && !currentCursor.hasNextPage) {
      console.log(`✅ [PreloadManager] No next page to preload (current page: ${currentPage})`);
      return;
    }

    console.log(`📅 [PreloadManager] Scheduling preload for page ${nextPage} in ${this.config.delayMs}ms`);

    // Schedule preload with delay
    const timeout = setTimeout(async () => {
      try {
        await this.executePreload(sessionId, nextPage, pageSize, filters, sorters, dataFetcher);
      } catch (error) {
        console.warn(`⚠️ [PreloadManager] Preload failed for page ${nextPage}:`, error);
      } finally {
        this.activeTasks.delete(taskId);
        this.preloadTimeouts.delete(taskId);
      }
    }, this.config.delayMs);

    this.preloadTimeouts.set(taskId, timeout);
  }

  /**
   * Execute preload
   */
  private async executePreload(
    sessionId: string,
    pageNumber: number,
    pageSize: number,
    filters: CrudFilter[] | undefined,
    sorters: Array<{ field: string; order: 'asc' | 'desc' }> | undefined,
    dataFetcher: (page: number) => Promise<any>
  ): Promise<void> {
    const taskId = this.getTaskId(sessionId, pageNumber);

    // Check if already cached (double-check)
    if (this.isPageCached(sessionId, pageNumber)) {
      console.log(`✅ [PreloadManager] Page ${pageNumber} already cached`);
      return;
    }

    // Wait for browser to be idle
    await this.waitForIdle();

    // Register task
    const task: PreloadTask = {
      sessionId,
      pageNumber,
      filters,
      sorters,
      pageSize,
      startedAt: Date.now(),
    };
    this.activeTasks.set(taskId, task);

    console.log(`🚀 [PreloadManager] Starting preload for page ${pageNumber}`);

    // Execute preload using request deduplicator
    const dedupeKey = `preload_${taskId}`;
    await requestDeduplicator.execute(dedupeKey, async () => {
      const result = await dataFetcher(pageNumber);
      const duration = Date.now() - task.startedAt;
      console.log(`✅ [PreloadManager] Preload completed for page ${pageNumber} (${duration}ms)`);
      return result;
    });
  }

  /**
   * Cancel specific preload
   */
  cancelPreload(taskId: string): void {
    const timeout = this.preloadTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.preloadTimeouts.delete(taskId);
      console.log(`🛑 [PreloadManager] Cancelled preload: ${taskId}`);
    }

    this.activeTasks.delete(taskId);
  }

  /**
   * Cancel all preloads for a session
   */
  cancelSessionPreloads(sessionId: string): void {
    const tasksToCancel: string[] = [];

    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.sessionId === sessionId) {
        tasksToCancel.push(taskId);
      }
    }

    for (const taskId of tasksToCancel) {
      this.cancelPreload(taskId);
    }

    if (tasksToCancel.length > 0) {
      console.log(`🛑 [PreloadManager] Cancelled ${tasksToCancel.length} preloads for session`);
    }
  }

  /**
   * Cancel all active preloads
   */
  cancelAll(): void {
    // Clear all timeouts
    for (const timeout of this.preloadTimeouts.values()) {
      clearTimeout(timeout);
    }

    const count = this.activeTasks.size;
    this.activeTasks.clear();
    this.preloadTimeouts.clear();

    if (count > 0) {
      console.log(`🛑 [PreloadManager] Cancelled all ${count} preloads`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[PreloadManager] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): PreloadConfig {
    return { ...this.config };
  }

  /**
   * Get active preload count
   */
  getActiveCount(): number {
    return this.activeTasks.size;
  }

  /**
   * Enable/disable preloading
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.cancelAll();
    }
    console.log(`[PreloadManager] Preloading ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Singleton instance
export const preloadManager = new PreloadManager();
