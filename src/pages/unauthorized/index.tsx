/**
 * Unauthorized Page
 * Displayed when user tries to access a resource they don't have permission for
 */

import React from 'react';
import { Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetIdentity, useLogout } from '@refinedev/core';

// ================================
// Unauthorized Page Component
// ================================

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity();

  // Get the path the user was trying to access
  const attemptedPath = location.state?.from || 'this page';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      <Result
        status="403"
        icon={<LockOutlined style={{ fontSize: 72, color: '#faad14' }} />}
        title="Access Denied"
        subTitle={
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <p>
              You don't have permission to access {attemptedPath}.
            </p>
            {identity?.role && (
              <p style={{ color: '#8c8c8c', fontSize: 14, marginTop: 16 }}>
                Your current role: <strong>{identity.role}</strong>
              </p>
            )}
            <p style={{ color: '#8c8c8c', fontSize: 14, marginTop: 8 }}>
              If you believe this is an error, please contact your system administrator.
            </p>
          </div>
        }
        extra={[
          <Button
            type="primary"
            key="home"
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </Button>,
          <Button
            key="back"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>,
          <Button
            key="logout"
            onClick={() => logout()}
          >
            Logout
          </Button>,
        ]}
      />
    </div>
  );
};

export default UnauthorizedPage;
