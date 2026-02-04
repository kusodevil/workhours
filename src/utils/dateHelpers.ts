import { format, addDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { TimeEntry } from '../types/database';

interface TimeEntryForm {
  projectId: string;
  hours: number;
  date: string;
  note: string;
}

/**
 * 取得指定週次的起始和結束日期
 * @param weeksAgo 往前推幾週 (0 = 本週)
 */
export function getWeekDates(weeksAgo: number = 0) {
  const today = new Date();
  const targetDate = subWeeks(today, weeksAgo);
  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });
  return { start, end };
}

/**
 * 取得指定月份的起始和結束日期
 * @param monthsAgo 往前推幾個月 (0 = 本月)
 */
export function getMonthDates(monthsAgo: number = 0) {
  const today = new Date();
  const targetDate = subMonths(today, monthsAgo);
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  return { start, end };
}

/**
 * 取得上週的工時記錄
 */
export function getLastWeekEntries(
  allEntries: TimeEntry[],
  userId: string
): TimeEntry[] {
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

  return allEntries.filter(e =>
    e.user_id === userId &&
    new Date(e.date) >= lastWeekStart &&
    new Date(e.date) <= lastWeekEnd
  );
}

/**
 * 將工時記錄的日期往後推移到本週
 */
export function shiftEntriesToThisWeek(entries: TimeEntry[]): TimeEntryForm[] {
  const offset = 7; // 天數差
  return entries.map(e => ({
    projectId: e.project_id,
    hours: e.hours,
    date: format(addDays(new Date(e.date), offset), 'yyyy-MM-dd'),
    note: e.note || ''
  }));
}

/**
 * 計算上週工時統計（用於預覽）
 */
export function calculateLastWeekStats(entries: TimeEntry[]) {
  const projectHours: Record<string, number> = {};

  entries.forEach(e => {
    if (!projectHours[e.project_id]) {
      projectHours[e.project_id] = 0;
    }
    projectHours[e.project_id] += e.hours;
  });

  return {
    totalEntries: entries.length,
    totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    projectHours
  };
}
