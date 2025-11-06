/**
 * User Costs Page - Phase 4.2 Task F.9
 * Detailed cost breakdown by user with export functionality
 */

import { useList } from '@refinedev/core';
import { Table, Card, Typography, Space, Button, Input, Tag, Statistic, Row, Col, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  DownloadOutlined,
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { UserCostStats, ScanRecord } from '@/types';
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { DateRangeFilter, type DateRange, isDateInRange, formatDateRange } from '@/components/common/DateRangeFilter';

const { Title, Text } = Typography;

export const UserCostsPage = () => {
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Fetch scan records instead of pre-aggregated stats
  const { data: scanRecordsData, isLoading, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000, // Get all records for stats calculation
    },
  });

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    if (!scanRecordsData?.data) return [];

    if (dateRange && dateRange.startDate && dateRange.endDate) {
      return scanRecordsData.data.filter(record =>
        isDateInRange(record.timestamp, dateRange)
      );
    }

    return scanRecordsData.data;
  }, [scanRecordsData?.data, dateRange]);

  // Calculate user stats from filtered records
  const userStatsData = useMemo(() => {
    const userMap = new Map<string, UserCostStats>();

    filteredRecords.forEach(record => {
      const username = record.username;

      if (!userMap.has(username)) {
        userMap.set(username, {
          userId: username,
          username: username,
          recordCount: 0,
          totalCostUsd: 0,
          avgCostPerRecord: 0,
          totalTokens: 0,
          lastUploadDate: record.timestamp,
        });
      }

      const userStats = userMap.get(username)!;
      userStats.recordCount += 1;
      userStats.totalCostUsd += record.aiCost?.totalCostUsd || 0;
      userStats.totalTokens += record.aiCost?.totalTokens || 0;

      // Track most recent upload
      if (record.timestamp > userStats.lastUploadDate!) {
        userStats.lastUploadDate = record.timestamp;
      }
    });

    // Calculate averages
    userMap.forEach(stats => {
      stats.avgCostPerRecord = stats.recordCount > 0 ? stats.totalCostUsd / stats.recordCount : 0;
    });

    return Array.from(userMap.values());
  }, [filteredRecords]);

  // Filter data based on search
  const filteredData = userStatsData.filter((user) =>
    user.username.toLowerCase().includes(searchText.toLowerCase())
  );

  // Calculate summary statistics
  const totalCost = filteredData?.reduce((sum, user) => sum + user.totalCostUsd, 0) || 0;
  const totalRecords = filteredData?.reduce((sum, user) => sum + user.recordCount, 0) || 0;
  const totalTokens = filteredData?.reduce((sum, user) => sum + user.totalTokens, 0) || 0;

  // Export to CSV function
  const handleExportCSV = () => {
    if (!filteredData) return;

    // CSV header
    const headers = ['Username', 'Record Count', 'Total Cost (USD)', 'Avg Cost/Record', 'Total Tokens', 'Last Upload'];
    const csvRows = [headers.join(',')];

    // CSV data rows
    filteredData.forEach((user) => {
      const row = [
        user.username,
        user.recordCount.toString(),
        user.totalCostUsd.toFixed(4),
        user.avgCostPerRecord.toFixed(4),
        user.totalTokens.toString(),
        user.lastUploadDate ? dayjs(user.lastUploadDate).format('YYYY-MM-DD HH:mm') : 'N/A',
      ];
      csvRows.push(row.join(','));
    });

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `user-costs-${dayjs().format('YYYY-MM-DD')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnsType<UserCostStats> = [
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 150,
      fixed: 'left',
      sorter: (a, b) => a.username.localeCompare(b.username),
      render: (username: string) => (
        <Space>
          <UserOutlined style={{ color: '#1890ff' }} />
          <strong>{username}</strong>
        </Space>
      ),
    },
    {
      title: 'Record Count',
      dataIndex: 'recordCount',
      key: 'recordCount',
      width: 140,
      sorter: (a, b) => a.recordCount - b.recordCount,
      render: (count: number) => (
        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
          {count} records
        </Tag>
      ),
    },
    {
      title: 'Total Cost',
      dataIndex: 'totalCostUsd',
      key: 'totalCostUsd',
      width: 130,
      sorter: (a, b) => a.totalCostUsd - b.totalCostUsd,
      defaultSortOrder: 'descend',
      render: (cost: number) => (
        <Text strong style={{ color: '#eb2f96', fontSize: 15 }}>
          ${cost.toFixed(4)}
        </Text>
      ),
    },
    {
      title: 'Avg Cost/Record',
      dataIndex: 'avgCostPerRecord',
      key: 'avgCostPerRecord',
      width: 150,
      responsive: ['lg'] as any,
      sorter: (a, b) => a.avgCostPerRecord - b.avgCostPerRecord,
      render: (avg: number) => <Text>${avg.toFixed(4)}</Text>,
    },
    {
      title: 'Total Tokens',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 130,
      responsive: ['md'] as any,
      sorter: (a, b) => a.totalTokens - b.totalTokens,
      render: (tokens: number) => tokens.toLocaleString(),
    },
    {
      title: 'Last Upload',
      dataIndex: 'lastUploadDate',
      key: 'lastUploadDate',
      width: 180,
      responsive: ['xl'] as any,
      sorter: (a, b) => {
        if (!a.lastUploadDate || !b.lastUploadDate) return 0;
        return dayjs(a.lastUploadDate).unix() - dayjs(b.lastUploadDate).unix();
      },
      render: (date?: Date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : 'N/A'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} style={{ margin: 0 }}>User Cost Analytics</Title>
        <Space direction="vertical" size={4}>
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            placeholder={['Start Date', 'End Date']}
            size="middle"
          />
          {dateRange && dateRange.startDate && dateRange.endDate && (
            <Text type="secondary" style={{ fontSize: 12, textAlign: 'right', display: 'block' }}>
              Showing: {formatDateRange(dateRange)}
            </Text>
          )}
        </Space>
      </div>

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={filteredData?.length || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Records"
              value={totalRecords}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Cost"
              value={totalCost}
              prefix={<DollarOutlined />}
              precision={4}
              suffix="USD"
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        {/* Toolbar */}
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
          <Input
            placeholder="Search username..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            loading={isLoading}
          >
            Refresh
          </Button>

          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportCSV}
            disabled={!filteredData || filteredData.length === 0}
          >
            Export CSV
          </Button>
        </Space>

        {/* User Cost Table */}
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="userId"
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `Total ${total} users`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size={4}>
                    <Text>
                      {searchText || dateRange ? 'No matching user costs' : 'No user cost data yet'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {searchText || dateRange
                        ? 'Try adjusting your filters'
                        : 'Cost data will appear after users start scanning'}
                    </Text>
                  </Space>
                }
                style={{ padding: 60 }}
              />
            ),
          }}
          summary={(pageData) => {
            const pageTotalCost = pageData.reduce((sum, user) => sum + user.totalCostUsd, 0);
            const pageTotalRecords = pageData.reduce((sum, user) => sum + user.recordCount, 0);
            const pageTotalTokens = pageData.reduce((sum, user) => sum + user.totalTokens, 0);

            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                  <Table.Summary.Cell index={0}>
                    <strong>Page Total</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <Tag color="blue">{pageTotalRecords} records</Tag>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong style={{ color: '#eb2f96' }}>
                      ${pageTotalCost.toFixed(4)}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text>${(pageTotalCost / pageTotalRecords || 0).toFixed(4)}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <Text>{pageTotalTokens.toLocaleString()}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}>—</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>

      {/* Additional Info Card */}
      <Card style={{ marginTop: 24 }} title="💡 Cost Insights">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Average Cost per User:</Text>
            <Text style={{ marginLeft: 8 }}>
              ${((totalCost / (filteredData?.length || 1)) || 0).toFixed(4)} USD
            </Text>
          </div>
          <div>
            <Text strong>Average Tokens per User:</Text>
            <Text style={{ marginLeft: 8 }}>
              {Math.round(totalTokens / (filteredData?.length || 1) || 0).toLocaleString()}
            </Text>
          </div>
          <div>
            <Text strong>Average Records per User:</Text>
            <Text style={{ marginLeft: 8 }}>
              {(totalRecords / (filteredData?.length || 1) || 0).toFixed(1)}
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};
