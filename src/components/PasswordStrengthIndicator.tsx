/**
 * Password Strength Indicator Component
 * Visual feedback for password strength
 * Shows requirements and suggestions
 */

import React, { useMemo } from 'react';
import { Progress, Space, Typography, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  validatePassword,
  getPasswordRequirements,
  getStrengthColor,
  getStrengthLabel,
  type PasswordRequirement,
} from '@/utils/passwordValidator';

const { Text } = Typography;

// ================================
// Types
// ================================

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  showSuggestions?: boolean;
  compact?: boolean;
}

// ================================
// Component
// ================================

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true,
  showSuggestions = true,
  compact = false,
}) => {
  // Validate password
  const validation = useMemo(() => validatePassword(password), [password]);
  const requirements = useMemo(() => getPasswordRequirements(password), [password]);

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  const strengthColor = getStrengthColor(validation.strength);
  const strengthLabel = getStrengthLabel(validation.strength);

  // Compact view (just the progress bar)
  if (compact) {
    return (
      <Progress
        percent={validation.score}
        strokeColor={strengthColor}
        size="small"
        format={() => strengthLabel}
        status="active"
      />
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {/* Strength indicator */}
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Progress
            percent={validation.score}
            strokeColor={strengthColor}
            size="small"
            style={{ flex: 1, marginBottom: 0 }}
            format={() => null}
          />
          <Tag color={strengthColor}>{strengthLabel}</Tag>
        </div>

        {/* Errors */}
        {validation.errors.length > 0 && (
          <div>
            {validation.errors.map((error, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                <Text type="danger" style={{ fontSize: 12 }}>
                  {error}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* Requirements */}
        {showRequirements && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Password must contain:
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {requirements.map((req: PasswordRequirement, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {req.met ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                  ) : (
                    <CloseCircleOutlined style={{ color: '#d9d9d9', fontSize: 12 }} />
                  )}
                  <Text
                    style={{
                      fontSize: 12,
                      color: req.met ? '#52c41a' : '#8c8c8c',
                    }}
                  >
                    {req.description}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {validation.warnings.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {validation.warnings.map((warning, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <InfoCircleOutlined style={{ color: '#faad14', fontSize: 12 }} />
                <Text type="warning" style={{ fontSize: 12 }}>
                  {warning}
                </Text>
              </div>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && validation.suggestions.length > 0 && validation.isValid && (
          <div style={{ marginTop: 4 }}>
            {validation.suggestions.map((suggestion, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#1890ff' }}>
                  {suggestion}
                </Text>
              </div>
            ))}
          </div>
        )}
      </Space>
    </div>
  );
};
