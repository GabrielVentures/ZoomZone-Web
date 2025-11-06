/**
 * Cost Trend Chart Component
 * Shows daily AI processing cost over time
 */

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useList } from '@refinedev/core';
import { Skeleton, Alert, Button, Empty, Space, Typography } from 'antd';
import { ScanRecord } from '@/types';
import { generateDailyStatsFromRecords } from '@/mocks/timeSeriesData';

const { Text } = Typography;

export const CostTrendChart = () => {
  // Fetch real scan records from Firestore
  const { data: scanRecordsData, isLoading, isError, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000, // Get enough records for weekly stats
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
        message="Failed to load cost trend data"
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
            <Text>No scan records yet</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Cost data will appear after scanning products with the mobile app
            </Text>
          </Space>
        }
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dateFormatted" />
        <YAxis
          label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft' }}
          tickFormatter={(value) => `$${value.toFixed(3)}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']}
          labelStyle={{ color: '#000' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalCostUsd"
          stroke="#eb2f96"
          strokeWidth={2}
          name="Daily Cost"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
