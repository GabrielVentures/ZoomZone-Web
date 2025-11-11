/**
 * Select All Pages Manager
 *
 * Handles intelligent "Select All Pages" functionality with different strategies
 * based on dataset size, following Gmail pattern best practices.
 *
 * Strategies:
 * - Small datasets (< 500): Progressive load all IDs immediately
 * - Medium datasets (500-2000): Progressive load with progress indicator
 * - Large datasets (2000-10000): Smart hybrid mode with warnings
 * - Very large datasets (> 10000): Block feature, require filters
 */

import { CrudFilter } from '@refinedev/core';
import { message, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

/**
 * Dataset size thresholds
 */
export const DATASET_THRESHOLDS = {
  SMALL: 500,
  MEDIUM: 2000,
  LARGE: 10000,
};

/**
 * Strategy types
 */
export type SelectAllStrategy = 'progressive-load' | 'hybrid-auto-select' | 'blocked';

/**
 * Progress callback
 */
export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * Select All Pages Manager
 */
class SelectAllPagesManager {
  private abortController: AbortController | null = null;
  private isLoading = false;

  /**
   * Determine strategy based on dataset size
   */
  getStrategy(totalRecords: number): SelectAllStrategy {
    if (totalRecords <= DATASET_THRESHOLDS.MEDIUM) {
      return 'progressive-load';
    } else if (totalRecords <= DATASET_THRESHOLDS.LARGE) {
      return 'hybrid-auto-select';
    } else {
      return 'blocked';
    }
  }

  /**
   * Check if operation is in progress
   */
  isLoadingInProgress(): boolean {
    return this.isLoading;
  }

  /**
   * Load all record IDs progressively
   *
   * @param totalRecords - Total number of records
   * @param pageSize - Page size
   * @param filters - Current filters
   * @param sorters - Current sorters
   * @param dataFetcher - Function to fetch a page of data (returns array of records with 'id')
   * @param onProgress - Progress callback
   * @returns Promise<Set<string>> - Set of all record IDs
   */
  async loadAllRecordIds(
    totalRecords: number,
    pageSize: number,
    _filters: CrudFilter[],
    _sorters: Array<{ field: string; order: 'asc' | 'desc' }>,
    dataFetcher: (page: number) => Promise<any[]>,
    onProgress?: ProgressCallback
  ): Promise<Set<string>> {
    // Create new abort controller
    this.abortController = new AbortController();
    this.isLoading = true;

    try {
      const strategy = this.getStrategy(totalRecords);

      // Check if blocked
      if (strategy === 'blocked') {
        throw new Error(`Dataset too large (${totalRecords} records). Please apply filters to narrow down results.`);
      }

      // Calculate total pages
      const totalPages = Math.ceil(totalRecords / pageSize);
      const allIds = new Set<string>();

      console.log(`🔄 [SelectAllPages] Loading ${totalRecords} IDs across ${totalPages} pages...`);

      // Show progress for medium datasets
      let hideLoading: (() => void) | null = null;
      if (totalRecords > DATASET_THRESHOLDS.SMALL) {
        hideLoading = message.loading(
          `Loading all records: 0/${totalRecords}`,
          0
        );
      }

      // Load all pages
      for (let page = 1; page <= totalPages; page++) {
        // Check if aborted
        if (this.abortController.signal.aborted) {
          console.log('🛑 [SelectAllPages] Operation cancelled');
          throw new Error('Operation cancelled by user');
        }

        try {
          // Fetch page data
          const records = await dataFetcher(page);

          // Extract IDs
          records.forEach(record => {
            if (record.id) {
              allIds.add(record.id);
            }
          });

          // Update progress
          const loadedCount = allIds.size;
          if (onProgress) {
            onProgress(loadedCount, totalRecords);
          }

          // Update loading message
          if (hideLoading) {
            hideLoading();
            hideLoading = message.loading(
              `Loading all records: ${loadedCount}/${totalRecords} (${Math.round((loadedCount / totalRecords) * 100)}%)`,
              0
            );
          }

          console.log(`✅ [SelectAllPages] Loaded page ${page}/${totalPages} (${loadedCount}/${totalRecords} IDs)`);

        } catch (error: any) {
          console.error(`❌ [SelectAllPages] Failed to load page ${page}:`, error);

          // If it's a network error, throw it to trigger retry logic
          if (error.code === 'unavailable' || error.message?.includes('network')) {
            throw error;
          }

          // For other errors, continue to next page
          continue;
        }
      }

      // Hide loading message
      if (hideLoading) {
        hideLoading();
      }

      console.log(`✅ [SelectAllPages] Successfully loaded ${allIds.size} IDs`);

      return allIds;

    } catch (error: any) {
      console.error('❌ [SelectAllPages] Load failed:', error);
      throw error;
    } finally {
      this.isLoading = false;
      this.abortController = null;
    }
  }

  /**
   * Cancel ongoing load operation
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isLoading = false;
      console.log('🛑 [SelectAllPages] Cancelled by user');
    }
  }

  /**
   * Show confirmation dialog before activating "select all pages"
   *
   * @param totalRecords - Total number of records
   * @param onConfirm - Callback when user confirms
   * @param onCancel - Callback when user cancels
   */
  showConfirmDialog(
    totalRecords: number,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    const strategy = this.getStrategy(totalRecords);

    if (strategy === 'blocked') {
      // Show error for very large datasets
      Modal.error({
        title: 'Dataset Too Large',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              Cannot select all <strong>{totalRecords.toLocaleString()} records</strong> at once.
              This would consume too much memory and may crash your browser.
            </p>
            <p style={{ marginTop: 12, color: '#8c8c8c' }}>
              <strong>Recommendation:</strong> Apply filters to narrow down the results to fewer than 10,000 records.
            </p>
          </div>
        ),
        okText: 'Got it',
        onOk: onCancel,
      });
      return;
    }

    if (strategy === 'hybrid-auto-select') {
      // Show warning for large datasets
      Modal.confirm({
        title: 'Select All Records?',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: (
          <div>
            <p>
              You are about to select <strong>{totalRecords.toLocaleString()} records</strong>.
            </p>
            <p style={{ marginTop: 12, color: '#d46b08' }}>
              ⚠️ <strong>Warning:</strong> This is a large dataset. Items will be selected as you navigate to each page.
            </p>
            <p style={{ marginTop: 12, color: '#8c8c8c', fontSize: 13 }}>
              Note: Only pages you visit will be included in bulk operations (export/delete).
              For better performance, consider applying filters to narrow down results.
            </p>
          </div>
        ),
        okText: `Select All ${totalRecords.toLocaleString()} Records`,
        okButtonProps: { danger: true },
        cancelText: 'Cancel',
        onOk: onConfirm,
        onCancel,
      });
      return;
    }

    // For small/medium datasets, show simple confirmation
    const willLoadImmediately = totalRecords <= DATASET_THRESHOLDS.SMALL;

    Modal.confirm({
      title: 'Select All Records?',
      icon: <ExclamationCircleOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <p>
            You are about to select <strong>all {totalRecords.toLocaleString()} records</strong> across all pages.
          </p>
          {!willLoadImmediately && (
            <p style={{ marginTop: 12, color: '#8c8c8c', fontSize: 13 }}>
              This will load all records in the background (may take a few seconds).
              You can cancel the operation at any time.
            </p>
          )}
        </div>
      ),
      okText: `Select All ${totalRecords.toLocaleString()} Records`,
      cancelText: 'Cancel',
      onOk: onConfirm,
      onCancel,
    });
  }

  /**
   * Auto-select current page items when in hybrid mode
   * Called when user navigates to a new page in "all pages" mode
   *
   * @param currentPageData - Current page data
   * @param existingSelection - Existing selected IDs
   * @returns Updated selection set
   */
  autoSelectPageItems(
    currentPageData: Array<{ id: string }>,
    existingSelection: Set<string>
  ): Set<string> {
    const updatedSelection = new Set(existingSelection);

    currentPageData.forEach(record => {
      if (record.id) {
        updatedSelection.add(record.id);
      }
    });

    const newCount = updatedSelection.size - existingSelection.size;
    if (newCount > 0) {
      console.log(`✅ [SelectAllPages] Auto-selected ${newCount} items on current page`);
    }

    return updatedSelection;
  }

  /**
   * Handle manual deselection in "all pages" mode
   * Decides whether to exit "all pages" mode or keep it
   *
   * @param newSelection - New selection after user action
   * @param totalRecords - Total number of records
   * @returns Whether to keep "all pages" mode active
   */
  shouldKeepAllPagesMode(
    newSelection: Set<string>,
    totalRecords: number
  ): boolean {
    // Gmail behavior: Keep "all pages" mode even if user deselects some items
    // Only exit if selection is empty or very small

    if (newSelection.size === 0) {
      return false; // Exit mode if nothing selected
    }

    // Keep mode if selection is still substantial (> 50% of total)
    const selectionPercent = (newSelection.size / totalRecords) * 100;
    if (selectionPercent > 50) {
      return true;
    }

    // Exit mode if selection dropped below 50%
    return false;
  }
}

// Singleton instance
export const selectAllPagesManager = new SelectAllPagesManager();
