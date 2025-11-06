/**
 * Date Range Filter Component
 * Reusable component for filtering data by date range
 */

import { DatePicker, Space } from 'antd';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { CalendarOutlined } from '@ant-design/icons';

dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangeFilterProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  placeholder?: [string, string];
  allowClear?: boolean;
  size?: 'small' | 'middle' | 'large';
}

/**
 * Quick date range presets
 */
const rangePresets: RangePickerProps['presets'] = [
  {
    label: 'Today',
    value: [dayjs().startOf('day'), dayjs().endOf('day')],
  },
  {
    label: 'Yesterday',
    value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')],
  },
  {
    label: 'This Week',
    value: [dayjs().startOf('week'), dayjs().endOf('week')],
  },
  {
    label: 'Last Week',
    value: [
      dayjs().subtract(1, 'week').startOf('week'),
      dayjs().subtract(1, 'week').endOf('week'),
    ],
  },
  {
    label: 'This Month',
    value: [dayjs().startOf('month'), dayjs().endOf('month')],
  },
  {
    label: 'Last Month',
    value: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ],
  },
  {
    label: 'Last 7 Days',
    value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    label: 'Last 30 Days',
    value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    label: 'Last 90 Days',
    value: [dayjs().subtract(89, 'day').startOf('day'), dayjs().endOf('day')],
  },
  {
    label: 'This Quarter',
    value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')],
  },
  {
    label: 'Last Quarter',
    value: [
      dayjs().subtract(1, 'quarter').startOf('quarter'),
      dayjs().subtract(1, 'quarter').endOf('quarter'),
    ],
  },
  {
    label: 'This Year',
    value: [dayjs().startOf('year'), dayjs().endOf('year')],
  },
  {
    label: 'Last Year',
    value: [
      dayjs().subtract(1, 'year').startOf('year'),
      dayjs().subtract(1, 'year').endOf('year'),
    ],
  },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  placeholder = ['Start Date', 'End Date'],
  allowClear = true,
  size = 'middle',
}) => {
  const handleChange = (dates: null | (Dayjs | null)[]) => {
    if (!onChange) return;

    if (!dates || dates.length === 0) {
      onChange({ startDate: null, endDate: null });
      return;
    }

    onChange({
      startDate: dates[0] ? dates[0].toDate() : null,
      endDate: dates[1] ? dates[1].toDate() : null,
    });
  };

  const rangeValue: [Dayjs | null, Dayjs | null] | null = value?.startDate && value?.endDate
    ? [dayjs(value.startDate), dayjs(value.endDate)]
    : null;

  return (
    <Space>
      <RangePicker
        value={rangeValue}
        onChange={handleChange}
        presets={rangePresets}
        placeholder={placeholder}
        allowClear={allowClear}
        size={size}
        format="YYYY-MM-DD"
        suffixIcon={<CalendarOutlined />}
        style={{ width: 280 }}
      />
    </Space>
  );
};

/**
 * Helper function to check if a date is within range
 */
export const isDateInRange = (date: Date, range: DateRange): boolean => {
  if (!range.startDate || !range.endDate) return true;

  const timestamp = dayjs(date).valueOf();
  const start = dayjs(range.startDate).startOf('day').valueOf();
  const end = dayjs(range.endDate).endOf('day').valueOf();

  return timestamp >= start && timestamp <= end;
};

/**
 * Helper function to get default date range (last 30 days)
 */
export const getDefaultDateRange = (): DateRange => {
  return {
    startDate: dayjs().subtract(29, 'day').startOf('day').toDate(),
    endDate: dayjs().endOf('day').toDate(),
  };
};

/**
 * Helper function to format date range for display
 */
export const formatDateRange = (range: DateRange): string => {
  if (!range.startDate || !range.endDate) return 'All Time';

  const start = dayjs(range.startDate).format('MMM D, YYYY');
  const end = dayjs(range.endDate).format('MMM D, YYYY');

  if (start === end) return start;
  return `${start} - ${end}`;
};
