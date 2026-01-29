import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Department } from '../types/database';

interface AdminDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (department: {
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
  }) => Promise<void>;
  department?: Department | null;
}

export function AdminDepartmentModal({
  isOpen,
  onClose,
  onSubmit,
  department,
}: AdminDepartmentModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!department;

  // 初始化表單（編輯模式）
  useEffect(() => {
    if (isOpen && department) {
      setName(department.name);
      setCode(department.code);
      setDescription(department.description || '');
      setIsActive(department.is_active);
    } else if (isOpen && !department) {
      // 新增模式：重置表單
      setName('');
      setCode('');
      setDescription('');
      setIsActive(true);
    }
    setError('');
  }, [isOpen, department]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 驗證必填欄位
    if (!name.trim()) {
      setError('請填寫部門名稱');
      return;
    }

    if (!code.trim()) {
      setError('請填寫部門代碼');
      return;
    }

    // 驗證 code 格式
    if (!/^[A-Z0-9]+$/.test(code)) {
      setError('部門代碼只能包含大寫英文字母和數字');
      return;
    }

    if (code.length < 2 || code.length > 10) {
      setError('部門代碼長度需為 2-10 個字元');
      return;
    }

    // 唯一性檢查
    setLoading(true);
    try {
      // 檢查 name（排除自己）
      const { data: nameExists } = await supabase
        .from('departments')
        .select('id')
        .eq('name', name.trim())
        .neq('id', department?.id || '00000000-0000-0000-0000-000000000000');

      if (nameExists && nameExists.length > 0) {
        setError('此部門名稱已存在');
        setLoading(false);
        return;
      }

      // 檢查 code（排除自己）
      const { data: codeExists } = await supabase
        .from('departments')
        .select('id')
        .eq('code', code.trim())
        .neq('id', department?.id || '00000000-0000-0000-0000-000000000000');

      if (codeExists && codeExists.length > 0) {
        setError('此部門代碼已存在');
        setLoading(false);
        return;
      }

      // 提交
      await onSubmit({
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        is_active: isActive,
      });

      handleClose();
    } catch (err: any) {
      setError(err.message || '操作失敗');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setCode('');
      setDescription('');
      setIsActive(true);
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isEditMode ? '編輯部門' : '新增部門'}
            </h2>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              aria-label="關閉"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                部門名稱 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
                placeholder="例如：Quality Assurance Team"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                部門代碼 *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading || isEditMode}
                required
                placeholder="例如：QA, DEV, PM"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-700"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {isEditMode ? '部門代碼創建後不可修改' : '2-10 個大寫英文字母或數字'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                部門描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder="選填：部門的職責或說明"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <label
                htmlFor="isActive"
                className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                啟用此部門
              </label>
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
                {loading ? (isEditMode ? '更新中...' : '建立中...') : (isEditMode ? '更新部門' : '建立部門')}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              <strong>提示：</strong>
              {isEditMode
                ? '更新部門資訊後，相關使用者的部門顯示會自動更新。'
                : '部門代碼創建後不可修改，請謹慎填寫。建議使用簡短的英文縮寫。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
