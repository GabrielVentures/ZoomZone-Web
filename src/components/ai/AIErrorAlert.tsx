/**
 * AI Error Alert Component
 * Displays user-friendly error messages for AI processing failures
 */

import React from "react";
import { Alert, Button, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

export type AIErrorCode = "RATE_LIMIT" | "QUOTA_EXCEEDED" | "NETWORK_ERROR" | "UNKNOWN" | null;

interface AIErrorAlertProps {
  errorCode: AIErrorCode;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

const ERROR_CONFIG: Record<
  Exclude<AIErrorCode, null>,
  {
    type: "error" | "warning" | "info";
    title: string;
    message: string;
    icon: string;
  }
> = {
  RATE_LIMIT: {
    type: "warning",
    title: "Processing Temporarily Busy",
    message:
      "⏸️ High volume detected. Your image has been queued and will be processed automatically. Please wait 1-2 minutes.",
    icon: "⏸️",
  },
  QUOTA_EXCEEDED: {
    type: "info",
    title: "Daily Quota Reached",
    message:
      "📊 Today's AI processing quota has been reached ($10 limit). The system will automatically reset at midnight (UTC+8).",
    icon: "📊",
  },
  NETWORK_ERROR: {
    type: "error",
    title: "Network Connection Issue",
    message: "🌐 Unable to reach the AI service. Please check your internet connection and try again.",
    icon: "🌐",
  },
  UNKNOWN: {
    type: "error",
    title: "Processing Failed",
    message: "❌ The AI processing encountered an unexpected error. Our team has been notified. Please try again later.",
    icon: "❌",
  },
};

export const AIErrorAlert: React.FC<AIErrorAlertProps> = ({ errorCode, errorMessage, onRetry, className }) => {
  if (!errorCode) {
    return null;
  }

  const config = ERROR_CONFIG[errorCode];

  if (!config) {
    return null;
  }

  return (
    <Alert
      type={config.type}
      message={config.title}
      description={
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>{config.message}</div>
          {errorMessage && (
            <div style={{ fontSize: "12px", color: "#8c8c8c", marginTop: "8px" }}>
              Technical details: {errorMessage}
            </div>
          )}
        </Space>
      }
      action={
        onRetry && (
          <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
            Retry Now
          </Button>
        )
      }
      className={className}
      showIcon
      closable={false}
      style={{ marginBottom: "16px" }}
    />
  );
};

/**
 * Get user-friendly error message from error code
 */
export function getFriendlyErrorMessage(errorCode: AIErrorCode): string {
  if (!errorCode) {
    return "AI processing failed. Please try again.";
  }

  const config = ERROR_CONFIG[errorCode];
  return config ? config.message : "An unexpected error occurred.";
}

/**
 * Determine if error is retryable
 */
export function isRetryable(errorCode: AIErrorCode): boolean {
  if (!errorCode) {
    return true;
  }

  // Don't allow immediate retry for quota exceeded (need to wait for reset)
  if (errorCode === "QUOTA_EXCEEDED") {
    return false;
  }

  return true;
}
