import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, subWeeks, subMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import type { Profile, TimeEntry } from '../types/database';
import { Button } from '../components/ui';
import { ConfirmModal } from '../components/ui';
import { TimeEntryEditModal } from '../components/TimeEntryEditModal';
import { AdminAddTimeEntryModal } from '../components/AdminAddTimeEntryModal';
import { Toast } from '../components/Toast';

export function AdminUsers() {
  const { profile, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { timeEntries, updateEntry, deleteEntry, refreshEntries } = useTimeEntries();
  const { projects, getProjectById } = useProjects();

  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 工時記錄相關狀態
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'last-week' | 'month' | 'all'>('week');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [addingForUser, setAddingForUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      setToast({ message: '載入用戶列表失敗', type: 'error' });
    } else {
      setUsers(data as Profile[]);
    }
    setIsLoading(false);
  };

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setUpdatingUserId(userId);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId);

    if (updateError) {
      setToast({ message: `更新失敗：${updateError.message}`, type: 'error' });
    } else {
      setToast({ message: '權限已更新', type: 'success' });
      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u
      ));
    }

    setUpdatingUserId(null);
  };

  // 根據選定用戶和時間範圍過濾時數記錄
  const getUserEntries = (userId: string) => {
    const userEntries = timeEntries.filter(e => e.user_id === userId);

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(weekStart, 1);
    const monthStart = subMonths(now, 1);

    switch (timeRange) {
      case 'week':
        return userEntries.filter(e => new Date(e.date) >= weekStart).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'last-week':
        return userEntries.filter(e => {
          const date = new Date(e.date);
          return date >= lastWeekStart && date < weekStart;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'month':
        return userEntries.filter(e => new Date(e.date) >= monthStart).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'all':
      default:
        return userEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  };

  // 計算統計資料
  const getEntriesStats = (entries: TimeEntry[]) => ({
    totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
    count: entries.length,
  });

  // 編輯時數記錄
  const handleEditEntry = async (id: string, updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>) => {
    const result = await updateEntry(id, updates);
    if (!result.error) {
      setToast({ message: '工時記錄已更新', type: 'success' });
    } else {
      setToast({ message: `更新失敗：${result.error}`, type: 'error' });
    }
  };

  // 刪除時數記錄
  const handleDeleteEntry = async () => {
    if (deletingEntryId) {
      const result = await deleteEntry(deletingEntryId);
      if (!result.error) {
        setToast({ message: '工時記錄已刪除', type: 'success' });
      } else {
        setToast({ message: `刪除失敗：${result.error}`, type: 'error' });
      }
      setDeletingEntryId(null);
    }
  };

  // 為指定用戶新增工時記錄
  const handleAddEntries = async (entries: Array<{ project_id: string; hours: number; date: string; note?: string }>) => {
    if (!addingForUser) return;

    try {
      // 為每個記錄添加 user_id
      const entriesWithUser = entries.map(entry => ({
        ...entry,
        user_id: addingForUser.id,
        note: entry.note || null,
      }));

      const { error: insertError } = await supabase
        .from('time_entries')
        .insert(entriesWithUser);

      if (insertError) {
        setToast({ message: `新增失敗：${insertError.message}`, type: 'error' });
      } else {
        setToast({ message: `成功為 ${addingForUser.name} 新增工時記錄`, type: 'success' });

        // 刷新時數記錄（不重新載入頁面，保持當前展開狀態）
        await refreshEntries();
      }
    } catch (err) {
      setToast({ message: '新增工時記錄時發生錯誤', type: 'error' });
    }
  };

  // 等待認證狀態載入
  if (authLoading) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  // 未登入，導向登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 已登入但 profile 還在載入中
  if (!profile) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  // 不是管理者，導向首頁
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">管理帳號</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">管理系統用戶和管理者權限</p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">載入中...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">尚無用戶</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <div key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{user.username}</p>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                            管理者
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        註冊時間：{new Date(user.created_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                      {expandedUserId === user.id ? '收起工時' : '查看工時'}
                    </button>
                    <Button
                      type="button"
                      variant={user.is_admin ? 'secondary' : 'primary'}
                      onClick={() => toggleAdmin(user.id, user.is_admin)}
                      disabled={updatingUserId === user.id}
                      className="min-w-[120px]"
                    >
                      {updatingUserId === user.id
                        ? '更新中...'
                        : user.is_admin
                        ? '移除管理者'
                        : '設為管理者'}
                    </Button>
                  </div>
                </div>

                {/* 展開的工時記錄區塊 */}
                {expandedUserId === user.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* 新增工時按鈕 */}
                    <div className="mb-4">
                      <button
                        onClick={() => setAddingForUser({ id: user.id, name: user.username })}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        + 新增工時
                      </button>
                    </div>

                    {/* 時間範圍篩選 */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <button
                        onClick={() => setTimeRange('week')}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          timeRange === 'week'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        本週
                      </button>
                      <button
                        onClick={() => setTimeRange('last-week')}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          timeRange === 'last-week'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        上週
                      </button>
                      <button
                        onClick={() => setTimeRange('month')}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          timeRange === 'month'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        最近一個月
                      </button>
                      <button
                        onClick={() => setTimeRange('all')}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          timeRange === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        全部
                      </button>
                    </div>

                    {(() => {
                      const entries = getUserEntries(user.id);
                      const stats = getEntriesStats(entries);

                      return (
                        <>
                          {/* 統計摘要 */}
                          <div className="flex gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>總時數：<strong className="text-gray-900 dark:text-gray-100">{stats.totalHours}</strong> 小時</span>
                            <span>記錄筆數：<strong className="text-gray-900 dark:text-gray-100">{stats.count}</strong></span>
                          </div>

                          {/* 工時記錄列表 */}
                          {entries.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              此時間範圍內無工時記錄
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {entries.map(entry => {
                                const project = getProjectById(entry.project_id);
                                return (
                                  <div
                                    key={entry.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: project?.color || '#gray' }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {project?.name || '未知專案'}
                                          </span>
                                          <span className="text-sm text-gray-500 dark:text-gray-400">
                                            {format(new Date(entry.date), 'M/d (EEEE)', { locale: zhTW })}
                                          </span>
                                        </div>
                                        {entry.note && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                                            {entry.note}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        {entry.hours} 小時
                                      </span>
                                      <button
                                        onClick={() => setEditingEntry(entry)}
                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                        title="編輯"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                          />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => setDeletingEntryId(entry.id)}
                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                        title="刪除"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">說明</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• 管理者可以查看和管理所有用戶的權限</li>
          <li>• 管理者可以設定其他用戶為管理者</li>
          <li>• 管理者可以查看和編輯所有用戶的工時記錄</li>
          <li>• 至少需要保留一位管理者</li>
        </ul>
      </div>

      {/* 編輯工時 Modal */}
      {editingEntry && (
        <TimeEntryEditModal
          entry={editingEntry}
          projects={projects}
          onClose={() => setEditingEntry(null)}
          onSave={handleEditEntry}
        />
      )}

      {/* 刪除確認 Modal */}
      <ConfirmModal
        isOpen={!!deletingEntryId}
        onClose={() => setDeletingEntryId(null)}
        onConfirm={handleDeleteEntry}
        title="確認刪除"
        message="確定要刪除這筆工時紀錄嗎？此操作無法復原。"
        confirmText="刪除"
        variant="danger"
      />

      {/* 新增工時 Modal */}
      {addingForUser && (
        <AdminAddTimeEntryModal
          isOpen={true}
          onClose={() => setAddingForUser(null)}
          onSubmit={handleAddEntries}
          projects={projects}
          userName={addingForUser.name}
        />
      )}
    </div>
  );
}
