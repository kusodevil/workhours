import * as XLSX from 'xlsx';
import { format, eachWeekOfInterval, endOfWeek } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadChineseFont } from './pdfFonts';
import type { TimeEntry } from '../types/database';
import type { Project } from '../types/database';

/**
 * 匯出週報 (Excel 格式)
 */
export function exportWeeklyReport(
  entries: TimeEntry[],
  projects: Project[],
  weekStart: Date,
  weekEnd: Date,
  userName: string
): void {
  // 按日期排序工時記錄
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 組裝數據
  const data = [
    ['工時週報'],
    ['期間', `${format(weekStart, 'yyyy/MM/dd')} - ${format(weekEnd, 'yyyy/MM/dd')}`],
    ['人員', userName],
    [],
    ['日期', '星期', '專案', '時數', '備註'],
    ...sortedEntries.map(e => {
      const project = projects.find(p => p.id === e.project_id);
      return [
        format(new Date(e.date), 'M/d'),
        format(new Date(e.date), 'EEE', { locale: zhTW }),
        project?.name || '未知專案',
        e.hours,
        e.note || ''
      ];
    }),
    [],
    ['小計', '', '', sortedEntries.reduce((sum, e) => sum + e.hours, 0), '']
  ];

  // 建立工作簿
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '週報');

  // 設定欄寬
  ws['!cols'] = [
    { wch: 8 },  // 日期
    { wch: 6 },  // 星期
    { wch: 20 }, // 專案
    { wch: 8 },  // 時數
    { wch: 30 }, // 備註
  ];

  // 下載
  const fileName = `工時週報_${format(weekStart, 'yyyy-MM-dd')}_至_${format(weekEnd, 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 匯出月報 (Excel 格式)
 */
export function exportMonthlyReport(
  entries: TimeEntry[],
  projects: Project[],
  monthStart: Date,
  monthEnd: Date,
  userName: string
): void {
  // 按日期排序
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 取得月份內的所有週
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  // 計算每週統計
  const weeklyStats = weeks.map((weekStartDate, index) => {
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
    const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');

    const weekEntries = sortedEntries.filter(e =>
      e.date >= weekStartStr && e.date <= weekEndStr
    );

    // 按專案分組
    const projectStats: Record<string, number> = {};
    weekEntries.forEach(e => {
      const project = projects.find(p => p.id === e.project_id);
      const projectName = project?.name || '未知專案';
      projectStats[projectName] = (projectStats[projectName] || 0) + e.hours;
    });

    const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);

    return {
      weekLabel: `Week ${index + 1} (${format(weekStartDate, 'M/d')} - ${format(weekEndDate, 'M/d')})`,
      projectStats,
      totalHours
    };
  });

  // 組裝數據
  const data: (string | number)[][] = [
    ['工時月報'],
    ['期間', `${format(monthStart, 'yyyy/MM')} (${format(monthStart, 'yyyy/MM/dd')} - ${format(monthEnd, 'yyyy/MM/dd')})`],
    ['人員', userName],
    [],
    ['週次', '專案', '時數', '佔比']
  ];

  // 總工時
  const totalMonthHours = sortedEntries.reduce((sum, e) => sum + e.hours, 0);

  // 添加每週數據
  weeklyStats.forEach(week => {
    if (week.totalHours > 0) {
      // 第一行：週次標題
      data.push([week.weekLabel, '', '', '']);

      // 各專案行
      Object.entries(week.projectStats).forEach(([projectName, hours]) => {
        const percentage = totalMonthHours > 0 ? ((hours / totalMonthHours) * 100).toFixed(1) + '%' : '0%';
        data.push(['', projectName, hours, percentage]);
      });

      // 週小計
      const weekPercentage = totalMonthHours > 0 ? ((week.totalHours / totalMonthHours) * 100).toFixed(1) + '%' : '0%';
      data.push(['', '週小計', week.totalHours, weekPercentage]);
      data.push(['']); // 空行
    }
  });

  // 月總計
  data.push(['總計', '', totalMonthHours, '100%']);

  // 建立工作簿
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '月報');

  // 設定欄寬
  ws['!cols'] = [
    { wch: 20 }, // 週次
    { wch: 20 }, // 專案
    { wch: 10 }, // 時數
    { wch: 10 }, // 佔比
  ];

  // 下載
  const fileName = `工時月報_${format(monthStart, 'yyyy-MM')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 匯出 CSV 格式
 */
export function exportCSV(
  entries: TimeEntry[],
  projects: Project[],
  weekStart: Date,
  weekEnd: Date
): void {
  // 按日期排序
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 組裝數據
  const data = [
    ['日期', '星期', '專案', '時數', '備註'],
    ...sortedEntries.map(e => {
      const project = projects.find(p => p.id === e.project_id);
      return [
        format(new Date(e.date), 'yyyy-MM-dd'),
        format(new Date(e.date), 'EEE', { locale: zhTW }),
        project?.name || '未知專案',
        e.hours,
        e.note || ''
      ];
    })
  ];

  // 建立工作簿
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  // 下載為 CSV
  const fileName = `工時紀錄_${format(weekStart, 'yyyy-MM-dd')}_至_${format(weekEnd, 'yyyy-MM-dd')}.csv`;
  XLSX.writeFile(wb, fileName, { bookType: 'csv' });
}

/**
 * 匯出週報 (PDF 格式)
 */
export async function exportWeeklyReportPDF(
  entries: TimeEntry[],
  projects: Project[],
  weekStart: Date,
  weekEnd: Date,
  userName: string
): Promise<void> {
  // 按日期排序
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 創建 PDF (A4, 直向)
  const doc = new jsPDF();

  // 載入中文字體
  await loadChineseFont(doc);

  // 標題
  doc.setFontSize(18);
  doc.text('工時週報', 105, 20, { align: 'center' });

  // 基本資訊
  doc.setFontSize(12);
  doc.text(`期間: ${format(weekStart, 'yyyy/MM/dd')} - ${format(weekEnd, 'yyyy/MM/dd')}`, 14, 35);
  doc.text(`人員: ${userName}`, 14, 42);

  // 準備表格數據
  const tableData = sortedEntries.map(e => {
    const project = projects.find(p => p.id === e.project_id);
    return [
      format(new Date(e.date), 'M/d'),
      format(new Date(e.date), 'EEE', { locale: zhTW }),
      project?.name || '未知專案',
      e.hours.toString(),
      e.note || ''
    ];
  });

  // 添加小計行
  const totalHours = sortedEntries.reduce((sum, e) => sum + e.hours, 0);
  tableData.push(['', '', '小計', totalHours.toString(), '']);

  // 生成表格
  autoTable(doc, {
    startY: 50,
    head: [['日期', '星期', '專案', '時數', '備註']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'NotoSansTC',
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      font: 'NotoSansTC',
    },
    columnStyles: {
      0: { cellWidth: 20 }, // 日期
      1: { cellWidth: 20 }, // 星期
      2: { cellWidth: 50 }, // 專案
      3: { cellWidth: 20, halign: 'right' }, // 時數
      4: { cellWidth: 70 }, // 備註
    },
    foot: [['']], // 空腳註
  });

  // 下載
  const fileName = `工時週報_${format(weekStart, 'yyyy-MM-dd')}_至_${format(weekEnd, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

/**
 * 匯出月報 (PDF 格式)
 */
export async function exportMonthlyReportPDF(
  entries: TimeEntry[],
  projects: Project[],
  monthStart: Date,
  monthEnd: Date,
  userName: string
): Promise<void> {
  // 按日期排序
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // 創建 PDF
  const doc = new jsPDF();

  // 載入中文字體
  await loadChineseFont(doc);

  // 標題
  doc.setFontSize(18);
  doc.text('工時月報', 105, 20, { align: 'center' });

  // 基本資訊
  doc.setFontSize(12);
  doc.text(`期間: ${format(monthStart, 'yyyy/MM')} (${format(monthStart, 'yyyy/MM/dd')} - ${format(monthEnd, 'yyyy/MM/dd')})`, 14, 35);
  doc.text(`人員: ${userName}`, 14, 42);

  // 取得月份內的所有週
  const weeks = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  // 準備表格數據
  const tableData: (string | number)[][] = [];
  let totalMonthHours = 0;

  weeks.forEach((weekStartDate, index) => {
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekStartStr = format(weekStartDate, 'yyyy-MM-dd');
    const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');

    const weekEntries = sortedEntries.filter(e =>
      e.date >= weekStartStr && e.date <= weekEndStr
    );

    if (weekEntries.length > 0) {
      const weekLabel = `Week ${index + 1} (${format(weekStartDate, 'M/d')} - ${format(weekEndDate, 'M/d')})`;

      // 按專案分組
      const projectStats: Record<string, number> = {};
      weekEntries.forEach(e => {
        const project = projects.find(p => p.id === e.project_id);
        const projectName = project?.name || '未知專案';
        projectStats[projectName] = (projectStats[projectName] || 0) + e.hours;
      });

      const weekTotal = weekEntries.reduce((sum, e) => sum + e.hours, 0);
      totalMonthHours += weekTotal;

      // 週標題行
      tableData.push([weekLabel, '', '', '']);

      // 各專案行
      Object.entries(projectStats).forEach(([projectName, hours]) => {
        tableData.push(['', projectName, hours, '']);
      });

      // 週小計
      tableData.push(['', '週小計', weekTotal, '']);
    }
  });

  // 總計行
  tableData.push(['總計', '', totalMonthHours, '100%']);

  // 生成表格
  autoTable(doc, {
    startY: 50,
    head: [['週次', '專案', '時數', '佔比']],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'NotoSansTC',
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      font: 'NotoSansTC',
    },
    columnStyles: {
      0: { cellWidth: 60 }, // 週次
      1: { cellWidth: 50 }, // 專案
      2: { cellWidth: 30, halign: 'right' }, // 時數
      3: { cellWidth: 30, halign: 'right' }, // 佔比
    },
  });

  // 下載
  const fileName = `工時月報_${format(monthStart, 'yyyy-MM')}.pdf`;
  doc.save(fileName);
}

