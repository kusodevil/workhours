import { useState } from 'react';
import { format, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { Modal, Button } from './ui';
import type { Project } from '../types/database';

interface TimeEntryForm {
  projectId: string;
  hours: number;
  date: string;
  note: string;
}

interface BatchFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToForm: (entries: TimeEntryForm[]) => void;
  projects: Project[];
}

export function BatchFillModal({ isOpen, onClose, onAddToForm, projects }: BatchFillModalProps) {
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState(7);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // 生成本週所有日期
  const thisWeek = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const weekDays = thisWeek.map(day => ({
    date: day,
    dateStr: format(day, 'yyyy-MM-dd'),
    dayName: format(day, 'EEE', { locale: zhTW }),
    dayLabel: format(day, 'M/d')
  }));

  const handleDayToggle = (dateStr: string) => {
    setSelectedDays(prev =>
      prev.includes(dateStr)
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId || selectedDays.length === 0) {
      return;
    }

    const entries = selectedDays.map(dateStr => ({
      projectId,
      hours,
      date: dateStr,
      note
    }));

    onAddToForm(entries);

    // 重置表單
    setProjectId('');
    setHours(7);
    setSelectedDays([]);
    setNote('');
  };

  const activeProjects = projects.filter(p => p.is_active);
  const canSubmit = projectId && selectedDays.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="批次填寫工時" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 專案選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            專案 <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">請選擇專案</option>
            {activeProjects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">每天將填入相同時數</p>
        </div>

        {/* 日期多選 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            選擇日期（本週） <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => handleDayToggle(day.dateStr)}
                className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                  selectedDays.includes(day.dateStr)
                    ? 'bg-blue-500 dark:bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className="text-xs mb-1">{day.dayName}</div>
                <div className="text-xs">{day.dayLabel}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            已選擇 {selectedDays.length} 天
          </p>
        </div>

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            備註（選填）
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
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
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={!canSubmit}
            className="flex-1"
          >
            加入表單 ({selectedDays.length} 筆)
          </Button>
        </div>
      </form>
    </Modal>
  );
}
