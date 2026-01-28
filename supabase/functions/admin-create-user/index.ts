import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCORS } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

interface CreateUserRequest {
  username: string;
  password: string;
}

serve(async (req) => {
  // 處理 CORS 預檢請求
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    // 驗證用戶身份
    const { userId, error: authError } = await verifyAuth(req);
    if (authError || !userId) {
      return new Response(
        JSON.stringify({ error: '未授權，請先登入' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 建立 Supabase client（使用 ANON_KEY 查詢用戶權限）
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 檢查呼叫者是否為管理者
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile || !profile.is_admin) {
      return new Response(
        JSON.stringify({ error: '權限不足，僅管理者可建立使用者' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 解析請求
    const body: CreateUserRequest = await req.json();
    const { username, password } = body;

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

    // 檢查 username 是否已存在
    const { data: existingUser, error: checkError } = await supabase
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

    // 使用 Service Role Key 建立 Supabase Admin client
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

    // 為 username 生成內部 email
    const internalEmail = `${username}@workhours.internal`;

    console.log(`[admin-create-user] Creating user with username: ${username}, email: ${internalEmail}`);

    // 使用 Admin API 建立使用者
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: internalEmail,
      password: password,
      email_confirm: true, // 自動確認 email（不需要發送驗證信）
      user_metadata: {
        username: username,
      },
    });

    if (createError) {
      console.error('[admin-create-user] Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: `建立使用者失敗：${createError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[admin-create-user] Successfully created user ${username} with ID ${newUser.user.id}`);

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
