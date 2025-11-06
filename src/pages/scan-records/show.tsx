/**
 * Scan Record Detail Page - Phase 4.2 Task F.6
 * Detailed view of a single scan record
 * Enhanced with P0.3: Single Record Retry
 */

import { useShow } from '@refinedev/core';
import { Card, Col, Row, Typography, Image, Tag, Descriptions, Space, Button, Modal, message, Alert, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { ScanRecord } from '@/types';
import dayjs from 'dayjs';
import { useState } from 'react';
import { retryAIProcessing, canRetry } from '@/utils/retryUtils';

const { Title, Text } = Typography;

export const ScanRecordShow = () => {
  const { queryResult } = useShow<ScanRecord>({
    resource: 'scan_records',
  });

  const { data, isLoading } = queryResult;
  const record = data?.data;

  const [retrying, setRetrying] = useState(false);
  const [localRecord, setLocalRecord] = useState<ScanRecord | null>(null);

  // Use local record if available (after retry), otherwise use fetched record
  const displayRecord = localRecord || record;

  if (isLoading || !displayRecord) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 4 }} style={{ marginBottom: 24 }} />
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card>
              <div style={{
                width: '100%',
                height: 400,
                backgroundColor: '#f0f0f0',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Skeleton.Image
                  active
                  style={{
                    width: '200px',
                    height: '200px'
                  }}
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Handle AI retry
  const handleRetry = () => {
    Modal.confirm({
      title: 'Retry AI Processing',
      icon: <ReloadOutlined style={{ color: '#1890ff' }} />,
      content: (
        <div>
          <p>Retry AI processing for this record?</p>
          <p style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
            This will re-submit the image to GPT-4o for recognition.
          </p>
          {displayRecord.retryCount && displayRecord.retryCount > 0 && (
            <Alert
              message={`Previous attempts: ${displayRecord.retryCount}`}
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      ),
      okText: 'Retry Now',
      cancelText: 'Cancel',
      onOk: async () => {
        setRetrying(true);
        try {
          const result = await retryAIProcessing(displayRecord);

          if (result.success) {
            message.success('AI retry successful! Record updated.');
            setLocalRecord(result.record);
          } else {
            message.error(`AI retry failed: ${result.error}`);
            setLocalRecord(result.record);
          }
        } catch (error) {
          message.error('Failed to retry AI processing');
          console.error('Retry error:', error);
        } finally {
          setRetrying(false);
        }
      },
    });
  };

  const getAIStatusTag = () => {
    if (displayRecord.aiProcessed && displayRecord.aiResult) {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 14, padding: '4px 12px' }}>
          AI Completed
        </Tag>
      );
    } else if (displayRecord.aiError) {
      return (
        <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
          AI Failed
        </Tag>
      );
    } else {
      return (
        <Tag icon={<ClockCircleOutlined />} color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>
          AI Pending
        </Tag>
      );
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Scan Record Details</Title>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Left Column - Image (Full width on mobile) */}
        <Col xs={24} lg={10}>
          <Card>
            <Image
              src={displayRecord.imageUrl}
              alt="Scan"
              style={{ width: '100%', borderRadius: 8 }}
            />
          </Card>

          {/* Location Map Placeholder */}
          {displayRecord.latitude && displayRecord.longitude && (
            <Card style={{ marginTop: 16 }}>
              <Space>
                <EnvironmentOutlined style={{ fontSize: 16, color: '#1890ff' }} />
                <Text strong>GPS Location</Text>
              </Space>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  {displayRecord.latitude.toFixed(6)}, {displayRecord.longitude.toFixed(6)}
                </Text>
              </div>
              {displayRecord.storeLocation && (
                <div style={{ marginTop: 8 }}>
                  <Text>{displayRecord.storeLocation}</Text>
                </div>
              )}
            </Card>
          )}
        </Col>

        {/* Right Column - Details (Full width on mobile) */}
        <Col xs={24} lg={14}>
          {/* Retry History Card */}
          {displayRecord.retryHistory && displayRecord.retryHistory.length > 0 && (
            <Card
              style={{
                background: '#f6f8fa',
                border: '1px solid #d1d5db',
                marginBottom: 16,
              }}
            >
              <Space style={{ marginBottom: 12 }}>
                <HistoryOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />
                <Title level={5} style={{ margin: 0 }}>
                  Retry History ({displayRecord.retryHistory.length} attempts)
                </Title>
              </Space>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {displayRecord.retryHistory.map((attempt, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      backgroundColor: '#fff',
                      borderRadius: 6,
                      border: `1px solid ${attempt.success ? '#52c41a' : '#ff4d4f'}`,
                    }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          {attempt.success ? (
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                          )}
                          <Text strong>Attempt {attempt.attemptNumber}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(attempt.timestamp).format('MMM DD, HH:mm')}
                        </Text>
                      </Space>
                      {attempt.error && <Text type="danger" style={{ fontSize: 12 }}>{attempt.error}</Text>}
                      {attempt.cost && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Cost: ${(attempt.cost.totalCostUsd ?? 0).toFixed(4)}
                        </Text>
                      )}
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Result Card */}
          {displayRecord.aiResult && (
            <Card
              style={{
                background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                border: '2px solid #722ed1',
                marginBottom: 16,
              }}
            >
              <Space style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 18 }}>✨</Text>
                <Title level={4} style={{ margin: 0, color: '#722ed1' }}>
                  AI Recognition Result
                </Title>
              </Space>

              <Descriptions column={1} size="small">
                {displayRecord.aiResult.title && (
                  <Descriptions.Item label="Product">
                    <Text strong style={{ fontSize: 16 }}>
                      {displayRecord.aiResult.title}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.price && (
                  <Descriptions.Item label="Price">
                    <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                      {displayRecord.aiResult.price}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.category && (
                  <Descriptions.Item label="Category">{displayRecord.aiResult.category}</Descriptions.Item>
                )}

                {displayRecord.aiResult.brand && (
                  <Descriptions.Item label="Brand">{displayRecord.aiResult.brand}</Descriptions.Item>
                )}

                {displayRecord.aiResult.size && (
                  <Descriptions.Item label="Size">{displayRecord.aiResult.size}</Descriptions.Item>
                )}

                {displayRecord.aiResult.description && (
                  <Descriptions.Item label="Description">{displayRecord.aiResult.description}</Descriptions.Item>
                )}

                {displayRecord.aiResult.confidence && (
                  <Descriptions.Item label="Confidence">
                    <Tag color={displayRecord.aiResult.confidence >= 0.8 ? 'green' : 'orange'}>
                      {Math.round(displayRecord.aiResult.confidence * 100)}%
                    </Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* AI Failed Card with Retry Button */}
          {displayRecord.aiError && (
            <Card
              style={{
                background: '#fff1f0',
                border: '2px solid #ff4d4f',
                marginBottom: 16,
              }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space style={{ marginBottom: 8 }}>
                    <CloseCircleOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />
                    <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                      AI Processing Failed
                    </Title>
                  </Space>
                  {canRetry(displayRecord) && (
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={handleRetry}
                      loading={retrying}
                      size="small"
                    >
                      Retry AI
                    </Button>
                  )}
                </Space>
                <Text type="danger">{displayRecord.aiError}</Text>
                {displayRecord.retryCount && displayRecord.retryCount >= 3 && (
                  <Alert
                    message="Maximum retry attempts reached"
                    description="This record has reached the maximum number of retry attempts (3). Please check the image quality or contact support."
                    type="warning"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )}
              </Space>
            </Card>
          )}

          {/* AI Pending Card with Retry Button */}
          {!displayRecord.aiProcessed && !displayRecord.aiError && (
            <Card
              style={{
                background: '#fffbe6',
                border: '2px solid #faad14',
                marginBottom: 16,
              }}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Space style={{ marginBottom: 8 }}>
                    <ClockCircleOutlined style={{ fontSize: 18, color: '#faad14' }} />
                    <Title level={4} style={{ margin: 0, color: '#faad14' }}>
                      AI Processing Pending
                    </Title>
                  </Space>
                  {canRetry(displayRecord) && (
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={handleRetry}
                      loading={retrying}
                      size="small"
                    >
                      Process Now
                    </Button>
                  )}
                </Space>
                <Text type="warning">This record is waiting for AI processing. You can manually trigger processing now.</Text>
              </Space>
            </Card>
          )}

          {/* Basic Information */}
          <Card title="Basic Information">
            <Descriptions column={1}>
              <Descriptions.Item label="Status">{getAIStatusTag()}</Descriptions.Item>
              <Descriptions.Item label="Merchant">
                <Text strong>{displayRecord.merchant}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Barcode">
                <Text code>{displayRecord.barcode}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Username">{displayRecord.username}</Descriptions.Item>
              <Descriptions.Item label="Scanned">
                {dayjs(displayRecord.timestamp).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {displayRecord.uploadTimestamp && (
                <Descriptions.Item label="Uploaded">
                  {dayjs(displayRecord.uploadTimestamp).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {displayRecord.lastRetryAt && (
                <Descriptions.Item label="Last Retry">
                  {dayjs(displayRecord.lastRetryAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* AI Cost Information */}
          {displayRecord.aiCost && (
            <Card title="AI Cost Information" style={{ marginTop: 16 }}>
              <Descriptions column={2}>
                <Descriptions.Item label="Latest Cost">
                  <Text strong style={{ color: '#eb2f96' }}>
                    ${displayRecord.aiCost.totalCostUsd?.toFixed(4)} USD
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Model">{displayRecord.aiCost.model || 'gpt-4o'}</Descriptions.Item>
                <Descriptions.Item label="Input Tokens">{displayRecord.aiCost.inputTokens}</Descriptions.Item>
                <Descriptions.Item label="Output Tokens">{displayRecord.aiCost.outputTokens}</Descriptions.Item>
                <Descriptions.Item label="Total Tokens">{displayRecord.aiCost.totalTokens}</Descriptions.Item>
                <Descriptions.Item label="Processing Time">
                  {displayRecord.aiCost.processingTimeMs}ms
                </Descriptions.Item>
                {displayRecord.totalCostWithRetries && displayRecord.totalCostWithRetries > (displayRecord.aiCost.totalCostUsd || 0) && (
                  <>
                    <Descriptions.Item label="Total Cost (with retries)" span={2}>
                      <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                        ${displayRecord.totalCostWithRetries.toFixed(4)} USD
                      </Text>
                      <Tag color="orange" style={{ marginLeft: 8 }}>
                        {displayRecord.retryCount} retry attempt(s)
                      </Tag>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Metadata */}
          <Card title="Metadata" style={{ marginTop: 16 }}>
            <Descriptions column={1}>
              <Descriptions.Item label="Record ID">
                <Text code>{displayRecord.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="User ID">
                <Text code>{displayRecord.userId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Image Filename">{displayRecord.imageFilename}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
