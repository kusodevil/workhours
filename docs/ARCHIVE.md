# 專案封存說明 (2026-09-17)

WorkHours 已於 2026-09-17 停止營運，Supabase 專案 `workhours-Prod` (hnbxlvrdrdbagidqnzrj) 已暫停，`workhours-dev` 已刪除。
程式碼保留於此 repo 作為作品集；資料庫 schema 保留於 `supabase/archive/`。

## 封存內容

| 內容 | 位置 | 說明 |
|---|---|---|
| 應用程式原始碼 | 本 repo | 最終版本 v1.4.0 |
| DB schema（table、RLS、function、trigger） | `supabase/archive/schema.sql` | 不含任何資料 |
| DB roles | `supabase/archive/roles.sql` | |
| **資料**（time_entries、profiles、auth users、storage metadata） | **不在 repo 內**（含個資） | 由專案擁有者私下保存 |
| **Storage 檔案**（avatars bucket，4 個檔案） | **不在 repo 內** | 同上 |

停運當下的資料量：6 位使用者、2 個部門、9 個專案、661 筆工時。

## 還原步驟

1. 建立新的 Supabase 專案，取得 DB 密碼。
2. 還原 schema 與 roles：
   ```bash
   psql "$DB_URL" -f supabase/archive/roles.sql
   psql "$DB_URL" -f supabase/archive/schema.sql
   ```
3. 還原資料（由擁有者私下保存的 `data.sql`）：
   ```bash
   psql "$DB_URL" -f data.sql
   ```
   `data.sql` 已包含 `auth.*` 與 `storage.*` 的資料，使用者帳號與密碼 hash 會一併還原。
4. 建立 `avatars` bucket（schema 中的 `storage.buckets` 資料已由 data.sql 建立），再把私下保存的 `storage/avatars/` 目錄上傳：
   ```bash
   supabase storage cp -r ./storage/avatars ss:///avatars --experimental
   ```
5. 部署 Edge Functions：`supabase functions deploy`。
   `notion-query` 需要額外設定 `NOTION_API_KEY`、`NOTION_VERSION` secrets（封存時未設定，該功能未啟用）。
6. 前端：依 README「環境設定」填入新專案的 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`。

## 已移除

- `.github/workflows/supabase-keep-alive.yml`：每日 ping Supabase 防止免費專案自動暫停；封存後不再需要。
