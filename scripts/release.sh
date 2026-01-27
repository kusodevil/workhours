#!/bin/bash

# WorkHours Release Script
# 使用方式: ./scripts/release.sh

set -e

echo "🚀 WorkHours Release Script"
echo ""

# 檢查是否在 main 分支
current_branch=$(git branch --show-current 2>/dev/null || echo "not-a-git-repo")
if [ "$current_branch" = "not-a-git-repo" ]; then
    echo "❌ 錯誤: 這不是一個 Git 倉庫"
    echo "   請先執行: git init"
    exit 1
fi

if [ "$current_branch" != "main" ] && [ "$current_branch" != "master" ]; then
    echo "⚠️  警告: 當前不在 main 分支 (當前: $current_branch)"
    read -p "繼續嗎? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 檢查工作目錄是否乾淨
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ 錯誤: 工作目錄不乾淨，請先提交所有變更"
    git status --short
    exit 1
fi

# 取得當前版本
current_version=$(node -p "require('./package.json').version")
echo "📦 當前版本: v$current_version"
echo ""

# 詢問新版本號
echo "請輸入新版本號 (格式: x.y.z):"
read -r new_version

# 驗證版本號格式
if ! [[ $new_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ 錯誤: 版本號格式不正確"
    exit 1
fi

echo ""
echo "準備發布 v$new_version"
echo ""

# 確認
read -p "確定要發布嗎? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消發布"
    exit 1
fi

# 更新 package.json (跨平台相容)
echo "📝 更新 package.json..."
node -e "const pkg=require('./package.json');pkg.version='$new_version';require('fs').writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n')"

# 建置測試
echo "🔨 建置測試..."
npm run build

# 提交變更
echo "💾 提交變更..."
git add package.json
git commit -m "chore: bump version to $new_version"

# 建立 tag
echo "🏷️  建立 tag v$new_version..."
git tag -a "v$new_version" -m "Release version $new_version"

# 推送
echo "⬆️  推送到遠端..."
git push origin $current_branch
git push origin "v$new_version"

echo ""
echo "✅ 發布完成！"
echo ""
echo "下一步:"
echo "1. 前往 GitHub 建立 Release"
echo "2. 選擇 tag: v$new_version"
echo "3. 填寫 Release Notes"
echo "4. 發布 Release"
echo ""
