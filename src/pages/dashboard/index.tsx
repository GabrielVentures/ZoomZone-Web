/**
 * Dashboard Page - Phase 4.2 Task F.4 & F.8
 * Main dashboard with statistics and charts
 */

import { Card, Col, Row, Statistic, Typography, Divider, Space, Alert, Button, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  UserOutlined,
  WarningOutlined,
  ReloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useList, useNavigation } from '@refinedev/core';
import { useMemo, useState, useEffect } from 'react';
import { ScanRecord, BudgetConfig, AlertLevel } from '@/types';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useDateRange } from '@/contexts/DateRangeContext';
import { CostTrendChart } from '@/components/dashboard/CostTrendChart';
import { TokenUsageChart } from '@/components/dashboard/TokenUsageChart';
import { AIStatusPieChart } from '@/components/dashboard/AIStatusPieChart';
import { UserCostBarChart } from '@/components/dashboard/UserCostBarChart';
import { RecordsActivityChart } from '@/components/dashboard/RecordsActivityChart';
import { loadBudgetConfig, getHighestAlert, generateAlertMessage, DEFAULT_BUDGET_CONFIG } from '@/utils/budgetUtils';
import { getRetryStatistics } from '@/utils/retryUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const DashboardPage = () => {
  const { push } = useNavigation();
  const { dateRange } = useDateRange();
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(DEFAULT_BUDGET_CONFIG);

  // Load budget config
  useEffect(() => {
    loadBudgetConfig().then(setBudgetConfig);
  }, []);

  // Fetch all scan records
  const { data: scanRecordsData } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000, // Get all records for stats calculation
    },
  });

  // Check budget alerts
  const highestAlert = useMemo(() => {
    if (!scanRecordsData?.data) return null;
    return getHighestAlert(scanRecordsData.data, budgetConfig);
  }, [scanRecordsData?.data, budgetConfig]);

  // Filter records based on date range
  const filteredRecords = useMemo(() => {
    if (!scanRecordsData?.data) return [];

    return scanRecordsData.data.filter(record => {
      const recordDate = dayjs(record.timestamp);
      return recordDate.isAfter(dateRange.startDate) && recordDate.isBefore(dateRange.endDate);
    });
  }, [scanRecordsData?.data, dateRange]);

  // Calculate stats from filtered records
  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const aiCompleted = filteredRecords.filter(r => r.aiProcessed && r.aiResult).length;
    const aiPending = filteredRecords.filter(r => !r.aiProcessed && !r.aiError).length;
    const aiFailed = filteredRecords.filter(r => !r.aiProcessed && r.aiError).length;

    const uniqueUsers = new Set(filteredRecords.map(r => r.username)).size;

    const totalAICostUsd = filteredRecords.reduce((sum, r) =>
      sum + (r.aiCost?.totalCostUsd || 0), 0
    );

    const totalTokens = filteredRecords.reduce((sum, r) =>
      sum + (r.aiCost?.totalTokens || 0), 0
    );

    const avgCostPerRecord = totalRecords > 0 ? totalAICostUsd / totalRecords : 0;

    // Calculate retry statistics
    const retryStats = getRetryStatistics(filteredRecords);

    return {
      totalRecords,
      aiCompleted,
      aiPending,
      aiFailed,
      totalUsers: uniqueUsers,
      totalAICostUsd,
      avgCostPerRecord,
      totalTokens,
      retryStats,
    };
  }, [filteredRecords]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Dashboard</Title>
        <Space direction="vertical" size={4}>
          <DateRangePicker showPresets={true} />
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'right', display: 'block' }}>
            Showing: {dateRange.startDate.format('MMM D, YYYY')} - {dateRange.endDate.format('MMM D, YYYY')}
          </Text>
        </Space>
      </div>

      {/* Budget Alert Banner */}
      {budgetConfig.enabled && highestAlert && (
        <Alert
          message={
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>
                <WarningOutlined style={{ marginRight: 8 }} />
                {generateAlertMessage(highestAlert)}
              </span>
              <Button size="small" type="link" onClick={() => push('/budget')}>
                Manage Budget →
              </Button>
            </Space>
          }
          type={highestAlert.alertLevel === AlertLevel.WARNING ? 'warning' : 'error'}
          showIcon={false}
          style={{ marginTop: 16 }}
          closable
        />
      )}


      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* Total Records */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Records"
              value={stats.totalRecords}
              prefix="📸"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        {/* AI Completed */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="AI Completed"
              value={stats.aiCompleted}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        {/* AI Pending */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="AI Pending"
              value={stats.aiPending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        {/* AI Failed */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="AI Failed"
              value={stats.aiFailed}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        {/* Total Users */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>

        {/* Total AI Cost */}
        <Col xs={24} sm={12} lg={8}>
          <Card>
            <Statistic
              title="Total AI Cost"
              value={stats.totalAICostUsd}
              prefix={<DollarOutlined />}
              precision={4}
              suffix="USD"
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Secondary Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="Average Cost per Record"
              value={stats.avgCostPerRecord}
              prefix={<DollarOutlined />}
              precision={4}
              suffix="USD"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12}>
          <Card>
            <Statistic title="Total Tokens Used" value={stats.totalTokens} />
          </Card>
        </Col>
      </Row>

      {/* Retry Statistics Row - P0.3 */}
      {stats.retryStats.totalRetries > 0 && (
        <>
          <Divider style={{ marginTop: 24, marginBottom: 16 }} />
          <Title level={4} style={{ marginBottom: 16 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            AI Retry Statistics
          </Title>
          <Row gutter={[16, 16]}>
            {/* Total Retries */}
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Retry Attempts"
                  value={stats.retryStats.totalRetries}
                  prefix={<ReloadOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                  <Tag color="green">{stats.retryStats.successfulRetries} Success</Tag>
                  <Tag color="red">{stats.retryStats.failedRetries} Failed</Tag>
                </div>
              </Card>
            </Col>

            {/* Records with Retries */}
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Records with Retries"
                  value={stats.retryStats.recordsWithRetries}
                  suffix={`/ ${stats.totalRecords}`}
                  valueStyle={{ color: '#722ed1' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                  {((stats.retryStats.recordsWithRetries / stats.totalRecords) * 100).toFixed(1)}% of total
                </div>
              </Card>
            </Col>

            {/* Retry Cost */}
            <Col xs={24} sm={12} lg={8}>
              <Card>
                <Statistic
                  title="Total Retry Cost"
                  value={stats.retryStats.totalRetryCost}
                  prefix={<DollarOutlined />}
                  precision={4}
                  suffix="USD"
                  valueStyle={{ color: '#ff4d4f' }}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>
                  Avg: ${stats.retryStats.avgCostPerRetry.toFixed(4)} per retry
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}

      <Divider style={{ marginTop: 32, marginBottom: 24 }} />

      {/* Charts Section - Task F.8 */}
      <Title level={3} style={{ marginBottom: 24 }}>
        📊 Analytics & Trends
      </Title>

      {/* Row 1: Cost Trend & Token Usage */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="💰 Daily AI Processing Cost" bordered={false}>
            <CostTrendChart />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="🔢 Daily Token Usage" bordered={false}>
            <TokenUsageChart />
          </Card>
        </Col>
      </Row>

      {/* Row 2: Records Activity & AI Status Distribution */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="📈 Records Activity (7 Days)" bordered={false}>
            <RecordsActivityChart />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="📊 AI Status Distribution" bordered={false}>
            <AIStatusPieChart />
          </Card>
        </Col>
      </Row>

      {/* Row 3: User Cost Breakdown */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card title="👥 Cost by User (Today)" bordered={false}>
            <UserCostBarChart />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
