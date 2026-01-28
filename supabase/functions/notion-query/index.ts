import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCORS } from '../_shared/cors.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { NotionError, handleNotionError } from '../_shared/errors.ts';

interface NotionQueryRequest {
  database_id: string;
  filter?: any;
  sorts?: any[];
  page_size?: number;
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

    // 解析請求
    const body: NotionQueryRequest = await req.json();
    const { database_id, filter, sorts, page_size = 100 } = body;

    // 驗證必填參數
    if (!database_id) {
      throw new NotionError('缺少 database_id 參數', 400, 'INVALID_REQUEST');
    }

    // 從環境變數讀取 Notion API Key
    const notionApiKey = Deno.env.get('NOTION_API_KEY');
    const notionVersion = Deno.env.get('NOTION_VERSION') || '2022-06-28';

    if (!notionApiKey) {
      console.error('NOTION_API_KEY not configured');
      throw new NotionError('Notion API 未設定', 500, 'CONFIG_ERROR');
    }

    console.log(`[notion-query] User ${userId} querying database ${database_id}`);

    // 呼叫 Notion API
    const response = await fetch(
      `https://api.notion.com/v1/databases/${database_id}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Notion-Version': notionVersion,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter,
          sorts,
          page_size,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[notion-query] Notion API error:', errorData);
      throw new NotionError(
        'Notion API 呼叫失敗',
        response.status,
        errorData.code || 'NOTION_API_ERROR'
      );
    }

    const data = await response.json();
    console.log(`[notion-query] Successfully returned ${data.results?.length || 0} results`);

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    return handleNotionError(error);
  }
});
