/**
 * AI Status Tag Component
 * Displays the current AI processing status with appropriate icon and color
 */

import React from "react";
import { Tag, Tooltip } from "antd";
import {
  ClockCircleOutlined,
  LoadingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  InboxOutlined,
  HourglassOutlined,
} from "@ant-design/icons";

export type AIStatus =
  | "pending"
  | "queued"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "rate_limited"
  | "batch_processing";

interface AIStatusTagProps {
  status: AIStatus;
  retryCount?: number;
  className?: string;
}

const STATUS_CONFIG: Record<
  AIStatus,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
    tooltip: string;
  }
> = {
  pending: {
    icon: <HourglassOutlined spin />,
    label: "Pending",
    color: "default",
    tooltip: "Waiting to be processed",
  },
  queued: {
    icon: <ClockCircleOutlined />,
    label: "Queued",
    color: "blue",
    tooltip: "In processing queue. Average wait time: 1-2 minutes",
  },
  processing: {
    icon: <LoadingOutlined spin />,
    label: "Processing",
    color: "orange",
    tooltip: "AI is analyzing the image...",
  },
  retrying: {
    icon: <SyncOutlined spin />,
    label: "Retrying",
    color: "purple",
    tooltip: "Automatically retrying after temporary failure",
  },
  completed: {
    icon: <CheckCircleOutlined />,
    label: "Completed",
    color: "success",
    tooltip: "AI processing completed successfully",
  },
  failed: {
    icon: <CloseCircleOutlined />,
    label: "Failed",
    color: "error",
    tooltip: "AI processing failed. Click retry to try again",
  },
  rate_limited: {
    icon: <PauseCircleOutlined />,
    label: "Rate Limited",
    color: "warning",
    tooltip: "Temporarily paused due to high volume. Will retry automatically",
  },
  batch_processing: {
    icon: <InboxOutlined />,
    label: "Batch Processing",
    color: "cyan",
    tooltip: "Part of a batch upload. Processing in queue",
  },
};

export const AIStatusTag: React.FC<AIStatusTagProps> = ({ status, retryCount, className }) => {
  // Simplify intermediate states: processing, queued, retrying, batch_processing → "Processing..."
  const isProcessingState = ['processing', 'queued', 'retrying', 'batch_processing'].includes(status);

  const config = isProcessingState
    ? {
        icon: <LoadingOutlined spin />,
        label: "Processing...",
        color: "blue",
        tooltip: "AI is processing your image. Please wait...",
      }
    : STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  const label = retryCount && retryCount > 0 && status === 'retrying'
    ? `Processing... (Retry ${retryCount}/3)`
    : config.label;

  return (
    <Tooltip title={config.tooltip}>
      <Tag icon={config.icon} color={config.color} className={className}>
        {label}
      </Tag>
    </Tooltip>
  );
};

/**
 * Get AI status from scan record data
 * Helper function to determine status from various fields
 *
 * Priority: Legacy fields first (for backward compatibility) → New ai_status field
 */
export function getAIStatus(record: any): AIStatus {
  // ===== PRIORITY 1: Legacy fields (for backward compatibility) =====

  // Check if AI completed successfully (has result)
  // ===== PRIORITY 1: ai_status field (most reliable after migration) =====
  if (record.ai_status) {
    return record.ai_status as AIStatus;
  }

  // ===== PRIORITY 2: Legacy checks for old data =====
  if (record.aiProcessed === true && record.aiResult) {
    return "completed";
  }

  // Check if has AI result but aiProcessed flag missing (old data without flag)
  if (record.aiResult && !record.aiProcessed && !record.aiError) {
    return "completed";
  }

  // ===== PRIORITY 3: Intermediate states =====
  if (record.queued_at && !record.processing_started_at) {
    return "queued";
  }

  if (record.processing_started_at && !record.aiProcessed && !record.aiResult) {
    return "processing";
  }

  // ===== DEFAULT: Pending =====
  return "pending";
}
