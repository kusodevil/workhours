import { useState } from 'react';
import { Modal, Button, Input, Select } from './ui';
import type { TimeEntry } from '../types/database';

interface Project {
  id: string;
  name: string;
  is_active: boolean;
}

interface TimeEntryEditModalProps {
  entry: TimeEntry;
  projects: Project[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>) => void;
}

export function TimeEntryEditModal({ entry, projects, onClose, onSave }: TimeEntryEditModalProps) {
  const [projectId, setProjectId] = useState(entry.project_id);
  const [hours, setHours] = useState<number | string>(entry.hours);
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note || '');
  const [hoursError, setHoursError] = useState<string>('');

  const activeProjects = projects.filter(p => p.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 清除之前的錯誤
    setHoursError('');

    // 將 hours 轉換為數字並驗證
    const hoursNum = typeof hours === 'string' ? parseFloat(hours) : hours;

    // 驗證時數欄位
    if (hours === '' || !hoursNum || isNaN(hoursNum)) {
      setHoursError('請輸入時數');
      return;
    }

    if (hoursNum < 0.5) {
      setHoursError('時數至少需要 0.5 小時');
      return;
    }

    if (hoursNum > 24) {
      setHoursError('時數不能超過 24 小時');
      return;
    }

    // 驗證其他必填欄位
    if (!projectId || !date) {
      return;
    }

    onSave(entry.id, { project_id: projectId, hours: hoursNum, date, note });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="編輯工時紀錄">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="專案"
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
        >
          {activeProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <div>
          <Input
            label="時數"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            value={hours}
            onChange={e => {
              setHours(e.target.value === '' ? '' : parseFloat(e.target.value));
              setHoursError('');
            }}
            className={hoursError ? 'border-red-500 dark:border-red-400' : ''}
          />
          {hoursError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {hoursError}
            </p>
          )}
        </div>
        <Input
          label="日期"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <Input
          label="備註"
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="選填"
        />
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button type="submit" className="flex-1">
            儲存
          </Button>
        </div>
      </form>
    </Modal>
  );
}
