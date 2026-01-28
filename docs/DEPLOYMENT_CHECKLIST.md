# 部署檢查清單

## 部署前檢查

### 1. RLS 政策檢查

在 Supabase SQL Editor 執行以下檢查：

```sql
-- 檢查 profiles 表的 SELECT 政策
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual = 'true'::text THEN '✅ 正確'
    ELSE '❌ 錯誤: ' || qual
  END as status
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
```

**預期結果**：
- 應該有一個政策的 `qual` 是 `true`
- 這樣所有已登入用戶才能看到所有成員的 profiles

**如果不正確**：執行 `supabase/migrations/fix_profiles_rls.sql`

### 2. 資料完整性檢查

```sql
-- 確認所有 auth.users 都有對應的 profiles
SELECT
  COUNT(*) as missing_profiles
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

**預期結果**：`missing_profiles` 應該是 0

**如果有缺失**：執行創建腳本：
```sql
INSERT INTO public.profiles (id, username, email, avatar_url)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1)) as username,
  au.email,
  NULL as avatar_url
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;
```

### 3. 構建測試

```bash
npm run build
```

確認：
- ✅ TypeScript 編譯通過
- ✅ Vite 構建成功
- ✅ 無警告或錯誤

### 4. 功能測試（Dev 環境）

- [ ] 註冊新帳號：自動登入並導向首頁
- [ ] Dashboard：成員工時總覽顯示所有成員名稱（不是 ID）
- [ ] Timesheet：週進度正確顯示
- [ ] Timesheet：複製上週工時功能正常
- [ ] Timesheet：批次填寫功能正常
- [ ] MyRecords：匯出週報/月報/CSV 正常
- [ ] Admin：管理帳號功能正常（僅 admin）

## 部署後驗證（Production）

### 1. 立即檢查

- [ ] 登入 Production 環境
- [ ] 查看 Dashboard：確認成員工時總覽顯示正確
- [ ] 打開 Console (F12)：確認 `Loaded profiles: X profiles` 的數量正確

### 2. 使用者體驗測試

- [ ] 註冊新帳號測試
- [ ] 填寫工時測試
- [ ] 匯出功能測試

## 回滾計畫

如果 Production 出現問題：

1. **立即回滾 RLS 政策**（如果是政策問題）：
   ```sql
   -- 暫時關閉 RLS（緊急用）
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ```

2. **檢查錯誤日誌**：
   - Supabase Dashboard > Logs
   - Browser Console 錯誤訊息

3. **聯絡資訊**：
   - Supabase Support: https://supabase.com/dashboard/support

## 常見問題

### Q: Dashboard 只顯示一個成員？
A: 檢查 profiles 的 RLS 政策，執行 `fix_profiles_rls.sql`

### Q: 註冊後顯示導航選單？
A: 這是正常的，註冊後會自動登入

### Q: 成員工時總覽顯示 "使用者 (xxxxx)"？
A: profiles 表缺少該用戶的記錄，執行資料完整性檢查的修復腳本

## 修復歷史

### 2026-01-27：Profiles RLS 政策修復

**問題**：
- Dev 和 Prod 的 profiles 表 RLS 政策過於限制
- 普通用戶只能讀取自己的 profile
- Dashboard「成員工時總覽」無法顯示其他團隊成員

**原始政策**：
```sql
-- Dev: auth.uid() = id
-- Prod: (auth.uid() = id) OR is_admin_user(auth.uid())
```

**修復後政策**：
```sql
USING (true) -- 所有已登入用戶可讀取所有 profiles
```

**執行狀態**：
- ✅ Dev 環境已修復
- ✅ Production 環境已修復

**驗證方法**：
1. 以普通用戶登入 Dashboard
2. 查看「成員工時總覽」是否顯示所有團隊成員
3. Console 應顯示 `Loaded profiles: X profiles`（X = 實際用戶數）

---

## 文檔版本

- 最後更新：2026-01-27
- 負責人：Jay Huang
