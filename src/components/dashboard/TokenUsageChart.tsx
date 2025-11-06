/**
 * Token Usage Chart Component
 * Shows daily token consumption over time
 */

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useList } from '@refinedev/core';
import { Skeleton, Alert, Button, Empty, Space, Typography } from 'antd';
import { ScanRecord } from '@/types';
import { generateDailyStatsFromRecords } from '@/mocks/timeSeriesData';

const { Text } = Typography;

export const TokenUsageChart = () => {
  // Fetch real scan records from Firestore
  const { data: scanRecordsData, isLoading, isError, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000,
    },
  });

  // Aggregate data into daily stats
  const chartData = useMemo(() => {
    if (!scanRecordsData?.data) return [];
    return generateDailyStatsFromRecords(scanRecordsData.data, 7);
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
        message="Failed to load token usage data"
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
            <Text>No token usage data</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Token metrics will appear after AI processing
            </Text>
          </Space>
        }
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#1890ff" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dateFormatted" />
        <YAxis
          label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
        />
        <Tooltip
          formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
          labelStyle={{ color: '#000' }}
        />
        <Area
          type="monotone"
          dataKey="totalTokens"
          stroke="#1890ff"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorTokens)"
          name="Daily Tokens"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
