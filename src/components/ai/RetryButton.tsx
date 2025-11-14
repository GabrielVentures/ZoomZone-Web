/**
 * Retry Button Component
 * Button to retry a single failed AI processing record
 */

import React, { useState } from "react";
import { Button, message, Tooltip } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { getFunctions, httpsCallable } from "firebase/functions";

interface RetryButtonProps {
  scanId: string;
  onSuccess?: () => void;
  size?: "small" | "middle" | "large";
  type?: "primary" | "default" | "dashed" | "link" | "text";
  block?: boolean;
  className?: string;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  scanId,
  onSuccess,
  size = "small",
  type = "primary",
  block = false,
  className,
}) => {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);

    try {
      const functions = getFunctions();
      const retrySingleScan = httpsCallable(functions, "retrySingleScan");

      const result = await retrySingleScan({ scanId });
      const data = result.data as any;

      if (data.success) {
        message.success("Scan queued for retry successfully!");

        // Notify parent component
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(data.message || "Failed to retry scan");
      }
    } catch (error: any) {
      console.error("Retry error:", error);
      message.error(`Failed to retry: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title="Retry AI processing for this scan">
      <Button
        icon={<ReloadOutlined />}
        onClick={handleRetry}
        loading={loading}
        size={size}
        type={type}
        block={block}
        className={className}
      >
        Retry
      </Button>
    </Tooltip>
  );
};
