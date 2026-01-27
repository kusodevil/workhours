import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects, PROJECT_COLORS } from '../context/ProjectContext';
import { Navigate } from 'react-router-dom';
import { Modal } from '../components/ui';
import { Button } from '../components/ui';

interface TimeEntryForm {
  projectId: string;
  hours: number;
  date: string;
  note: string;
}

export function Timesheet() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addEntry } = useTimeEntries();
  const { projects, addProject, isLoading: projectsLoading } = useProjects();
  const [entries, setEntries] = useState<TimeEntryForm[]>([
    { projectId: '', hours: 0, date: new Date().toISOString().split('T')[0], note: '' },
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // New project modal state
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [creatingProject, setCreatingProject] = useState(false);

  if (authLoading) {
    return <div className="flex justify-center py-12">載入中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const activeProjects = projects.filter(p => p.is_active);

  const addFormEntry = () => {
    setEntries([...entries, { projectId: '', hours: 0, date: new Date().toISOString().split('T')[0], note: '' }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateFormEntry = (index: number, field: keyof TimeEntryForm, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Add each entry to the database
    for (const entry of entries) {
      if (entry.projectId && entry.hours > 0) {
        const result = await addEntry({
          project_id: entry.projectId,
          hours: entry.hours,
          date: entry.date,
          note: entry.note || undefined,
        });
        if (result.error) {
          setError(result.error);
          setSubmitting(false);
          return;
        }
      }
    }

    // Reset form
    setEntries([{ projectId: '', hours: 0, date: new Date().toISOString().split('T')[0], note: '' }]);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setCreatingProject(true);
    const result = await addProject(newProjectName.trim(), newProjectColor);
    setCreatingProject(false);

    if (result.error) {
      setError(result.error);
    } else {
      setShowNewProject(false);
      setNewProjectName('');
      setNewProjectColor(PROJECT_COLORS[0]);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">填寫工時</h1>
        <p className="text-gray-500 mt-1">記錄您本週在各專案上投入的時間</p>
      </div>

      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          工時已成功提交！
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          {entries.map((entry, index) => (
            <div key={index} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Project Select */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      專案
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={entry.projectId}
                        onChange={e => updateFormEntry(index, 'projectId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                        required
                        disabled={projectsLoading}
                      >
                        <option value="">選擇專案</option>
                        {activeProjects.map(project => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowNewProject(true)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                        title="新增專案"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      時數
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={entry.hours || ''}
                      onChange={e => updateFormEntry(index, 'hours', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                      placeholder="0"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      日期
                    </label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={e => updateFormEntry(index, 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Remove Button */}
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="mt-6 p-2 text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Note */}
              <div className="mt-3">
                <input
                  type="text"
                  value={entry.note}
                  onChange={e => updateFormEntry(index, 'note', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm"
                  placeholder="備註（選填）"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add Entry Button */}
        <button
          type="button"
          onClick={addFormEntry}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + 新增一筆工時
        </button>

        {/* Summary & Submit */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">本次填寫總計</p>
              <p className="text-2xl font-bold text-gray-900">{totalHours} 小時</p>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交工時'}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h3 className="font-medium text-blue-900 mb-2">填寫提示</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 可以一次填寫多個專案的工時</li>
          <li>• 時數最小單位為 0.5 小時</li>
          <li>• 點擊「+」按鈕可新增自訂專案</li>
        </ul>
      </div>

      {/* New Project Modal */}
      <Modal isOpen={showNewProject} onClose={() => setShowNewProject(false)} title="新增專案">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">專案名稱</label>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none"
              placeholder="輸入專案名稱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">選擇顏色</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewProjectColor(color)}
                  className={`w-8 h-8 rounded-full ${newProjectColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowNewProject(false)}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleCreateProject}
              disabled={creatingProject || !newProjectName.trim()}
              className="flex-1"
            >
              {creatingProject ? '建立中...' : '建立專案'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
