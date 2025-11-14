/**
 * Scan Record Detail Page - Phase 4.2 Task F.6
 * Detailed view of a single scan record
 * Enhanced with P0.3: Single Record Retry
 */

import { useShow } from '@refinedev/core';
import { Card, Col, Row, Typography, Image, Tag, Descriptions, Space, message, Alert, Skeleton } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EnvironmentOutlined,
  HistoryOutlined,
  LoadingOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { ScanRecord } from '@/types';
import dayjs from 'dayjs';
// ⭐ NEW: AI components
import { AIStatusTag, getAIStatus, AIErrorAlert, RetryButton } from '@/components/ai';

const { Title, Text } = Typography;

export const ScanRecordShow = () => {
  const { queryResult } = useShow<ScanRecord>({
    resource: 'scan_records',
  });

  const { data, isLoading } = queryResult;
  const record = data?.data;

  // Use fetched record directly
  const displayRecord = record;

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
              {displayRecord.storeLocation &&
               displayRecord.storeLocation.toLowerCase() !== 'unknown' &&
               displayRecord.storeLocation.toLowerCase() !== 'unknown store' && (
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
                  <Descriptions.Item label="Total Price">
                    <Text strong style={{ fontSize: 16, color: '#52c41a' }}>
                      {displayRecord.aiResult.price}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.unit_price && (
                  <Descriptions.Item label="Unit Price">
                    <Text style={{ fontSize: 14, color: '#1890ff' }}>
                      {displayRecord.aiResult.unit_price}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.count !== undefined && (
                  <Descriptions.Item label="Count">
                    <Text strong style={{ fontSize: 14 }}>
                      {displayRecord.aiResult.count}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.unit && (
                  <Descriptions.Item label="Unit">{displayRecord.aiResult.unit}</Descriptions.Item>
                )}

                {displayRecord.aiResult.label_date && (
                  <Descriptions.Item label="Tag Date">
                    <Text style={{ fontSize: 14, color: '#722ed1', fontWeight: 600 }}>
                      {displayRecord.aiResult.label_date}
                    </Text>
                  </Descriptions.Item>
                )}

                {displayRecord.aiResult.brand && (
                  <Descriptions.Item label="Brand">{displayRecord.aiResult.brand}</Descriptions.Item>
                )}

                {displayRecord.aiResult.description && (
                  <Descriptions.Item label="Description">{displayRecord.aiResult.description}</Descriptions.Item>
                )}

                {/* AI Extracted SKU */}
                {displayRecord.aiResult.barcode_shelf_tag && (
                  <Descriptions.Item label="SKU (AI)">
                    <Text code style={{ fontSize: 13, fontWeight: 600, color: '#1890ff' }}>
                      {displayRecord.aiResult.barcode_shelf_tag}
                    </Text>
                  </Descriptions.Item>
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

          {/* ⭐ NEW: AI Processing Status Card */}
          <Card title="🤖 AI Processing Status" style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* Status Tag */}
              <div>
                <Text strong>Status: </Text>
                <AIStatusTag
                  status={getAIStatus(displayRecord)}
                  retryCount={displayRecord?.ai_retry_count}
                />
              </div>

              {/* Failed: Show friendly error and retry button */}
              {getAIStatus(displayRecord) === 'failed' && (
                <>
                  <AIErrorAlert
                    errorCode={(displayRecord?.ai_error_code as 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'NETWORK_ERROR' | 'UNKNOWN') || null}
                    errorMessage={displayRecord?.ai_processing_error_message}
                  />
                  <RetryButton
                    scanId={displayRecord?.id || ''}
                    onSuccess={() => {
                      queryResult.refetch();
                      message.success('Scan queued for retry!');
                    }}
                    type="primary"
                    block
                  />
                </>
              )}

              {/* Processing: Show progress */}
              {getAIStatus(displayRecord) === 'processing' && (
                <Alert
                  message="AI is analyzing your image..."
                  description="This usually takes 5-10 seconds. Please wait."
                  type="info"
                  showIcon
                  icon={<LoadingOutlined spin />}
                />
              )}

              {/* Retrying: Show retry info */}
              {getAIStatus(displayRecord) === 'retrying' && (
                <Alert
                  message={`Retrying (Attempt ${displayRecord?.ai_retry_count || 1}/3)...`}
                  description="The system is automatically retrying after a temporary failure."
                  type="warning"
                  showIcon
                  icon={<SyncOutlined spin />}
                />
              )}

              {/* Queued: Show wait time */}
              {getAIStatus(displayRecord) === 'queued' && (
                <Alert
                  message="Processing Queued"
                  description="Your image is in the processing queue. Average wait time: 1-2 minutes."
                  type="info"
                  showIcon
                  icon={<ClockCircleOutlined />}
                />
              )}

              {/* Batch Processing: Show batch info */}
              {getAIStatus(displayRecord) === 'batch_processing' && (
                <Alert
                  message="Batch Processing"
                  description={`Part of batch upload. Position: ${displayRecord?.batch_position || 'N/A'}. Processing in progress...`}
                  type="info"
                  showIcon
                  icon={<LoadingOutlined spin />}
                />
              )}

              {/* Rate Limited: Show friendly message */}
              {getAIStatus(displayRecord) === 'rate_limited' && (
                <>
                  <Alert
                    message="⏸️ Processing Temporarily Paused"
                    description="High volume detected. Your image has been queued and will be processed automatically in 1-2 minutes."
                    type="warning"
                    showIcon
                  />
                  <RetryButton
                    scanId={displayRecord?.id || ''}
                    onSuccess={() => {
                      queryResult.refetch();
                      message.success('Scan queued for retry!');
                    }}
                    type="default"
                    block
                  />
                </>
              )}

              {/* Pending: Show manual trigger option */}
              {getAIStatus(displayRecord) === 'pending' && (
                <>
                  <Alert
                    message="AI Processing Not Started"
                    description="This record is waiting for AI processing. You can manually trigger processing now."
                    type="warning"
                    showIcon
                  />
                  <RetryButton
                    scanId={displayRecord?.id || ''}
                    onSuccess={() => {
                      queryResult.refetch();
                      message.success('AI processing started!');
                    }}
                    type="primary"
                    block
                  />
                </>
              )}
            </Space>
          </Card>

          {/* Basic Information */}
          <Card title="Basic Information">
            <Descriptions column={1}>
              <Descriptions.Item label="Status">
                <AIStatusTag
                  status={getAIStatus(displayRecord)}
                  retryCount={displayRecord?.ai_retry_count}
                />
              </Descriptions.Item>
              {/* Only show storeLocation, ignore merchant field */}
              {displayRecord.storeLocation &&
               displayRecord.storeLocation.toLowerCase() !== 'unknown' &&
               displayRecord.storeLocation.toLowerCase() !== 'unknown store' && (
                <Descriptions.Item label="Store">
                  <Text strong>{displayRecord.storeLocation}</Text>
                </Descriptions.Item>
              )}
              {/* Display SKU only */}
              {(displayRecord.barcode_shelf_tag || displayRecord.aiResult?.barcode_shelf_tag) && (
                <Descriptions.Item label="SKU">
                  <Text code style={{ fontSize: 14, fontWeight: 600, color: '#1890ff' }}>
                    {displayRecord.barcode_shelf_tag || displayRecord.aiResult?.barcode_shelf_tag}
                  </Text>
                </Descriptions.Item>
              )}
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
