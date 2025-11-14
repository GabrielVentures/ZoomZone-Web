/**
 * Batch Retry Modal Component
 * Allows users to retry all failed AI processing records at once
 */

import React, { useState } from "react";
import { Modal, Button, Space, Alert, Progress, Statistic, Row, Col, message } from "antd";
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { getFunctions, httpsCallable } from "firebase/functions";

interface BatchRetryModalProps {
  visible: boolean;
  failedCount: number;
  onClose: () => void;
  onSuccess?: (retriedCount: number) => void;
}

export const BatchRetryModal: React.FC<BatchRetryModalProps> = ({ visible, failedCount, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    status: "idle" | "retrying" | "completed" | "error";
    retriedCount: number;
    batchRetryId?: string;
  }>({
    status: "idle",
    retriedCount: 0,
  });

  const handleRetry = async () => {
    setLoading(true);
    setProgress({ status: "retrying", retriedCount: 0 });

    try {
      const functions = getFunctions();
      const retryFailedScans = httpsCallable(functions, "retryFailedScans");

      const result = await retryFailedScans({
        limit: 100, // Retry up to 100 failed scans
      });

      const data = result.data as any;

      if (data.success) {
        setProgress({
          status: "completed",
          retriedCount: data.retriedCount,
          batchRetryId: data.batchRetryId,
        });

        message.success(`${data.retriedCount} scans queued for retry successfully!`);

        // Notify parent component
        if (onSuccess) {
          onSuccess(data.retriedCount);
        }

        // Auto close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(data.message || "Failed to retry scans");
      }
    } catch (error: any) {
      console.error("Batch retry error:", error);
      setProgress({ status: "error", retriedCount: 0 });
      message.error(`Failed to retry scans: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const estimatedTime = Math.ceil((failedCount * 30) / 60); // 30 seconds per scan, convert to minutes

  return (
    <Modal
      title={
        <Space>
          <SyncOutlined spin={progress.status === "retrying"} />
          Batch Retry Failed AI Processing
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={
        progress.status === "completed"
          ? [
              <Button key="close" type="primary" onClick={onClose}>
                Close
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={onClose} disabled={loading}>
                Cancel
              </Button>,
              <Button key="retry" type="primary" onClick={handleRetry} loading={loading} disabled={failedCount === 0}>
                Retry All
              </Button>,
            ]
      }
      width={600}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Status Alert */}
        {progress.status === "idle" && (
          <Alert
            message="Ready to Retry"
            description={`You have ${failedCount} failed scans. Click "Retry All" to queue them for reprocessing.`}
            type="info"
            showIcon
          />
        )}

        {progress.status === "retrying" && (
          <Alert
            message="Processing..."
            description="Queueing failed scans for retry. Please wait..."
            type="info"
            showIcon
            icon={<SyncOutlined spin />}
          />
        )}

        {progress.status === "completed" && (
          <Alert
            message="Successfully Queued!"
            description={`${progress.retriedCount} scans have been queued for retry. AI processing will begin shortly.`}
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
          />
        )}

        {progress.status === "error" && (
          <Alert
            message="Retry Failed"
            description="An error occurred while queueing scans for retry. Please try again later."
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
          />
        )}

        {/* Statistics */}
        {progress.status !== "completed" && progress.status !== "error" && (
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Failed Scans"
                value={failedCount}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Est. Processing Time"
                value={estimatedTime}
                suffix="min"
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: "#1890ff" }}
              />
            </Col>
          </Row>
        )}

        {/* Progress Bar (shown during retry) */}
        {progress.status === "retrying" && (
          <Progress
            percent={50}
            status="active"
            strokeColor={{
              from: "#108ee9",
              to: "#87d068",
            }}
          />
        )}

        {/* Information Box */}
        {progress.status === "idle" && (
          <Alert
            message="How it works"
            description={
              <Space direction="vertical">
                <div>1. Failed scans will be added to a processing queue</div>
                <div>2. Each scan will be retried automatically with intelligent rate limiting</div>
                <div>3. You can monitor progress in the scan records list</div>
                <div>4. Processing time: approximately 30 seconds per scan</div>
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ background: "#f0f5ff", border: "1px solid #adc6ff" }}
          />
        )}
      </Space>
    </Modal>
  );
};
