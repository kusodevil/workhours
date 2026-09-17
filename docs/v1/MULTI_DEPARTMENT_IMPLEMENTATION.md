# 多部門支援實作指南

## 概述

本文件說明如何完成多部門支援功能的剩餘工作。

## 已完成的工作

✅ **資料庫層面** (commit: 3e21171)
- 創建 `departments` 表
- `profiles` 表新增 `department_id` 和 `role` 欄位
- 實作三種角色：`super_admin`, `department_admin`, `member`
- 更新所有 RLS policies 支援部門隔離

✅ **前端基礎架構** (commit: 3e21171)
- 更新 TypeScript 類型定義
- AuthContext 提供部門和角色資訊

✅ **Dashboard 部門過濾** (commit: 6ac69ad)
- Super Admin 可選擇查看全公司或特定部門
- Department Admin/Member 只能看本部門
- 動態顯示部門名稱

## 待完成的工作

### 1. Admin 頁面修改

需要修改以下檔案：
- `src/pages/AdminUsers.tsx`
- `src/components/AdminCreateUserModal.tsx`

#### AdminUsers.tsx 修改重點：

```typescript
import { useAuth } from '../context/AuthContext';

export function AdminUsers() {
  const {
    profile,
    isAuthenticated,
    isSuperAdmin,     // 新增
    isDepartmentAdmin, // 新增
    departmentId,     // 新增
    isLoading: authLoading
  } = useAuth();

  // 修改權限檢查
  if (!isAuthenticated || (!isSuperAdmin && !isDepartmentAdmin)) {
    return <Navigate to="/" />;
  }

  // 修改 fetchUsers，根據角色過濾
  const fetchUsers = async () => {
    setIsLoading(true);
    let query = supabase
      .from('profiles')
      .select('*');

    // Department Admin 只能看本部門
    if (!isSuperAdmin && departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      setToast({ message: '載入用戶列表失敗', type: 'error' });
    } else {
      setUsers(data as Profile[]);
    }
    setIsLoading(false);
  };

  // 修改 toggleAdmin 為 updateUserRole
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    // Department Admin 不能設定 super_admin
    if (!isSuperAdmin && newRole === 'super_admin') {
      setToast({ message: '權限不足', type: 'error' });
      return;
    }

    setUpdatingUserId(userId);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      setToast({ message: `更新失敗：${error.message}`, type: 'error' });
    } else {
      setToast({ message: '角色已更新', type: 'success' });
      fetchUsers();
    }

    setUpdatingUserId(null);
  };
}
```

#### AdminUsers.tsx UI 修改：

```tsx
{/* 使用者列表 */}
<div className="space-y-4">
  {users.map(user => (
    <div key={user.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{user.username}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          {user.department_id && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {departments.find(d => d.id === user.department_id)?.name || '未知部門'}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* 角色選擇 */}
          <select
            value={user.role}
            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
            disabled={updatingUserId === user.id || (!isSuperAdmin && user.role === 'super_admin')}
            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value="member">一般成員</option>
            <option value="department_admin">部門管理員</option>
            {isSuperAdmin && <option value="super_admin">超級管理員</option>}
          </select>

          {/* 刪除按鈕 */}
          <button
            onClick={() => setDeletingUser({ id: user.id, name: user.username })}
            disabled={user.id === profile?.id}
            className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
```

#### AdminCreateUserModal.tsx 修改：

```typescript
import type { UserRole, Department } from '../types/database';

export function AdminCreateUserModal({ isOpen, onClose, onSuccess }: Props) {
  const { isSuperAdmin, departmentId } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('member');

  // 載入部門列表
  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
      // 自動選擇當前部門（如果不是 Super Admin）
      if (!isSuperAdmin && departmentId) {
        setSelectedDepartment(departmentId);
      }
    }
  }, [isOpen, isSuperAdmin, departmentId]);

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) {
      setDepartments(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ... 驗證 ...

    const { data, error } = await invokeEdgeFunction<{ user: User }>('create-user', {
      username,
      password,
      department_id: selectedDepartment,
      role: selectedRole,
    });

    // ... 錯誤處理 ...
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增使用者">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username & Password fields ... */}

        {/* 部門選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            部門
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            disabled={!isSuperAdmin}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="">選擇部門</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* 角色選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            角色
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="member">一般成員</option>
            <option value="department_admin">部門管理員</option>
            {isSuperAdmin && <option value="super_admin">超級管理員</option>}
          </select>
        </div>

        {/* Submit buttons ... */}
      </form>
    </Modal>
  );
}
```

### 2. Edge Function 修改

需要修改 `supabase/functions/create-user/index.ts` 來支援部門和角色：

```typescript
const { username, password, department_id, role } = await req.json();

// 創建使用者後，更新 profiles
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .update({
    department_id,
    role: role || 'member'
  })
  .eq('id', data.user.id);
```

### 3. 測試步驟

#### 3.1 執行資料庫遷移

```bash
# 連接到 Supabase 並執行 migration
supabase db push

# 或者直接在 Supabase Dashboard 的 SQL Editor 中執行
# supabase/migrations/20260129_add_multi_department_support.sql
```

#### 3.2 驗證資料庫變更

```sql
-- 檢查 departments 表
SELECT * FROM departments;

-- 檢查 profiles 是否有新欄位
SELECT id, username, department_id, role FROM profiles LIMIT 5;

-- 檢查 RLS policies
SELECT * FROM pg_policies WHERE tablename IN ('departments', 'profiles', 'time_entries');
```

#### 3.3 測試各角色權限

**Super Admin 測試：**
1. 登入 Super Admin 帳號
2. 進入 Dashboard，應該能看到「全公司」選項
3. 切換部門，資料應該正確過濾
4. 進入 Admin 頁面，應該能看到所有使用者
5. 嘗試修改使用者角色和部門
6. 新增使用者時應該能選擇任何部門和角色

**Department Admin 測試：**
1. 登入 Department Admin 帳號
2. 進入 Dashboard，應該只看到本部門資料
3. 不應該看到部門選擇器
4. 進入 Admin 頁面，應該只看到本部門使用者
5. 嘗試修改使用者角色（不能設定 super_admin）
6. 新增使用者時只能加入本部門

**Member 測試：**
1. 登入一般成員帳號
2. 進入 Dashboard，應該只看到本部門資料
3. 不應該看到 Admin 選項
4. 只能管理自己的工時記錄

### 4. 可能遇到的問題

#### 問題 1：RLS 阻止查詢

**症狀：** 無法看到任何資料或「permission denied」錯誤

**解決：**
```sql
-- 檢查 RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 確認使用者的 role 和 department_id 正確設定
SELECT id, username, role, department_id FROM profiles WHERE id = auth.uid();
```

#### 問題 2：現有使用者沒有部門

**解決：**
```sql
-- 將所有沒有部門的使用者設定到 QA Team
UPDATE profiles
SET department_id = (SELECT id FROM departments WHERE code = 'QA' LIMIT 1)
WHERE department_id IS NULL;
```

#### 問題 3：Edge Function 權限不足

**症狀：** 創建使用者後無法更新 department_id

**解決：** 確認 Edge Function 使用 `SUPABASE_SERVICE_ROLE_KEY`

### 5. 部署檢查清單

- [ ] 資料庫 migration 已執行
- [ ] 現有使用者已分配部門
- [ ] 至少有一個 Super Admin
- [ ] RLS policies 測試通過
- [ ] Admin 頁面功能測試通過
- [ ] Dashboard 部門過濾測試通過
- [ ] 各角色權限測試通過
- [ ] Edge Functions 已更新並部署

## 未來擴展建議

### Phase 2: 進階權限管理
- 新增部門管理頁面（Super Admin 專用）
- 支援部門啟用/停用
- 部門統計和分析

### Phase 3: 細緻化權限
- 新增更多角色（如 Team Lead, Viewer）
- 權限繼承和委派機制
- 審計日誌記錄所有權限變更

## 聯絡資訊

如有問題，請參考：
- Supabase 文件：https://supabase.com/docs/guides/auth/row-level-security
- 專案 GitHub: https://github.com/kusodevil/workhours

---

最後更新：2026-01-29
版本：Phase 1 (部分完成)
