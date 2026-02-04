import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { format, startOfWeek, endOfWeek, subWeeks, isWeekend } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { ConfirmModal } from '../components/ui';
import { Card } from '../components/ui';
import { ExportButton } from '../components/ExportButton';
import { TimeEntryEditModal } from '../components/TimeEntryEditModal';
import type { TimeEntry } from '../types/database';

export function MyRecords() {
  const { isAuthenticated, user, profile, isLoading: authLoading } = useAuth();
  const { timeEntries, updateEntry, deleteEntry, isLoading: entriesLoading } = useTimeEntries();
  const { projects, getProjectById } = useProjects();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('all');

  if (authLoading) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userId = user?.id;

  // Generate week options for filter
  const weekOptions = useMemo(() => {
    const options: { value: string; label: string; start: Date; end: Date }[] = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      options.push({
        value: format(weekStart, 'yyyy-MM-dd'),
        label: `${format(weekStart, 'M/d', { locale: zhTW })} - ${format(weekEnd, 'M/d', { locale: zhTW })}`,
        start: weekStart,
        end: weekEnd,
      });
    }
    return options;
  }, []);

  // Get user's entries
  const userEntries = useMemo(() => {
    if (!userId) return [];
    return timeEntries
      .filter(e => e.user_id === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [timeEntries, userId]);

  // Filter entries by selected week
  const filteredEntries = useMemo(() => {
    if (selectedWeek === 'all') return userEntries;

    const selectedOption = weekOptions.find(w => w.value === selectedWeek);
    if (!selectedOption) return userEntries;

    return userEntries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= selectedOption.start && entryDate <= selectedOption.end;
    });
  }, [userEntries, selectedWeek, weekOptions]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, typeof filteredEntries> = {};

    filteredEntries.forEach(entry => {
      const dateKey = entry.date; // 使用原本的日期作為 key

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([dateStr, entries]) => {
        const date = new Date(dateStr);
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        const isWorkday = !isWeekend(date); // 判斷是否為工作日
        const hoursNeeded = isWorkday ? 7 : 0; // 工作日目標 7 小時
        const shortfall = isWorkday ? Math.max(0, hoursNeeded - totalHours) : 0; // 還差多少小時

        return {
          date,
          dateStr,
          entries,
          totalHours,
          isWorkday,
          hoursNeeded,
          shortfall,
        };
      });
  }, [filteredEntries]);

  // Calculate stats (always based on all user entries, not filtered)
  const stats = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);

    const thisWeekHours = userEntries
      .filter(e => new Date(e.date) >= thisWeekStart)
      .reduce((sum, e) => sum + e.hours, 0);

    const lastWeekHours = userEntries
      .filter(e => {
        const d = new Date(e.date);
        return d >= lastWeekStart && d < thisWeekStart;
      })
      .reduce((sum, e) => sum + e.hours, 0);

    const totalHours = userEntries.reduce((sum, e) => sum + e.hours, 0);

    return { thisWeekHours, lastWeekHours, totalHours };
  }, [userEntries]);

  // Calculate filtered stats
  const filteredStats = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
    const entryCount = filteredEntries.length;
    return { totalHours, entryCount };
  }, [filteredEntries]);

  const handleEdit = async (id: string, updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>) => {
    await updateEntry(id, updates);
  };

  const handleDelete = async () => {
    if (deletingEntryId) {
      await deleteEntry(deletingEntryId);
    }
  };

  if (entriesLoading) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">我的工時紀錄</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">查看並管理您過去填寫的工時紀錄</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedWeek}
            onChange={e => setSelectedWeek(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="all">全部週次</option>
            {weekOptions.map((opt, index) => (
              <option key={opt.value} value={opt.value}>
                {index === 0 ? '本週 ' : ''}{opt.label}
              </option>
            ))}
          </select>
          <ExportButton
            entries={filteredEntries}
            projects={projects}
            userName={profile?.username || '使用者'}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">本週工時</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.thisWeekHours} 小時</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">上週工時</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.lastWeekHours} 小時</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500 dark:text-gray-400">累計總工時</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.totalHours} 小時</p>
        </Card>
      </div>

      {/* Filtered Stats */}
      {selectedWeek !== 'all' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-400">
            篩選結果：{filteredStats.entryCount} 筆紀錄
          </span>
          <span className="font-semibold text-blue-900 dark:text-blue-300">
            共 {filteredStats.totalHours} 小時
          </span>
        </div>
      )}

      {/* Daily Records */}
      <div className="space-y-3">
        {entriesByDate.map(day => (
          <Card key={day.dateStr} padding={false} className="overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {format(day.date, 'M月d日 (EEEE)', { locale: zhTW })}
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${
                    day.isWorkday
                      ? day.totalHours >= 7
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {day.totalHours} 小時
                    {day.isWorkday && day.totalHours < 7 && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        (還差 {day.shortfall} 小時)
                      </span>
                    )}
                    {day.isWorkday && day.totalHours >= 7 && (
                      <span className="ml-2">✓</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {day.entries.map(entry => {
                const project = getProjectById(entry.project_id);
                return (
                  <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                    <div className="flex items-center gap-4">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project?.color || '#gray' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{project?.name || '未知專案'}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(entry.date), 'M/d (EEEE)', { locale: zhTW })}
                          {entry.note && ` - ${entry.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.hours} 小時</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingEntry(entry)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="編輯"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingEntryId(entry.id)}
                          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="刪除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {entriesByDate.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {selectedWeek === 'all' ? '尚無工時紀錄' : '此週無工時紀錄'}
          </p>
        </Card>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          projects={projects}
          onClose={() => setEditingEntry(null)}
          onSave={handleEdit}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deletingEntryId}
        onClose={() => setDeletingEntryId(null)}
        onConfirm={handleDelete}
        title="確認刪除"
        message="確定要刪除這筆工時紀錄嗎？此操作無法復原。"
        confirmText="刪除"
        variant="danger"
      />
    </div>
  );
}
