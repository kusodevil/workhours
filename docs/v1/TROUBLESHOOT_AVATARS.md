# 頭像功能故障排除指南

## 問題：預設頭像沒有顯示

### 可能原因
1. Profile 資料尚未載入完成
2. Username 為空值

### 排查步驟

1. 打開瀏覽器開發者工具（F12）
2. 切換到 Console 標籤
3. 查看是否有任何錯誤訊息

4. 確認 Profile 資料：
   - 在 Console 輸入並執行以下指令來檢查 profile 資料：
   ```javascript
   // 檢查當前登入的用戶資料
   window.location.reload()
   ```

5. 檢查 Supabase 資料庫：
   - 前往 Supabase Dashboard → Table Editor → profiles
   - 找到你的帳號記錄
   - 確認 `username` 欄位有值

### 解決方法

如果 username 為空，請到「個人設定」頁面更新使用者名稱。

---

## 問題：上傳頭像失敗

### 可能原因
1. Supabase Storage 的 `avatars` bucket 不存在
2. Storage 政策（RLS）未設定

### 排查步驟

1. **檢查 Storage Bucket 是否存在**
   - 前往 Supabase Dashboard → Storage
   - 確認是否有名為 `avatars` 的 bucket
   - 確認 `avatars` bucket 是 **Public**

2. **檢查錯誤訊息**
   - 打開瀏覽器開發者工具（F12）
   - 切換到 Console 標籤
   - 點擊「更換頭像」並選擇圖片
   - 查看 Console 中的錯誤訊息

### 解決方法

#### 方法 1: 透過 UI 建立 Bucket 和政策

1. **建立 avatars bucket**（如果不存在）：
   - 前往 Supabase Dashboard → Storage
   - 點擊「New bucket」
   - Name: `avatars`
   - Public bucket: **勾選**
   - 點擊「Create bucket」

2. **設定 Storage 政策**：
   - 點擊 `avatars` bucket
   - 切換到「Policies」標籤
   - 點擊「New policy」
   - 選擇「For full customization」

   **政策 1: 允許上傳（INSERT）**
   - Policy name: `Users can upload their own avatar`
   - Allowed operation: `INSERT`
   - Target roles: `authenticated`
   - USING expression:
   ```sql
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```

   **政策 2: 允許更新（UPDATE）**
   - Policy name: `Users can update their own avatar`
   - Allowed operation: `UPDATE`
   - Target roles: `authenticated`
   - USING expression:
   ```sql
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```

   **政策 3: 允許讀取（SELECT）**
   - Policy name: `Anyone can view avatars`
   - Allowed operation: `SELECT`
   - Target roles: `public`
   - USING expression:
   ```sql
   bucket_id = 'avatars'
   ```

   **政策 4: 允許刪除（DELETE）**
   - Policy name: `Users can delete their own avatar`
   - Allowed operation: `DELETE`
   - Target roles: `authenticated`
   - USING expression:
   ```sql
   bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
   ```

#### 方法 2: 透過 SQL 快速設定

前往 Supabase Dashboard → SQL Editor，執行以下 SQL：

```sql
-- 建立 avatars bucket (如果透過 UI 已建立則跳過此步驟)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 設定 Storage 政策
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### 測試頭像上傳

1. 前往「個人設定」頁面
2. 點擊「更換頭像」
3. 選擇一張圖片（JPG 或 PNG）
4. 等待上傳完成
5. 確認頭像顯示在右上角導覽列

---

## 常見錯誤訊息

### `new row violates row-level security policy`
**原因**: Storage RLS 政策未正確設定
**解決**: 按照上述步驟設定 Storage 政策

### `Bucket not found`
**原因**: `avatars` bucket 不存在
**解決**: 按照上述步驟建立 `avatars` bucket

### `The resource already exists`
**原因**: 嘗試上傳相同檔名的檔案
**解決**: 這不是問題，代碼使用 `upsert: true` 會自動覆蓋舊檔案

---

## 檢查清單

開發環境頭像功能正常運作需要：

- [ ] Supabase 開發專案已建立
- [ ] `.env` 檔案指向開發專案
- [ ] 開發帳號已註冊並可登入
- [ ] `avatars` Storage bucket 已建立且為 Public
- [ ] Storage 的 4 個 RLS 政策已設定
- [ ] Profile 有 username 值
- [ ] 瀏覽器 Console 沒有錯誤訊息

完成以上檢查後，頭像功能應該可以正常運作！
