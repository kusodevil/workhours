import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { Button } from '../components/ui';

export function AdminUsers() {
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError('載入用戶列表失敗');
    } else {
      setUsers(data as Profile[]);
    }
    setIsLoading(false);
  };

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setError('');
    setSuccess('');
    setUpdatingUserId(userId);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId);

    if (updateError) {
      setError(`更新失敗：${updateError.message}`);
    } else {
      setSuccess('管理者權限已更新');
      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u
      ));
      setTimeout(() => setSuccess(''), 3000);
    }

    setUpdatingUserId(null);
  };

  if (authLoading) {
    return <div className="flex justify-center py-12">載入中...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">管理帳號</h1>
        <p className="text-gray-500 mt-1">管理系統用戶和管理者權限</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">尚無用戶</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map(user => (
              <div
                key={user.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xl font-semibold text-blue-600">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{user.username}</p>
                      {user.is_admin && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          管理者
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      註冊時間：{new Date(user.created_at).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                </div>
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
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h3 className="font-medium text-blue-900 mb-2">說明</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 管理者可以查看和管理所有用戶的權限</li>
          <li>• 管理者可以設定其他用戶為管理者</li>
          <li>• 至少需要保留一位管理者</li>
        </ul>
      </div>
    </div>
  );
}
