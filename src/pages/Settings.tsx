import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import type { Department } from '../types/database';

export function Settings() {
  const { isAuthenticated, isLoading: authLoading, profile, user } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch department information
  useEffect(() => {
    const fetchDepartment = async () => {
      if (profile?.department_id) {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('id', profile.department_id)
          .single();

        if (data) {
          setDepartment(data);
        }
      }
    };

    fetchDepartment();
  }, [profile?.department_id]);

  if (authLoading) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setMessage(null);
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setMessage({ type: 'success', text: '頭像更新成功！' });

      // Refresh the page to update avatar
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setMessage({ type: 'error', text: '頭像上傳失敗，請重試' });
    } finally {
      setUploading(false);
    }
  };

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setMessage({ type: 'error', text: '使用者名稱不能為空' });
      return;
    }

    try {
      setMessage(null);
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setMessage({ type: 'success', text: '使用者名稱更新成功！' });

      // Refresh the page to update username
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Error updating username:', error);
      setMessage({ type: 'error', text: '更新失敗，請重試' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setMessage({ type: 'error', text: '請填寫所有密碼欄位' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密碼至少需要 6 個字元' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: '新密碼與確認密碼不一致' });
      return;
    }

    try {
      setChangingPassword(true);

      // Verify current password by creating a temporary client
      const { createClient } = await import('@supabase/supabase-js');
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false, // Don't persist this session
            autoRefreshToken: false,
          },
        }
      );

      const { error: verifyError } = await tempClient.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (verifyError) {
        setMessage({ type: 'error', text: '目前密碼錯誤' });
        setChangingPassword(false);
        return;
      }

      // Update to new password using the original authenticated session
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage({ type: 'success', text: '密碼更新成功！請使用新密碼重新登入' });

      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Log out user after 2 seconds so they can re-login with new password
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: '密碼更新失敗，請重試' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">個人設定</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">管理您的個人資料</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">頭像</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
                  {profile?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              variant="secondary"
            >
              {uploading ? '上傳中...' : '更換頭像'}
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              支援 JPG、PNG 格式，建議尺寸 500x500px
            </p>
          </div>
        </div>
      </div>

      {/* Username Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">使用者名稱</h2>
        <form onSubmit={handleUsernameUpdate}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                使用者名稱
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入使用者名稱"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? '儲存中...' : '儲存變更'}
            </Button>
          </div>
        </form>
      </div>

      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">外觀設定</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            主題模式
          </label>
          <ThemeToggle />
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">變更密碼</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          更新密碼後，系統會自動登出，請使用新密碼重新登入
        </p>
        <form onSubmit={handlePasswordChange}>
          <div className="space-y-4">
            {message && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                目前密碼
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入目前密碼"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                新密碼
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="輸入新密碼（至少 6 個字元）"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                確認新密碼
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="再次輸入新密碼"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? '更新中...' : '更新密碼'}
            </Button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">帳號資訊</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="text-gray-900 dark:text-gray-100">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">部門</p>
            <p className="text-gray-900 dark:text-gray-100">
              {department ? (
                <span>
                  {department.name}
                  <span className="ml-2 text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {department.code}
                  </span>
                </span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">未分配部門</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">帳號建立時間</p>
            <p className="text-gray-900 dark:text-gray-100">
              {new Date(user.created_at).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
