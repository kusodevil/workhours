import { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useProjects } from '../context/ProjectContext';
import { useTimeEntries } from '../context/TimeEntryContext';
import { Button, ConfirmModal } from '../components/ui';
import { ThemeToggle } from '../components/ThemeToggle';
import { exportBackup, importBackup, isBackupFile, clearAll } from '../lib/db';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** 把圖片縮到 256px 正方形並轉成 data URL，避免大圖塞爆 IndexedDB */
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings() {
  const { profile, isLoading, updateProfile, reloadProfile } = useUser();
  const { projects, refreshProjects } = useProjects();
  const { timeEntries, refreshEntries } = useTimeEntries();
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; entries: number; projects: number; data: unknown } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (profile) setUsername(profile.username);
  }, [profile]);

  if (isLoading || !profile) {
    return <div className="flex justify-center py-12 text-gray-900 dark:text-gray-100">載入中...</div>;
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_AVATAR_BYTES * 8) {
      setMessage({ type: 'error', text: '圖片太大，請選擇 16MB 以下的圖片' });
      return;
    }

    try {
      setMessage(null);
      setUploading(true);
      const avatar_url = await fileToAvatarDataUrl(file);
      const { error } = await updateProfile({ avatar_url });
      if (error) throw new Error(error);
      setMessage({ type: 'success', text: '頭像更新成功！' });
    } catch (error) {
      console.error('Error updating avatar:', error);
      setMessage({ type: 'error', text: '頭像更新失敗，請重試' });
    } finally {
      setUploading(false);
    }
  };

  const handleUsernameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ type: 'error', text: '名稱不能為空' });
      return;
    }
    setMessage(null);
    setSaving(true);
    const { error } = await updateProfile({ username: username.trim() });
    setSaving(false);
    setMessage(error ? { type: 'error', text: '更新失敗，請重試' } : { type: 'success', text: '名稱更新成功！' });
  };

  const handleExport = async () => {
    const backup = await exportBackup();
    const stamp = backup.exported_at.slice(0, 10);
    downloadJson(`workhours-backup-${stamp}.json`, backup);
    setMessage({ type: 'success', text: '已匯出備份檔' });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackupFile(data)) {
        setMessage({ type: 'error', text: '這不是 WorkHours 的備份檔' });
        return;
      }
      setMessage(null);
      setPendingImport({ name: file.name, entries: data.time_entries.length, projects: data.projects.length, data });
    } catch {
      setMessage({ type: 'error', text: '檔案無法讀取，請確認是 JSON 格式' });
    }
  };

  const confirmImport = async () => {
    if (!pendingImport || !isBackupFile(pendingImport.data)) return;
    try {
      await importBackup(pendingImport.data);
      await Promise.all([reloadProfile(), refreshProjects(), refreshEntries()]);
      setMessage({ type: 'success', text: `已匯入 ${pendingImport.entries} 筆工時、${pendingImport.projects} 個專案` });
    } catch (error) {
      console.error('Error importing backup:', error);
      setMessage({ type: 'error', text: '匯入失敗，資料未變更' });
    } finally {
      setPendingImport(null);
    }
  };

  const handleClear = async () => {
    await clearAll();
    await Promise.all([reloadProfile(), refreshProjects(), refreshEntries()]);
    setConfirmClear(false);
    setMessage({ type: 'success', text: '已清除所有資料' });
  };

  const card = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6';
  const heading = 'text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4';
  const hint = 'text-sm text-gray-500 dark:text-gray-400';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">設定</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">個人資料、外觀與資料備份</p>
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

      {/* Avatar */}
      <div className={card}>
        <h2 className={heading}>頭像</h2>
        <div className="flex items-center gap-6">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1">
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => avatarInputRef.current?.click()} disabled={uploading}>
                {uploading ? '處理中...' : '更換頭像'}
              </Button>
              {profile.avatar_url && (
                <Button type="button" variant="secondary" onClick={() => updateProfile({ avatar_url: null })}>
                  移除
                </Button>
              )}
            </div>
            <p className={`${hint} mt-2`}>圖片會縮成 256×256 存在本機</p>
          </div>
        </div>
      </div>

      {/* Username */}
      <div className={card}>
        <h2 className={heading}>名稱</h2>
        <form onSubmit={handleUsernameUpdate} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="顯示在頁面與匯出報表上的名稱"
            required
          />
          <Button type="submit" disabled={saving}>
            {saving ? '儲存中...' : '儲存變更'}
          </Button>
        </form>
      </div>

      {/* Appearance */}
      <div className={card}>
        <h2 className={heading}>外觀設定</h2>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">主題模式</label>
        <ThemeToggle />
      </div>

      {/* Backup */}
      <div className={card}>
        <h2 className={heading}>資料備份</h2>
        <p className={`${hint} mb-4`}>
          所有資料只存在這台電腦的瀏覽器裡（IndexedDB）。清除瀏覽器資料或換電腦前，請先匯出備份。
          目前有 <span className="font-medium text-gray-900 dark:text-gray-100">{timeEntries.length}</span> 筆工時、
          <span className="font-medium text-gray-900 dark:text-gray-100">{projects.length}</span> 個專案。
        </p>
        <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleExport}>匯出備份 (JSON)</Button>
          <Button type="button" variant="secondary" onClick={() => importInputRef.current?.click()}>
            匯入備份
          </Button>
        </div>
        <p className={`${hint} mt-3`}>匯入會完全取代目前的資料。</p>
      </div>

      {/* Danger zone */}
      <div className={`${card} border-red-200 dark:border-red-900/50`}>
        <h2 className={heading}>清除資料</h2>
        <p className={`${hint} mb-4`}>刪除這個瀏覽器裡的所有工時、專案與個人資料。此動作無法復原。</p>
        <Button type="button" variant="danger" onClick={() => setConfirmClear(true)}>
          清除所有資料
        </Button>
      </div>

      <ConfirmModal
        isOpen={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        onConfirm={confirmImport}
        title="匯入備份"
        message={`將以「${pendingImport?.name}」（${pendingImport?.entries} 筆工時、${pendingImport?.projects} 個專案）完全取代目前的 ${timeEntries.length} 筆工時與 ${projects.length} 個專案。確定要匯入嗎？`}
        confirmText="匯入"
        variant="primary"
      />
      <ConfirmModal
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title="清除所有資料"
        message="確定要刪除所有工時、專案與個人資料嗎？此動作無法復原，建議先匯出備份。"
        confirmText="清除"
        variant="danger"
      />
    </div>
  );
}
