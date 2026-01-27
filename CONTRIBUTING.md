# 貢獻指南

感謝你考慮為 WorkHours 做出貢獻！

## 📝 目錄

- [開發流程](#開發流程)
- [程式碼規範](#程式碼規範)
- [提交規範](#提交規範)
- [Pull Request 流程](#pull-request-流程)

## 🔄 開發流程

### 1. Fork 專案

點擊 GitHub 上的 "Fork" 按鈕將專案 fork 到你的帳號下。

### 2. Clone 到本地

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/workhours.git
cd workhours
\`\`\`

### 3. 新增 upstream remote

\`\`\`bash
git remote add upstream https://github.com/ORIGINAL_OWNER/workhours.git
\`\`\`

### 4. 建立功能分支

\`\`\`bash
# 從 main 分支建立新分支
git checkout -b feature/your-feature-name

# 或是修復 bug
git checkout -b fix/bug-description
\`\`\`

### 5. 進行開發

- 遵循專案的程式碼風格
- 撰寫清晰的提交訊息
- 確保程式碼可以正常運行
- 新增或更新相關測試

### 6. 提交變更

\`\`\`bash
git add .
git commit -m "feat: add new feature"
\`\`\`

### 7. 同步 upstream

\`\`\`bash
git fetch upstream
git rebase upstream/main
\`\`\`

### 8. 推送到 GitHub

\`\`\`bash
git push origin feature/your-feature-name
\`\`\`

### 9. 建立 Pull Request

到 GitHub 上你 fork 的專案頁面，點擊 "New Pull Request"。

## 💻 程式碼規範

### TypeScript

- 使用 TypeScript 嚴格模式
- 為所有函數和變數明確定義型別
- 避免使用 \`any\` 型別
- 使用 interface 而非 type（除非需要 union types）

### React

- 使用函數式元件和 Hooks
- 遵循 React Hooks 規則
- 使用 useMemo 和 useCallback 優化效能
- 避免過度巢狀的元件結構

### 命名規範

- 元件檔案使用 PascalCase: \`MyComponent.tsx\`
- 工具函式檔案使用 camelCase: \`myUtil.ts\`
- Context 檔案使用 PascalCase + Context: \`AuthContext.tsx\`
- 常數使用 UPPER_SNAKE_CASE: \`MAX_RETRY_COUNT\`

### 樣式

- 使用 Tailwind CSS utility classes
- 避免自訂 CSS（除非必要）
- 保持 className 整潔且有組織
- 響應式設計優先（mobile-first）

## 📋 提交規範

我們使用 [Conventional Commits](https://www.conventionalcommits.org/) 規範。

### 格式

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### Type

- \`feat\`: 新功能
- \`fix\`: 修復 bug
- \`docs\`: 文件變更
- \`style\`: 程式碼格式（不影響程式碼運行的變動）
- \`refactor\`: 重構（既不是新增功能也不是修復 bug）
- \`perf\`: 效能優化
- \`test\`: 測試相關
- \`chore\`: 建構工具或輔助工具變動

### 範例

\`\`\`bash
feat(dashboard): add member hours chart

- Add horizontal stacked bar chart for member hours
- Update color scheme to use soft colors
- Add week selector for data filtering

Closes #123
\`\`\`

## 🔍 Pull Request 流程

### PR 檢查清單

在提交 PR 前，請確認：

- [ ] 程式碼遵循專案的程式碼規範
- [ ] 已運行 \`npm run lint\` 且無錯誤
- [ ] 已運行 \`npm run build\` 且成功建置
- [ ] 已測試所有變更的功能
- [ ] 已更新相關文件（如 README.md）
- [ ] 提交訊息遵循 Conventional Commits 規範
- [ ] PR 標題清楚描述變更內容

### PR 模板

\`\`\`markdown
## 變更說明
<!-- 簡要說明這個 PR 做了什麼 -->

## 變更類型
- [ ] 新功能 (feat)
- [ ] Bug 修復 (fix)
- [ ] 文件更新 (docs)
- [ ] 樣式調整 (style)
- [ ] 重構 (refactor)
- [ ] 效能優化 (perf)
- [ ] 測試 (test)
- [ ] 其他 (chore)

## 測試
<!-- 說明如何測試這些變更 -->

## 截圖（如適用）
<!-- 新增截圖展示變更 -->

## 相關 Issue
Closes #issue_number
\`\`\`

### Code Review

- 所有 PR 都需要至少一位維護者的審核
- 維護者可能會要求變更或提供建議
- 請耐心等待審核並及時回應反饋

## 🐛 回報 Bug

### 使用 GitHub Issues

1. 搜尋現有的 issues 確認問題尚未回報
2. 建立新 issue 並使用 bug 模板
3. 提供詳細資訊：
   - 問題描述
   - 重現步驟
   - 預期行為
   - 實際行為
   - 環境資訊（瀏覽器、作業系統等）
   - 螢幕截圖（如適用）

## 💡 功能建議

1. 開啟新的 GitHub Issue
2. 使用 feature request 模板
3. 清楚描述：
   - 功能需求
   - 使用場景
   - 預期效益
   - 可能的實作方式（可選）

## 📞 聯絡方式

如有任何問題，歡迎：
- 在 GitHub 上開 Issue
- 聯絡專案維護者

## ❤️ 致謝

再次感謝你的貢獻！每一個貢獻都讓 WorkHours 變得更好。
