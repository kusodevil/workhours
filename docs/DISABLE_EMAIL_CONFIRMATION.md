# 關閉 Email 驗證設定

為了讓同事可以快速註冊使用，需要在 Supabase 後台關閉 Email 驗證功能。

## 設定步驟

1. 前往 Supabase 專案後台：https://supabase.com/dashboard

2. 選擇您的專案（workhours）

3. 點擊左側選單 **Authentication** → **Providers**

4. 找到 **Email** provider，點擊編輯

5. **關閉** 以下選項：
   - ✅ **Confirm email** (取消勾選)

   或者將設定改為：
   - Double confirm email changes: `disabled`
   - Secure email change: `disabled`

6. 點擊 **Save** 儲存設定

## 完成

設定完成後，使用者註冊時不需要驗證 Email，可以直接登入使用。

## 注意事項

- 這個設定適用於內部團隊使用
- 如果未來要開放給外部使用者，建議重新啟用 Email 驗證功能
- 確保團隊成員使用公司 Email 註冊，以便管理

## 備用方案

如果無法在 Supabase 後台關閉 Email 驗證，可以聯絡管理員設定 SMTP，或使用 Supabase 提供的測試用 Email 驗證連結（會顯示在 logs 中）。
