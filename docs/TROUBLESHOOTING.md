# 故障排除指南

## 常見問題與解決方案

### 1. Dashboard「成員工時總覽」只顯示部分成員

**症狀**：
- Dashboard 的「成員工時總覽」圖表只顯示當前登入用戶
- 或顯示「使用者 (xxxxxxxx)」而不是真實姓名
- Console 顯示 `Loaded profiles: 1 profiles` 但實際有多個用戶

**原因**：
profiles 表的 RLS 政策過於限制，普通用戶只能讀取自己的 profile

**檢查方法**：
```sql
-- 在 Supabase SQL Editor 執行
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
```

**錯誤的政策範例**：
```sql
-- 只能讀取自己的 profile
qual: (auth.uid() = id)

-- 或只有 admin 能讀取所有人
qual: ((auth.uid() = id) OR is_admin_user(auth.uid()))
```

**解決方案**：
執行 `supabase/migrations/fix_profiles_rls.sql` 修復 RLS 政策

**驗證修復**：
1. 重新整理 Dashboard 頁面
2. Console 應顯示正確的 profiles 數量
3. 「成員工時總覽」應顯示所有團隊成員的真實姓名

---

### 2. 註冊後顯示所有導航選單

**症狀**：
- 用戶完成註冊後，立即看到「總覽」「填寫工時」等選單
- 不確定這是否為預期行為

**原因**：
這是**正常且預期的行為**。Supabase 在開發環境中，`signUp()` 會自動登入用戶。

**設計邏輯**：
1. 用戶註冊 → Supabase 自動登入
2. `onAuthStateChange` 觸發
3. AuthContext 更新 `isAuthenticated = true`
4. Layout 組件顯示已登入用戶的導航選單
5. 500ms 後自動導向首頁

**如果想要改變行為**：
可以在 Register.tsx 添加 `signOut()` 強制登出，但這會破壞用戶體驗。

---

### 3. 週進度顯示 0/7 天但已填寫工時

**症狀**：
- Timesheet 頁面顯示「已填 0/7 天」
- 但「我的紀錄」頁面有顯示工時記錄

**可能原因**：
1. **日期格式不匹配**：資料庫儲存的日期格式與計算邏輯不一致
2. **週起始日設定**：`weekStartsOn` 設定錯誤
3. **用戶 ID 不匹配**：`useWeekProgress` 傳入的 `userId` 不正確

**檢查步驟**：
```typescript
// 在 Timesheet.tsx 添加除錯 log
console.log('Current user ID:', user?.id);
console.log('Time entries:', timeEntries);
console.log('Week progress:', progress);
```

**常見解法**：
- 確認 `weekStartsOn: 1`（週一為起始日）
- 確認日期格式統一為 `'yyyy-MM-dd'`
- 確認 `userId` 傳入正確

---

### 4. 匯出的 Excel 檔案無法開啟

**症狀**：
- 點擊「匯出週報」後檔案下載成功
- 但 Excel 顯示檔案損壞或無法開啟

**可能原因**：
1. xlsx 版本過舊
2. 資料中包含特殊字元導致格式錯誤
3. 檔案名稱包含非法字元

**解決方案**：
```bash
# 更新 xlsx 套件
npm install xlsx@latest

# 或指定穩定版本
npm install xlsx@0.18.5
```

**除錯步驟**：
1. 檢查 Console 是否有錯誤訊息
2. 嘗試匯出少量資料測試
3. 檢查資料中是否有 null 或 undefined

---

### 5. 批次填寫後無法提交

**症狀**：
- 使用「批次填寫」功能後
- 點擊「提交工時」按鈕沒有反應或出現錯誤

**可能原因**：
1. **專案 ID 無效**：選擇的專案已被停用
2. **日期驗證失敗**：批次生成的日期格式不正確
3. **時數驗證失敗**：時數不在 0.5-24 範圍內

**檢查方法**：
```typescript
// 在 Timesheet.tsx 的 handleSubmit 添加
console.log('Submitting entries:', entries);
```

**常見解法**：
- 確認選擇的專案 `is_active = true`
- 確認日期格式為 `'yyyy-MM-dd'`
- 確認時數符合資料庫 CHECK 條件

---

### 6. 複製上週工時後日期不正確

**症狀**：
- 點擊「複製上週工時」
- 日期沒有正確偏移 7 天

**可能原因**：
時區處理不當，導致日期計算錯誤

**檢查步驟**：
```typescript
// 在 dateHelpers.ts 的 shiftEntriesToThisWeek 添加
console.log('Original date:', entry.date);
console.log('Shifted date:', format(addDays(new Date(entry.date), 7), 'yyyy-MM-dd'));
```

**解決方案**：
確保使用 `date-fns` 的函數，避免直接操作 Date 物件

---

### 7. Admin 功能無法使用

**症狀**：
- 「管理帳號」選單看不到
- 或進入後顯示「無權限」

**檢查步驟**：
```sql
-- 在 Supabase SQL Editor 檢查
SELECT id, username, email, is_admin
FROM profiles
WHERE email = 'your@email.com';
```

**解決方案**：
```sql
-- 設定為管理員
UPDATE profiles
SET is_admin = true
WHERE email = 'your@email.com';
```

---

## 效能問題

### Dashboard 載入緩慢

**可能原因**：
1. time_entries 表資料過多
2. 缺少適當的索引
3. 未使用 useMemo 快取計算結果

**優化建議**：
```sql
-- 確認索引存在
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON time_entries(project_id);
```

---

## 聯絡資訊

如果遇到本文未涵蓋的問題：
1. 檢查 Browser Console 的錯誤訊息
2. 查看 Supabase Dashboard > Logs
3. 參考 `docs/DATABASE.md` 確認資料庫結構
4. 聯絡系統管理員

## 文檔版本

- 建立日期：2026-01-27
- 最後更新：2026-01-27
- 維護者：Jay Huang
