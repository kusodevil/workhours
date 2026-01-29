import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

interface LookupRequest {
  username: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[lookup-email-by-username] Request received');

    // 解析請求
    const body: LookupRequest = await req.json();
    const { username } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: '使用者名稱為必填' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[lookup-email-by-username] Looking up email for username:', username);

    // 使用 Service Role Key 繞過 RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseServiceKey) {
      console.error('[lookup-email-by-username] SUPABASE_SERVICE_ROLE_KEY not configured');
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

    // 查詢 email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('username', username)
      .maybeSingle();

    console.log('[lookup-email-by-username] Lookup result:', { profile, profileError });

    if (profileError) {
      console.error('[lookup-email-by-username] Error looking up email:', profileError);
      return new Response(
        JSON.stringify({ error: `查詢失敗：${profileError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!profile) {
      console.log('[lookup-email-by-username] No profile found for username:', username);
      return new Response(
        JSON.stringify({ error: '找不到此使用者' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[lookup-email-by-username] Found email for username:', profile.email);

    return new Response(
      JSON.stringify({
        email: profile.email
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('[lookup-email-by-username] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: '發生未預期的錯誤' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
