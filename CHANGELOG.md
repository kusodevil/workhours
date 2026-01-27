# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-01-27

### Fixed
- 🔒 **導航欄顯示問題修復**
  - 修復登入頁面仍顯示「總覽」和「趨勢分析」導航項目的問題
  - 所有功能導航項目現在只在登入後顯示
  - 未登入狀態下僅顯示品牌標誌和登入/註冊按鈕

## [1.0.1] - 2026-01-27

### Fixed
- 🔒 **路由保護問題修復**
  - 新增 ProtectedRoute 組件保護需要認證的頁面
  - 未登入使用者現在會被重定向到登入頁面
  - 登入檢查期間顯示載入畫面
  - 修復未登入狀態下仍可訪問儀表板等頁面的安全問題

### Security
- 強化路由安全，確保所有功能頁面都需要認證才能訪問

## [1.0.0] - 2026-01-27

### Added
- 🎉 **首次正式發布**
- 使用者認證系統（登入、註冊、登出）
- 個人資料管理（頭像上傳、使用者名稱編輯）
- 工時填寫功能
  - 支援多筆工時同時填寫
  - 自訂專案功能
  - 備註欄位
- 個人工時紀錄查詢
  - 週次篩選
  - 編輯和刪除功能
  - 統計資訊顯示
- QA Team 工時總覽儀表板
  - 本週總工時統計
  - 每日工時分佈圖表
  - 專案時數比例圖表
  - 專案工時明細表格
  - 成員工時總覽（水平堆疊長條圖）
  - 週次篩選功能
- 趨勢分析功能
  - 週工時趨勢線圖
  - 專案工時變化趨勢卡片
  - 週總工時柱狀圖
  - 新增專案提示
  - 趨勢洞察摘要
  - 時間範圍篩選（近一個月 / 近三個月）
  - 專案篩選（僅影響圖表，不影響洞察資訊）
- 專案管理
  - 8 種柔和配色系統
  - 專案啟用/停用功能
  - 專案描述欄位
- 完整的 RWD 響應式設計
- 無障礙優化（移除所有 focus ring）

### Technical
- React 19 + TypeScript
- Vite 建構工具
- Tailwind CSS 4 樣式系統
- Supabase 後端服務（認證、資料庫、Storage）
- Recharts 圖表庫
- React Router 路由管理
- date-fns 日期處理

### Security
- Row Level Security (RLS) 資料庫安全策略
- 使用者只能查看/編輯自己的工時紀錄
- Storage 頭像上傳安全策略

[1.0.2]: https://github.com/kusodevil/workhours/releases/tag/v1.0.2
[1.0.1]: https://github.com/kusodevil/workhours/releases/tag/v1.0.1
[1.0.0]: https://github.com/kusodevil/workhours/releases/tag/v1.0.0
