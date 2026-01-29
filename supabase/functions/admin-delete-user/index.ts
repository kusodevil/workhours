import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';

interface DeleteUserRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[admin-delete-user] Request received');

    // 驗證用戶身份
    const { userId, error: authError } = await verifyAuth(req);
    console.log('[admin-delete-user] Auth verification result:', { userId, authError });

    if (authError || !userId) {
      console.log('[admin-delete-user] Auth failed');
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
      console.error('[admin-delete-user] SUPABASE_SERVICE_ROLE_KEY not configured');
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

    // 檢查呼叫者是否為管理者
    console.log('[admin-delete-user] Checking if user is admin:', userId);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    console.log('[admin-delete-user] Admin check result:', { profile, profileError });

    if (profileError || !profile || !profile.is_admin) {
      console.log('[admin-delete-user] User is not admin or profile not found');
      return new Response(
        JSON.stringify({ error: '權限不足，僅管理者可刪除使用者' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[admin-delete-user] User is admin, proceeding to delete user');

    // 解析請求
    const body: DeleteUserRequest = await req.json();
    const { userId: targetUserId } = body;

    // 驗證輸入
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: '使用者 ID 為必填' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 防止管理者刪除自己
    if (targetUserId === userId) {
      return new Response(
        JSON.stringify({ error: '不能刪除自己的帳號' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 使用 Admin API 刪除使用者
    console.log(`[admin-delete-user] Deleting user with ID: ${targetUserId}`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteError) {
      console.error('[admin-delete-user] Error deleting user:', deleteError);
      return new Response(
        JSON.stringify({ error: `刪除使用者失敗：${deleteError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[admin-delete-user] Successfully deleted user with ID ${targetUserId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: '使用者已刪除'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('[admin-delete-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: '發生未預期的錯誤' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
