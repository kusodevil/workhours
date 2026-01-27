# 發布指南

本文件說明如何發布新版本的 WorkHours。

## 📋 發布檢查清單

在發布新版本前，請確認：

- [ ] 所有功能都已完成並測試
- [ ] 所有測試都通過
- [ ] 文件已更新（README.md, CHANGELOG.md）
- [ ] 版本號已更新（package.json）
- [ ] 已在本地建置並測試生產版本
- [ ] 所有變更已提交到 Git
- [ ] 已合併到 main 分支

## 🔢 版本號規則

我們遵循 [Semantic Versioning](https://semver.org/) 規範：

\`\`\`
MAJOR.MINOR.PATCH (例如: 1.2.3)
\`\`\`

- **MAJOR**: 不相容的 API 變更
- **MINOR**: 向後相容的新功能
- **PATCH**: 向後相容的 bug 修復

## 🚀 發布流程

### 1. 準備發布

\`\`\`bash
# 確保在 main 分支且是最新版本
git checkout main
git pull origin main

# 確認工作目錄乾淨
git status
\`\`\`

### 2. 更新版本號

編輯 \`package.json\`：

\`\`\`json
{
  "version": "1.1.0"
}
\`\`\`

### 3. 更新 CHANGELOG.md

在 \`CHANGELOG.md\` 頂部新增：

\`\`\`markdown
## [1.1.0] - 2026-02-01

### Added
- 新功能 A
- 新功能 B

### Changed
- 變更 X
- 變更 Y

### Fixed
- 修復問題 1
- 修復問題 2

[1.1.0]: https://github.com/your-org/workhours/compare/v1.0.0...v1.1.0
\`\`\`

### 4. 提交變更

\`\`\`bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.0"
\`\`\`

### 5. 建立 Git Tag

\`\`\`bash
# 建立帶註釋的 tag
git tag -a v1.1.0 -m "Release version 1.1.0"

# 查看 tag
git tag -l
\`\`\`

### 6. 推送到 GitHub

\`\`\`bash
# 推送提交
git push origin main

# 推送 tags
git push origin v1.1.0

# 或一次推送所有 tags
git push origin --tags
\`\`\`

### 7. 建立 GitHub Release

1. 前往 GitHub 專案頁面
2. 點擊 "Releases" > "Draft a new release"
3. 選擇剛建立的 tag: \`v1.1.0\`
4. 填寫 Release 標題: \`v1.1.0\`
5. 將 CHANGELOG.md 的內容複製到描述欄位
6. 如果是預覽版，勾選 "This is a pre-release"
7. 點擊 "Publish release"

### 8. 驗證部署

如果使用 Vercel 自動部署：

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 確認部署成功
3. 訪問生產環境 URL
4. 測試主要功能

## 📝 Release Notes 模板

\`\`\`markdown
## What's New in v1.1.0

### ✨ New Features
- **Feature A**: Description of feature A
- **Feature B**: Description of feature B

### 🐛 Bug Fixes
- Fixed issue with X
- Resolved problem with Y

### 🔧 Improvements
- Improved performance of Z
- Enhanced UI/UX for W

### 📚 Documentation
- Updated README with new examples
- Added deployment guide

### 🙏 Contributors
Thanks to @user1, @user2 for their contributions!

**Full Changelog**: https://github.com/your-org/workhours/compare/v1.0.0...v1.1.0
\`\`\`

## 🔙 回滾版本

如果發現問題需要回滾：

\`\`\`bash
# 回滾到前一個版本
git revert HEAD

# 或 reset 到特定 tag
git reset --hard v1.0.0

# 強制推送（謹慎使用）
git push origin main --force

# 刪除錯誤的 tag
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
\`\`\`

## 🔄 Hotfix 流程

緊急修復流程：

\`\`\`bash
# 1. 從 main 建立 hotfix 分支
git checkout -b hotfix/critical-bug main

# 2. 修復問題並測試
# ... 進行修改 ...

# 3. 提交
git add .
git commit -m "fix: critical bug description"

# 4. 更新版本號（PATCH）
# 編輯 package.json: 1.0.0 -> 1.0.1

# 5. 合併回 main
git checkout main
git merge hotfix/critical-bug

# 6. 建立 tag
git tag -a v1.0.1 -m "Hotfix: critical bug"

# 7. 推送
git push origin main --tags

# 8. 刪除 hotfix 分支
git branch -d hotfix/critical-bug
\`\`\`

## 📊 發布後檢查

- [ ] GitHub Release 已建立
- [ ] 生產環境已部署最新版本
- [ ] 主要功能運作正常
- [ ] 無明顯錯誤或問題
- [ ] 團隊成員已收到通知
- [ ] 使用者文件已更新

## 🔔 通知使用者

發布後通知使用者：

1. **GitHub Release**: 自動通知 watch 專案的使用者
2. **Slack/Discord**: 在團隊頻道公告
3. **Email**: 發送更新通知給使用者（如適用）

## 📈 版本發布歷史

| 版本 | 日期 | 類型 | 重點 |
|------|------|------|------|
| 1.0.0 | 2026-01-27 | Major | 首次正式發布 |
| 0.9.0 | 2026-01-20 | Minor | Beta 版本 |
| 0.1.0 | 2026-01-10 | Minor | Alpha 版本 |

## 🤝 維護者

- @your-username - Release Manager
- @teammate - Reviewer

---

更新日期：2026-01-27
版本：1.0.0
