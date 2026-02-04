import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadChineseFont } from './pdfFonts';
import type { TimeEntry, Profile, Project } from '../types/database';

// 按使用者分組工時記錄
interface UserTimeStats {
  userId: string;
  userName: string;
  totalHours: number;
  entries: TimeEntry[];
  dailyHours: Record<string, number>;
}

function groupEntriesByUser(entries: TimeEntry[], profiles: Profile[]): UserTimeStats[] {
  const userMap: Record<string, UserTimeStats> = {};

  entries.forEach(entry => {
    const profile = profiles.find(p => p.id === entry.user_id);
    if (!profile) return;

    if (!userMap[entry.user_id]) {
      userMap[entry.user_id] = {
        userId: entry.user_id,
        userName: profile.username,
        totalHours: 0,
        entries: [],
        dailyHours: {}
      };
    }

    userMap[entry.user_id].totalHours += entry.hours;
    userMap[entry.user_id].entries.push(entry);
    userMap[entry.user_id].dailyHours[entry.date] =
      (userMap[entry.user_id].dailyHours[entry.date] || 0) + entry.hours;
  });

  return Object.values(userMap).sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * 匯出部門週報/月報 PDF
 */
export async function exportDepartmentWeeklyReportPDF(
  entries: TimeEntry[],
  projects: Project[],
  profiles: Profile[],
  weekStart: Date,
  weekEnd: Date,
  departmentName: string,
  reportType: 'week' | 'month' = 'week'
): Promise<void> {
  const doc = new jsPDF();

  // 載入中文字體
  await loadChineseFont(doc);

  const userStats = groupEntriesByUser(entries, profiles);
  const departmentTotal = userStats.reduce((sum, user) => sum + user.totalHours, 0);

  // 標題
  doc.setFontSize(18);
  const reportTitle = reportType === 'week' ? '工時週報' : '工時月報';
  doc.text(`${departmentName} - ${reportTitle}`, 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`期間： ${format(weekStart, 'yyyy/MM/dd')} - ${format(weekEnd, 'yyyy/MM/dd')}`, 105, 30, { align: 'center' });
  doc.text(`匯出時間： ${format(new Date(), 'yyyy/MM/dd HH:mm')}`, 105, 36, { align: 'center' });

  // 統計摘要
  doc.setFontSize(12);
  doc.text('統計摘要', 14, 50);

  const summaryData = [
    ['部門總時數', `${departmentTotal.toFixed(1)} 小時`],
    ['參與人數', `${userStats.length} 人`],
    ['平均時數', userStats.length > 0 ? `${(departmentTotal / userStats.length).toFixed(1)} 小時` : '0 小時'],
    ['達標人數 (≥35h)', `${userStats.filter(u => u.totalHours >= 35).length} 人`]
  ];

  autoTable(doc, {
    startY: 55,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: {
      font: 'NotoSansTC',
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 60 }
    }
  });

  // 成員工時明細
  const yPosition = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.text('成員工時明細', 14, yPosition);

  const memberData = userStats.map(user => [
    user.userName,
    `${user.totalHours.toFixed(1)}h`,
    user.totalHours >= 35 ? '✓ 達標' : `還差 ${(35 - user.totalHours).toFixed(1)}h`
  ]);

  autoTable(doc, {
    startY: yPosition + 5,
    head: [['員工姓名', '總時數', '完成狀態']],
    body: memberData,
    theme: 'grid',
    styles: {
      font: 'NotoSansTC',
      fontSize: 10,
      cellPadding: 5,
      halign: 'center'
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'normal',
      font: 'NotoSansTC'
    },
    columnStyles: {
      0: { cellWidth: 60, halign: 'left' },
      1: { cellWidth: 40 },
      2: { cellWidth: 60 }
    }
  });

  // 如果需要，加入詳細資料（新頁）
  if (userStats.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('每日工時詳情', 105, 20, { align: 'center' });

    let currentY = 30;

    userStats.forEach((user, index) => {
      // 檢查是否需要新頁面
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.text(`${index + 1}. ${user.userName} (總計: ${user.totalHours.toFixed(1)}h)`, 14, currentY);
      currentY += 5;

      const detailData = user.entries
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(entry => {
          const project = projects.find(p => p.id === entry.project_id);
          return [
            format(new Date(entry.date), 'M/d (EEE)', { locale: zhTW }),
            project?.name || '未知',
            `${entry.hours}h`,
            entry.note || '-'
          ];
        });

      autoTable(doc, {
        startY: currentY,
        head: [['日期', '專案', '時數', '備註']],
        body: detailData,
        theme: 'striped',
        styles: {
          font: 'NotoSansTC',
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [229, 231, 235],
          textColor: [0, 0, 0],
          fontStyle: 'normal',
          font: 'NotoSansTC'
        },
        margin: { left: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // 下載
  const reportLabel = reportType === 'week' ? '工時週報' : '工時月報';
  const fileName = `${departmentName}_${reportLabel}_${format(weekStart, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

/**
 * 匯出部門工時 CSV
 */
export function exportDepartmentCSV(
  entries: TimeEntry[],
  projects: Project[],
  profiles: Profile[],
  start: Date,
  end: Date,
  departmentName: string
): void {
  // CSV 表頭
  let csv = '\uFEFF'; // UTF-8 BOM for Excel
  csv += '部門,員工姓名,日期,星期,專案,時數,備註\n';

  // 按日期和使用者排序
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const profileA = profiles.find(p => p.id === a.user_id);
    const profileB = profiles.find(p => p.id === b.user_id);
    return (profileA?.username || '').localeCompare(profileB?.username || '');
  });

  // 加入資料行
  sortedEntries.forEach(entry => {
    const profile = profiles.find(p => p.id === entry.user_id);
    const project = projects.find(p => p.id === entry.project_id);
    const date = new Date(entry.date);

    csv += [
      departmentName,
      profile?.username || '未知',
      format(date, 'yyyy/MM/dd'),
      format(date, 'EEE', { locale: zhTW }),
      project?.name || '未知專案',
      entry.hours,
      `"${(entry.note || '').replace(/"/g, '""')}"`
    ].join(',') + '\n';
  });

  // 加入統計摘要
  csv += '\n';
  csv += '統計摘要\n';

  const userStats = groupEntriesByUser(entries, profiles);
  const departmentTotal = userStats.reduce((sum, user) => sum + user.totalHours, 0);

  csv += `部門總時數,${departmentTotal.toFixed(1)}小時\n`;
  csv += `參與人數,${userStats.length}人\n`;
  csv += `平均時數,${userStats.length > 0 ? (departmentTotal / userStats.length).toFixed(1) : 0}小時\n`;
  csv += '\n';
  csv += '個人統計\n';
  csv += '員工姓名,總時數\n';

  userStats.forEach(user => {
    csv += `${user.userName},${user.totalHours.toFixed(1)}\n`;
  });

  // 下載
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${departmentName}_工時報表_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
