/**
 * Records Activity Chart Component
 * Shows daily record counts by AI status
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useList } from '@refinedev/core';
import { Skeleton, Alert, Button, Empty, Space, Typography } from 'antd';
import { ScanRecord } from '@/types';
import { generateDailyStatsFromRecords } from '@/mocks/timeSeriesData';

const { Text } = Typography;

export const RecordsActivityChart = () => {
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
        message="Failed to load records activity data"
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
            <Text>No activity records</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Start scanning to see daily activity trends
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="dateFormatted" />
        <YAxis label={{ value: 'Records', angle: -90, position: 'insideLeft' }} />
        <Tooltip labelStyle={{ color: '#000' }} />
        <Legend />
        <Area
          type="monotone"
          dataKey="aiCompleted"
          stackId="1"
          stroke="#52c41a"
          fill="#52c41a"
          name="Completed"
        />
        <Area
          type="monotone"
          dataKey="aiPending"
          stackId="1"
          stroke="#faad14"
          fill="#faad14"
          name="Pending"
        />
        <Area
          type="monotone"
          dataKey="aiFailed"
          stackId="1"
          stroke="#ff4d4f"
          fill="#ff4d4f"
          name="Failed"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
