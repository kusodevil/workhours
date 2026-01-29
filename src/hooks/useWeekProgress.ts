import { useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isWeekend } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { TimeEntry } from '../types/database';

export interface WeekProgress {
  filledDays: number;
  totalDays: number;
  percentage: number;
  totalHours: number;
  dailyStatus: Array<{
    date: Date;
    dayName: string;
    filled: boolean;
    hours: number;
    isWorkday: boolean;
    isComplete: boolean;
    shortfall: number;
  }>;
}

export function useWeekProgress(
  entries: TimeEntry[],
  userId: string
): WeekProgress {
  return useMemo(() => {
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(thisWeekStart, { weekStartsOn: 1 });

    // 生成本週所有日期
    const weekDays = eachDayOfInterval({
      start: thisWeekStart,
      end: thisWeekEnd
    });

    // 計算每天的填寫狀態
    const dailyStatus = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayEntries = entries.filter(
        e => e.user_id === userId && e.date === dayStr
      );
      const hours = dayEntries.reduce((sum, e) => sum + e.hours, 0);
      const isWorkday = !isWeekend(day); // 判斷是否為工作日
      const isComplete = isWorkday ? hours >= 8 : hours > 0; // 工作日需達 8 小時，周末有填就算完成
      const shortfall = isWorkday ? Math.max(0, 8 - hours) : 0; // 還差多少小時

      return {
        date: day,
        dayName: format(day, 'EEE', { locale: zhTW }),
        filled: hours > 0,
        hours,
        isWorkday,
        isComplete,
        shortfall
      };
    });

    const filledDays = dailyStatus.filter(d => d.filled).length;
    const totalHours = dailyStatus.reduce((sum, d) => sum + d.hours, 0);

    return {
      filledDays,
      totalDays: 7,
      percentage: (filledDays / 7) * 100,
      totalHours,
      dailyStatus
    };
  }, [entries, userId]);
}
