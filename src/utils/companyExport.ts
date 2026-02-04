import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadChineseFont } from './pdfFonts';
import type { TimeEntry, Profile, Project, Department } from '../types/database';

// 重用日期工具函式
export function getWeekDates(weeksAgo: number = 0) {
  const today = new Date();
  const targetDate = subWeeks(today, weeksAgo);
  const start = startOfWeek(targetDate, { weekStartsOn: 1 });
  const end = endOfWeek(targetDate, { weekStartsOn: 1 });
  return { start, end };
}

export function getMonthDates(monthsAgo: number = 0) {
  const today = new Date();
  const targetDate = subMonths(today, monthsAgo);
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);
  return { start, end };
}

// 按部門分組資料
interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  totalHours: number;
  memberCount: number;
  avgHours: number;
  profiles: Profile[];
  entries: TimeEntry[];
}

function groupByDepartment(
  entries: TimeEntry[],
  profiles: Profile[],
  departments: Department[]
): DepartmentStats[] {
  const deptMap: Record<string, DepartmentStats> = {};

  // 初始化所有部門
  departments.forEach(dept => {
    deptMap[dept.id] = {
      departmentId: dept.id,
      departmentName: dept.name,
      totalHours: 0,
      memberCount: 0,
      avgHours: 0,
      profiles: [],
      entries: []
    };
  });

  // 分組 profiles
  profiles.forEach(profile => {
    if (profile.department_id && deptMap[profile.department_id]) {
      deptMap[profile.department_id].profiles.push(profile);
      deptMap[profile.department_id].memberCount++;
    }
  });

  // 分組 entries 並計算總時數
  entries.forEach(entry => {
    const profile = profiles.find(p => p.id === entry.user_id);
    if (profile?.department_id && deptMap[profile.department_id]) {
      deptMap[profile.department_id].entries.push(entry);
      deptMap[profile.department_id].totalHours += entry.hours;
    }
  });

  // 計算平均時數
  Object.values(deptMap).forEach(dept => {
    dept.avgHours = dept.memberCount > 0 ? dept.totalHours / dept.memberCount : 0;
  });

  // 只返回有成員的部門，並按總時數排序
  return Object.values(deptMap)
    .filter(d => d.memberCount > 0)
    .sort((a, b) => b.totalHours - a.totalHours);
}

/**
 * 匯出全公司週報/月報 PDF
 */
export async function exportCompanyWeeklyReportPDF(
  entries: TimeEntry[],
  _projects: Project[],
  profiles: Profile[],
  departments: Department[],
  periodStart: Date,
  periodEnd: Date,
  reportType: 'week' | 'month' = 'week'
): Promise<void> {
  const doc = new jsPDF();

  // 載入中文字體
  await loadChineseFont(doc);

  const deptStats = groupByDepartment(entries, profiles, departments);
  const companyTotal = deptStats.reduce((sum, dept) => sum + dept.totalHours, 0);
  const totalMembers = deptStats.reduce((sum, dept) => sum + dept.memberCount, 0);

  // 標題
  doc.setFontSize(18);
  const reportTitle = reportType === 'week' ? '全公司工時週報' : '全公司工時月報';
  doc.text(reportTitle, 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`期間： ${format(periodStart, 'yyyy/MM/dd')} - ${format(periodEnd, 'yyyy/MM/dd')}`, 105, 30, { align: 'center' });
  doc.text(`匯出時間： ${format(new Date(), 'yyyy/MM/dd HH:mm')}`, 105, 36, { align: 'center' });

  // 全公司統計摘要
  doc.setFontSize(12);
  doc.text('全公司統計摘要', 14, 50);

  const companySummaryData = [
    ['公司總時數', `${companyTotal.toFixed(1)} 小時`],
    ['部門數量', `${deptStats.length} 個部門`],
    ['總人數', `${totalMembers} 人`],
    ['平均時數', totalMembers > 0 ? `${(companyTotal / totalMembers).toFixed(1)} 小時` : '0 小時']
  ];

  autoTable(doc, {
    startY: 55,
    head: [],
    body: companySummaryData,
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

  // 各部門統計
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(12);
  doc.text('各部門統計', 14, currentY);

  const deptTableData = deptStats.map(dept => [
    dept.departmentName,
    `${dept.memberCount} 人`,
    `${dept.totalHours.toFixed(1)}h`,
    `${dept.avgHours.toFixed(1)}h`
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    head: [['部門名稱', '人數', '總時數', '平均時數']],
    body: deptTableData,
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
      1: { cellWidth: 30 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 }
    }
  });

  // 各部門詳細資料（新頁）
  if (deptStats.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.text('各部門詳細資料', 105, 20, { align: 'center' });

    currentY = 30;

    deptStats.forEach((dept, index) => {
      // 檢查是否需要新頁面
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(11);
      doc.text(`${index + 1}. ${dept.departmentName} (總計: ${dept.totalHours.toFixed(1)}h, ${dept.memberCount}人)`, 14, currentY);
      currentY += 5;

      // 部門成員統計
      const memberStats: Record<string, number> = {};
      dept.entries.forEach(entry => {
        const profile = dept.profiles.find(p => p.id === entry.user_id);
        if (profile) {
          memberStats[profile.username] = (memberStats[profile.username] || 0) + entry.hours;
        }
      });

      const memberData = Object.entries(memberStats)
        .sort((a, b) => b[1] - a[1])
        .map(([name, hours]) => [
          name,
          `${hours.toFixed(1)}h`,
          hours >= 35 ? '✓ 達標' : `還差 ${(35 - hours).toFixed(1)}h`
        ]);

      autoTable(doc, {
        startY: currentY,
        head: [['員工姓名', '總時數', '完成狀態']],
        body: memberData,
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
        margin: { left: 20 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30 },
          2: { cellWidth: 50 }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // 下載
  const reportLabel = reportType === 'week' ? '全公司工時週報' : '全公司工時月報';
  const fileName = `${reportLabel}_${format(periodStart, 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

/**
 * 匯出全公司工時 CSV
 */
export function exportCompanyCSV(
  entries: TimeEntry[],
  projects: Project[],
  profiles: Profile[],
  departments: Department[],
  start: Date,
  end: Date
): void {
  // CSV 表頭
  let csv = '\uFEFF'; // UTF-8 BOM for Excel
  csv += '部門,員工姓名,日期,星期,專案,時數,備註\n';

  // 按部門和日期排序
  const sortedEntries = [...entries].sort((a, b) => {
    const profileA = profiles.find(p => p.id === a.user_id);
    const profileB = profiles.find(p => p.id === b.user_id);
    const deptA = profileA?.department_id || '';
    const deptB = profileB?.department_id || '';

    if (deptA !== deptB) {
      const deptNameA = departments.find(d => d.id === deptA)?.name || '';
      const deptNameB = departments.find(d => d.id === deptB)?.name || '';
      return deptNameA.localeCompare(deptNameB);
    }

    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (profileA?.username || '').localeCompare(profileB?.username || '');
  });

  // 加入資料行
  sortedEntries.forEach(entry => {
    const profile = profiles.find(p => p.id === entry.user_id);
    const department = profile?.department_id ? departments.find(d => d.id === profile.department_id) : null;
    const project = projects.find(p => p.id === entry.project_id);
    const date = new Date(entry.date);

    csv += [
      department?.name || '未分配',
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

  const deptStats = groupByDepartment(entries, profiles, departments);
  const companyTotal = deptStats.reduce((sum, dept) => sum + dept.totalHours, 0);
  const totalMembers = deptStats.reduce((sum, dept) => sum + dept.memberCount, 0);

  csv += `公司總時數,${companyTotal.toFixed(1)}小時\n`;
  csv += `部門數量,${deptStats.length}個\n`;
  csv += `總人數,${totalMembers}人\n`;
  csv += `平均時數,${totalMembers > 0 ? (companyTotal / totalMembers).toFixed(1) : 0}小時\n`;
  csv += '\n';

  csv += '各部門統計\n';
  csv += '部門名稱,人數,總時數,平均時數\n';
  deptStats.forEach(dept => {
    csv += `${dept.departmentName},${dept.memberCount},${dept.totalHours.toFixed(1)},${dept.avgHours.toFixed(1)}\n`;
  });

  // 下載
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `全公司工時報表_${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
