# 開發環境資料庫設定指南

## 步驟 1：建立新的 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊「New Project」
3. 專案名稱：`workhours-dev`
4. 選擇區域（建議選擇 Southeast Asia）
5. 設定資料庫密碼（記得保存）
6. 等待專案建立完成

## 步驟 2：取得開發環境設定

1. 在新專案中，前往 `Settings` → `API`
2. 複製以下資訊：
   - **Project URL**
   - **anon public** key

## 步驟 3：更新本機環境變數

編輯專案根目錄的 `.env` 檔案：

```env
# 開發環境設定
VITE_SUPABASE_URL=你的開發專案_URL
VITE_SUPABASE_ANON_KEY=你的開發專案_ANON_KEY
```

## 步驟 4：執行資料庫設定 SQL

前往 Supabase Dashboard → SQL Editor，執行以下 SQL：

```sql
-- =====================================================
-- WorkHours 開發環境資料庫設定
-- =====================================================

-- 1. 建立 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 建立 projects 表
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. 建立 time_entries 表
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

-- 5. 啟用 Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- 6. 建立輔助函數（繞過 RLS 檢查管理者身份）
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT is_admin FROM profiles WHERE id = user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 建立 profiles 的 RLS 政策
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR is_admin_user(auth.uid())
);

CREATE POLICY "profiles_update"
ON profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR is_admin_user(auth.uid())
)
WITH CHECK (
  auth.uid() = id OR is_admin_user(auth.uid())
);

-- 8. 建立 projects 的 RLS 政策
CREATE POLICY "projects_select"
ON projects FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "projects_insert"
ON projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_update"
ON projects FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "projects_delete"
ON projects FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 9. 建立 time_entries 的 RLS 政策
CREATE POLICY "time_entries_select"
ON time_entries FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "time_entries_insert"
ON time_entries FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "time_entries_update"
ON time_entries FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "time_entries_delete"
ON time_entries FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 10. 建立註冊時自動建立 profile 的 trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, is_admin)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 刪除舊的 trigger（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 建立新的 trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. 設定開發用管理者帳號（請改成你的開發用 email）
-- 註：此步驟需要你先註冊一個開發用帳號後再執行
-- UPDATE profiles
-- SET is_admin = true
-- WHERE email = 'your-dev-email@example.com';

-- =====================================================
-- 設定完成！
-- =====================================================
```

## 步驟 5：註冊開發用管理者帳號

1. 啟動本機開發環境：`npm run dev`
2. 前往註冊頁面註冊一個開發用帳號
3. 回到 Supabase SQL Editor 執行：

```sql
-- 將你的開發帳號設為管理者
UPDATE profiles
SET is_admin = true
WHERE email = 'your-dev-email@example.com';
```

## 步驟 6：設定 Supabase Email 認證

前往 `Authentication` → `Providers` → `Email`：
- 啟用 `Enable Email provider`
- **關閉** `Confirm email`（開發環境不需要驗證 email）

## 步驟 7：設定 Supabase Storage（頭像上傳功能）

### 7.1 建立 Storage Bucket

1. 前往 Supabase Dashboard → `Storage`
2. 點擊「New bucket」
3. 填寫設定：
   - Name: `avatars`
   - Public bucket: **勾選**（使頭像可以公開存取）
4. 點擊「Create bucket」

### 7.2 設定 Storage 政策

前往剛建立的 `avatars` bucket → `Policies` → 點擊「New policy」

建立以下兩個政策：

**政策 1: 允許已登入用戶上傳自己的頭像**

```sql
-- Policy name: Users can upload their own avatar
-- Allowed operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**政策 2: 允許已登入用戶更新自己的頭像**

```sql
-- Policy name: Users can update their own avatar
-- Allowed operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**政策 3: 允許所有人讀取頭像**

```sql
-- Policy name: Anyone can view avatars
-- Allowed operation: SELECT
-- Target roles: public

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

**政策 4: 允許用戶刪除自己的頭像**

```sql
-- Policy name: Users can delete their own avatar
-- Allowed operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 7.3 測試頭像功能

1. 登入開發環境
2. 前往「個人設定」頁面
3. 點擊「更換頭像」上傳圖片
4. 確認頭像顯示在右上角導覽列

## 步驟 8：確認 Vercel 環境變數

確保 Vercel 使用生產環境設定：

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 選擇你的專案 → Settings → Environment Variables
3. 確認以下變數設定為**生產環境**的值：
   - `VITE_SUPABASE_URL` = 生產專案 URL
   - `VITE_SUPABASE_ANON_KEY` = 生產專案 ANON_KEY

## 完成！

現在你有兩個獨立的環境：

- 🔧 **開發環境**：本機 `.env` → workhours-dev
- 🚀 **生產環境**：Vercel 環境變數 → workhours

可以安心在本機開發和測試，不會影響正式環境的資料！
