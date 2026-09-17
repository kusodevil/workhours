# WorkHours - 工時管理系統

> 一個簡潔、易用的個人工時追蹤與分析工具——不需帳號、不需後端，資料只存在你的瀏覽器裡。

> **2.0 起為純本機個人版。** 1.x 是以 Supabase 為後端的多人團隊版（帳號、部門、管理員），
> 已於 2026-09-17 停止營運；其 schema 與還原步驟保留在 [docs/ARCHIVE.md](docs/ARCHIVE.md)。

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 目錄

- [功能特色](#功能特色)
- [技術棧](#技術棧)
- [快速開始](#快速開始)
- [環境設定](#環境設定)
- [部署指南](#部署指南)
- [專案結構](#專案結構)
- [開發指南](#開發指南)
- [貢獻指南](#貢獻指南)

## ✨ 功能特色

### 💾 本機優先
- 不需註冊登入，開啟即用
- 所有資料存在瀏覽器 IndexedDB，離線可用
- 一鍵匯出 / 匯入 JSON 備份

### ⏱️ 工時填寫
- 直覺的工時填寫介面
- 支援一次填寫多筆工時
- 自訂專案功能
- 備註欄位記錄詳細資訊

### 📊 數據視覺化
- **總覽儀表板**
  - QA Team 本週總工時
  - 每日工時分佈圖
  - 專案時數比例圓餅圖
  - 成員工時總覽長條圖

- **趨勢分析**
  - 週工時趨勢線圖
  - 專案工時變化分析
  - 新增專案自動提示
  - 趨勢洞察摘要

### 📝 紀錄管理
- 個人工時紀錄查詢
- 週次篩選功能
- 編輯和刪除工時紀錄
- 統計資訊一目了然

### 📤 報表匯出
- **部門工時匯出**
  - 管理者可匯出特定部門的週報/月報
  - PDF 格式：包含統計摘要、成員明細與每日工時詳情
  - CSV 格式：適合 Excel 分析與數據處理
- **全公司工時匯出**
  - Super Admin 可匯出全公司所有部門的工時報表
  - 完整的跨部門統計與分析
  - 支援中文字體，格式美觀易讀

### 🎨 使用者體驗
- 完整響應式設計（支援桌面、平板、手機）
- 8 種柔和配色系統
- 無障礙優化設計
- 流暢的互動體驗

## 🛠️ 技術棧

### 前端
- **框架**: React 19 + TypeScript
- **建構工具**: Vite
- **樣式**: Tailwind CSS 4
- **路由**: React Router v7
- **圖表**: Recharts
- **日期處理**: date-fns

### 資料儲存
- **IndexedDB** (透過 [Dexie](https://dexie.org/))：沒有後端、沒有帳號
- 頭像縮成 256×256 後以 data URL 存在本機
- 備份格式：單一 JSON 檔（個人檔案 + 專案 + 工時）

## 🚀 快速開始

### 前置需求

- Node.js >= 18.0.0
- npm >= 9.0.0 (或 yarn / pnpm)

### 安裝步驟

1. **Clone 專案**
   \`\`\`bash
   git clone https://github.com/your-org/workhours.git
   cd workhours
   \`\`\`

2. **安裝依賴**
   \`\`\`bash
   npm install
   \`\`\`

3. **啟動開發伺服器**
   \`\`\`bash
   npm run dev
   \`\`\`

   開啟瀏覽器訪問 \`http://localhost:5173\`

## 📦 部署指南

### 使用 Vercel (推薦)

1. **Fork 或 Push 專案到 GitHub**

2. **前往 [Vercel](https://vercel.com)**
   - 使用 GitHub 帳號登入
   - 點擊 "Add New Project"
   - 選擇你的 GitHub 專案

3. **部署**（不需要任何環境變數）
   - 點擊 "Deploy"
   - 等待建置完成
   - 你的應用將會部署到 \`https://your-project.vercel.app\`

### 自動部署

每次推送到 \`main\` 分支，Vercel 會自動建置並部署最新版本。

## 📁 專案結構

```
workhours/
  src/
    components/        # React 元件
      Layout.tsx       # 主要佈局
      ui/              # UI 元件庫
    context/           # React Context
      AuthContext.tsx  # 認證狀態
      ProjectContext.tsx   # 專案管理
      TimeEntryContext.tsx # 工時管理
    pages/             # 頁面元件
      Dashboard.tsx    # 總覽儀表板
      Timesheet.tsx    # 工時填寫
      MyRecords.tsx    # 個人紀錄
      Trends.tsx       # 趨勢分析
      Settings.tsx     # 個人設定
      Login.tsx        # 登入頁
      Register.tsx     # 註冊頁
    types/             # TypeScript 型別定義
    lib/               # 工具函式與設定
    App.tsx            # 主要應用元件
  docs/                # 文件
  CHANGELOG.md         # 更新日誌
  CONTRIBUTING.md      # 貢獻指南
  README.md            # 本文件
```

## 💻 開發指南

### 可用指令

\`\`\`bash
# 開發模式
npm run dev

# 建置生產版本
npm run build

# 預覽生產版本
npm run preview

# Lint 檢查
npm run lint
\`\`\`

### Git 提交規範

使用 Conventional Commits 規範：

\`\`\`bash
feat: 新增功能
fix: 修復問題
docs: 文件更新
style: 程式碼格式調整
refactor: 重構
test: 測試相關
chore: 建構工具或輔助工具變動
\`\`\`

### 分支策略

- \`main\` - 正式版本
- \`develop\` - 開發版本
- \`feature/*\` - 功能開發
- \`fix/*\` - 問題修復

## 🤝 貢獻指南

歡迎貢獻！請參考 [CONTRIBUTING.md](CONTRIBUTING.md) 了解詳細資訊。

### 快速步驟

1. Fork 本專案
2. 建立你的功能分支 (\`git checkout -b feature/AmazingFeature\`)
3. 提交你的變更 (\`git commit -m 'feat: Add some AmazingFeature'\`)
4. 推送到分支 (\`git push origin feature/AmazingFeature\`)
5. 開啟 Pull Request

## 📄 授權

本專案採用 MIT 授權

---

**WorkHours** - 讓工時管理變得簡單 💼✨
