// 本機資料模型（IndexedDB）。欄位沿用 1.x 的 snake_case 命名，讓頁面程式碼不需改動。

export interface Profile {
  id: string;
  username: string;
  /** data URL（圖片直接存在本機） */
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  hours: number;
  date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** 匯出 / 匯入 JSON 的格式 */
export interface BackupFile {
  app: 'workhours';
  version: 2;
  exported_at: string;
  profile: Profile;
  projects: Project[];
  time_entries: TimeEntry[];
}
