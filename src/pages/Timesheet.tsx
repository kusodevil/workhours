import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects, PROJECT_COLORS, getUsedColors } from '../context/ProjectContext';
import { Navigate } from 'react-router-dom';
import { Modal } from '../components/ui';
import { Button } from '../components/ui';
import { WeekProgressIndicator } from '../components/WeekProgressIndicator';
import { QuickFillPanel } from '../components/QuickFillPanel';
import { BatchFillModal } from '../components/BatchFillModal';
import { getLastWeekEntries, shiftEntriesToThisWeek, calculateLastWeekStats } from '../utils/dateHelpers';

interface TimeEntryForm {
  projectId: string;
  hours: number;
  date: string;
  note: string;
}

export function Timesheet() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { addEntry, timeEntries } = useTimeEntries();
  const { projects, addProject, updateProject, deleteProject, isLoading: projectsLoading } = useProjects();
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

  // Manage projects modal state
  const [showManageProjects, setShowManageProjects] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Edit project modal state
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectColor, setEditProjectColor] = useState(PROJECT_COLORS[0]);
  const [updatingProject, setUpdatingProject] = useState(false);

  // Quick fill modal state
  const [showBatchFill, setShowBatchFill] = useState(false);

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

  const handleDeleteProject = async (projectId: string) => {
    setDeletingProjectId(projectId);
    const result = await deleteProject(projectId);
    setDeletingProjectId(null);

    if (result.error) {
      setError(result.error);
    } else {
      setProjectToDelete(null);
    }
  };

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setEditingProject(projectId);
      setEditProjectName(project.name);
      setEditProjectColor(project.color);
    }
  };

  // Quick fill handlers
  const handleCopyLastWeek = () => {
    if (!user) return;

    const lastWeek = getLastWeekEntries(timeEntries, user.id);
    if (lastWeek.length === 0) {
      setError('上週無工時記錄，無法複製');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const stats = calculateLastWeekStats(lastWeek);
    const projectNames = Object.keys(stats.projectHours)
      .map(id => projects.find(p => p.id === id)?.name || '未知')
      .join('、');

    if (window.confirm(
      `確定要複製上週的 ${stats.totalEntries} 筆記錄嗎？\n\n` +
      `專案：${projectNames}\n` +
      `總工時：${stats.totalHours} 小時\n\n` +
      `日期將自動調整為本週，您可以在提交前修改。`
    )) {
      const shifted = shiftEntriesToThisWeek(lastWeek);
      setEntries(shifted);
    }
  };

  const handleBatchAdd = (newEntries: TimeEntryForm[]) => {
    setEntries(prev => [...prev, ...newEntries]);
    setShowBatchFill(false);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;

    setUpdatingProject(true);
    const result = await updateProject(editingProject, {
      name: editProjectName.trim(),
      color: editProjectColor,
    });
    setUpdatingProject(false);

    if (result.error) {
      setError(result.error);
    } else {
      setEditingProject(null);
      setEditProjectName('');
      setEditProjectColor(PROJECT_COLORS[0]);
    }
  };

  const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

  // 計算已使用的顏色
  const usedColors = getUsedColors(projects);
  const usedColorsInEdit = editingProject ? getUsedColors(projects, editingProject) : usedColors;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">填寫工時</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">記錄您本週在各專案上投入的時間</p>
      </div>

      {submitted && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-gray-700 rounded-lg text-green-700 dark:text-gray-300">
          工時已成功提交！
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded-lg text-red-700 dark:text-gray-300">
          {error}
        </div>
      )}

      {/* Week Progress Indicator */}
      {user && (
        <div className="mb-6">
          <WeekProgressIndicator entries={timeEntries} userId={user.id} />
        </div>
      )}

      {/* Quick Fill Panel */}
      <div className="mb-6">
        <QuickFillPanel
          onCopyLastWeek={handleCopyLastWeek}
          onShowBatchFill={() => setShowBatchFill(true)}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {entries.map((entry, index) => (
            <div key={index} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Project Select */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      專案
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={entry.projectId}
                        onChange={e => updateFormEntry(index, 'projectId', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                        title="新增專案"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManageProjects(true)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                        title="管理專案"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>

                  {/* Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      時數
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      max="24"
                      step="0.5"
                      value={entry.hours || ''}
                      onChange={e => updateFormEntry(index, 'hours', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="0"
                      required
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      日期
                    </label>
                    <input
                      type="date"
                      value={entry.date}
                      onChange={e => updateFormEntry(index, 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:[color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                {/* Remove Button */}
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    className="mt-6 p-2 text-gray-400 dark:text-gray-500 hover:text-red-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          + 新增一筆工時
        </button>

        {/* Summary & Submit */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">本次填寫總計</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalHours} 小時</p>
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
      <div className="mt-6 p-4 bg-blue-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-blue-900 dark:text-gray-100 mb-2">填寫提示</h3>
        <ul className="text-sm text-blue-700 dark:text-gray-300 space-y-1">
          <li>• 可以一次填寫多個專案的工時</li>
          <li>• 時數最小單位為 0.5 小時</li>
          <li>• 點擊「+」按鈕可新增自訂專案</li>
        </ul>
      </div>

      {/* New Project Modal */}
      <Modal isOpen={showNewProject} onClose={() => setShowNewProject(false)} title="新增專案">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">專案名稱</label>
            <input
              type="text"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="輸入專案名稱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">選擇顏色</label>
            <div className="grid grid-cols-8 gap-2">
              {PROJECT_COLORS.map(color => {
                const isUsed = usedColors.has(color);
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => !isUsed && setNewProjectColor(color)}
                    disabled={isUsed}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newProjectColor === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
                    } ${isUsed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                    title={isUsed ? '此顏色已被使用' : ''}
                  />
                );
              })}
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

      {/* Manage Projects Modal */}
      <Modal isOpen={showManageProjects} onClose={() => setShowManageProjects(false)} title="管理專案">
        <div className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">尚無專案</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-medium text-gray-900 dark:text-gray-100">{project.name}</span>
                    {!project.is_active && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        已停用
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditProject(project.id)}
                      className="text-blue-600 hover:text-blue-700"
                      title="編輯專案"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectToDelete(project.id)}
                      disabled={deletingProjectId === project.id}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50"
                      title="刪除專案"
                    >
                      {deletingProjectId === project.id ? '刪除中...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowManageProjects(false)}
              className="w-full"
            >
              關閉
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Project Modal */}
      {editingProject && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProject(null)}
          title="編輯專案"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">專案名稱</label>
              <input
                type="text"
                value={editProjectName}
                onChange={e => setEditProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入專案名稱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">選擇顏色</label>
              <div className="grid grid-cols-8 gap-2">
                {PROJECT_COLORS.map(color => {
                  const isUsed = usedColorsInEdit.has(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => !isUsed && setEditProjectColor(color)}
                      disabled={isUsed}
                      className={`w-8 h-8 rounded-full transition-all ${
                        editProjectColor === color ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' : ''
                      } ${isUsed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                      title={isUsed ? '此顏色已被使用' : ''}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditingProject(null)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={handleUpdateProject}
                disabled={updatingProject || !editProjectName.trim()}
                className="flex-1"
              >
                {updatingProject ? '更新中...' : '儲存變更'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setProjectToDelete(null)}
          title="確認刪除"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              確定要刪除「<span className="font-semibold">{projects.find(p => p.id === projectToDelete)?.name}</span>」嗎？
            </p>
            <p className="text-sm text-red-600">
              ⚠️ 此操作將同時刪除該專案的所有工時紀錄，且無法復原！
            </p>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setProjectToDelete(null)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                type="button"
                onClick={() => handleDeleteProject(projectToDelete)}
                disabled={deletingProjectId !== null}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deletingProjectId ? '刪除中...' : '確認刪除'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Batch Fill Modal */}
      <BatchFillModal
        isOpen={showBatchFill}
        onClose={() => setShowBatchFill(false)}
        onAddToForm={handleBatchAdd}
        projects={activeProjects}
      />
    </div>
  );
}
