import { useState } from 'react';
import { queryNotionDatabase } from '../lib/edge-functions';
import { Button } from '../components/ui';

export function NotionTest() {
  const [databaseId, setDatabaseId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuery = async () => {
    if (!databaseId) {
      alert('請輸入 Database ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const { data, error: err } = await queryNotionDatabase(databaseId);

    if (err) {
      setError(err);
    } else {
      setResult(data);
    }

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notion API 測試</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">測試 Edge Function 串接 Notion API</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notion Database ID
            </label>
            <input
              type="text"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button onClick={handleQuery} disabled={loading}>
            {loading ? '查詢中...' : '查詢 Notion Database'}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">錯誤: {error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              查詢結果 ({result.results?.length || 0} 筆)
            </h3>
            <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-800 dark:text-gray-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
