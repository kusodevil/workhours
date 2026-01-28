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
  const [hours, setHours] = useState(entry.hours);
  const [date, setDate] = useState(entry.date);
  const [note, setNote] = useState(entry.note || '');

  const activeProjects = projects.filter(p => p.is_active);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(entry.id, { project_id: projectId, hours, date, note });
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="編輯工時紀錄">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="專案"
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          required
        >
          {activeProjects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Input
          label="時數"
          type="number"
          min={0.5}
          max={24}
          step={0.5}
          value={hours}
          onChange={e => setHours(parseFloat(e.target.value) || 0)}
          required
        />
        <Input
          label="日期"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
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
