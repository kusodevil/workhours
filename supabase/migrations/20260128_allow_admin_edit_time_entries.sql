-- 允許管理者編輯和刪除所有時數記錄
-- Migration: Allow admins to edit/delete all time entries
-- Date: 2026-01-28

-- 更新 UPDATE 政策：允許管理者編輯所有時數記錄
DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
CREATE POLICY "time_entries_update"
ON time_entries FOR UPDATE
TO authenticated
USING (
  -- 用戶可以編輯自己的記錄
  auth.uid() = user_id
  OR
  -- 或者用戶是管理者
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 更新 DELETE 政策：允許管理者刪除所有時數記錄
DROP POLICY IF EXISTS "time_entries_delete" ON time_entries;
CREATE POLICY "time_entries_delete"
ON time_entries FOR DELETE
TO authenticated
USING (
  -- 用戶可以刪除自己的記錄
  auth.uid() = user_id
  OR
  -- 或者用戶是管理者
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 驗證政策已更新
COMMENT ON POLICY "time_entries_update" ON time_entries IS '允許用戶編輯自己的時數記錄，或管理者編輯所有記錄';
COMMENT ON POLICY "time_entries_delete" ON time_entries IS '允許用戶刪除自己的時數記錄，或管理者刪除所有記錄';
