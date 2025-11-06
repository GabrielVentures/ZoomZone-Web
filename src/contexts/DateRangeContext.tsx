/**
 * Date Range Context
 * Global state for synchronized date range across all pages
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import dayjs, { Dayjs } from 'dayjs';

export interface DateRangeState {
  startDate: Dayjs;
  endDate: Dayjs;
  preset: string;
}

interface DateRangeContextType {
  dateRange: DateRangeState;
  setDateRange: (startDate: Dayjs, endDate: Dayjs, preset?: string) => void;
  setPreset: (preset: string) => void;
}

// Default to last 30 days
const getDefaultDateRange = (): DateRangeState => ({
  startDate: dayjs().subtract(30, 'days').startOf('day'),
  endDate: dayjs().endOf('day'),
  preset: 'last30days',
});

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

/**
 * Date Range Provider
 * Manages global date range state and provides it to all components
 */
export const DateRangeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dateRange, setDateRangeState] = useState<DateRangeState>(getDefaultDateRange());

  const setDateRange = (startDate: Dayjs, endDate: Dayjs, preset: string = 'custom') => {
    setDateRangeState({
      startDate,
      endDate,
      preset,
    });
  };

  const setPreset = (preset: string) => {
    let startDate: Dayjs;
    let endDate: Dayjs = dayjs().endOf('day');

    switch (preset) {
      case 'today':
        startDate = dayjs().startOf('day');
        break;
      case 'yesterday':
        startDate = dayjs().subtract(1, 'day').startOf('day');
        endDate = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'last7days':
        startDate = dayjs().subtract(7, 'days').startOf('day');
        break;
      case 'last30days':
        startDate = dayjs().subtract(30, 'days').startOf('day');
        break;
      case 'thisMonth':
        startDate = dayjs().startOf('month');
        break;
      case 'lastMonth':
        startDate = dayjs().subtract(1, 'month').startOf('month');
        endDate = dayjs().subtract(1, 'month').endOf('month');
        break;
      case 'last3months':
        startDate = dayjs().subtract(3, 'months').startOf('day');
        break;
      case 'thisYear':
        startDate = dayjs().startOf('year');
        break;
      default:
        startDate = dayjs().subtract(30, 'days').startOf('day');
    }

    setDateRangeState({
      startDate,
      endDate,
      preset,
    });
  };

  return (
    <DateRangeContext.Provider value={{ dateRange, setDateRange, setPreset }}>
      {children}
    </DateRangeContext.Provider>
  );
};

/**
 * Hook to use date range context
 */
export const useDateRange = (): DateRangeContextType => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};
