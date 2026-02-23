-- ============================================
-- Supabase Keep-Alive Ping
-- 防止免費方案專案因閒置被自動暫停
-- ============================================
--
-- 使用方式：
-- 1. 登入 Supabase Dashboard → SQL Editor
-- 2. 複製下方「正式環境」或「開發環境」對應的 SQL
-- 3. 將 YOUR_SUPABASE_URL 和 YOUR_ANON_KEY 替換為實際值
-- 4. 執行 SQL
--
-- 驗證：
--   SELECT * FROM cron.job;
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
--
-- 移除（如不再需要）：
--   SELECT cron.unschedule('keep-alive-ping');
-- ============================================

-- 1. 啟用所需擴充（如已啟用會自動跳過）
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. 移除舊的同名 job（如存在）
SELECT cron.unschedule('keep-alive-ping')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'keep-alive-ping');

-- 3. 建立 keep-alive cron job
-- 排程：每 4 天的凌晨 0 點（UTC）執行一次
-- 在 7 天暫停門檻內保留充足安全餘量
SELECT cron.schedule(
  'keep-alive-ping',
  '0 0 */4 * *',
  $$
  SELECT net.http_get(
    url := 'YOUR_SUPABASE_URL/rest/v1/',
    headers := '{"apikey": "YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
