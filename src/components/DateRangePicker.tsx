/**
 * Shared Date Range Picker Component
 * Synchronized across all pages using DateRangeContext
 */

import { DatePicker, Select, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useDateRange } from '@/contexts/DateRangeContext';

const { RangePicker } = DatePicker;

interface DateRangePickerProps {
  showPresets?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  showPresets = true
}) => {
  const { dateRange, setDateRange, setPreset } = useDateRange();

  const presetOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Last 3 Months', value: 'last3months' },
    { label: 'This Year', value: 'thisYear' },
  ];

  const handleRangeChange = (dates: null | (Dayjs | null)[]) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates[0], dates[1], 'custom');
    }
  };

  const handlePresetChange = (value: string) => {
    setPreset(value);
  };

  return (
    <Space>
      {showPresets && (
        <Select
          value={dateRange.preset}
          onChange={handlePresetChange}
          options={presetOptions}
          style={{ width: 150 }}
        />
      )}
      <RangePicker
        value={[dateRange.startDate, dateRange.endDate]}
        onChange={handleRangeChange}
        format="YYYY-MM-DD"
        allowClear={false}
      />
    </Space>
  );
};
