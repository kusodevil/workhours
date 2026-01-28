import { supabase } from './supabase';

export interface EdgeFunctionResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * 呼叫 Supabase Edge Function
 *
 * @param functionName - Edge Function 名稱
 * @param payload - 請求參數
 * @returns Promise<{ data, error }>
 */
export async function invokeEdgeFunction<T = any>(
  functionName: string,
  payload?: Record<string, any>
): Promise<EdgeFunctionResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke<T>(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`Edge Function ${functionName} error:`, error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`Edge Function ${functionName} exception:`, err);
    return { data: null, error: '呼叫服務失敗' };
  }
}

/**
 * 查詢 Notion Database
 *
 * @param databaseId - Notion Database ID
 * @param filter - Notion API filter object (optional)
 * @returns Promise<{ data, error }>
 */
export async function queryNotionDatabase(
  databaseId: string,
  filter?: any
): Promise<EdgeFunctionResponse<any>> {
  return invokeEdgeFunction('notion-query', {
    database_id: databaseId,
    filter,
  });
}
