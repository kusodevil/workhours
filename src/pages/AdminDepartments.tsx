import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Department } from '../types/database';
import { AdminDepartmentModal } from '../components/AdminDepartmentModal';
import { ConfirmModal } from '../components/ui';
import { Toast } from '../components/Toast';

interface DepartmentWithCount extends Department {
  userCount?: number;
}

export function AdminDepartments() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<{ id: string; name: string; userCount: number } | null>(null);

  // 權限守衛
  if (!authLoading && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (isSuperAdmin) {
      fetchDepartments();
    }
  }, [isSuperAdmin]);

  const fetchDepartments = async () => {
    setIsLoading(true);

    // 獲取所有部門
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .order('created_at', { ascending: false });

    if (deptError) {
      setToast({ message: '載入部門列表失敗', type: 'error' });
      setIsLoading(false);
      return;
    }

    // 獲取每個部門的使用者數量
    const departmentsWithCount: DepartmentWithCount[] = await Promise.all(
      (deptData || []).map(async (dept) => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('department_id', dept.id);

        return {
          ...dept,
          userCount: count || 0,
        };
      })
    );

    setDepartments(departmentsWithCount);
    setIsLoading(false);
  };

  const handleCreateDepartment = async (departmentData: {
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
  }) => {
    const { error } = await supabase.from('departments').insert({
      name: departmentData.name,
      code: departmentData.code,
      description: departmentData.description || null,
      is_active: departmentData.is_active,
    });

    if (error) {
      throw new Error(error.message);
    }

    setToast({ message: '部門已建立', type: 'success' });
    await fetchDepartments();
  };

  const handleEditDepartment = async (departmentData: {
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
  }) => {
    if (!editingDepartment) return;

    const { error } = await supabase
      .from('departments')
      .update({
        name: departmentData.name,
        // code 不更新（創建後不可編輯）
        description: departmentData.description || null,
        is_active: departmentData.is_active,
      })
      .eq('id', editingDepartment.id);

    if (error) {
      throw new Error(error.message);
    }

    setToast({ message: '部門已更新', type: 'success' });
    setEditingDepartment(null);
    await fetchDepartments();
  };

  const toggleDepartmentStatus = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);

    // 如果要停用，先檢查是否有使用者
    if (currentStatus) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', id);

      if (count && count > 0) {
        setToast({
          message: `此部門有 ${count} 位使用者，無法停用。請先將使用者轉移到其他部門。`,
          type: 'error',
        });
        setTogglingId(null);
        return;
      }
    }

    const { error } = await supabase
      .from('departments')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      setToast({ message: '更新失敗', type: 'error' });
    } else {
      setToast({
        message: currentStatus ? '部門已停用' : '部門已啟用',
        type: 'success',
      });
      await fetchDepartments();
    }

    setTogglingId(null);
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return;

    // 檢查是否有使用者
    if (deletingDepartment.userCount > 0) {
      setToast({
        message: `此部門有 ${deletingDepartment.userCount} 位使用者，無法刪除。請先將使用者轉移到其他部門。`,
        type: 'error',
      });
      setDeletingDepartment(null);
      return;
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', deletingDepartment.id);

    if (error) {
      setToast({ message: `刪除失敗：${error.message}`, type: 'error' });
    } else {
      setToast({ message: '部門已刪除', type: 'success' });
      await fetchDepartments();
    }

    setDeletingDepartment(null);
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">載入中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            部門管理
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            管理公司的部門設定
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新增部門
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Departments List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {departments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">尚無部門資料</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              建立第一個部門
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    部門名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    代碼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    使用者數量
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      !dept.is_active ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {dept.name}
                        </span>
                        {!dept.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            已停用
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {dept.description || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          dept.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {dept.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {dept.userCount || 0} 人
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingDepartment(dept)}
                          className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => toggleDepartmentStatus(dept.id, dept.is_active)}
                          disabled={togglingId === dept.id}
                          className={`px-3 py-1.5 text-sm border rounded-lg ${
                            dept.is_active
                              ? 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              : 'text-green-600 dark:text-green-400 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                          } disabled:opacity-50`}
                        >
                          {togglingId === dept.id
                            ? '處理中...'
                            : dept.is_active
                            ? '停用'
                            : '啟用'}
                        </button>
                        <button
                          onClick={() => setDeletingDepartment({ id: dept.id, name: dept.name, userCount: dept.userCount || 0 })}
                          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AdminDepartmentModal
        isOpen={showCreateModal || !!editingDepartment}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDepartment(null);
        }}
        onSubmit={editingDepartment ? handleEditDepartment : handleCreateDepartment}
        department={editingDepartment}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingDepartment}
        onClose={() => setDeletingDepartment(null)}
        onConfirm={handleDeleteDepartment}
        title="確認刪除部門"
        message={
          deletingDepartment
            ? deletingDepartment.userCount > 0
              ? `部門「${deletingDepartment.name}」有 ${deletingDepartment.userCount} 位使用者，無法刪除。請先將使用者轉移到其他部門後再刪除。`
              : `確定要刪除部門「${deletingDepartment.name}」嗎？此操作無法復原。`
            : ''
        }
        confirmText={deletingDepartment && deletingDepartment.userCount > 0 ? '我知道了' : '刪除'}
        variant="danger"
      />
    </div>
  );
}
