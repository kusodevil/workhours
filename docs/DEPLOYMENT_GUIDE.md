# 部署指南 - 完整移交文件

> ⚠️ **重要聲明**：本系統為個人學習專案，智慧財產權屬於原作者。

## 系統架構

- **前端框架**：React 19 + TypeScript + Vite
- **樣式系統**：Tailwind CSS 4
- **後端服務**：Supabase (BaaS)
- **部署平台**：Vercel
- **版本控制**：GitHub

## 完整部署步驟

### 1. 準備新的 Supabase 專案

1. 前往 [Supabase](https://supabase.com) 註冊/登入
2. 建立新專案（選擇合適的區域，建議 Singapore）
3. 等待專案建立完成（約 2-3 分鐘）

### 2. 設定資料庫結構

在 Supabase Dashboard → SQL Editor，依序執行以下 SQL：

#### 2.1 建立 departments 資料表
```sql
-- 部門資料表
create table public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  code text not null unique,
  description text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 啟用 RLS
alter table public.departments enable row level security;

-- RLS 政策：所有人可讀取啟用的部門
create policy "Everyone can read active departments"
  on public.departments for select
  using (is_active = true);

-- RLS 政策：超級管理員可以管理所有部門
create policy "Super admins can manage all departments"
  on public.departments for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );
```

#### 2.2 建立 profiles 資料表
```sql
-- 使用者 profiles
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  avatar_url text,
  role text default 'member' check (role in ('member', 'department_admin', 'super_admin')),
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 啟用 RLS
alter table public.profiles enable row level security;

-- RLS 政策：使用者可以讀取自己的 profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- RLS 政策：使用者可以更新自己的 profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS 政策：部門管理員可以讀取同部門的 profiles
create policy "Department admins can read department profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid()
      and p.role in ('department_admin', 'super_admin')
      and (p.role = 'super_admin' or p.department_id = profiles.department_id)
    )
  );

-- RLS 政策：超級管理員可以管理所有 profiles
create policy "Super admins can manage all profiles"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid()
      and p.role = 'super_admin'
    )
  );
```

#### 2.3 建立 projects 資料表
```sql
-- 專案資料表
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#3b82f6',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 啟用 RLS
alter table public.projects enable row level security;

-- RLS 政策：所有認證使用者可以讀取專案
create policy "Authenticated users can read projects"
  on public.projects for select
  to authenticated
  using (true);

-- RLS 政策：認證使用者可以建立專案
create policy "Authenticated users can create projects"
  on public.projects for insert
  to authenticated
  with check (true);
```

#### 2.4 建立 time_entries 資料表
```sql
-- 工時記錄資料表
create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  hours numeric not null check (hours > 0),
  description text,
  entry_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 啟用 RLS
alter table public.time_entries enable row level security;

-- RLS 政策：使用者可以讀取自己的工時記錄
create policy "Users can read own time entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

-- RLS 政策：使用者可以建立自己的工時記錄
create policy "Users can create own time entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

-- RLS 政策：使用者可以更新自己的工時記錄
create policy "Users can update own time entries"
  on public.time_entries for update
  using (auth.uid() = user_id);

-- RLS 政策：使用者可以刪除自己的工時記錄
create policy "Users can delete own time entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- RLS 政策：部門管理員可以讀取同部門的工時記錄
create policy "Department admins can read department time entries"
  on public.time_entries for select
  using (
    exists (
      select 1 from public.profiles as p1
      join public.profiles as p2 on p1.department_id = p2.department_id
      where p1.id = auth.uid()
      and p2.id = time_entries.user_id
      and p1.role in ('department_admin', 'super_admin')
    )
  );

-- RLS 政策：超級管理員可以讀取所有工時記錄
create policy "Super admins can read all time entries"
  on public.time_entries for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'super_admin'
    )
  );
```

#### 2.5 建立 Trigger 自動建立 profile
```sql
-- 當新使用者註冊時，自動建立 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- 建立 trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

#### 2.6 建立 Storage Bucket (頭像上傳)
```sql
-- 在 Supabase Dashboard → Storage 建立名為 'avatars' 的 bucket
-- 或使用 SQL：
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

-- Storage 政策：允許認證使用者上傳自己的頭像
create policy "Users can upload own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage 政策：允許所有人讀取頭像
create policy "Anyone can read avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');
```

### 3. 部署 Edge Functions

#### 3.1 安裝 Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

#### 3.2 連接到你的專案
```bash
# 登入
supabase login

# 連接到專案（從 Supabase Dashboard 複製 Project ID）
supabase link --project-ref your-project-id
```

#### 3.3 部署 reset-password function
```bash
cd /path/to/workhours
supabase functions deploy reset-password
```

### 4. 設定��境變數

從 Supabase Dashboard → Settings → API 取得：
- `VITE_SUPABASE_URL`：Project URL
- `VITE_SUPABASE_ANON_KEY`：anon public key
- `SUPABASE_SERVICE_ROLE_KEY`：service_role key（⚠️ 非常敏感，不要外洩）

### 5. 本地開發設定

```bash
# Clone 專案
git clone https://github.com/kusodevil/workhours.git
cd workhours

# 安裝依賴
npm install

# 建立 .env 檔案
cp .env.example .env

# 編輯 .env，填入你的 Supabase 資訊
nano .env
```

`.env` 內容：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

```bash
# 啟動開發伺服器
npm run dev
```

### 6. 部署到 Vercel

1. 前往 [Vercel](https://vercel.com)
2. 點擊 "Add New Project"
3. 選擇你的 GitHub Repository
4. 設定環境變數：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 點擊 "Deploy"

### 7. 建立第一個超級管理員

部署完成後：

1. 前往你的網站，註冊一個帳號
2. 記下註冊的 Email
3. 到 Supabase Dashboard → SQL Editor 執行：

```sql
-- 將使用者提升為超級管理員
update public.profiles
set role = 'super_admin'
where email = 'your-email@example.com';
```

4. 重新登入，你現在是超級管理員了

## 常見問題

### Q: Edge Function 部署失敗
A: 確認 Supabase CLI 已正確連接到專案：
```bash
supabase projects list
supabase link --project-ref your-project-id
```

### Q: RLS 政策導致無法讀取資料
A: 暫時停用 RLS 測試：
```sql
alter table public.profiles disable row level security;
-- 測試完記得重新啟用
alter table public.profiles enable row level security;
```

### Q: 忘記設定超級管理員
A: 使用 SQL 直接更新：
```sql
update public.profiles set role = 'super_admin' where email = 'your@email.com';
```

## 維護建議

1. **定期備份**：Supabase Dashboard → Database → Backups
2. **監控錯誤**：Vercel Dashboard → Logs
3. **更新依賴**：定期執行 `npm update`
4. **安全性**：
   - 不要把 SERVICE_ROLE_KEY 加入 Git
   - 定期輪換 API Keys
   - 啟用 Supabase 的 2FA

## 技術支援

- Supabase 文件：https://supabase.com/docs
- Vercel 文件：https://vercel.com/docs
- React 文件：https://react.dev

---

建立日期：2026-01-29
最後更新：2026-01-29
系統版本：v1.3.0
