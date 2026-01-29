import { format } from 'date-fns';
import { useWeekProgress } from '../hooks/useWeekProgress';
import { Card } from './ui';
import type { TimeEntry } from '../types/database';

interface WeekProgressIndicatorProps {
  entries: TimeEntry[];
  userId: string;
}

export function WeekProgressIndicator({ entries, userId }: WeekProgressIndicatorProps) {
  const progress = useWeekProgress(entries, userId);

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">本週填寫進度</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            已填 {progress.filledDays}/{progress.totalDays} 天
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">本週工時</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {progress.totalHours} 小時
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 dark:bg-green-400 transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Daily Status */}
      <div className="mt-3 grid grid-cols-7 gap-2">
        {progress.dailyStatus.map((day, i) => {
          // 決定顏色和樣式
          let bgColor = 'bg-gray-100 dark:bg-gray-700';
          let textColor = 'text-gray-400 dark:text-gray-500';
          let titleText = `${format(day.date, 'M/d')}: ${day.hours}h`;

          if (day.filled) {
            if (day.isWorkday) {
              // 工作日
              if (day.isComplete) {
                // 已達標
                bgColor = 'bg-green-500 dark:bg-green-600';
                textColor = 'text-white';
                titleText += ' ✓';
              } else {
                // 未達標
                bgColor = 'bg-orange-400 dark:bg-orange-500';
                textColor = 'text-white';
                titleText += ` (還差 ${day.shortfall}h)`;
              }
            } else {
              // 周末
              bgColor = 'bg-blue-400 dark:bg-blue-500';
              textColor = 'text-white';
            }
          }

          return (
            <div
              key={i}
              className={`text-center py-2 rounded-lg text-xs font-medium transition-colors ${bgColor} ${textColor}`}
              title={titleText}
            >
              <div>{day.dayName}</div>
              {day.filled && (
                <div className="text-[10px] mt-0.5 opacity-90">{day.hours}h</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      {progress.filledDays < 5 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          提示：建議每天填寫工時，避免遺忘細節
        </p>
      )}
    </Card>
  );
}
