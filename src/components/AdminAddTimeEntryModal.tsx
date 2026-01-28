import { useState, useMemo } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Modal, Button } from './ui';
import type { Project } from '../types/database';

interface AdminAddTimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entries: Array<{ project_id: string; hours: number; date: string; note?: string }>) => Promise<void>;
  projects: Project[];
  userName: string;
}

export function AdminAddTimeEntryModal({ isOpen, onClose, onSubmit, projects, userName }: AdminAddTimeEntryModalProps) {
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState(8);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateFilter, setDateFilter] = useState<'all' | 'weekdays' | 'weekends'>('all');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectError, setProjectError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');

  // 根據開始和結束日期計算所有日期
  const allDates = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return [];

    const dates = eachDayOfInterval({ start, end });

    // 根據過濾條件篩選日期
    return dates.filter(date => {
      const dayOfWeek = date.getDay();
      if (dateFilter === 'weekdays') {
        return dayOfWeek !== 0 && dayOfWeek !== 6;
      } else if (dateFilter === 'weekends') {
        return dayOfWeek === 0 || dayOfWeek === 6;
      }
      return true;
    });
  }, [startDate, endDate, dateFilter]);

  // 快速選擇日期範圍
  const selectThisWeek = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setDateError('');
  };

  const selectLastWeek = () => {
    const start = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const end = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setDateError('');
  };

  const selectThisMonth = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
    setDateError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的錯誤
    setProjectError('');
    setDateError('');

    // 驗證必填欄位
    let hasError = false;

    if (!projectId) {
      setProjectError('請選擇專案');
      hasError = true;
    }

    if (!startDate || !endDate) {
      setDateError('請選擇日期範圍');
      hasError = true;
    } else if (new Date(startDate) > new Date(endDate)) {
      setDateError('結束日期不能早於開始日期');
      hasError = true;
    } else if (allDates.length === 0) {
      setDateError('所選日期範圍內沒有符合條件的日期');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    const entries = allDates.map(date => ({
      project_id: projectId,
      hours,
      date: format(date, 'yyyy-MM-dd'),
      note: note || undefined
    }));

    await onSubmit(entries);

    // 重置表單
    setProjectId('');
    setHours(8);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setDateFilter('all');
    setNote('');
    setProjectError('');
    setDateError('');
    setIsSubmitting(false);
    onClose();
  };

  const activeProjects = projects.filter(p => p.is_active);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`為 ${userName} 新增工時`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 專案選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            專案 <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={projectId}
            onChange={e => {
              setProjectId(e.target.value);
              setProjectError('');
            }}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
              projectError
                ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
            }`}
          >
            <option value="">請選擇專案</option>
            {activeProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {projectError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {projectError}
            </p>
          )}
        </div>

        {/* 時數輸入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            時數 <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="number"
            min="0.5"
            max="24"
            step="0.5"
            value={hours}
            onChange={e => setHours(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark]"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">每天將填入相同時數</p>
        </div>

        {/* 日期範圍選擇 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              日期範圍 <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={selectThisWeek}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                本週
              </button>
              <button
                type="button"
                onClick={selectLastWeek}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                上週
              </button>
              <button
                type="button"
                onClick={selectThisMonth}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                本月
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">開始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">結束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* 日期過濾選項 */}
          <div className="mt-3">
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">包含日期類型</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('weekdays')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'weekdays'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                僅工作日
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('weekends')}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  dateFilter === 'weekends'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                僅週末
              </button>
            </div>
          </div>

          {/* 預覽將新增的日期 */}
          {allDates.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                將新增 <strong>{allDates.length}</strong> 天的工時記錄：
              </p>
              <div className="flex flex-wrap gap-1">
                {allDates.slice(0, 10).map(date => (
                  <span key={date.toISOString()} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                    {format(date, 'M/d (EEE)', { locale: zhTW })}
                  </span>
                ))}
                {allDates.length > 10 && (
                  <span className="text-xs px-2 py-0.5 text-blue-600 dark:text-blue-400">
                    ... 還有 {allDates.length - 10} 天
                  </span>
                )}
              </div>
            </div>
          )}

          {dateError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {dateError}
            </p>
          )}
        </div>

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            備註（選填）
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            rows={2}
            placeholder="所有日期將使用相同備註"
          />
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? '新增中...' : `新增 ${allDates.length} 筆工時`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
