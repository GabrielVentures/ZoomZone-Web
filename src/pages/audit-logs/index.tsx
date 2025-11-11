/**
 * Audit Logs Page
 * View all system activity logs with filtering and pagination
 * Admin-only page
 */

import { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Tag,
  Space,
  Select,
  Typography,
  Alert,
  Spin,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DateRangeFilter, type DateRange } from '@/components/common/DateRangeFilter';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebaseConfig';
import {
  ActivityLog,
  ActivityAction,
  ResourceType,
  GetAuditLogsRequest,
  GetAuditLogsResponse,
} from '@/types';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

export const AuditLogsPage = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | undefined>(undefined);
  const [actionFilter, setActionFilter] = useState<ActivityAction | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const getAuditLogs = httpsCallable<GetAuditLogsRequest, GetAuditLogsResponse>(
        functions,
        'getAuditLogs'
      );

      // Build filters object, only include defined values
      const filters: any = {};
      if (resourceTypeFilter) filters.resource_type = resourceTypeFilter;
      if (actionFilter) filters.action = actionFilter;
      if (dateRange?.startDate) filters.start_date = dateRange.startDate.toISOString();
      if (dateRange?.endDate) filters.end_date = dateRange.endDate.toISOString();

      const request: GetAuditLogsRequest = {
        page: currentPage,
        pageSize,
        filters,
        sort: {
          field: 'timestamp',
          order: 'desc',
        },
      };

      console.log('🔍 [AuditLogs] Fetching with request:', request);

      const result = await getAuditLogs(request);

      console.log('📦 [AuditLogs] Result:', result);

      if (result.data.success) {
        if (result.data.data && result.data.data.logs) {
          // Convert Firestore timestamps to Date objects
          const logsWithDates = result.data.data.logs.map(log => {
            // Handle Firestore Timestamp object
            let timestamp: Date;

            if (log.timestamp) {
              if (typeof log.timestamp === 'object' && ('seconds' in log.timestamp || '_seconds' in log.timestamp)) {
                // Firestore Timestamp object (can be {seconds, nanoseconds} or {_seconds, _nanoseconds})
                const seconds = (log.timestamp as any).seconds || (log.timestamp as any)._seconds;
                timestamp = new Date(seconds * 1000);
              } else if (typeof log.timestamp === 'string') {
                // ISO string
                timestamp = new Date(log.timestamp);
              } else if (log.timestamp instanceof Date) {
                // Already a Date
                timestamp = log.timestamp;
              } else {
                // Fallback: use original timestamp
                timestamp = log.timestamp;
              }
            } else {
              // No timestamp field - this shouldn't happen, but handle gracefully
              console.warn('Log entry missing timestamp:', log);
              timestamp = new Date(0); // Use epoch time as fallback
            }

            return {
              ...log,
              timestamp,
            };
          });

          setLogs(logsWithDates);
          setTotal(result.data.data.total || 0);
          console.log(`✅ [AuditLogs] Loaded ${logsWithDates.length} audit logs (total: ${result.data.data.total || 0})`);
        } else {
          // Success but no data - collection might be empty
          console.log('📭 [AuditLogs] No audit logs found (empty collection)');
          setLogs([]);
          setTotal(0);
        }
      } else {
        console.warn('⚠️ [AuditLogs] Request failed:', result.data);
        message.error('Failed to load audit logs');
        setLogs([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('❌ [AuditLogs] Error fetching audit logs:', error);
      console.error('Error details:', error?.message, error?.code);
      message.error(`Failed to load audit logs: ${error?.message || 'Unknown error'}`);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, resourceTypeFilter, actionFilter, dateRange]);

  // Get level icon and color

  // Get resource type color
  const getResourceTypeColor = (resourceType: string) => {
    switch (resourceType) {
      case ResourceType.BUDGET_CONFIG:
        return 'purple';
      case ResourceType.SCAN_RECORD:
        return 'cyan';
      case ResourceType.USER:
        return 'green';
      case ResourceType.USER_QUOTA:
        return 'geekblue';
      case ResourceType.GLOBAL_AI_CONFIG:
        return 'magenta';
      case ResourceType.SYSTEM:
        return 'default';
      default:
        return 'default';
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'red';
    if (action.includes('CREATE')) return 'green';
    if (action.includes('UPDATE')) return 'blue';
    if (action.includes('EXPORT')) return 'cyan';
    if (action.includes('RETRY')) return 'orange';
    return 'default';
  };

  // Table columns
  const columns: ColumnsType<ActivityLog> = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: Date) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>
            {dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')}
          </div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {dayjs(timestamp).fromNow()}
          </div>
        </div>
      ),
    },
    {
      title: 'Resource',
      dataIndex: 'resource_type',
      key: 'resource_type',
      width: 150,
      render: (resourceType: string) => (
        <Tag color={getResourceTypeColor(resourceType)} style={{ fontSize: 11 }}>
          {resourceType}
        </Tag>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 180,
      render: (action: string) => (
        <Tag color={getActionColor(action)} style={{ fontSize: 11, fontFamily: 'monospace' }}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => (
        <Text style={{ fontSize: 12 }}>{description}</Text>
      ),
    },
    {
      title: 'User',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500 }}>{record.user_email}</div>
          <div style={{ fontSize: 11, color: '#8c8c8c' }}>
            {record.user_role}
          </div>
        </div>
      ),
    },
    {
      title: 'Changes',
      dataIndex: 'changes',
      key: 'changes',
      width: 120,
      render: (changes: any) => {
        if (!changes || !changes.fields_changed || changes.fields_changed.length === 0) {
          return <Text type="secondary">—</Text>;
        }
        return (
          <Tag icon={<FileTextOutlined />} color="default">
            {changes.fields_changed.length} field(s)
          </Tag>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Audit Logs</Title>
      <Text type="secondary">
        View all system activities and changes. All timestamps are in your local timezone.
      </Text>

      <Card style={{ marginTop: 24 }}>
        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              placeholder={['Start Date', 'End Date']}
              size="middle"
            />

            <Select
              placeholder="Filter by Resource Type"
              style={{ width: 220 }}
              value={resourceTypeFilter}
              onChange={setResourceTypeFilter}
              allowClear
            >
              <Select.Option value={ResourceType.BUDGET_CONFIG}>
                Budget Config
              </Select.Option>
              <Select.Option value={ResourceType.SCAN_RECORD}>
                Scan Record
              </Select.Option>
              <Select.Option value={ResourceType.USER}>
                User
              </Select.Option>
              <Select.Option value={ResourceType.USER_QUOTA}>
                User Quota
              </Select.Option>
              <Select.Option value={ResourceType.GLOBAL_AI_CONFIG}>
                Global AI Config
              </Select.Option>
              <Select.Option value={ResourceType.SYSTEM}>
                System
              </Select.Option>
            </Select>

            <Select
              placeholder="Filter by Action"
              style={{ width: 220 }}
              value={actionFilter}
              onChange={setActionFilter}
              allowClear
            >
              <Select.Option value={ActivityAction.BUDGET_CONFIG_UPDATE}>
                Budget Update
              </Select.Option>
              <Select.Option value={ActivityAction.BUDGET_CONFIG_RESET}>
                Budget Reset
              </Select.Option>
              <Select.Option value={ActivityAction.SCAN_RECORD_DELETE}>
                Scan Delete
              </Select.Option>
              <Select.Option value={ActivityAction.SCAN_RECORD_BATCH_DELETE}>
                Batch Delete
              </Select.Option>
              <Select.Option value={ActivityAction.SCAN_RECORD_EXPORT}>
                CSV Export
              </Select.Option>
              <Select.Option value={ActivityAction.USER_QUOTA_UPDATE}>
                Quota Update
              </Select.Option>
              <Select.Option value={ActivityAction.GLOBAL_AI_CONFIG_UPDATE}>
                AI Config Update
              </Select.Option>
              <Select.Option value={ActivityAction.CIRCUIT_BREAKER_TOGGLE}>
                Circuit Breaker
              </Select.Option>
            </Select>
          </Space>
        </div>

        {/* Info Alert */}
        {logs.length === 0 && !loading && (
          <Alert
            message="No audit logs found"
            description="Try adjusting your filters or check back later when there are more activities."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Table */}
        <Spin spinning={loading}>
          <Table
            dataSource={logs}
            columns={columns}
            rowKey="id"
            pagination={{
              current: currentPage,
              pageSize,
              total,
              showSizeChanger: false,
              showTotal: (total) => `Total ${total} logs`,
              onChange: (page) => setCurrentPage(page),
            }}
            scroll={{ x: 1200 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: '12px 48px' }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {record.changes && record.changes.fields_changed && record.changes.fields_changed.length > 0 && (
                      <div>
                        <Text strong>Changed Fields:</Text>
                        <div style={{ marginTop: 8 }}>
                          {record.changes.fields_changed.map((field, idx) => (
                            <Tag key={idx} color="blue" style={{ marginBottom: 4 }}>
                              {field}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    )}

                    {record.changes?.before && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>Before:</Text>
                        <pre style={{
                          backgroundColor: '#f5f5f5',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 11,
                          marginTop: 4,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}>
                          {JSON.stringify(record.changes.before, null, 2)}
                        </pre>
                      </div>
                    )}

                    {record.changes?.after && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>After:</Text>
                        <pre style={{
                          backgroundColor: '#f5f5f5',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 11,
                          marginTop: 4,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}>
                          {JSON.stringify(record.changes.after, null, 2)}
                        </pre>
                      </div>
                    )}

                    {record.metadata && (
                      <div style={{ marginTop: 8 }}>
                        <Text strong>Metadata:</Text>
                        <pre style={{
                          backgroundColor: '#f5f5f5',
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 11,
                          marginTop: 4,
                          maxHeight: 200,
                          overflow: 'auto',
                        }}>
                          {JSON.stringify(record.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div style={{ marginTop: 8, fontSize: 11, color: '#8c8c8c' }}>
                      <div><strong>Resource ID:</strong> {record.resource_id}</div>
                      <div><strong>User ID:</strong> {record.user_id}</div>
                      {record.ip_address && <div><strong>IP Address:</strong> {record.ip_address}</div>}
                    </div>
                  </Space>
                </div>
              ),
              rowExpandable: (record) => {
                return !!(
                  (record.changes?.fields_changed && record.changes.fields_changed.length > 0) ||
                  record.changes?.before ||
                  record.changes?.after ||
                  record.metadata
                );
              },
            }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
