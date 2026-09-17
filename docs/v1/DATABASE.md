# 資料庫結構說明

本文件說明 WorkHours 的資料庫結構和設定流程。

## 📋 目錄

- [資料庫架構](#資料庫架構)
- [設定步驟](#設定步驟)
- [資料表詳細說明](#資料表詳細說明)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Storage 設定](#storage-設定)

## 🗄️ 資料庫架構

### ER Diagram

\`\`\`
profiles (使用者資料)
  ↓
time_entries (工時紀錄)
  ↓
projects (專案)
\`\`\`

## 🚀 設定步驟

請按順序執行以下 SQL 腳本：

### 1. 建立 profiles 表格

\`\`\`sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    NULL
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
\`\`\`

### 2. 建立 projects 表格

\`\`\`sql
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Projects are viewable by everyone"
  ON projects FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = created_by);
\`\`\`

### 3. 建立 time_entries 表格

\`\`\`sql
CREATE TABLE time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  project_id UUID REFERENCES projects(id) NOT NULL,
  hours NUMERIC(4,1) NOT NULL CHECK (hours > 0 AND hours <= 24),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view all time entries (for dashboard)"
  ON time_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
\`\`\`

### 4. 建立索引

\`\`\`sql
-- Improve query performance
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_is_active ON projects(is_active);
\`\`\`

## 📊 資料表詳細說明

### profiles (使用者資料表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| id | UUID | 主鍵，對應 auth.users | PRIMARY KEY |
| username | TEXT | 使用者名稱 | NOT NULL, UNIQUE |
| email | TEXT | Email | NOT NULL, UNIQUE |
| avatar_url | TEXT | 頭像 URL | NULLABLE |
| created_at | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT now() |

### projects (專案表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| name | TEXT | 專案名稱 | NOT NULL |
| description | TEXT | 專案描述 | NULLABLE |
| color | TEXT | 顏色代碼（HEX） | NOT NULL |
| is_active | BOOLEAN | 是否啟用 | DEFAULT true |
| created_by | UUID | 建立者 | FOREIGN KEY profiles(id) |
| created_at | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT now() |

### time_entries (工時紀錄表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| id | UUID | 主鍵 | PRIMARY KEY |
| user_id | UUID | 使用者 ID | FOREIGN KEY profiles(id) |
| project_id | UUID | 專案 ID | FOREIGN KEY projects(id) |
| hours | NUMERIC(4,1) | 工時 | 0 < hours <= 24 |
| date | DATE | 日期 | NOT NULL |
| note | TEXT | 備註 | NULLABLE |
| created_at | TIMESTAMP | 建立時間 | NOT NULL, DEFAULT now() |
| updated_at | TIMESTAMP | 更新時間 | NOT NULL, DEFAULT now() |

## 🔐 Row Level Security (RLS)

### profiles
- **SELECT**: 所有人可以查看所有使用者資料（用於顯示團隊成員）
- **INSERT**: 使用者只能建立自己的資料
- **UPDATE**: 使用者只能更新自己的資料

### projects
- **SELECT**: 所有人可以查看所有專案
- **INSERT**: 認證使用者可以建立專案
- **UPDATE**: 使用者只能更新自己建立的專案

### time_entries
- **SELECT**: 使用者可以查看自己的工時紀錄，以及所有工時紀錄（用於團隊儀表板）
- **INSERT**: 認證使用者可以新增自己的工時紀錄
- **UPDATE**: 使用者只能更新自己的工時紀錄
- **DELETE**: 使用者只能刪除自己的工時紀錄

## 💾 Storage 設定

### 建立 avatars bucket

\`\`\`sql
-- 建立 avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- 設定 storage policies - 允許使用者上傳自己的頭像
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允許所有人讀取頭像
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 允許使用者更新自己的頭像
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 允許使用者刪除自己的頭像
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
\`\`\`

## 🔧 維護

### 備份

建議定期備份資料庫，Supabase 提供每日自動備份功能。

### 清理舊資料

如需清理超過一年的舊工時紀錄：

\`\`\`sql
DELETE FROM time_entries
WHERE date < CURRENT_DATE - INTERVAL '1 year';
\`\`\`

### 統計查詢

查看系統使用統計：

\`\`\`sql
-- 使用者數量
SELECT COUNT(*) FROM profiles;

-- 專案數量
SELECT COUNT(*) FROM projects WHERE is_active = true;

-- 本月總工時
SELECT SUM(hours) FROM time_entries
WHERE date >= DATE_TRUNC('month', CURRENT_DATE);

-- 最活躍的專案
SELECT p.name, COUNT(*) as entry_count, SUM(te.hours) as total_hours
FROM time_entries te
JOIN projects p ON te.project_id = p.id
WHERE te.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.name
ORDER BY total_hours DESC
LIMIT 10;
\`\`\`

## 🐛 故障排除

### 常見問題

1. **無法建立工時紀錄**
   - 檢查 RLS policies 是否正確設定
   - 確認使用者已登入

2. **無法上傳頭像**
   - 檢查 Storage policies 是否正確
   - 確認 avatars bucket 已建立

3. **查詢效能問題**
   - 檢查索引是否已建立
   - 考慮新增額外的索引

---

更新日期：2026-01-27
版本：1.0.0
