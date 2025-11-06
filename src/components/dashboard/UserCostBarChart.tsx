/**
 * User Cost Bar Chart Component
 * Shows AI processing cost per user
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useList } from '@refinedev/core';
import { Skeleton, Alert, Button, Empty, Space, Typography } from 'antd';
import { ScanRecord } from '@/types';
import { generateUserDailyCosts } from '@/mocks/timeSeriesData';

const { Text } = Typography;
const COLORS = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];

export const UserCostBarChart = () => {
  // Fetch real scan records from Firestore
  const { data: scanRecordsData, isLoading, isError, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000,
    },
  });

  // Generate user costs from real data
  const chartData = useMemo(() => {
    if (!scanRecordsData?.data) return [];
    return generateUserDailyCosts(scanRecordsData.data);
  }, [scanRecordsData]);

  // Loading state
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  // Error state
  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load user cost data"
        description="Please try refreshing the page"
        action={
          <Button size="small" onClick={() => refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  // Empty state
  if (!chartData || chartData.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size={4}>
            <Text>No cost data for today</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              User costs will appear after today's scans
            </Text>
          </Space>
        }
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="username" />
        <YAxis
          label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `$${value.toFixed(3)}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === 'totalCostUsd') return [`$${value.toFixed(4)}`, 'Total Cost'];
            if (name === 'avgCostPerRecord') return [`$${value.toFixed(4)}`, 'Avg Cost'];
            return [value, name];
          }}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Bar dataKey="totalCostUsd" name="Total Cost" radius={[8, 8, 0, 0]}>
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
