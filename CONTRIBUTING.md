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

---

## ⚠️ **重要：正式環境推送規範**

### 對於專案維護者和 AI 助手

推送到 `main` 分支（正式環境）**必須**遵循以下流程：

1. **完成開發和本地測試**
   ```bash
   npm run build  # 確保編譯成功
   npm run lint   # 確保無 lint 錯誤
   ```

2. **提交到本地 Git**
   ```bash
   git add .
   git commit -m "feat: your changes"
   ```

3. **❗ 停止並等待確認**
   - **不要**立即執行 `git push`
   - 向專案負責人（用戶）報告：
     - 完成了什麼改動
     - Build 測試結果
     - 是否有任何風險或注意事項

4. **等待明確指示**
   - 等待用戶回覆「可以推送」、「推到正式環境」或類似的明確指令
   - 如果用戶想先在測試環境驗證，則等待驗證完成

5. **取得同意後才推送**
   ```bash
   git push origin main
   ```

### 例外情況

以下情況可以不經確認直接推送：
- 緊急 hotfix（修復嚴重 bug）
- 純文件更新（README、CHANGELOG 等）
- 用戶**明確**要求立即推送

### 違反此規範的後果

- 可能導致未測試的代碼進入生產環境
- 破壞用戶的測試流程
- 降低代碼品質和穩定性

**請務必遵守此規範！**

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

### UI 元件與表單驗證

#### 錯誤訊息風格（必須統一）

**❌ 禁止使用瀏覽器原生驗證訊息**
- 不要使用 HTML5 `required` 屬性來顯示錯誤訊息
- 瀏覽器原生的驗證提示（橘色 tooltip）與專案風格不一致

**✅ 使用統一的自訂錯誤訊息風格**

所有錯誤訊息必須使用以下統一風格：

```tsx
{error && (
  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
    {error}
  </div>
)}
```

**實作步驟：**

1. **加入狀態管理**
   ```tsx
   const [error, setError] = useState('');
   ```

2. **在 handleSubmit 中進行驗證**
   ```tsx
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setError('');

     // 驗證必填欄位
     if (!fieldValue.trim()) {
       setError('請填寫此欄位');
       return;
     }

     // 其他驗證邏輯...
   };
   ```

3. **移除 `required` 屬性**
   ```tsx
   // ❌ 錯誤
   <input type="text" required />

   // ✅ 正確
   <input type="text" />
   ```

4. **在表單頂部顯示錯誤訊息**
   ```tsx
   <form onSubmit={handleSubmit}>
     {error && (
       <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
         {error}
       </div>
     )}
     {/* 其他表單欄位 */}
   </form>
   ```

**參考範例：**
- [Login.tsx](src/pages/Login.tsx) - line 33-36
- [Register.tsx](src/pages/Register.tsx) - line 44-47
- [AdminCreateUserModal.tsx](src/components/AdminCreateUserModal.tsx) - line 76-79

#### 成功訊息風格

```tsx
{message?.type === 'success' && (
  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
    {message.text}
  </div>
)}
```

#### 開發檢查清單

開發新功能或修改表單時，請確認：

- [ ] 所有必填欄位使用 JavaScript 驗證（不使用 `required` 屬性）
- [ ] 錯誤訊息使用統一的紅色 alert 風格
- [ ] 成功訊息使用統一的綠色 alert 風格
- [ ] 支援淺色和深色主題（使用 `dark:` 前綴）
- [ ] 錯誤訊息文字清晰且友善

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
