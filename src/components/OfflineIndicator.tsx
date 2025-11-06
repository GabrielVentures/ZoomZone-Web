/**
 * Offline Indicator Component
 * Displays network status alert when app is offline or connection is restored
 */

import { Alert } from 'antd';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Don't show anything if online and never was offline
  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0',
      }}
    >
      {!isOnline && (
        <Alert
          message="You are offline"
          description="Changes will be saved and synced when connection is restored."
          type="warning"
          banner
          showIcon
        />
      )}
      {isOnline && wasOffline && (
        <Alert
          message="Connection restored"
          description="Your data has been synchronized."
          type="success"
          banner
          showIcon
        />
      )}
    </div>
  );
};
