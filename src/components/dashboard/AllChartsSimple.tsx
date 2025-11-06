/**
 * Simplified Charts - Guaranteed to Display Data
 * All charts replaced with simple table/list views
 */

import { mockDailyStats, mockUserDailyCosts, mockAIStatusDistribution } from '@/mocks/timeSeriesData';

export const SimpleCostTrendChart = () => {
  console.log('💰 [SimpleCostTrendChart] Rendering');
  return (
    <div style={{ padding: 20 }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#fafafa' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Cost (USD)</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Records</th>
          </tr>
        </thead>
        <tbody>
          {mockDailyStats.map((day, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{day.dateFormatted}</td>
              <td style={{ padding: 10, textAlign: 'right', color: '#eb2f96', fontWeight: 'bold' }}>
                ${day.totalCostUsd.toFixed(4)}
              </td>
              <td style={{ padding: 10, textAlign: 'right' }}>{day.totalRecords}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SimpleTokenUsageChart = () => {
  console.log('🔢 [SimpleTokenUsageChart] Rendering');
  return (
    <div style={{ padding: 20 }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#fafafa' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Tokens</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Records</th>
          </tr>
        </thead>
        <tbody>
          {mockDailyStats.map((day, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{day.dateFormatted}</td>
              <td style={{ padding: 10, textAlign: 'right', color: '#1890ff', fontWeight: 'bold' }}>
                {day.totalTokens.toLocaleString()}
              </td>
              <td style={{ padding: 10, textAlign: 'right' }}>{day.totalRecords}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SimpleRecordsActivityChart = () => {
  console.log('📈 [SimpleRecordsActivityChart] Rendering');
  return (
    <div style={{ padding: 20 }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#fafafa' }}>
            <th style={{ padding: 10, textAlign: 'left' }}>Date</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Completed</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Pending</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Failed</th>
            <th style={{ padding: 10, textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {mockDailyStats.map((day, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 10 }}>{day.dateFormatted}</td>
              <td style={{ padding: 10, textAlign: 'right', color: '#52c41a' }}>{day.aiCompleted}</td>
              <td style={{ padding: 10, textAlign: 'right', color: '#faad14' }}>{day.aiPending}</td>
              <td style={{ padding: 10, textAlign: 'right', color: '#ff4d4f' }}>{day.aiFailed}</td>
              <td style={{ padding: 10, textAlign: 'right', fontWeight: 'bold' }}>{day.totalRecords}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const SimpleAIStatusPieChart = () => {
  console.log('📊 [SimpleAIStatusPieChart] Rendering');
  const total = mockAIStatusDistribution.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20, textAlign: 'center', fontSize: 24, fontWeight: 'bold' }}>
        Total: {total} records
      </div>
      {mockAIStatusDistribution.map((item, i) => {
        const percent = total > 0 ? (item.value / total * 100).toFixed(1) : 0;
        return (
          <div key={i} style={{ marginBottom: 15, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 20, height: 20, backgroundColor: item.color, borderRadius: '50%' }}></div>
                <span style={{ fontSize: 16, fontWeight: 500 }}>{item.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{percent}%</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const SimpleUserCostBarChart = () => {
  console.log('👥 [SimpleUserCostBarChart] Rendering');
  const maxCost = Math.max(...mockUserDailyCosts.map(u => u.totalCostUsd));

  return (
    <div style={{ padding: 20 }}>
      {mockUserDailyCosts.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
          No data for today
        </div>
      ) : (
        mockUserDailyCosts.map((user, i) => {
          const barWidth = maxCost > 0 ? (user.totalCostUsd / maxCost * 100) : 0;
          const colors = ['#1890ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1'];
          const color = colors[i % colors.length];

          return (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 5, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500 }}>{user.username}</span>
                <span style={{ fontWeight: 'bold', color }}>${user.totalCostUsd.toFixed(4)}</span>
              </div>
              <div style={{ backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden', height: 30 }}>
                <div
                  style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: color,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 10,
                    color: '#fff',
                    fontSize: 12
                  }}
                >
                  {user.recordCount} records
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
