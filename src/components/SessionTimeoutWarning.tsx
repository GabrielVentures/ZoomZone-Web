/**
 * Session Timeout Warning Component
 * Displays a modal warning before session timeout
 * Allows user to extend session or logout
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Progress } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useLogout } from '@refinedev/core';
import { sessionManager } from '@/utils/sessionManager';

// ================================
// Types
// ================================

interface SessionTimeoutWarningProps {
  /**
   * Whether to automatically initialize session manager
   * Default: true
   */
  autoInit?: boolean;
}

// ================================
// Component
// ================================

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  autoInit = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const { mutate: logout } = useLogout();

  useEffect(() => {
    if (!autoInit) return;

    // Initialize session manager with callbacks
    sessionManager.init({
      onWarning: (seconds) => {
        setRemainingSeconds(seconds);
        setVisible(true);
      },
      onTimeout: () => {
        setVisible(false);
        logout();
      },
      onActivity: () => {
        // Close warning if user is active
        if (visible) {
          setVisible(false);
        }
      },
    });

    // Countdown timer when warning is visible
    let countdownInterval: NodeJS.Timeout | null = null;

    if (visible && remainingSeconds > 0) {
      countdownInterval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      // Don't destroy session manager on unmount - it should persist
    };
  }, [visible, remainingSeconds, autoInit, logout]);

  /**
   * Handle stay logged in
   */
  const handleStayLoggedIn = () => {
    sessionManager.reset();
    setVisible(false);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    setVisible(false);
    logout();
  };

  // Calculate progress percentage
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / 120) * 100));

  return (
    <Modal
      open={visible}
      closable={false}
      maskClosable={false}
      keyboard={false}
      centered
      footer={null}
      width={480}
    >
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <ClockCircleOutlined
          style={{
            fontSize: 64,
            color: '#faad14',
            marginBottom: 24,
          }}
        />

        <h2 style={{ marginBottom: 16 }}>Session Expiring Soon</h2>

        <p style={{ fontSize: 16, color: '#595959', marginBottom: 24 }}>
          Your session will expire in <strong>{remainingSeconds}</strong> seconds due to inactivity.
        </p>

        <Progress
          percent={progressPercent}
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#ff4d4f',
          }}
          style={{ marginBottom: 32 }}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button
            type="primary"
            size="large"
            onClick={handleStayLoggedIn}
            style={{ minWidth: 140 }}
          >
            Stay Logged In
          </Button>

          <Button size="large" onClick={handleLogout} style={{ minWidth: 140 }}>
            Logout Now
          </Button>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#8c8c8c' }}>
          Click anywhere or perform any action to stay logged in.
        </p>
      </div>
    </Modal>
  );
};
