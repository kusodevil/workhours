# 新增管理者功能設定

## 資料庫設定

請在 Supabase Dashboard 執行以下 SQL：

### 1. 新增 is_admin 欄位到 profiles 表

```sql
-- Add is_admin column to profiles table
ALTER TABLE profiles
ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;

-- Set jay.huang@ikala.ai as admin
UPDATE profiles
SET is_admin = true
WHERE email = 'jay.huang@ikala.ai';
```

### 2. 更新註冊 trigger 來處理 is_admin

```sql
-- Update the trigger function to handle is_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, is_admin)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    false  -- Default to non-admin
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 執行步驟

1. 前往 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇您的專案（workhours）
3. 點擊左側選單 **SQL Editor**
4. 點擊 **New query**
5. 複製貼上上面的 SQL 指令
6. 點擊 **Run** 執行

## 完成後

- jay.huang@ikala.ai 將成為管理者
- 登入後可以看到「管理帳號」選項
- 管理者可以設定其他帳號為管理者
