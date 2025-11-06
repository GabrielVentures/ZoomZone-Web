/**
 * Scan Records List Page - Phase 4.2 Task F.5
 * List view of all scan records with filters and search
 */

import { useList, useNavigation, useDelete } from '@refinedev/core';
import { Table, Tag, Image, Space, Typography, Input, Select, Card, Button, Modal, message, Alert, Progress, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { ScanRecord } from '@/types';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DateRangeFilter, type DateRange, isDateInRange } from '@/components/common/DateRangeFilter';
import { batchRetryAIProcessing, canRetry } from '@/utils/retryUtils';
import { logBatchScanRecordDelete, logScanRecordExport } from '@/utils/auditLogger';

dayjs.extend(relativeTime);

const { Title } = Typography;

// LocalStorage key for persisting selection
const SELECTION_STORAGE_KEY = 'scan_records_selection';

export const ScanRecordList = () => {
  const { show } = useNavigation();
  const { mutate: deleteOne } = useDelete();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Debounce search text
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Load selection from localStorage on mount
  useEffect(() => {
    const savedSelection = localStorage.getItem(SELECTION_STORAGE_KEY);
    if (savedSelection) {
      try {
        const parsed = JSON.parse(savedSelection);
        setSelectedRowKeys(parsed);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    if (selectedRowKeys.length > 0) {
      localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectedRowKeys));
    } else {
      localStorage.removeItem(SELECTION_STORAGE_KEY);
    }
  }, [selectedRowKeys]);

  const { data, isLoading, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 20,
    },
    sorters: [
      {
        field: 'timestamp',
        order: 'desc',
      },
    ],
    filters: [
      ...(debouncedSearchText ? [{ field: 'q', operator: 'contains' as const, value: debouncedSearchText }] : []),
      ...(statusFilter ? [{ field: 'aiStatus', operator: 'eq' as const, value: statusFilter }] : []),
    ],
  });

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

  // Get selected records
  const getSelectedRecords = () => {
    if (!data?.data) return [];
    return data.data.filter(record => selectedRowKeys.includes(record.id));
  };

  // Batch Export CSV - export only selected records
  const handleBatchExportCSV = () => {
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) {
      message.warning('Please select records to export');
      return;
    }

    // Use the same CSV generation logic
    exportRecordsToCSV(selectedRecords);
    message.success(`Exported ${selectedRecords.length} records to CSV`);

    // Log audit trail (async, non-blocking)
    logScanRecordExport(selectedRecords.length, {
      selected_records: true,
      search_filter: searchText || undefined,
      status_filter: statusFilter || undefined,
      date_range: dateRange ? {
        start: dateRange.startDate?.toISOString(),
        end: dateRange.endDate?.toISOString(),
      } : undefined,
    }).catch((err) => {
      console.warn('⚠️ [ScanRecords] Failed to log CSV export:', err);
    });
  };

  // Batch Delete with confirmation
  const handleBatchDelete = () => {
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) {
      message.warning('Please select records to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Selected Records',
      icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
      content: (
        <div>
          <p>Are you sure you want to delete <strong>{selectedRecords.length}</strong> record(s)?</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>This action cannot be undone.</p>
        </div>
      ),
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
              const deletedIds = selectedRowKeys.slice(0, successCount).map(key => String(key));
              logBatchScanRecordDelete(deletedIds, successCount).catch((err) => {
                console.warn('⚠️ [ScanRecords] Failed to log batch deletion:', err);
              });
            }

            setSelectedRowKeys([]);

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

  // Batch AI Retry - enhanced with actual retry logic
  const handleBatchRetry = () => {
    const selectedRecords = getSelectedRecords();

    // Filter only failed or pending records that can be retried
    const retryableRecords = selectedRecords.filter(record => canRetry(record));

    // Records that cannot be retried
    const nonRetryableCount = selectedRecords.length - retryableRecords.length;

    if (retryableRecords.length === 0) {
      message.warning('No retryable records selected. Records must have failed or be pending, and not exceed max retry attempts (3).');
      return;
    }

    Modal.confirm({
      title: 'Batch Retry AI Processing',
      icon: <ReloadOutlined style={{ color: '#1890ff' }} />,
      width: 520,
      content: (
        <div>
          <p>Retry AI processing for <strong>{retryableRecords.length}</strong> record(s)?</p>
          {nonRetryableCount > 0 && (
            <Alert
              message={`${nonRetryableCount} record(s) will be skipped`}
              description="Some selected records are already completed or have reached maximum retry attempts."
              type="warning"
              showIcon
              style={{ marginTop: 12, marginBottom: 12 }}
            />
          )}
          <p style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
            This will re-submit the images to GPT-4o for recognition.
          </p>
          <Alert
            message="Estimated cost"
            description={`Approximately $${(retryableRecords.length * 0.005).toFixed(4)} USD for ${retryableRecords.length} record(s)`}
            type="info"
            showIcon
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      okText: 'Start Batch Retry',
      cancelText: 'Cancel',
      onOk: async () => {
        // Show progress modal
        let progressModal: ReturnType<typeof Modal.info> | null = null;

        try {
          let processed = 0;
          let successCount = 0;
          let failCount = 0;

          // Create progress modal
          progressModal = Modal.info({
            title: 'Processing Batch Retry',
            icon: <LoadingOutlined style={{ color: '#1890ff' }} />,
            content: (
              <div>
                <Progress
                  percent={0}
                  status="active"
                  format={() => `${processed}/${retryableRecords.length}`}
                />
                <p style={{ marginTop: 16, color: '#8c8c8c' }}>
                  Please wait while we retry AI processing...
                </p>
              </div>
            ),
            okButtonProps: { disabled: true },
            closable: false,
            maskClosable: false,
          });

          // Process retries one by one with progress updates
          for (let i = 0; i < retryableRecords.length; i++) {
            const record = retryableRecords[i];
            const result = await batchRetryAIProcessing([record]);

            processed++;
            successCount += result.successCount;
            failCount += result.failCount;

            // Update progress
            const percent = Math.round((processed / retryableRecords.length) * 100);
            progressModal.update({
              content: (
                <div>
                  <Progress
                    percent={percent}
                    status="active"
                    format={() => `${processed}/${retryableRecords.length}`}
                  />
                  <p style={{ marginTop: 16, color: '#52c41a' }}>
                    ✅ Success: {successCount}
                  </p>
                  <p style={{ color: '#ff4d4f' }}>
                    ❌ Failed: {failCount}
                  </p>
                </div>
              ),
            });
          }

          // Close progress modal and show final result
          progressModal.destroy();

          Modal.success({
            title: 'Batch Retry Complete',
            content: (
              <div>
                <p><strong>Total processed:</strong> {retryableRecords.length}</p>
                <p style={{ color: '#52c41a' }}><strong>✅ Successful:</strong> {successCount}</p>
                <p style={{ color: '#ff4d4f' }}><strong>❌ Failed:</strong> {failCount}</p>
                <Alert
                  message="Results saved"
                  description="Please refresh the page to see updated records with retry results."
                  type="info"
                  style={{ marginTop: 12 }}
                />
              </div>
            ),
          });

          setSelectedRowKeys([]);

          // Suggest page refresh
          setTimeout(() => {
            Modal.confirm({
              title: 'Refresh Page?',
              content: 'Would you like to refresh the page to see the latest data?',
              okText: 'Refresh',
              cancelText: 'Later',
              onOk: () => window.location.reload(),
            });
          }, 2000);

        } catch (error) {
          if (progressModal) {
            progressModal.destroy();
          }
          message.error('Failed to process batch retry');
          console.error('Batch retry error:', error);
        }
      },
    });
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedRowKeys([]);
    message.info('Selection cleared');
  };

  // Helper function to export records to CSV (extracted for reuse)
  const exportRecordsToCSV = (records: ScanRecord[]) => {
    // CSV headers - optimized for essential data only
    const headers = [
      'Record ID',
      'Username',
      'Merchant',
      'Barcode',
      'Store Location',
      'Date',
      'Product Title',
      'Price',
      'Brand',
      'Size',
      'Promotion',
      'AI Cost (USD)',
      'Model',
      'Image URL'
    ];
    const csvRows = [headers.join(',')];

    // CSV data rows
    records.forEach((record) => {
      // Prefer Upload Date (server timestamp) over Device Date
      const dateValue = record.uploadTimestamp
        ? dayjs(record.uploadTimestamp).format('YYYY-MM-DD HH:mm:ss')
        : dayjs(record.timestamp).format('YYYY-MM-DD HH:mm:ss');

      const row = [
        record.id || '',
        record.username || '',
        record.merchant || '',
        record.barcode || '',
        record.storeLocation || '',
        dateValue,
        record.aiResult?.title || '',
        record.aiResult?.price || '',
        record.aiResult?.brand || '',
        record.aiResult?.size || '',
        record.aiResult?.promotion ? `"${record.aiResult.promotion.replace(/"/g, '""')}"` : '',
        record.aiCost?.totalCostUsd ? record.aiCost.totalCostUsd.toFixed(4) : '',
        record.aiCost?.model || '',
        record.imageUrl || ''
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

  // Export CSV function - CRITICAL FEATURE for client
  const handleExportCSV = () => {
    if (!data?.data) return;

    // Filter data based on current search/filters
    let exportData = data.data;
    if (searchText || statusFilter || dateRange) {
      exportData = data.data.filter((record) => {
        // Apply date range filter
        if (dateRange && dateRange.startDate && dateRange.endDate) {
          if (!isDateInRange(record.timestamp, dateRange)) {
            return false;
          }
        }

        // Apply search filter
        if (searchText) {
          const searchLower = searchText.toLowerCase();
          const matchesSearch =
            record.barcode.toLowerCase().includes(searchLower) ||
            record.merchant.toLowerCase().includes(searchLower) ||
            record.username.toLowerCase().includes(searchLower) ||
            record.aiResult?.title?.toLowerCase().includes(searchLower) ||
            record.aiResult?.brand?.toLowerCase().includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Apply status filter
        if (statusFilter) {
          if (statusFilter === 'completed' && !(record.aiProcessed && record.aiResult)) return false;
          if (statusFilter === 'pending' && !((!record.aiProcessed && !record.aiError))) return false;
          if (statusFilter === 'failed' && !((!record.aiProcessed && record.aiError))) return false;
        }

        return true;
      });
    }

    // Use helper function to export
    exportRecordsToCSV(exportData);
  };

  // Apply date range filter to displayed data
  const filteredData = data?.data?.filter((record) => {
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      return isDateInRange(record.timestamp, dateRange);
    }
    return true;
  });

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
      render: (storeLocation: string | undefined, record) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{record.merchant}</div>
          {storeLocation && (
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
              {storeLocation.length > 20 ? storeLocation.substring(0, 20) + '...' : storeLocation}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Barcode',
      dataIndex: 'barcode',
      key: 'barcode',
      width: 130,
      responsive: ['md'] as any,
      render: (barcode: string) => (
        <Typography.Text code style={{ fontSize: 11 }}>
          {barcode}
        </Typography.Text>
      ),
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

            {/* Price Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {record.aiResult?.price && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Price:</span>
                  <span style={{ fontWeight: 700, color: '#52c41a', fontSize: 14 }}>
                    {record.aiResult.price}
                  </span>
                </div>
              )}
              {record.aiResult?.unitPrice && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Unit:</span>
                  <span style={{
                    fontSize: 11,
                    color: '#1890ff',
                    backgroundColor: '#e6f7ff',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontWeight: 600
                  }}>
                    {record.aiResult.unitPrice}
                  </span>
                </div>
              )}
              {record.aiResult?.size && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Size:</span>
                  <span style={{ fontSize: 11, color: '#595959', fontWeight: 600 }}>
                    {record.aiResult.size}
                  </span>
                </div>
              )}
            </div>

            {/* Promotion (if exists) */}
            {record.aiResult?.promotion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#8c8c8c', fontWeight: 500 }}>Promo:</span>
                <Tag
                  color="orange"
                  icon={<span style={{ marginRight: 4 }}>🎁</span>}
                  style={{
                    fontSize: 11,
                    margin: 0,
                    maxWidth: 'calc(100% - 52px)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}
                >
                  {record.aiResult.promotion}
                </Tag>
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
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
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
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              size="middle"
            />

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

        {/* Batch Operations Toolbar - Shows when records are selected */}
        {selectedRowKeys.length > 0 && (
          <Alert
            message={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>
                  <strong>{selectedRowKeys.length}</strong> record(s) selected
                  {(() => {
                    const currentPageSelectedCount = data?.data?.filter(record =>
                      selectedRowKeys.includes(record.id)
                    ).length || 0;

                    if (currentPageSelectedCount < selectedRowKeys.length) {
                      return (
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          across pages
                        </Tag>
                      );
                    }
                    return null;
                  })()}
                </span>
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
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDelete}
                  >
                    Delete
                  </Button>
                </Space>
              </Space>
            }
            type="info"
            style={{ marginBottom: 16 }}
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
            total: filteredData?.length || 0,
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} records`,
          }}
          locale={{
            emptyText: (
              <Empty
                image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                imageStyle={{ height: 160 }}
                description={
                  <Space direction="vertical" size={12} style={{ marginTop: 16 }}>
                    <Title level={4} style={{ marginBottom: 0 }}>
                      {searchText || statusFilter || dateRange ? 'No matching records' : 'Welcome to ShelfTagSnap!'}
                    </Title>
                    <Typography.Text type="secondary">
                      {searchText || statusFilter || dateRange
                        ? 'Try adjusting your filters to see more results'
                        : 'No scan records yet. Get started by:'}
                    </Typography.Text>
                    {!searchText && !statusFilter && !dateRange && (
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
            return selectedRowKeys.includes(record.id) ? 'row-selected' : '';
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
              if (!selectedRowKeys.includes(record.id)) {
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
