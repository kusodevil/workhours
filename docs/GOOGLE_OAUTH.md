# Google OAuth 設定指南

本文件說明如何在 WorkHours 中設置 Google 帳號登入功能。

## 📋 目錄

- [前置需求](#前置需求)
- [Google Cloud Console 設定](#google-cloud-console-設定)
- [Supabase 設定](#supabase-設定)
- [測試](#測試)
- [故障排除](#故障排除)

## 🔧 前置需求

- Google Cloud Platform 帳號
- Supabase 專案
- WorkHours 已部署到公開 URL（或使用 localhost 進行開發測試）

## 🌐 Google Cloud Console 設定

### 1. 建立專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點擊左上角選擇專案 → 新增專案
3. 輸入專案名稱：`WorkHours`
4. 點擊「建立」

### 2. 啟用 Google+ API

1. 在左側選單選擇「API 和服務」→「已啟用的 API 和服務」
2. 點擊「+ 啟用 API 和服務」
3. 搜尋「Google+ API」
4. 點擊並啟用

### 3. 設定 OAuth 同意畫面

1. 在左側選單選擇「API 和服務」→「OAuth 同意畫面」
2. 選擇使用者類型：
   - **外部**：任何 Google 帳號都能登入（推薦用於生產環境）
   - **內部**：僅限組織內部使用（僅適用於 Google Workspace）
3. 填寫應用程式資訊：
   - **應用程式名稱**：`WorkHours`
   - **使用者支援電子郵件**：你的 email
   - **應用程式首頁**：你的部署 URL（例如：`https://status-window.vercel.app`）
   - **授權網域**：`vercel.app`（如果使用 Vercel）
   - **開發人員聯絡資訊**：你的 email
4. 點擊「儲存並繼續」
5. 權限範圍：使用預設值即可，點擊「儲存並繼續」
6. 測試使用者：可以先不添加，點擊「儲存並繼續」

### 4. 建立 OAuth 2.0 用戶端 ID

1. 在左側選單選擇「API 和服務」→「憑證」
2. 點擊「+ 建立憑證」→「OAuth 2.0 用戶端 ID」
3. 應用程式類型選擇：**網頁應用程式**
4. 名稱：`WorkHours Web Client`
5. **已授權的 JavaScript 來源**：
   - 生產環境：`https://status-window.vercel.app`
   - 開發環境：`http://localhost:5173`
6. **已授權的重新導向 URI**：
   - 複製你的 Supabase 專案 URL
   - 格式：`https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback`
   - 例如：`https://hnbxlvrdrdbagidqnzrj.supabase.co/auth/v1/callback`
7. 點擊「建立」
8. **重要**：複製「用戶端 ID」和「用戶端密鑰」，稍後會用到

## 🗄️ Supabase 設定

### 1. 前往 Authentication 設定

1. 登入你的 [Supabase Dashboard](https://app.supabase.com)
2. 選擇你的專案
3. 左側選單選擇「Authentication」→「Providers」

### 2. 啟用 Google Provider

1. 在 Providers 列表中找到「Google」
2. 點擊展開
3. 啟用「Enable Sign in with Google」
4. 填入從 Google Cloud Console 取得的資訊：
   - **Client ID**：從步驟 4.8 複製的用戶端 ID
   - **Client Secret**：從步驟 4.8 複製的用戶端密鑰
5. **Authorized Client IDs**：留空（除非你有特殊需求）
6. 點擊「Save」

### 3. 確認 Redirect URL

Supabase 會自動提供 Redirect URL，確認它符合以下格式：
\`\`\`
https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
\`\`\`

這個 URL 應該已經添加到 Google Cloud Console 的「已授權的重新導向 URI」中。

## ✅ 測試

### 本地開發測試

1. 啟動開發伺服器：
   \`\`\`bash
   npm run dev
   \`\`\`

2. 訪問 http://localhost:5173/login

3. 點擊「使用 Google 登入」按鈕

4. 應該會：
   - 跳轉到 Google 登入頁面
   - 要求授權存取基本資料
   - 登入成功後自動返回應用程式

### 生產環境測試

1. 確保應用程式已部署到 Vercel 或其他平台

2. 訪問你的部署 URL（例如：https://status-window.vercel.app/login）

3. 點擊「使用 Google 登入」

4. 測試流程應該與本地開發相同

## 🐛 故障排除

### 問題 1：redirect_uri_mismatch 錯誤

**錯誤訊息**：
\`\`\`
Error: redirect_uri_mismatch
\`\`\`

**解決方案**：
1. 檢查 Google Cloud Console 中的「已授權的重新導向 URI」
2. 確認包含正確的 Supabase callback URL
3. 確認 URL 完全匹配（包括 https/http 和尾隨斜線）

### 問題 2：Access blocked: This app's request is invalid

**原因**：OAuth 同意畫面設定不完整

**解決方案**：
1. 回到 Google Cloud Console
2. 完成「OAuth 同意畫面」所有必填欄位
3. 確保應用程式狀態為「正式版」（如果是外部使用者）

### 問題 3：登入後沒有跳轉

**原因**：Redirect URL 設定不正確

**解決方案**：
1. 檢查 `AuthContext.tsx` 中的 redirectTo 設定
2. 確認 URL 正確指向你的應用程式首頁
3. 檢查瀏覽器 console 是否有錯誤訊息

### 問題 4：使用者資料沒有正確建立

**原因**：profiles 表格的 trigger 可能沒有正確設定

**解決方案**：
1. 檢查 Supabase Database 中的 `handle_new_user()` function
2. 確認 trigger `on_auth_user_created` 已正確設置
3. 參考 `docs/DATABASE.md` 重新執行 SQL

## 📝 開發環境 vs 生產環境

### 開發環境

- 使用 `http://localhost:5173`
- 可以使用單一 Google OAuth Client
- Redirect URL: Supabase callback URL

### 生產環境

- 使用實際部署 URL（例如：`https://status-window.vercel.app`）
- 建議使用相同的 OAuth Client，但添加生產環境 URL
- 或者建立獨立的 production OAuth Client

## 🔒 安全性建議

1. **不要公開 Client Secret**
   - Client Secret 只儲存在 Supabase 後端
   - 永遠不要提交到 Git repository

2. **使用 HTTPS**
   - 生產環境必須使用 HTTPS
   - Vercel 自動提供 HTTPS

3. **限制授權網域**
   - 只添加必要的授權網域
   - 定期審查已授權的網域

4. **監控使用情況**
   - 在 Google Cloud Console 監控 API 使用量
   - 設定配額和警報

## 📚 相關文件

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文件](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

更新日期：2026-01-27
版本：1.1.0
