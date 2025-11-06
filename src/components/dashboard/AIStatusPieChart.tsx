/**
 * AI Status Distribution Pie Chart
 * Shows proportion of AI processing statuses
 */

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useList } from '@refinedev/core';
import { Skeleton, Alert, Button, Empty, Space, Typography } from 'antd';
import { ScanRecord } from '@/types';
import { generateAIStatusDistribution } from '@/mocks/timeSeriesData';

const { Text } = Typography;

const renderLabel = (props: any) => {
  const { name, percent } = props;
  // Only show label if slice is > 2% to avoid overlap with tiny slices
  if (percent < 0.02) return null;
  return `${name}: ${(percent * 100).toFixed(0)}%`;
};

export const AIStatusPieChart = () => {
  // Fetch real scan records from Firestore
  const { data: scanRecordsData, isLoading, isError, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000,
    },
  });

  // Generate AI status distribution from real data
  const chartData = useMemo(() => {
    if (!scanRecordsData?.data) return [];
    return generateAIStatusDistribution(scanRecordsData.data);
  }, [scanRecordsData]);

  // Loading state
  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  // Error state
  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load AI status data"
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
            <Text>No AI status data</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              AI processing status will be tracked here
            </Text>
          </Space>
        }
        style={{ padding: 40 }}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [value, 'Records']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
