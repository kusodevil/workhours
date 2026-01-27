import { Card, Button } from './ui';

interface QuickFillPanelProps {
  onCopyLastWeek: () => void;
  onShowBatchFill: () => void;
}

export function QuickFillPanel({ onCopyLastWeek, onShowBatchFill }: QuickFillPanelProps) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">⚡ 快速填寫</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCopyLastWeek}
          className="flex-1"
        >
          複製上週工時
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onShowBatchFill}
          className="flex-1"
        >
          批次填寫
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        提示：可使用快速填寫功能節省時間，加入表單後可再編輯
      </p>
    </Card>
  );
}
