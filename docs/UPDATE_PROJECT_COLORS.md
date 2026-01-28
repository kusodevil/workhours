# 更新專案顏色為柔和色系

## 背景

代碼中使用的是柔和色系，但生產環境的專案可能是使用較鮮豔的顏色。此文檔說明如何將生產環境的專案顏色更新為柔和色系。

## 柔和色系配色

```javascript
const SOFT_COLORS = [
  '#7C9CBF', // 柔和藍
  '#6EAF8D', // 柔和綠
  '#E6A76B', // 柔和橘
  '#9B87C7', // 柔和紫
  '#D98FA9', // 柔和粉
  '#D97C7C', // 柔和紅
  '#5FB3C5', // 柔和青
  '#A8C66C', // 柔和黃綠
];
```

## 更新步驟

### 1. 查看當前專案

前往生產環境 Supabase Dashboard → SQL Editor，執行以下 SQL 查看所有專案：

```sql
SELECT id, name, color, is_active
FROM projects
ORDER BY created_at;
```

### 2. 更新專案顏色

根據專案名稱，選擇合適的柔和色系進行更新。

#### 方法 1: 逐一更新（推薦）

```sql
-- 更新 Claude 專案為柔和橘
UPDATE projects
SET color = '#E6A76B'
WHERE name = 'Claude';

-- 更新 Kolr 專案為柔和紅
UPDATE projects
SET color = '#D97C7C'
WHERE name = 'Kolr';

-- 更新 Others 專案為柔和綠
UPDATE projects
SET color = '#6EAF8D'
WHERE name = 'Others';
```

#### 方法 2: 批量更新（如果專案較多）

如果你有很多專案，可以使用 CASE WHEN 批量更新：

```sql
UPDATE projects
SET color = CASE name
  WHEN 'Claude' THEN '#E6A76B'  -- 柔和橘
  WHEN 'Kolr' THEN '#D97C7C'    -- 柔和紅
  WHEN 'Others' THEN '#6EAF8D'  -- 柔和綠
  -- 根據需要添加更多專案
  ELSE color  -- 保持其他專案的顏色不變
END
WHERE name IN ('Claude', 'Kolr', 'Others');  -- 只更新這些專案
```

### 3. 驗證更新結果

執行以下 SQL 確認顏色已更新：

```sql
SELECT name, color, is_active
FROM projects
ORDER BY created_at;
```

### 4. 重新整理網頁

在瀏覽器中重新整理生產環境網頁，確認圖表顏色已更新為柔和色系。

## 顏色選擇建議

根據專案性質選擇合適的顏色：

| 顏色代碼 | 顏色名稱 | 適合用於 |
|---------|---------|---------|
| #7C9CBF | 柔和藍 | 開發、技術類專案 |
| #6EAF8D | 柔和綠 | 測試、QA、穩定類專案 |
| #E6A76B | 柔和橘 | 重點專案、主要功能 |
| #9B87C7 | 柔和紫 | 創新、實驗類專案 |
| #D98FA9 | 柔和粉 | 設計、UI/UX 類專案 |
| #D97C7C | 柔和紅 | 緊急、重要專案 |
| #5FB3C5 | 柔和青 | 文檔、支援類專案 |
| #A8C66C | 柔和黃綠 | 優化、效能類專案 |

## 注意事項

- 更新生產環境前，建議先在開發環境測試
- 顏色更新後會立即反映在所有圖表中
- 建議為不同專案選擇容易區分的顏色
- 可以使用瀏覽器的「檢查元素」功能預覽顏色效果

## 完成！

執行完成後，生產環境和開發環境將使用一致的柔和色系，圖表視覺效果更加統一和舒適。
