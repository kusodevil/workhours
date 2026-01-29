import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Department, UserRole } from '../types/database';

interface AdminCreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (username: string, password: string, departmentId: string, role: UserRole) => Promise<void>;
}

export function AdminCreateUserModal({ isOpen, onClose, onSubmit }: AdminCreateUserModalProps) {
  const { isSuperAdmin, departmentId } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 載入部門列表
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      // 自動選擇當前部門（如果不是 Super Admin）
      if (!isSuperAdmin && departmentId) {
        setSelectedDepartment(departmentId);
      }
    }
  }, [isOpen, isSuperAdmin, departmentId]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setDepartments(data);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 驗證必填欄位
    if (!username.trim()) {
      setError('請填寫使用者名稱');
      return;
    }

    if (!password.trim()) {
      setError('請填寫密碼');
      return;
    }

    if (!selectedDepartment) {
      setError('請選擇部門');
      return;
    }

    // 驗證 username（允許英文、數字、底線、中文）
    if (username.length < 2) {
      setError('使用者名稱至少需要 2 個字元');
      return;
    }

    // 驗證密碼
    if (password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(username, password, selectedDepartment, selectedRole);
      // 成功後重置表單
      setUsername('');
      setPassword('');
      setSelectedDepartment('');
      setSelectedRole('member');
      onClose();
    } catch (err: any) {
      setError(err.message || '建立使用者失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setUsername('');
      setPassword('');
      setSelectedDepartment('');
      setSelectedRole('member');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              新增使用者
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                使用者名稱 *
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入使用者名稱"
                disabled={loading}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                可使用中文、英文、數字，至少 2 個字元
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                密碼 *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入密碼"
                disabled={loading}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                至少 6 個字元
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                部門 *
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={!isSuperAdmin || loading}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
              >
                <option value="">選擇部門</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {!isSuperAdmin && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  只能在您的部門建立使用者
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                角色 *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="member">一般成員</option>
                <option value="department_admin">部門管理員</option>
                {isSuperAdmin && <option value="super_admin">超級管理員</option>}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedRole === 'super_admin' && '可管理所有部門'}
                {selectedRole === 'department_admin' && '可管理本部門使用者'}
                {selectedRole === 'member' && '只能管理自己的工時記錄'}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '建立中...' : '建立使用者'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>提示：</strong>建立後，使用者可以使用「使用者名稱」和「密碼」登入系統。新使用者將被分配到指定部門，並擁有對應的權限。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
