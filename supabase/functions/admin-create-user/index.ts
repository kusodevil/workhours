import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCORS } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

interface CreateUserRequest {
  username: string;
  password: string;
  department_id: string;
  role?: 'super_admin' | 'department_admin' | 'member';
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    // 驗證用戶身份
    console.log('[admin-create-user] Request received');
    const { userId, error: authError } = await verifyAuth(req);
    console.log('[admin-create-user] Auth verification result:', { userId, authError });
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: '未授權，請先登入' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 建立 Supabase Admin client（使用 Service Role Key 繞過 RLS）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('[admin-create-user] SUPABASE_SERVICE_ROLE_KEY not configured');
      return new Response(
        JSON.stringify({ error: '服務配置錯誤' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 檢查呼叫者是否為管理者（使用 Service Role Key 繞過 RLS）
    console.log('[admin-create-user] Checking if user is admin:', userId);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, department_id')
      .eq('id', userId)
      .single();

    console.log('[admin-create-user] Admin check result:', { profile, profileError });

    if (profileError || !profile || (profile.role !== 'super_admin' && profile.role !== 'department_admin')) {
      console.log('[admin-create-user] User is not admin or profile not found');
      return new Response(
        JSON.stringify({ error: '權限不足，僅管理者可建立使用者' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[admin-create-user] User is admin, proceeding to create user');

    // 解析請求
    const body: CreateUserRequest = await req.json();
    const { username, password, department_id, role = 'member' } = body;

    // 驗證輸入
    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '使用者名稱和密碼為必填' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!department_id) {
      return new Response(
        JSON.stringify({ error: '部門為必填' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (username.length < 2) {
      return new Response(
        JSON.stringify({ error: '使用者名稱至少需要 2 個字元' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: '密碼至少需要 6 個字元' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 部門管理員只能在自己的部門建立使用者
    if (profile.role === 'department_admin' && department_id !== profile.department_id) {
      return new Response(
        JSON.stringify({ error: '您只能在自己的部門建立使用者' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 部門管理員不能建立超級管理員
    if (profile.role === 'department_admin' && role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: '部門管理員無法建立超級管理員' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 檢查 username 是否已存在
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('[admin-create-user] Error checking existing user:', checkError);
      return new Response(
        JSON.stringify({ error: '檢查使用者失敗' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: '使用者名稱已存在' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 為 username 生成內部 email
    // 使用 crypto.randomUUID() 生成唯一的 email，避免中文字符問題
    const emailPrefix = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const internalEmail = `user_${emailPrefix}@workhours.internal`;

    console.log(`[admin-create-user] Creating user with username: ${username}, email: ${internalEmail}`);

    // 使用 Admin API 建立使用者
    console.log('[admin-create-user] Calling supabaseAdmin.auth.admin.createUser...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true, // 自動確認 email（不需要發送驗證信）
      user_metadata: {
        username: username,
      },
    });

    console.log('[admin-create-user] Admin API call completed');

    if (createError) {
      console.error('[admin-create-user] Error creating user:', createError);
      console.error('[admin-create-user] Error details:', JSON.stringify(createError));
      return new Response(
        JSON.stringify({ error: `建立使用者失敗：${createError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[admin-create-user] Successfully created user ${username} with ID ${newUser.user.id}`);

    // 等待一下讓 trigger 先創建 profile（如果有的話）
    await new Promise(resolve => setTimeout(resolve, 500));

    // 使用 upsert 確保 profiles 表記錄存在，並設置 username、department_id 和 role
    console.log('[admin-create-user] Upserting profile with username, department, and role');
    const { data: upsertedProfile, error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        username: username,
        email: internalEmail,
        department_id: department_id,
        role: role,
        is_admin: false // 保留向後相容
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (profileUpsertError) {
      console.error('[admin-create-user] Error upserting profile:', profileUpsertError);
      // 不要因為這個失敗而返回錯誤，用戶已經創建成功了
    } else {
      console.log('[admin-create-user] Profile upserted successfully:', upsertedProfile);
    }

    // 驗證 username 是否真的被寫入
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('username, email')
      .eq('id', newUser.user.id)
      .single();

    console.log('[admin-create-user] Verification - Profile data:', verifyProfile);
    if (verifyError) {
      console.error('[admin-create-user] Verification failed:', verifyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          username: username,
          email: internalEmail,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('[admin-create-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: '建立使用者時發生錯誤' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
