/**
 * Scan Records List Page - Phase 4.2 Task F.5
 * List view of all scan records with filters and search
 */

import { useList, useNavigation, useDelete, useDataProvider } from '@refinedev/core';
import { Table, Tag, Image, Space, Typography, Input, Select, Card, Button, Modal, message, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { ScanRecord } from '@/types';
import { useState, useEffect, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
// import { DateRangeFilter, type DateRange, isDateInRange } from '@/components/common/DateRangeFilter';
import { logBatchScanRecordDelete, logScanRecordExport } from '@/utils/auditLogger';
import { cursorManager } from '@/utils/cursorManager';
import { selectionManager } from '@/utils/selectionManager';
import { selectAllPagesManager, SelectAllStrategy } from '@/utils/selectAllPagesManager';

dayjs.extend(relativeTime);

const { Title } = Typography;

export const ScanRecordList = () => {
  const { show } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const dataProvider = useDataProvider();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const previousSessionIdRef = useRef<string | null>(null);

  // Gmail-style "Select All" state
  const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);
  const [selectAllStrategy, setSelectAllStrategy] = useState<SelectAllStrategy | null>(null);
  const [isLoadingAllIds, setIsLoadingAllIds] = useState(false);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      // Reset to page 1 when search changes
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Build filters for useList
  const filters = useMemo(() => [
    ...(debouncedSearchText ? [{ field: 'q', operator: 'contains' as const, value: debouncedSearchText }] : []),
    ...(statusFilter ? [{ field: 'aiStatus', operator: 'eq' as const, value: statusFilter }] : []),
  ], [debouncedSearchText, statusFilter]);

  const sorters = useMemo(() => [
    {
      field: 'timestamp',
      order: 'desc' as const,
    },
  ], []);

  const { data, isLoading, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: currentPage,
      pageSize: pageSize,
    },
    sorters,
    filters,
  });

  // Generate current session ID
  const currentSessionId = useMemo(() => {
    return cursorManager.generateSessionId(filters, sorters);
  }, [filters, sorters]);

  // Session change detection and selection management
  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;

    if (previousSessionId && previousSessionId !== currentSessionId) {
      // Session changed (filters or sorters changed)
      console.log(`🔄 [ScanRecordList] Session changed, clearing cursors and selections`);

      // Clear old session cursors
      cursorManager.clearSession(previousSessionId);

      // Clear selections (they're no longer valid for new filter/sort)
      selectionManager.clear();
      setSelectedRowKeys(new Set());
      setIsAllPagesSelected(false); // Reset all-pages mode
      setSelectAllStrategy(null);

      // Cancel any ongoing loading
      if (isLoadingAllIds) {
        selectAllPagesManager.cancel();
        setIsLoadingAllIds(false);
      }

      // Reset to page 1
      setCurrentPage(1);
    } else if (!previousSessionId) {
      // Initial load - try to restore selection from selectionManager
      const savedSelection = selectionManager.load(currentSessionId);
      if (savedSelection && savedSelection.size > 0) {
        console.log(`✅ [ScanRecordList] Restored ${savedSelection.size} selections from storage`);
        setSelectedRowKeys(new Set(savedSelection));
      }
    }

    previousSessionIdRef.current = currentSessionId;
  }, [currentSessionId, isLoadingAllIds]);

  // Save selections to selectionManager whenever they change
  useEffect(() => {
    if (selectedRowKeys.size > 0) {
      selectionManager.save(selectedRowKeys, currentSessionId);
    } else {
      selectionManager.clear();
      setIsAllPagesSelected(false); // Reset all-pages selection when clearing
      setSelectAllStrategy(null);
    }
  }, [selectedRowKeys, currentSessionId]);

  // Solution B: Auto-select items when page changes in hybrid mode
  useEffect(() => {
    if (!isAllPagesSelected || selectAllStrategy !== 'hybrid-auto-select') {
      return;
    }

    if (!data?.data || data.data.length === 0) {
      return;
    }

    // Auto-select current page items
    console.log(`🔄 [Hybrid Mode] Auto-selecting items on page ${currentPage}...`);

    const updatedSelection = selectAllPagesManager.autoSelectPageItems(
      data.data,
      selectedRowKeys
    );

    if (updatedSelection.size !== selectedRowKeys.size) {
      setSelectedRowKeys(updatedSelection);
      console.log(`✅ [Hybrid Mode] Selected ${updatedSelection.size - selectedRowKeys.size} new items`);
    }
  }, [data, currentPage, isAllPagesSelected, selectAllStrategy]);

  // Calculate selection statistics (Gmail-style)
  const selectionStats = useMemo(() => {
    const totalRecords = data?.total || 0;
    const currentPageData = data?.data || [];
    const selectedCount = selectedRowKeys.size;

    // Count how many items on current page are selected
    const selectedOnCurrentPage = currentPageData.filter(record =>
      selectedRowKeys.has(record.id)
    ).length;

    const selectedOnOtherPages = selectedCount - selectedOnCurrentPage;

    // Check if all current page items are selected
    const isCurrentPageFullySelected =
      currentPageData.length > 0 &&
      selectedOnCurrentPage === currentPageData.length;

    // Check if all items across all pages are selected
    const isAllItemsSelected = selectedCount === totalRecords && totalRecords > 0;

    return {
      selectedCount,
      selectedOnCurrentPage,
      selectedOnOtherPages,
      isCurrentPageFullySelected,
      isAllItemsSelected,
      totalRecords,
      currentPageSize: currentPageData.length,
    };
  }, [selectedRowKeys, data]);

  // Data fetcher function for selectAllPagesManager
  // Fetches data for a specific page and returns records
  const fetchPageData = async (page: number): Promise<ScanRecord[]> => {
    try {
      console.log(`📄 [SelectAll] Fetching page ${page}...`);

      // Use data provider to fetch the page
      const result = await dataProvider().getList<ScanRecord>({
        resource: 'scan_records',
        pagination: {
          current: page,
          pageSize: pageSize,
        },
        sorters,
        filters,
      });

      return result?.data || [];
    } catch (error) {
      console.error(`❌ [SelectAll] Failed to fetch page ${page}:`, error);
      throw error;
    }
  };

  // Handle "Select All Pages" - Intelligent strategy based on dataset size
  const handleSelectAllPages = async () => {
    if (isAllPagesSelected) {
      // User wants to deselect all
      setSelectedRowKeys(new Set());
      setIsAllPagesSelected(false);
      setSelectAllStrategy(null);
      message.info('Selection cleared');
      console.log('🔄 [Gmail Mode] Cleared all-pages selection');
      return;
    }

    const totalRecords = selectionStats.totalRecords;
    const strategy = selectAllPagesManager.getStrategy(totalRecords);

    console.log(`🎯 [SelectAll] Strategy for ${totalRecords} records: ${strategy}`);

    // Show confirmation dialog
    selectAllPagesManager.showConfirmDialog(
      totalRecords,
      async () => {
        // User confirmed - proceed with selection
        setIsAllPagesSelected(true);
        setSelectAllStrategy(strategy);

        if (strategy === 'progressive-load') {
          // Strategy A: Load all IDs progressively
          console.log('🚀 [SelectAll] Starting progressive load...');
          setIsLoadingAllIds(true);

          try {
            const allIds = await selectAllPagesManager.loadAllRecordIds(
              totalRecords,
              pageSize,
              filters,
              sorters,
              fetchPageData,
              (loaded, total) => {
                console.log(`📊 Progress: ${loaded}/${total}`);
              }
            );

            console.log(`✅ [SelectAll] Loaded ${allIds.size} IDs`);
            setSelectedRowKeys(allIds);
            message.success(`All ${allIds.size} records selected`);
          } catch (error: any) {
            console.error('❌ [SelectAll] Failed:', error);

            // Reset state on error
            setIsAllPagesSelected(false);
            setSelectAllStrategy(null);

            if (error.message !== 'Operation cancelled by user') {
              message.error(error.message || 'Failed to load all records. Please try again.');
            } else {
              message.info('Operation cancelled');
            }
          } finally {
            setIsLoadingAllIds(false);
          }
        } else if (strategy === 'hybrid-auto-select') {
          // Strategy B: Auto-select items as user navigates
          // Start with current page selected
          const currentPageIds = (data?.data || []).map(r => r.id);
          setSelectedRowKeys(new Set(currentPageIds));

          message.info(
            `All ${totalRecords} records marked for selection. Items will be selected as you navigate pages.`,
            5
          );
          console.log('✅ [SelectAll] Hybrid mode activated');
        }
      },
      () => {
        // User cancelled
        console.log('🛑 [SelectAll] User cancelled');
      }
    );
  };

  const getAIStatusTag = (record: ScanRecord) => {
    if (record.aiProcessed && record.aiResult) {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success">
          Completed
        </Tag>
      );
    } else if (record.aiError) {
      return (
        <Tag icon={<CloseCircleOutlined />} color="error">
          Failed
        </Tag>
      );
    } else {
      return (
        <Tag icon={<ClockCircleOutlined />} color="warning">
          Pending
        </Tag>
      );
    }
  };

  // Get selected records from current page
  /**
   * Get selected records - fetches from Firestore for cross-page selections
   */
  const getSelectedRecords = async (): Promise<ScanRecord[]> => {
    if (selectedRowKeys.size === 0) return [];

    // For single-page selections (all selected items are on current page)
    const currentPageIds = new Set((data?.data || []).map(r => r.id));
    const allOnCurrentPage = Array.from(selectedRowKeys).every(id => currentPageIds.has(id));

    if (allOnCurrentPage && data?.data) {
      // Fast path: all selected items are on current page
      return data.data.filter(record => selectedRowKeys.has(record.id));
    }

    // Cross-page selection: fetch from Firestore using getMany
    try {
      console.log(`🔄 [Export] Fetching ${selectedRowKeys.size} records from Firestore...`);
      const selectedIds = Array.from(selectedRowKeys);

      const provider = dataProvider();
      if (!provider) {
        console.error('❌ [Export] Data provider not available');
        message.error('Data provider not available');
        return [];
      }

      const result = await provider.getMany!({
        resource: 'scan_records',
        ids: selectedIds,
      });

      console.log(`✅ [Export] Fetched ${result.data.length} records`);
      return result.data as ScanRecord[];
    } catch (error) {
      console.error('❌ [Export] Failed to fetch records:', error);
      message.error('Failed to fetch selected records');
      return [];
    }
  };

  // Batch Export CSV - export only selected records
  const handleBatchExportCSV = async () => {
    if (selectedRowKeys.size === 0) {
      message.warning('Please select records to export');
      return;
    }

    // Show loading indicator
    const hideLoading = message.loading('Preparing export...', 0);

    try {
      // If "all pages" is selected, show special warning
      if (isAllPagesSelected) {
        hideLoading();
        Modal.confirm({
          title: 'Export All Records?',
          icon: <ExclamationCircleOutlined style={{ color: '#1890ff' }} />,
          content: (
            <div>
              <p>You are about to export <strong>{selectedRowKeys.size} records</strong> across multiple pages.</p>
              <p style={{ color: '#8c8c8c', marginTop: 8, fontSize: 13 }}>
                Note: {selectAllStrategy === 'hybrid-auto-select'
                  ? 'Only records from visited pages will be exported. Navigate to more pages to include them.'
                  : 'All selected records will be fetched and exported.'}
              </p>
            </div>
          ),
          okText: 'Export Selected',
          cancelText: 'Cancel',
          onOk: async () => {
            const loadingMsg = message.loading('Fetching records...', 0);
            const selectedRecords = await getSelectedRecords();
            loadingMsg();

            if (selectedRecords.length === 0) {
              message.warning('No records to export');
              return;
            }

            exportRecordsToCSV(selectedRecords);
            message.success(`Exported ${selectedRecords.length} records to CSV`);

            // Log audit trail
            logScanRecordExport(selectedRecords.length, {
              selected_records: true,
              all_pages_mode: true,
              search_filter: searchText || undefined,
              status_filter: statusFilter || undefined,
            }).catch((err) => {
              console.warn('⚠️ [ScanRecords] Failed to log CSV export:', err);
            });
          },
        });
        return;
      }

      // Normal export - fetch selected records
      const selectedRecords = await getSelectedRecords();
      hideLoading();

      if (selectedRecords.length === 0) {
        message.warning('No records to export');
        return;
      }

      exportRecordsToCSV(selectedRecords);
      message.success(`Exported ${selectedRecords.length} records to CSV`);

      // Log audit trail
      logScanRecordExport(selectedRecords.length, {
        selected_records: true,
        search_filter: searchText || undefined,
        status_filter: statusFilter || undefined,
      }).catch((err) => {
        console.warn('⚠️ [ScanRecords] Failed to log CSV export:', err);
      });
    } catch (error) {
      hideLoading();
      console.error('❌ [Export] Export failed:', error);
      message.error('Export failed. Please try again.');
    }
  };

  // Batch Delete with confirmation
  const handleBatchDelete = async () => {
    if (selectedRowKeys.size === 0) {
      message.warning('Please select records to delete');
      return;
    }

    // Enhanced confirmation for "all pages" mode
    const confirmTitle = isAllPagesSelected
      ? 'Delete All Selected Records?'
      : 'Delete Selected Records';

    const confirmContent = isAllPagesSelected ? (
      <div>
        <p>You have selected <strong>"All Pages"</strong> mode.</p>
        <p style={{ marginTop: 8 }}>
          This will delete <strong>{selectedRowKeys.size} selected record(s)</strong>{selectAllStrategy === 'hybrid-auto-select' ? ' (only visited pages)' : ''}.
        </p>
        <p style={{ color: '#ff4d4f', marginTop: 8, fontWeight: 600 }}>
          ⚠️ This action cannot be undone!
        </p>
        {selectAllStrategy === 'hybrid-auto-select' && (
          <p style={{ color: '#8c8c8c', marginTop: 8, fontSize: 13 }}>
            Note: Only items from visited pages ({selectedRowKeys.size} records) will be deleted.
            Navigate to more pages to include them in deletion.
          </p>
        )}
      </div>
    ) : (
      <div>
        <p>Are you sure you want to delete <strong>{selectedRowKeys.size}</strong> record(s)?</p>
        <p style={{ color: '#ff4d4f', marginTop: 8 }}>This action cannot be undone.</p>
      </div>
    );

    Modal.confirm({
      title: confirmTitle,
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: confirmContent,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        return new Promise<void>(async (resolve, reject) => {
          const hide = message.loading('Deleting records...', 0);

          try {
            // Delete all selected records sequentially to avoid multiple success messages
            let successCount = 0;
            let failCount = 0;

            for (const id of selectedRowKeys) {
              try {
                await new Promise<void>((resolveDelete) => {
                  deleteOne(
                    {
                      resource: 'scan_records',
                      id: id as string,
                      successNotification: false, // Disable individual notifications
                    },
                    {
                      onSuccess: () => {
                        successCount++;
                        resolveDelete();
                      },
                      onError: (error) => {
                        failCount++;
                        console.error(`Failed to delete record ${id}:`, error);
                        resolveDelete(); // Continue even if one fails
                      },
                    }
                  );
                });
              } catch (error) {
                failCount++;
                console.error(`Error deleting record ${id}:`, error);
              }
            }

            hide();

            // Show summary message
            if (failCount === 0) {
              message.success(`Successfully deleted ${successCount} record(s)`);
            } else if (successCount > 0) {
              message.warning(`Deleted ${successCount} record(s), ${failCount} failed`);
            } else {
              message.error('Failed to delete records. Please try again.');
              reject();
              return;
            }

            // Log audit trail for successful deletions (async, non-blocking)
            if (successCount > 0) {
              const deletedIds = Array.from(selectedRowKeys).slice(0, successCount);
              logBatchScanRecordDelete(deletedIds, successCount).catch((err) => {
                console.warn('⚠️ [ScanRecords] Failed to log batch deletion:', err);
              });
            }

            setSelectedRowKeys(new Set());
            setIsAllPagesSelected(false); // Reset all-pages mode
            setSelectAllStrategy(null);

            // Refetch data to show updates without page reload
            refetch();

            resolve();
          } catch (error) {
            hide();
            console.error('Delete error:', error);
            message.error('Failed to delete records. Please try again.');
            reject(error);
          }
        });
      },
    });
  };

  // Batch AI Retry - REMOVED (unused)

  // Clear selection - REMOVED (unused)

  // Helper function to export records to CSV (extracted for reuse)
  const exportRecordsToCSV = (records: ScanRecord[]) => {
    // CSV headers - Updated per user requirements
    // Removed: Brand, Promotion
    // Renamed: Price → Total Price
    const headers = [
      'SKU',
      'Product Title',
      'Username',
      'Unit Price',
      'Total Price',
      'Count',
      'Size',
      'Unit',
      'Category',
      'Label Date',
      'Store Location',
      'Date',
      'AI Cost (USD)',
      'Model',
      'Image URL',
      'Record ID'
    ];
    const csvRows = [headers.join(',')];

    // CSV data rows
    records.forEach((record) => {
      // Prefer Upload Date (server timestamp) over Device Date
      const dateValue = record.uploadTimestamp
        ? dayjs(record.uploadTimestamp).format('YYYY-MM-DD HH:mm:ss')
        : dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss');

      // Extract SKU (shelf tag ID)
      const sku = record.barcode_shelf_tag ||
                  record.aiResult?.barcode_shelf_tag ||
                  record.barcode?.slice(-6) ||  // Fallback: last 6 digits of legacy barcode
                  '';

      // Filter out "Unknown" store locations
      const storeLocation = record.storeLocation &&
                            record.storeLocation.toLowerCase() !== 'unknown' &&
                            record.storeLocation.toLowerCase() !== 'unknown store'
                            ? record.storeLocation : '';

      const row = [
        sku,                                              // SKU (1st priority)
        record.aiResult?.title || '',                     // Product Title
        record.username || '',                            // Username
        record.aiResult?.unit_price || '',                // Unit Price (fixed: unit_price not unitPrice)
        record.aiResult?.price || '',                     // Total Price
        record.aiResult?.count !== undefined ? String(record.aiResult.count) : '',  // Count (calculated)
        record.aiResult?.size || '',                      // Size
        record.aiResult?.unit || '',                      // Unit
        record.aiResult?.category || '',                  // Category
        record.aiResult?.label_date || '',                // Label Date
        storeLocation,                                    // Store Location
        dateValue,                                        // Date
        record.aiCost?.totalCostUsd ? record.aiCost.totalCostUsd.toFixed(4) : '', // AI Cost
        record.aiCost?.model || '',                       // Model
        record.imageUrl || '',                            // Image URL
        record.id || ''                                   // Record ID (last)
      ];

      // Escape commas and quotes in fields
      const escapedRow = row.map(field => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });

      csvRows.push(escapedRow.join(','));
    });

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const recordCount = records.length === data?.data?.length ? '' : `-${records.length}records`;
    const filename = `scan-records-${dayjs().format('YYYY-MM-DD-HHmmss')}${recordCount}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV function - REMOVED (unused)

  // Apply date range filter to displayed data
  // NOTE: Client-side filtering is disabled to allow proper server-side pagination
  // Date range filtering should be moved to server-side filters in useList
  const filteredData = data?.data || [];

  const columns: ColumnsType<ScanRecord> = [
    {
      title: 'Image',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 100,
      fixed: 'left',
      onCell: () => ({
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
        },
      }),
      render: (url: string) => (
        <div
          style={{ padding: '8px 0', cursor: 'zoom-in' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={url}
            alt="Scan"
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 8 }}
            preview={{
              mask: <div style={{ fontSize: 12 }}>🔍 Click to zoom</div>,
            }}
          />
        </div>
      ),
    },
    {
      title: 'Store',
      dataIndex: 'storeLocation',
      key: 'storeLocation',
      width: 140,
      render: (storeLocation: string | undefined) => {
        // Only show storeLocation, ignore merchant field entirely
        // Filter out "Unknown" values
        const location = storeLocation &&
                         storeLocation.toLowerCase() !== 'unknown' &&
                         storeLocation.toLowerCase() !== 'unknown store'
                         ? storeLocation : '';

        // If empty, show a dash
        if (!location) {
          return <div style={{ color: '#8c8c8c' }}>—</div>;
        }

        // Display storeLocation in normal black text (not gray)
        return (
          <div style={{ fontWeight: 500, fontSize: 13, color: '#000000' }}>
            {location.length > 25 ? location.substring(0, 25) + '...' : location}
          </div>
        );
      },
    },
    {
      title: 'SKU',
      dataIndex: 'barcode_shelf_tag',
      key: 'barcode_shelf_tag',
      width: 130,
      responsive: ['md'] as any,
      render: (shelfTagId: string, record: ScanRecord) => {
        // Priority: barcode_shelf_tag > AI result > legacy barcode
        const displayId = shelfTagId ||
                          record.aiResult?.barcode_shelf_tag ||
                          record.barcode?.slice(-6) ||  // Fallback: last 6 digits
                          '';

        return (
          <Typography.Text code style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>
            {displayId || 'N/A'}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Product Info',
      key: 'productInfo',
      width: 280,
      render: (_, record) => {
        const hasAI = record.aiResult;

        if (!hasAI) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getAIStatusTag(record)}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Waiting for AI processing...
              </Typography.Text>
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Product Name with label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500, minWidth: 48 }}>
                Product:
              </span>
              <div style={{
                fontWeight: 600,
                color: '#722ed1',
                fontSize: 13,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {record.aiResult?.title || '—'}
              </div>
              {getAIStatusTag(record)}
            </div>

            {/* Price Row - Updated per user requirements */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {record.aiResult?.price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Total:</span>
                  <span style={{ fontWeight: 700, color: '#52c41a', fontSize: 14 }}>
                    {record.aiResult.price}
                  </span>
                </div>
              )}
              {record.aiResult?.unit_price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Unit Price:</span>
                  <span style={{
                    fontSize: 11,
                    color: '#1890ff',
                    backgroundColor: '#e6f7ff',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontWeight: 600
                  }}>
                    {record.aiResult.unit_price}
                  </span>
                </div>
              )}
              {record.aiResult?.count !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Count:</span>
                  <span style={{ fontSize: 11, color: '#595959', fontWeight: 600 }}>
                    {record.aiResult.count}
                  </span>
                </div>
              )}
            </div>

            {/* Label Date Row */}
            {record.aiResult?.label_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Tag Date:</span>
                <span style={{ fontSize: 11, color: '#722ed1', fontWeight: 600 }}>
                  {record.aiResult.label_date}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      responsive: ['lg'] as any,
      render: (username: string) => (
        <div style={{ fontSize: 12 }}>{username}</div>
      ),
    },
    {
      title: 'Uploaded',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 110,
      responsive: ['md'] as any,
      render: (timestamp: Date) => (
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          {dayjs(timestamp).fromNow()}
        </div>
      ),
    },
  ];

  // Row selection configuration with improved UX
  const rowSelection = {
    selectedRowKeys: Array.from(selectedRowKeys),
    onChange: (newKeys: React.Key[]) => {
      const currentPageData = data?.data || [];

      // ✅ FIX: Properly merge cross-page selections
      // Ant Design Table's onChange only gives us current page's selections
      // We need to preserve selections from other pages

      // 1. Get all IDs on current page
      const currentPageIds = new Set(currentPageData.map(r => r.id));

      // 2. Preserve selections from other pages (items not on current page)
      const otherPagesSelection = Array.from(selectedRowKeys).filter(
        id => !currentPageIds.has(id)
      );

      // 3. Merge: other pages' selections + current page's new selections
      const mergedSelection = new Set([
        ...otherPagesSelection,
        ...newKeys.map(k => String(k))
      ]);

      console.log(`📊 [Selection] Current page: ${newKeys.length} selected, Other pages: ${otherPagesSelection.length}, Total: ${mergedSelection.size}`);

      // Check if user manually deselected items in "all pages" mode
      if (isAllPagesSelected && mergedSelection.size < selectedRowKeys.size) {
        // User manually deselected some items
        // Decide whether to keep "all pages" mode active
        const shouldKeepMode = selectAllPagesManager.shouldKeepAllPagesMode(
          mergedSelection,
          selectionStats.totalRecords
        );

        if (!shouldKeepMode) {
          console.log('🔄 [Selection] Exiting all-pages mode due to deselection');
          setIsAllPagesSelected(false);
          setSelectAllStrategy(null);
        }
      }

      setSelectedRowKeys(mergedSelection);
    },
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
    columnWidth: 60, // Wider checkbox column for easier clicking
    getCheckboxProps: (record: ScanRecord) => ({
      name: record.id,
    }),
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Scan Records</Title>

      <Card style={{ marginTop: 24 }}>
        {/* Toolbar with Filters and Export */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
          <Space wrap>
            {/* DateRangeFilter temporarily disabled - needs server-side implementation */}
            {/* <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              size="middle"
            /> */}

            <Input
              placeholder="Search barcode, merchant, username..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />

            <Select
              placeholder="Filter by AI Status"
              style={{ width: 200 }}
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Select.Option value="completed">✅ Completed</Select.Option>
              <Select.Option value="pending">⏳ Pending</Select.Option>
              <Select.Option value="failed">❌ Failed</Select.Option>
            </Select>
          </Space>

          {/* Refresh Button */}
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>
        </div>

        {/* Gmail-Style Selection Banner */}
        {selectedRowKeys.size > 0 && (
          <Alert
            message={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Row 1: Selection Status */}
                <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <Space direction="vertical" size={2}>
                    {/* Main selection message */}
                    <span>
                      {isAllPagesSelected ? (
                        <>
                          ✅ <strong>All {selectionStats.totalRecords} records</strong> are selected
                        </>
                      ) : selectionStats.isCurrentPageFullySelected && selectionStats.selectedOnOtherPages === 0 ? (
                        <>
                          <strong>{selectionStats.selectedCount} records</strong> on this page are selected
                        </>
                      ) : selectionStats.selectedOnOtherPages > 0 ? (
                        <>
                          <strong>{selectionStats.selectedCount} records</strong> selected
                          <span style={{ color: '#8c8c8c', marginLeft: 4 }}>
                            ({selectionStats.selectedOnCurrentPage} on this page, {selectionStats.selectedOnOtherPages} on other pages)
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>{selectionStats.selectedCount} records</strong> selected
                        </>
                      )}
                    </span>

                    {/* Gmail-style "Select All Pages" prompt */}
                    {!isAllPagesSelected &&
                     selectionStats.isCurrentPageFullySelected &&
                     selectionStats.totalRecords > selectionStats.currentPageSize && (
                      <Button
                        type="link"
                        size="small"
                        onClick={handleSelectAllPages}
                        style={{
                          padding: 0,
                          height: 'auto',
                          fontSize: 13,
                          fontWeight: 500
                        }}
                      >
                        Select all {selectionStats.totalRecords} records in Scan Records
                      </Button>
                    )}

                    {/* Deselect all link when in "all pages" mode */}
                    {isAllPagesSelected && (
                      <Button
                        type="link"
                        size="small"
                        onClick={handleSelectAllPages}
                        style={{
                          padding: 0,
                          height: 'auto',
                          fontSize: 13,
                          color: '#ff4d4f'
                        }}
                      >
                        Clear selection
                      </Button>
                    )}
                  </Space>

                  {/* Action Buttons */}
                  <Space>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={handleBatchExportCSV}
                    >
                      Export Selected
                    </Button>
                    <Button
                      size="small"
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        setSelectedRowKeys(new Set());
                        setIsAllPagesSelected(false);
                        setSelectAllStrategy(null);
                        message.info('Selection cleared');
                      }}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                    >
                      Delete
                    </Button>
                  </Space>
                </Space>

                {/* Warning when "all pages" is active */}
                {isAllPagesSelected && (
                  <div style={{
                    padding: '8px 12px',
                    background: '#fff7e6',
                    border: '1px solid #ffd591',
                    borderRadius: 4,
                    fontSize: 13,
                    color: '#d46b08'
                  }}>
                    ⚠️ <strong>Warning:</strong> Actions will affect <strong>all {selectionStats.totalRecords} records</strong> across all pages that match your current filters.
                  </div>
                )}
              </div>
            }
            type={isAllPagesSelected ? "warning" : "info"}
            style={{ marginBottom: 16 }}
            showIcon={false}
          />
        )}

        {/* Table with Enhanced Interaction */}
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          rowSelection={rowSelection}
          scroll={{ x: 800 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} records`,
            onChange: (page, newPageSize) => {
              if (newPageSize && newPageSize !== pageSize) {
                // Page size changed - need to handle carefully
                console.log(`📏 [ScanRecordList] PageSize changed: ${pageSize} → ${newPageSize}`);

                // Clear cursor cache for current session (page sizes don't match anymore)
                cursorManager.clearSession(currentSessionId);

                // Clear selections (different page size makes selections confusing)
                if (selectedRowKeys.size > 0) {
                  Modal.confirm({
                    title: 'Clear selections?',
                    content: `Changing page size will clear your ${selectedRowKeys.size} selected items. Continue?`,
                    onOk: () => {
                      selectionManager.clear();
                      setSelectedRowKeys(new Set());
                      setIsAllPagesSelected(false); // Reset all-pages mode
                      setSelectAllStrategy(null);
                      setPageSize(newPageSize);
                      setCurrentPage(1);
                    },
                    onCancel: () => {
                      // Do nothing, keep current pageSize
                    },
                  });
                } else {
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                }
              } else {
                // Normal page navigation
                setCurrentPage(page);
              }
            },
          }}
          locale={{
            emptyText: (
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                imageStyle={{ height: 160 }}
                description={
                  <Space direction="vertical" size={12} style={{ marginTop: 16 }}>
                    <Title level={4} style={{ marginBottom: 0 }}>
                      {searchText || statusFilter ? 'No matching records' : 'Welcome to ShelfTagSnap!'}
                    </Title>
                    <Typography.Text type="secondary">
                      {searchText || statusFilter
                        ? 'Try adjusting your filters to see more results'
                        : 'No scan records yet. Get started by:'}
                    </Typography.Text>
                    {!searchText && !statusFilter && (
                      <ol style={{ textAlign: 'left', margin: '16px auto', maxWidth: 400 }}>
                        <li>Download the ShelfTagSnap mobile app</li>
                        <li>Scan shelf tags in stores</li>
                        <li>AI will automatically recognize product information</li>
                      </ol>
                    )}
                  </Space>
                }
                style={{ padding: '60px 0' }}
              />
            ),
          }}
          rowClassName={(record) => {
            // Add custom class for selected rows
            return selectedRowKeys.has(record.id) ? 'row-selected' : '';
          }}
          onRow={(record) => ({
            onClick: (e) => {
              const target = e.target as HTMLElement;

              // Prevent navigation when clicking on:
              // 1. Checkbox
              // 2. Image column
              // 3. Any interactive elements (buttons, links, etc.)
              if (
                target.closest('.ant-checkbox-wrapper') ||
                target.closest('.ant-table-selection-column') ||
                target.closest('img') ||
                target.closest('.ant-image') ||
                target.closest('button') ||
                target.closest('a')
              ) {
                e.stopPropagation();
                return;
              }

              // Navigate to detail page
              show('scan_records', record.id);
            },
            onMouseEnter: (e) => {
              // Add hover effect to row
              const row = e.currentTarget;
              row.style.backgroundColor = '#f5f5f5';
            },
            onMouseLeave: (e) => {
              // Remove hover effect
              const row = e.currentTarget;
              if (!selectedRowKeys.has(record.id)) {
                row.style.backgroundColor = '';
              }
            },
            style: {
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            },
          })}
        />
      </Card>
    </div>
  );
};
