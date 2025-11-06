/**
 * Budget Management Page - P0.4
 * Cost control and budget monitoring dashboard
 */

import { useState, useEffect, useMemo } from 'react';
import { useList } from '@refinedev/core';
import {
  Card,
  Row,
  Col,
  Typography,
  Form,
  InputNumber,
  Switch,
  Button,
  Space,
  Statistic,
  Progress,
  Alert,
  Divider,
  Tag,
  message,
  Modal,
  Skeleton,
} from 'antd';
import {
  DollarOutlined,
  WarningOutlined,
  SettingOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ScanRecord, BudgetConfig, BudgetPeriod, AlertLevel } from '@/types';
import {
  loadBudgetConfig,
  saveBudgetConfig,
  resetBudgetConfig,
  calculateBudgetUsage,
  getAlertColor,
  getAlertText,
  generateAlertMessage,
  DEFAULT_BUDGET_CONFIG,
} from '@/utils/budgetUtils';
import { cacheManager } from '@/utils/cacheManager';

const { Title, Text, Paragraph } = Typography;

export const BudgetManagementPage = () => {
  const [form] = Form.useForm();
  const [budgetConfig, setBudgetConfig] = useState<BudgetConfig>(DEFAULT_BUDGET_CONFIG);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Fetch all scan records
  const { data: scanRecordsData, isLoading, refetch } = useList<ScanRecord>({
    resource: 'scan_records',
    pagination: {
      current: 1,
      pageSize: 1000,
    },
  });

  const records = scanRecordsData?.data || [];

  // Load budget config from Firestore on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoadingConfig(true);
        const config = await loadBudgetConfig();
        setBudgetConfig(config);
        form.setFieldsValue(config);
      } catch (error) {
        console.error('Failed to load budget config:', error);
        message.error('Failed to load budget configuration. Using defaults.');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🐛 DEBUG: Log records data
  useEffect(() => {
    console.log('🔍 [Budget Debug] Total records loaded:', records.length);
    console.log('🔍 [Budget Debug] Sample record:', records[0]);
    if (records.length > 0) {
      const totalCost = records.reduce((sum, r) => sum + (r.aiCost?.totalCostUsd || 0), 0);
      console.log('🔍 [Budget Debug] Total cost (all records):', totalCost.toFixed(4));
      const testRecords = records.filter(r => r.username?.includes('[TEST-BUDGET]'));
      console.log('🔍 [Budget Debug] Test records:', testRecords.length);
      const testCost = testRecords.reduce((sum, r) => sum + (r.aiCost?.totalCostUsd || 0), 0);
      console.log('🔍 [Budget Debug] Test records cost:', testCost.toFixed(4));
    }
  }, [records]);

  // Calculate budget usage (only daily - simplified global quota)
  const dailyUsage = useMemo(
    () => {
      const usage = calculateBudgetUsage(records, budgetConfig, BudgetPeriod.DAILY);
      console.log('🔍 [Budget Debug] Daily usage:', {
        currentUsage: usage.currentUsage,
        budgetLimit: usage.budgetLimit,
        usagePercent: usage.usagePercent,
        alertLevel: usage.alertLevel,
        recordCount: usage.recordCount,
      });
      return usage;
    },
    [records, budgetConfig]
  );

  // Update form when config changes
  useEffect(() => {
    form.setFieldsValue(budgetConfig);
  }, [budgetConfig, form]);

  // Handle form submission
  const handleSave = async (values: BudgetConfig) => {
    try {
      setIsSaving(true);
      await saveBudgetConfig(values);
      setBudgetConfig(values);
      setIsEditing(false);
      message.success('Budget configuration saved successfully to Firestore');
      console.log('✅ [Budget] Budget configuration saved and will now affect iOS API');
    } catch (error) {
      console.error('Failed to save budget config:', error);
      message.error('Failed to save budget configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleReset = () => {
    Modal.confirm({
      title: 'Reset Budget Configuration',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you want to reset all budget settings to defaults?',
      okText: 'Reset',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setIsResetting(true);
          const defaults = await resetBudgetConfig();
          setBudgetConfig(defaults);
          form.setFieldsValue(defaults);
          setIsEditing(false);
          message.success('Budget configuration reset to defaults');
        } catch (error) {
          console.error('Failed to reset budget config:', error);
          message.error('Failed to reset budget configuration. Please try again.');
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  // Render usage card
  const renderUsageCard = (
    usage: ReturnType<typeof calculateBudgetUsage>,
    title: string,
    icon: React.ReactNode
  ) => {
    const color = getAlertColor(usage.alertLevel);
    const statusText = getAlertText(usage.alertLevel);

    return (
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              {icon}
              <Title level={4} style={{ margin: 0 }}>
                {title}
              </Title>
            </Space>
            <Tag color={usage.alertLevel === AlertLevel.SAFE ? 'success' : usage.alertLevel === AlertLevel.WARNING ? 'warning' : usage.alertLevel === AlertLevel.CRITICAL ? 'orange' : 'error'}>
              {statusText}
            </Tag>
          </div>

          {/* Progress Bar */}
          <Progress
            percent={Math.min(usage.usagePercent, 100)}
            strokeColor={color}
            status={usage.alertLevel === AlertLevel.EXCEEDED ? 'exception' : 'normal'}
            format={(percent) => `${percent?.toFixed(1)}%`}
          />

          {/* Statistics */}
          <Row gutter={[16, 16]}>
            <Col xs={12}>
              <Statistic
                title="Current Usage"
                value={usage.currentUsage}
                precision={4}
                prefix="$"
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="Budget Limit"
                value={usage.budgetLimit}
                precision={2}
                prefix="$"
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="Remaining"
                value={usage.remainingBudget}
                precision={4}
                prefix="$"
                valueStyle={{ fontSize: 18, color: usage.remainingBudget > 0 ? '#52c41a' : '#ff4d4f' }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="Records"
                value={usage.recordCount}
                valueStyle={{ fontSize: 18 }}
              />
            </Col>
          </Row>

          {/* Projected Usage Warning */}
          {usage.projectedUsage && usage.projectedUsage > usage.budgetLimit && (
            <Alert
              message="Projected Overspend"
              description={`Based on current usage, you're projected to spend $${usage.projectedUsage.toFixed(4)} by end of period.`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
            />
          )}

          {/* Average Cost */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            Average cost per record: ${usage.avgCostPerRecord.toFixed(4)}
          </Text>
        </Space>
      </Card>
    );
  };

  // Loading state
  if (isLoading || isLoadingConfig) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 24 }} />
        <Card style={{ marginBottom: 24 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={8}>
            <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
          </Col>
        </Row>
        <Card style={{ marginTop: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>
          Budget Management
        </Title>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={async () => {
              try {
                console.log('🔄 [Budget] Clearing cache and refreshing data...');
                // Clear all cache to force fresh data fetch
                cacheManager.clear();
                console.log('✅ [Budget] Cache cleared');

                // Reload budget config from Firestore
                setIsLoadingConfig(true);
                const config = await loadBudgetConfig();
                setBudgetConfig(config);
                form.setFieldsValue(config);
                console.log('✅ [Budget] Budget config reloaded from Firestore');

                // Refetch scan records from Firestore
                await refetch();

                message.success('Data refreshed successfully');
              } catch (error) {
                console.error('Failed to refresh:', error);
                message.error('Failed to refresh data');
              } finally {
                setIsLoadingConfig(false);
              }
            }}
            loading={isLoading || isLoadingConfig}
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Global Alert - Shows daily budget alert */}
      {budgetConfig.enabled && dailyUsage.alertLevel !== AlertLevel.SAFE && (
        <Alert
          message={getAlertText(dailyUsage.alertLevel)}
          description={generateAlertMessage(dailyUsage)}
          type={dailyUsage.alertLevel === AlertLevel.WARNING ? 'warning' : 'error'}
          showIcon
          closable
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Budget Configuration Card */}
      <Card
        title={
          <Space>
            <SettingOutlined />
            <span>Budget Configuration</span>
          </Space>
        }
        extra={
          <Space>
            {!isEditing ? (
              <>
                <Button
                  type="primary"
                  onClick={() => setIsEditing(true)}
                  disabled={isSaving || isResetting}
                >
                  Edit Settings
                </Button>
                <Button
                  danger
                  onClick={handleReset}
                  loading={isResetting}
                  disabled={isSaving}
                >
                  Reset to Defaults
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    form.setFieldsValue(budgetConfig);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={isSaving}
                >
                  Save Changes
                </Button>
              </>
            )}
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={budgetConfig}
          onFinish={handleSave}
          disabled={!isEditing}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name="enabled"
                label="Enable Budget Monitoring"
                valuePropName="checked"
              >
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
            </Col>

            <Divider>Global Daily Budget Limit (USD)</Divider>

            <Col xs={24}>
              <Form.Item
                name="dailyBudget"
                label="Daily Budget (Shared by All Users)"
                rules={[{ required: true, message: 'Required' }]}
                extra="This budget is shared across all users. First-come-first-served."
              >
                <InputNumber
                  prefix="$"
                  min={0}
                  step={1}
                  precision={2}
                  style={{ width: '100%', maxWidth: 400 }}
                  size="large"
                />
              </Form.Item>
            </Col>

            <Divider>Alert Thresholds (%)</Divider>

            <Col xs={24} md={8}>
              <Form.Item
                name={['alertThresholds', 'warning']}
                label="Warning Threshold"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  suffix="%"
                  min={0}
                  max={100}
                  step={5}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={['alertThresholds', 'critical']}
                label="Critical Threshold"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  suffix="%"
                  min={0}
                  max={100}
                  step={5}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name={['alertThresholds', 'exceeded']}
                label="Exceeded Threshold"
                initialValue={100}
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  suffix="%"
                  disabled
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {!budgetConfig.enabled && (
          <Alert
            message="Budget Monitoring Disabled"
            description="Enable budget monitoring to track costs and receive alerts."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Usage Statistics - Daily Budget Only (Global Shared Quota) */}
      <Title level={3} style={{ marginBottom: 16 }}>
        Today's Usage - Global Shared Quota
      </Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        All users share this daily budget. First-come-first-served.
      </Text>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          {renderUsageCard(dailyUsage, 'Daily Budget (All Users)', <DollarOutlined style={{ fontSize: 24, color: '#1890ff' }} />)}
        </Col>
      </Row>

      {/* Information Card */}
      <Card style={{ marginTop: 24 }} title="💡 Simplified Global Budget System">
        <Paragraph>
          <Text strong>How it works:</Text>
        </Paragraph>
        <ul>
          <li><Text strong>Single Shared Daily Quota:</Text> All users share one global daily budget ($50 by default)</li>
          <li><Text strong>First-Come-First-Served:</Text> No individual user quotas - available to all until daily limit is reached</li>
          <li><Text strong>Automatic Alerts:</Text> Get notified at 80% and 90% usage thresholds</li>
          <li><Text strong>Circuit Breaker:</Text> Processing stops automatically when budget is exhausted</li>
          <li><Text strong>Daily Reset:</Text> Budget resets automatically at midnight (server time)</li>
          <li><Text strong>Rate Limiting:</Text> Anti-abuse protection still in place (10 requests/minute per user)</li>
        </ul>
        <Paragraph style={{ marginTop: 16 }}>
          <Text type="secondary" strong>
            Purpose: Prevent API token theft/abuse, not fair distribution among users.
          </Text>
        </Paragraph>
      </Card>
    </div>
  );
};
