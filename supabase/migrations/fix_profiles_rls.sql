-- Fix profiles RLS policy to allow all authenticated users to view all profiles
-- This is necessary for Dashboard to show all team members' work hours
--
-- 問題：原本的政策是 ((auth.uid() = id) OR is_admin_user(auth.uid()))
-- 導致普通用戶只能看到自己的 profile，無法在 Dashboard 看到其他團隊成員
--
-- 解決方案：改為 USING (true)，允許所有已登入用戶讀取所有 profiles
--
-- 執行日期：2026-01-27
-- 環境：Dev ✅ | Prod ✅

-- Drop the restrictive policy if it exists
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Create new policy: all authenticated users can view all profiles
CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy was created
SELECT
  policyname,
  cmd,
  CASE
    WHEN qual = 'true'::text THEN '✅ 正確 (允許所有人讀取)'
    ELSE '❌ 錯誤: ' || qual
  END as policy_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
