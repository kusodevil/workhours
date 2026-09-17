# 部署指南

本文件說明如何將 WorkHours 部署到生產環境。

## 📋 目錄

- [部署前準備](#部署前準備)
- [Vercel 部署（推薦）](#vercel-部署推薦)
- [Docker 部署](#docker-部署)
- [其他平台](#其他平台)
- [環境變數設定](#環境變數設定)
- [常見問題](#常見問題)

## ✅ 部署前準備

### 1. Supabase 設定

確保你已經：
- 建立 Supabase 專案
- 執行所有資料庫遷移腳本（參考 [DATABASE.md](DATABASE.md)）
- 建立 Storage bucket
- 設定所有 RLS policies

### 2. 環境變數

確認以下環境變數已準備好：
- \`VITE_SUPABASE_URL\`: 你的 Supabase 專案 URL
- \`VITE_SUPABASE_ANON_KEY\`: 你的 Supabase anon key

## 🚀 Vercel 部署（推薦）

Vercel 提供最簡單的部署方式，且完全免費。

### 方法 1: GitHub 整合（推薦）

1. **Push 程式碼到 GitHub**
   \`\`\`bash
   git init
   git add .
   git commit -m "feat: initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/workhours.git
   git push -u origin main
   \`\`\`

2. **連接到 Vercel**
   - 前往 [Vercel Dashboard](https://vercel.com/dashboard)
   - 點擊 "Add New Project"
   - Import 你的 GitHub 專案
   - Vercel 會自動偵測 Vite 專案

3. **設定環境變數**
   - 在 "Environment Variables" 區塊新增：
     - \`VITE_SUPABASE_URL\`
     - \`VITE_SUPABASE_ANON_KEY\`

4. **部署**
   - 點擊 "Deploy"
   - 等待建置完成（通常 1-2 分鐘）
   - 取得你的部署 URL：\`https://your-project.vercel.app\`

### 方法 2: Vercel CLI

1. **安裝 Vercel CLI**
   \`\`\`bash
   npm install -g vercel
   \`\`\`

2. **登入**
   \`\`\`bash
   vercel login
   \`\`\`

3. **部署**
   \`\`\`bash
   vercel
   \`\`\`

4. **設定環境變數**
   \`\`\`bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   \`\`\`

5. **生產部署**
   \`\`\`bash
   vercel --prod
   \`\`\`

### 自動部署

設定完成後，每次推送到 \`main\` 分支都會自動觸發部署。

## 🐳 Docker 部署

### 使用 Docker Compose

1. **建立 .env 檔案**
   \`\`\`bash
   cp .env.example .env
   # 編輯 .env 填入你的 Supabase 資訊
   \`\`\`

2. **建置並啟動**
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. **訪問應用**
   - 開啟瀏覽器訪問 \`http://localhost:3000\`

4. **查看日誌**
   \`\`\`bash
   docker-compose logs -f
   \`\`\`

5. **停止服務**
   \`\`\`bash
   docker-compose down
   \`\`\`

### 開發模式

使用 Docker Compose 的開發模式（包含熱重載）：

\`\`\`bash
docker-compose --profile dev up workhours-dev
\`\`\`

### 僅使用 Docker

\`\`\`bash
# 建置映像
docker build -t workhours:1.0.0 .

# 運行容器
docker run -d \\
  -p 3000:80 \\
  -e VITE_SUPABASE_URL=your_url \\
  -e VITE_SUPABASE_ANON_KEY=your_key \\
  --name workhours \\
  workhours:1.0.0
\`\`\`

## 🌐 其他平台

### Netlify

1. 安裝 Netlify CLI
   \`\`\`bash
   npm install -g netlify-cli
   \`\`\`

2. 登入並初始化
   \`\`\`bash
   netlify login
   netlify init
   \`\`\`

3. 設定建置命令
   - Build command: \`npm run build\`
   - Publish directory: \`dist\`

4. 設定環境變數
   - 到 Netlify Dashboard > Site settings > Build & deploy > Environment
   - 新增 \`VITE_SUPABASE_URL\` 和 \`VITE_SUPABASE_ANON_KEY\`

5. 部署
   \`\`\`bash
   netlify deploy --prod
   \`\`\`

### Cloudflare Pages

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 選擇 "Pages" > "Create a project"
3. 連接 GitHub 專案
4. 設定：
   - Build command: \`npm run build\`
   - Build output directory: \`dist\`
5. 設定環境變數
6. 部署

### AWS S3 + CloudFront

1. 建置專案
   \`\`\`bash
   npm run build
   \`\`\`

2. 上傳到 S3
   \`\`\`bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   \`\`\`

3. 設定 CloudFront 分發
4. 設定 Route 53 DNS（可選）

## ⚙️ 環境變數設定

### 必要變數

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| VITE_SUPABASE_URL | Supabase 專案 URL | https://xxxxx.supabase.co |
| VITE_SUPABASE_ANON_KEY | Supabase anon key | eyJhbGc... |

### 可選變數

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| VITE_APP_NAME | 應用名稱 | WorkHours |
| VITE_APP_VERSION | 應用版本 | 1.0.0 |

## 🔍 驗證部署

部署完成後，請驗證以下功能：

- [ ] 首頁可以正常載入
- [ ] 可以註冊新帳號
- [ ] 可以登入
- [ ] 可以上傳頭像
- [ ] 可以填寫工時
- [ ] 儀表板資料正確顯示
- [ ] 趨勢分析圖表正常
- [ ] 響應式設計在手機上正常

## 🐛 常見問題

### 1. 部署後出現白畫面

**原因**：可能是環境變數設定錯誤

**解決方法**：
- 檢查 Vercel/Netlify 的環境變數設定
- 確認變數名稱包含 \`VITE_\` 前綴
- 重新部署

### 2. 無法連接 Supabase

**原因**：CORS 設定或環境變數錯誤

**解決方法**：
- 檢查 Supabase URL 是否正確
- 確認 anon key 沒有過期
- 檢查 Supabase 專案的 CORS 設定

### 3. 圖片無法顯示

**原因**：Storage bucket 設定問題

**解決方法**：
- 確認 avatars bucket 已建立
- 檢查 Storage policies 是否正確
- 確認 bucket 設定為 public

### 4. 路由 404 錯誤

**原因**：SPA 路由設定問題

**解決方法**：
- Vercel: 確認 \`vercel.json\` 的 rewrites 設定
- Netlify: 新增 \`_redirects\` 檔案：\`/* /index.html 200\`
- Nginx: 確認 nginx.conf 的 try_files 設定

### 5. 建置失敗

**原因**：依賴問題或 TypeScript 錯誤

**解決方法**：
\`\`\`bash
# 本地測試建置
npm run build

# 檢查 TypeScript 錯誤
npm run lint
\`\`\`

## 📊 監控與日誌

### Vercel Analytics

啟用 Vercel Analytics 以追蹤使用情況：

1. 到 Vercel Dashboard
2. 選擇專案 > Analytics
3. 啟用 Analytics

### Sentry 錯誤追蹤（可選）

安裝 Sentry 以追蹤生產環境錯誤：

\`\`\`bash
npm install @sentry/react @sentry/vite-plugin
\`\`\`

參考 [Sentry 文件](https://docs.sentry.io/platforms/javascript/guides/react/) 進行設定。

## 🔄 更新部署

### Vercel (Git 整合)

\`\`\`bash
git add .
git commit -m "feat: new feature"
git push
# Vercel 會自動部署
\`\`\`

### Docker

\`\`\`bash
# 重新建置
docker-compose build

# 重啟服務
docker-compose up -d
\`\`\`

## 🔐 安全性建議

1. **環境變數**
   - 永遠不要將 \`.env\` 檔案提交到 Git
   - 使用平台提供的環境變數管理

2. **HTTPS**
   - Vercel 自動提供 HTTPS
   - 自行部署時確保使用 HTTPS

3. **定期更新**
   - 定期更新依賴套件
   - 關注 Supabase 和 React 的安全公告

4. **監控**
   - 設定錯誤監控
   - 定期檢查應用日誌

---

更新日期：2026-01-27
版本：1.0.0
