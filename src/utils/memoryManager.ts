/**
 * Memory Manager for Cache Monitoring and Cleanup
 *
 * Monitors memory usage and automatically cleans up caches when necessary.
 * Helps prevent memory issues with large datasets.
 */

import { cursorManager } from './cursorManager';
import { selectionManager } from './selectionManager';
import { cacheManager } from './cacheManager';
import { requestDeduplicator } from './requestDeduplicator';

/**
 * Memory monitoring configuration
 */
export interface MemoryConfig {
  enabled: boolean;
  checkIntervalMs: number;      // How often to check memory
  warningThresholdMB: number;   // Warning threshold in MB
  criticalThresholdMB: number;  // Critical threshold in MB (trigger cleanup)
  autoCleanup: boolean;         // Automatically cleanup on critical
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  usedJSHeapSizeMB: number;
  totalJSHeapSizeMB: number;
  jsHeapSizeLimitMB: number;
  usagePercent: number;
  timestamp: number;
}

/**
 * Cleanup report
 */
export interface CleanupReport {
  timestamp: number;
  beforeMemoryMB: number;
  afterMemoryMB: number;
  freedMemoryMB: number;
  cursorSessionsCleared: number;
  cachesCleared: number;
  selectionsCleared: boolean;
  deduplicatorCleared: boolean;
}

/**
 * Default memory configuration
 */
const DEFAULT_CONFIG: MemoryConfig = {
  enabled: true,
  checkIntervalMs: 30000,       // Check every 30 seconds
  warningThresholdMB: 200,      // Warn at 200MB
  criticalThresholdMB: 300,     // Cleanup at 300MB
  autoCleanup: true,
};

/**
 * Memory Manager (Singleton)
 *
 * Monitors memory usage and performs automatic cleanup when needed.
 */
class MemoryManager {
  private config: MemoryConfig;
  private checkInterval: NodeJS.Timeout | null = null;
  private lastStats: MemoryStats | null = null;
  private onWarning?: (stats: MemoryStats) => void;
  private onCritical?: (stats: MemoryStats) => void;

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    // Check if Performance API is available
    if (!performance || !(performance as any).memory) {
      console.warn('[MemoryManager] Performance.memory API not available');
      return null;
    }

    const memory = (performance as any).memory;

    const stats: MemoryStats = {
      usedJSHeapSizeMB: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSizeMB: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      jsHeapSizeLimitMB: Math.round(memory.jsHeapSizeLimit / 1024 / 1024),
      usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      timestamp: Date.now(),
    };

    this.lastStats = stats;
    return stats;
  }

  /**
   * Check memory and trigger actions if needed
   */
  private checkMemory(): void {
    const stats = this.getMemoryStats();
    if (!stats) return;

    // Log memory status
    console.log(
      `📊 [MemoryManager] Memory: ${stats.usedJSHeapSizeMB}MB / ${stats.jsHeapSizeLimitMB}MB (${stats.usagePercent}%)`
    );

    // Check for critical threshold
    if (stats.usedJSHeapSizeMB >= this.config.criticalThresholdMB) {
      console.warn(`🚨 [MemoryManager] CRITICAL: Memory usage at ${stats.usedJSHeapSizeMB}MB`);

      if (this.onCritical) {
        this.onCritical(stats);
      }

      if (this.config.autoCleanup) {
        this.performCleanup('critical');
      }
    }
    // Check for warning threshold
    else if (stats.usedJSHeapSizeMB >= this.config.warningThresholdMB) {
      console.warn(`⚠️ [MemoryManager] WARNING: Memory usage at ${stats.usedJSHeapSizeMB}MB`);

      if (this.onWarning) {
        this.onWarning(stats);
      }
    }
  }

  /**
   * Perform cleanup to free memory
   *
   * @param severity - 'light' | 'medium' | 'critical'
   */
  performCleanup(severity: 'light' | 'medium' | 'critical' = 'medium'): CleanupReport {
    console.log(`🧹 [MemoryManager] Starting ${severity} cleanup...`);

    const beforeStats = this.getMemoryStats();
    const beforeMemoryMB = beforeStats?.usedJSHeapSizeMB || 0;

    const report: CleanupReport = {
      timestamp: Date.now(),
      beforeMemoryMB,
      afterMemoryMB: 0,
      freedMemoryMB: 0,
      cursorSessionsCleared: 0,
      cachesCleared: 0,
      selectionsCleared: false,
      deduplicatorCleared: false,
    };

    // Light cleanup: Clear oldest cursor sessions
    if (severity === 'light') {
      const cursorStats = cursorManager.getStats();
      cursorManager.cleanupOldSessions(5); // Keep only 5 most recent
      report.cursorSessionsCleared = cursorStats.totalSessions - 5;
    }

    // Medium cleanup: Clear more caches
    else if (severity === 'medium') {
      const cursorStats = cursorManager.getStats();
      cursorManager.cleanupOldSessions(3); // Keep only 3 most recent
      report.cursorSessionsCleared = cursorStats.totalSessions - 3;

      // Clear data cache
      cacheManager.clear();
      report.cachesCleared = 1;

      // Clear request deduplicator
      requestDeduplicator.clear();
      report.deduplicatorCleared = true;
    }

    // Critical cleanup: Clear everything
    else if (severity === 'critical') {
      const cursorStats = cursorManager.getStats();
      cursorManager.clearAll();
      report.cursorSessionsCleared = cursorStats.totalSessions;

      // Clear data cache
      cacheManager.clear();
      report.cachesCleared = 1;

      // Clear selections
      selectionManager.clear();
      report.selectionsCleared = true;

      // Clear request deduplicator
      requestDeduplicator.clear();
      report.deduplicatorCleared = true;
    }

    // Get after stats
    setTimeout(() => {
      const afterStats = this.getMemoryStats();
      report.afterMemoryMB = afterStats?.usedJSHeapSizeMB || 0;
      report.freedMemoryMB = report.beforeMemoryMB - report.afterMemoryMB;

      console.log(
        `✅ [MemoryManager] Cleanup complete: Freed ${report.freedMemoryMB}MB ` +
        `(${report.beforeMemoryMB}MB → ${report.afterMemoryMB}MB)`
      );
    }, 1000); // Wait 1 second for garbage collection

    return report;
  }

  /**
   * Start automatic memory monitoring
   */
  start(): void {
    if (this.checkInterval) {
      console.warn('[MemoryManager] Already started');
      return;
    }

    if (!this.config.enabled) {
      console.log('[MemoryManager] Disabled, not starting');
      return;
    }

    console.log(`🚀 [MemoryManager] Starting (check every ${this.config.checkIntervalMs}ms)`);

    // Initial check
    this.checkMemory();

    // Set interval for periodic checks
    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop automatic memory monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[MemoryManager] Stopped');
    }
  }

  /**
   * Register warning callback
   */
  onMemoryWarning(callback: (stats: MemoryStats) => void): void {
    this.onWarning = callback;
  }

  /**
   * Register critical callback
   */
  onMemoryCritical(callback: (stats: MemoryStats) => void): void {
    this.onCritical = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    // Restart if enabled status changed
    if (wasEnabled !== this.config.enabled) {
      this.stop();
      if (this.config.enabled) {
        this.start();
      }
    }

    console.log('[MemoryManager] Configuration updated:', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Get last memory statistics
   */
  getLastStats(): MemoryStats | null {
    return this.lastStats;
  }

  /**
   * Force memory check now
   */
  checkNow(): MemoryStats | null {
    this.checkMemory();
    return this.lastStats;
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

// Auto-start in development mode
if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
  // Start monitoring after 5 seconds
  setTimeout(() => {
    memoryManager.start();
  }, 5000);
}
