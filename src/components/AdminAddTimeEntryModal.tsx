import { useState } from 'react';
import { format } from 'date-fns';
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
  const [hours, setHours] = useState(7);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectError, setProjectError] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');

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

    if (!date) {
      setDateError('請選擇日期');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    const entries = [{
      project_id: projectId,
      hours,
      date,
      note: note || undefined
    }];

    await onSubmit(entries);

    // 重置表單
    setProjectId('');
    setHours(7);
    setDate(format(new Date(), 'yyyy-MM-dd'));
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
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">每天將填入相同時數</p>
        </div>

        {/* 日期選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            日期 <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={e => {
              setDate(e.target.value);
              setDateError('');
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:[color-scheme:dark]"
          />
          {dateError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
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
            {isSubmitting ? '新增中...' : '新增工時'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
