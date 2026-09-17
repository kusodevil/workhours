import Dexie, { type EntityTable } from 'dexie';
import type { BackupFile, Profile, Project, TimeEntry } from '../types/database';

/**
 * 所有資料都存在瀏覽器的 IndexedDB，沒有任何後端。
 * 換電腦或清除瀏覽器資料前，請先到「設定 → 資料備份」匯出。
 */
export const db = new Dexie('workhours') as Dexie & {
  profile: EntityTable<Profile, 'id'>;
  projects: EntityTable<Project, 'id'>;
  time_entries: EntityTable<TimeEntry, 'id'>;
};

db.version(1).stores({
  profile: 'id',
  projects: 'id, created_at',
  time_entries: 'id, date, project_id',
});

export const newId = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

/** 第一次開啟時建立預設個人檔案 */
export async function getOrCreateProfile(): Promise<Profile> {
  const existing = await db.profile.toCollection().first();
  if (existing) return existing;

  const profile: Profile = {
    id: newId(),
    username: '我',
    avatar_url: null,
    created_at: now(),
  };
  await db.profile.add(profile);
  return profile;
}

export async function exportBackup(): Promise<BackupFile> {
  const [profile, projects, time_entries] = await Promise.all([
    getOrCreateProfile(),
    db.projects.toArray(),
    db.time_entries.toArray(),
  ]);
  return { app: 'workhours', version: 2, exported_at: now(), profile, projects, time_entries };
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.app === 'workhours' &&
    v.version === 2 &&
    typeof v.profile === 'object' &&
    Array.isArray(v.projects) &&
    Array.isArray(v.time_entries)
  );
}

/** 匯入會「完全取代」目前的資料 */
export async function importBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.profile, db.projects, db.time_entries, async () => {
    await Promise.all([db.profile.clear(), db.projects.clear(), db.time_entries.clear()]);
    await db.profile.add(backup.profile);
    await db.projects.bulkAdd(backup.projects);
    await db.time_entries.bulkAdd(backup.time_entries);
  });
}

export async function clearAll(): Promise<void> {
  await db.transaction('rw', db.profile, db.projects, db.time_entries, async () => {
    await Promise.all([db.profile.clear(), db.projects.clear(), db.time_entries.clear()]);
  });
}
