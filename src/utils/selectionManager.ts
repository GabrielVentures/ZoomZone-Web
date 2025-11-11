/**
 * Selection Manager for Cross-Page Selection Persistence
 *
 * Manages selected record IDs across pages with localStorage persistence.
 * Validates against session ID to clear when filters change.
 */

/**
 * Selection state structure
 */
export interface SelectionState {
  selectedIds: string[];
  sessionId: string;
  timestamp: number;
  filtersHash: string;
  sortersHash: string;
}

/**
 * Selection Manager (Singleton)
 */
class SelectionManager {
  private readonly storageKey = 'scan_records_selection_v2';
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save selection state to localStorage
   */
  save(selectedIds: Set<string>, sessionId: string): void {
    try {
      const state: SelectionState = {
        selectedIds: Array.from(selectedIds),
        sessionId,
        timestamp: Date.now(),
        filtersHash: sessionId.split('__')[0] || '',
        sortersHash: sessionId.split('__')[1] || '',
      };

      localStorage.setItem(this.storageKey, JSON.stringify(state));
      console.log(`💾 [SelectionManager] Saved ${selectedIds.size} selected IDs`);
    } catch (error) {
      console.warn('⚠️ [SelectionManager] Failed to save selection:', error);
      // localStorage might be full or disabled
    }
  }

  /**
   * Load selection state from localStorage
   * Returns null if session doesn't match or expired
   */
  load(currentSessionId: string): Set<string> | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return null;
      }

      const state: SelectionState = JSON.parse(stored);

      // Validate session ID (filters/sorters must match)
      if (state.sessionId !== currentSessionId) {
        console.log(`🔄 [SelectionManager] Session mismatch, clearing selection`);
        this.clear();
        return null;
      }

      // Check expiration (24 hours)
      const age = Date.now() - state.timestamp;
      if (age > this.maxAge) {
        console.log(`⏰ [SelectionManager] Selection expired (${(age / 1000 / 60 / 60).toFixed(1)}h old)`);
        this.clear();
        return null;
      }

      console.log(`✅ [SelectionManager] Loaded ${state.selectedIds.length} selected IDs`);
      return new Set(state.selectedIds);
    } catch (error) {
      console.warn('⚠️ [SelectionManager] Failed to load selection:', error);
      this.clear();
      return null;
    }
  }

  /**
   * Clear selection state
   */
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
      console.log(`🗑️ [SelectionManager] Cleared selection`);
    } catch (error) {
      console.warn('⚠️ [SelectionManager] Failed to clear selection:', error);
    }
  }

  /**
   * Check if selection exists for current session
   */
  has(currentSessionId: string): boolean {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return false;

      const state: SelectionState = JSON.parse(stored);
      return state.sessionId === currentSessionId && (Date.now() - state.timestamp) <= this.maxAge;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const selectionManager = new SelectionManager();
