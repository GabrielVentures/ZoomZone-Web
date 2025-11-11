/**
 * Cursor Manager for Firestore Cursor-Based Pagination
 *
 * Manages Firestore document cursors for efficient pagination.
 * Supports multiple query sessions with automatic cleanup.
 */

import { QueryDocumentSnapshot } from 'firebase/firestore';
import { CrudFilter } from '@refinedev/core';

/**
 * Single page cursor information
 */
export interface PageCursor {
  pageNumber: number;
  pageSize: number;
  startCursor: QueryDocumentSnapshot | undefined; // Cursor to start from (last doc of previous page)
  endCursor: QueryDocumentSnapshot | undefined;   // Last document of this page
  hasNextPage: boolean;
  recordCount: number; // Actual number of records returned
}

/**
 * Query session (unique filter + sorter combination)
 */
export interface QuerySession {
  sessionId: string;
  filters: CrudFilter[];
  sorters: Array<{ field: string; order: 'asc' | 'desc' }>;
  createdAt: number;
  lastAccessedAt: number;

  // Cursor cache: key = pageNumber, value = PageCursor
  cursors: Map<number, PageCursor>;

  // Total estimation based on farthest page visited
  estimatedTotal: number | null;
  maxPageVisited: number;
}

/**
 * Session statistics
 */
export interface SessionStats {
  totalCachedPages: number;
  maxPageVisited: number;
  estimatedTotal: number | null;
}

/**
 * Global cursor manager statistics
 */
export interface GlobalStats {
  totalSessions: number;
  totalCursors: number;
}

/**
 * Cursor Manager (Singleton)
 *
 * Manages pagination cursors across multiple query sessions.
 * Each session is identified by unique filter + sorter combination.
 */
class CursorManager {
  private sessions: Map<string, QuerySession> = new Map();
  private readonly maxSessions = 20;          // Max 20 query sessions
  private readonly maxPagesPerSession = 100;  // Max 100 pages per session

  /**
   * Generate session ID based on filters and sorters
   */
  generateSessionId(
    filters?: CrudFilter[],
    sorters?: Array<{ field: string; order: 'asc' | 'desc' }>
  ): string {
    const filtersStr = JSON.stringify(filters || []);
    const sortersStr = JSON.stringify(sorters || []);
    return `${filtersStr}__${sortersStr}`;
  }

  /**
   * Get or create query session
   */
  getOrCreateSession(
    filters?: CrudFilter[],
    sorters?: Array<{ field: string; order: 'asc' | 'desc' }>
  ): QuerySession {
    const sessionId = this.generateSessionId(filters, sorters);

    let session = this.sessions.get(sessionId);

    if (!session) {
      // Check cache size limit
      if (this.sessions.size >= this.maxSessions) {
        // Remove oldest session
        const oldestSessionId = this.findOldestSession();
        if (oldestSessionId) {
          this.sessions.delete(oldestSessionId);
          console.log(`🗑️ [CursorManager] Removed oldest session: ${oldestSessionId.substring(0, 30)}...`);
        }
      }

      session = {
        sessionId,
        filters: filters || [],
        sorters: sorters || [],
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        cursors: new Map(),
        estimatedTotal: null,
        maxPageVisited: 0,
      };

      this.sessions.set(sessionId, session);
      console.log(`✨ [CursorManager] Created new session: ${sessionId.substring(0, 30)}...`);
    } else {
      session.lastAccessedAt = Date.now();
    }

    return session;
  }

  /**
   * Get cursor for specific page
   */
  getCursor(sessionId: string, pageNumber: number): PageCursor | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [CursorManager] Session not found: ${sessionId.substring(0, 30)}...`);
      return null;
    }

    return session.cursors.get(pageNumber) || null;
  }

  /**
   * Save page cursor
   */
  saveCursor(sessionId: string, cursor: PageCursor): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ [CursorManager] Cannot save cursor: session not found`);
      return;
    }

    // Limit pages per session
    if (session.cursors.size >= this.maxPagesPerSession) {
      // Remove oldest page (assuming user won't go back that far)
      const oldestPage = Math.min(...session.cursors.keys());
      session.cursors.delete(oldestPage);
      console.log(`🗑️ [CursorManager] Removed oldest page ${oldestPage} from session`);
    }

    session.cursors.set(cursor.pageNumber, cursor);
    session.maxPageVisited = Math.max(session.maxPageVisited, cursor.pageNumber);

    // Update total estimation
    if (cursor.recordCount < cursor.pageSize && !cursor.hasNextPage) {
      // This is the last page - calculate accurate total
      session.estimatedTotal = (cursor.pageNumber - 1) * cursor.pageSize + cursor.recordCount;
      console.log(`📊 [CursorManager] Accurate total calculated: ${session.estimatedTotal}`);
    }

    console.log(`💾 [CursorManager] Saved cursor for page ${cursor.pageNumber} (${cursor.recordCount} records, hasNext: ${cursor.hasNextPage})`);
  }

  /**
   * Clear specific session
   */
  clearSession(sessionId: string): void {
    const deleted = this.sessions.delete(sessionId);
    if (deleted) {
      console.log(`🗑️ [CursorManager] Cleared session: ${sessionId.substring(0, 30)}...`);
    }
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    console.log(`🗑️ [CursorManager] Cleared all ${count} sessions`);
  }

  /**
   * Find oldest session (by last accessed time)
   */
  private findOldestSession(): string | null {
    let oldestTime = Infinity;
    let oldestId: string | null = null;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastAccessedAt < oldestTime) {
        oldestTime = session.lastAccessedAt;
        oldestId = id;
      }
    }

    return oldestId;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): SessionStats | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      totalCachedPages: session.cursors.size,
      maxPageVisited: session.maxPageVisited,
      estimatedTotal: session.estimatedTotal,
    };
  }

  /**
   * Get global statistics
   */
  getStats(): GlobalStats {
    let totalCursors = 0;
    for (const session of this.sessions.values()) {
      totalCursors += session.cursors.size;
    }

    return {
      totalSessions: this.sessions.size,
      totalCursors,
    };
  }

  /**
   * Find nearest cached page before target page
   */
  findNearestCachedPage(sessionId: string, targetPage: number): number | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const cachedPages = Array.from(session.cursors.keys()).sort((a, b) => b - a);

    for (const page of cachedPages) {
      if (page < targetPage) {
        return page;
      }
    }

    return null;
  }

  /**
   * Cleanup old sessions (keep N most recent)
   */
  cleanupOldSessions(keepCount: number = 5): void {
    if (this.sessions.size <= keepCount) return;

    // Sort sessions by last accessed time (descending)
    const sorted = Array.from(this.sessions.entries())
      .sort((a, b) => b[1].lastAccessedAt - a[1].lastAccessedAt);

    // Remove old sessions
    const toRemove = sorted.slice(keepCount);
    for (const [id] of toRemove) {
      this.sessions.delete(id);
    }

    console.log(`🗑️ [CursorManager] Cleaned up ${toRemove.length} old sessions, kept ${keepCount}`);
  }
}

// Singleton instance
export const cursorManager = new CursorManager();
