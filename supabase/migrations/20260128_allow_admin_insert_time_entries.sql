-- 允許管理者為任何用戶新增時數記錄
-- Migration: Allow admins to insert time entries for any user
-- Date: 2026-01-28

-- 更新 INSERT 政策：允許管理者為任何用戶新增時數記錄
DROP POLICY IF EXISTS "time_entries_insert" ON time_entries;
CREATE POLICY "time_entries_insert"
ON time_entries FOR INSERT
TO authenticated
WITH CHECK (
  -- 用戶可以新增自己的記錄
  auth.uid() = user_id
  OR
  -- 或者用戶是管理者（可以為任何人新增記錄）
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 驗證政策已更新
COMMENT ON POLICY "time_entries_insert" ON time_entries IS '允許用戶新增自己的時數記錄，或管理者為任何用戶新增記錄';
