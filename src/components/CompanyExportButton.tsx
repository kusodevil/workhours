import { useState } from 'react';
import { format } from 'date-fns';
import { Button, Modal } from './ui';
import { exportCompanyWeeklyReportPDF, exportCompanyCSV, getWeekDates, getMonthDates } from '../utils/companyExport';
import type { TimeEntry, Profile, Project, Department } from '../types/database';

interface CompanyExportButtonProps {
  entries: TimeEntry[];
  projects: Project[];
  profiles: Profile[];
  departments: Department[];
}

type ReportType = 'week' | 'month';
type ExportFormat = 'pdf' | 'csv';

export function CompanyExportButton({ entries, projects, profiles, departments }: CompanyExportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('week');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [exporting, setExporting] = useState(false);

  // 生成過去 8 週選項
  const weekOptions = Array.from({ length: 8 }, (_, i) => {
    const { start, end } = getWeekDates(i);
    return {
      value: i,
      label: i === 0 ? '本週' : `${i} 週前`,
      dateRange: `${format(start, 'M/d')} - ${format(end, 'M/d')}`,
      start,
      end
    };
  });

  // 生成過去 12 個月選項
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const { start, end } = getMonthDates(i);
    return {
      value: i,
      label: i === 0 ? '本月' : `${i} 個月前`,
      dateRange: format(start, 'yyyy/MM'),
      start,
      end
    };
  });

  const handleExport = async () => {
    setExporting(true);

    try {
      if (reportType === 'week') {
        const { start, end } = getWeekDates(selectedWeek);
        const weekStartStr = format(start, 'yyyy-MM-dd');
        const weekEndStr = format(end, 'yyyy-MM-dd');

        // 篩選該週的記錄
        const weekEntries = entries.filter(
          e => e.date >= weekStartStr && e.date <= weekEndStr
        );

        if (exportFormat === 'pdf') {
          await exportCompanyWeeklyReportPDF(weekEntries, projects, profiles, departments, start, end, 'week');
        } else if (exportFormat === 'csv') {
          exportCompanyCSV(weekEntries, projects, profiles, departments, start, end);
        }
      } else if (reportType === 'month') {
        const { start, end } = getMonthDates(selectedMonth);
        const monthStartStr = format(start, 'yyyy-MM-dd');
        const monthEndStr = format(end, 'yyyy-MM-dd');

        // 篩選該月的記錄
        const monthEntries = entries.filter(
          e => e.date >= monthStartStr && e.date <= monthEndStr
        );

        if (exportFormat === 'pdf') {
          await exportCompanyWeeklyReportPDF(monthEntries, projects, profiles, departments, start, end, 'month');
        } else if (exportFormat === 'csv') {
          exportCompanyCSV(monthEntries, projects, profiles, departments, start, end);
        }
      }

      setShowModal(false);
    } catch (error) {
      console.error('匯出失敗:', error);
      alert('匯出失敗，請重試');
    } finally {
      setExporting(false);
    }
  };

  const openExportModal = (type: ReportType) => {
    setReportType(type);
    setExportFormat('pdf');
    setSelectedWeek(0);
    setSelectedMonth(0);
    setShowModal(true);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openExportModal('week')}
        >
          匯出全公司週報
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openExportModal('month')}
        >
          匯出全公司月報
        </Button>
      </div>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={reportType === 'week' ? '匯出全公司週報' : '匯出全公司月報'}
        >
          <div className="space-y-4">
            {/* 公司資訊 */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400">
                <span className="font-medium">匯出範圍：</span>全公司
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                將匯出 {departments.length} 個部門，共 {profiles.length} 位成員的工時記錄
              </p>
            </div>

            {/* 時間範圍選擇 */}
            {reportType === 'week' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  選擇週次
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {weekOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.dateRange})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  選擇月份
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} ({opt.dateRange})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 匯出格式選擇 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                匯出格式
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    exportFormat === 'pdf'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    exportFormat === 'csv'
                      ? 'bg-blue-600 dark:bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  CSV
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {exportFormat === 'pdf' && 'PDF 格式包含各部門統計、員工明細與彙總資訊'}
                {exportFormat === 'csv' && 'CSV 格式適合 Excel 分析，包含所有部門與成員工時明細'}
              </p>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1"
              >
                {exporting ? '匯出中...' : '確認匯出'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
