import { corsHeaders } from './cors.ts';

export class NotionError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'NotionError';
  }
}

export function handleNotionError(error: unknown): Response {
  console.error('Notion API Error:', error);

  if (error instanceof NotionError) {
    return new Response(
      JSON.stringify({
        error: '資料查詢失敗',
        code: error.code,
      }),
      {
        status: error.statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // 預設錯誤回應（不洩漏內部資訊）
  return new Response(
    JSON.stringify({ error: '服務暫時無法使用' }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}
