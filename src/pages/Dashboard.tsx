import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { timeEntries, isLoading } = useTimeEntries();
  const { projects } = useProjects();
  const { effectiveTheme } = useTheme();
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Calculate week options
  const weekOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      options.push({
        value: i,
        label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      });
    }
    return options;
  }, []);

  // Filter entries by selected week
  const weekEntries = useMemo(() => {
    const week = weekOptions[selectedWeek];
    if (!week) return [];
    return timeEntries.filter(e => e.date >= week.start && e.date <= week.end);
  }, [selectedWeek, weekOptions, timeEntries]);

  // Project stats for charts
  const projectStats = useMemo(() => {
    const stats: Record<string, { name: string; hours: number; color: string }> = {};

    weekEntries.forEach(entry => {
      const project = projects.find(p => p.id === entry.project_id);
      if (project) {
        if (!stats[project.id]) {
          stats[project.id] = { name: project.name, hours: 0, color: project.color };
        }
        stats[project.id].hours += entry.hours;
      }
    });

    const statsArray = Object.values(stats);
    const total = statsArray.reduce((sum, stat) => sum + stat.hours, 0);

    // Add percent field to each stat
    return statsArray.map(stat => ({
      ...stat,
      percent: total > 0 ? stat.hours / total : 0
    })).sort((a, b) => b.hours - a.hours);
  }, [weekEntries, projects]);

  // Daily breakdown for bar chart
  const dailyStats = useMemo(() => {
    const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    const week = weekOptions[selectedWeek];
    if (!week) return [];

    const weekStart = new Date(week.start);

    return days.map((dayName, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const dateStr = date.toISOString().split('T')[0];

      const dayEntries = weekEntries.filter(e => e.date === dateStr);
      const result: Record<string, string | number> = { name: dayName };

      projects.filter(p => p.is_active).forEach(project => {
        const projectHours = dayEntries
          .filter(e => e.project_id === project.id)
          .reduce((sum, e) => sum + e.hours, 0);
        result[project.name] = projectHours;
      });

      return result;
    });
  }, [weekEntries, weekOptions, selectedWeek, projects]);

  const activeProjects = projects.filter(p => p.is_active);
  const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);

  // 平均每日：只算有填工時的天數
  const workedDays = new Set(weekEntries.map(entry => entry.date)).size;
  const avgHoursPerDay = workedDays > 0 ? totalHours / workedDays : 0;
  const isEmpty = !isLoading && timeEntries.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">工時總覽</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">查看每週工時分配狀況</p>
        </div>
        {/* Week Selector */}
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
        >
          {weekOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.value === 0 ? '本週 ' : ''}{opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 第一次使用：還沒有任何資料 */}
      {isEmpty && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium">歡迎使用 WorkHours</p>
          <p className="mt-1">
            所有資料都只存在這台電腦的瀏覽器裡。你可以直接到
            <Link to="/timesheet" className="underline mx-1">填寫工時</Link>
            開始，或先到
            <Link to="/settings" className="underline mx-1">設定</Link>
            匯入之前的備份。
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">本週總工時</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalHours} 小時</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">平均每日</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{avgHoursPerDay.toFixed(1)} 小時</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">參與專案</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{projectStats.length} 個</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Daily Hours */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">每日工時分佈</h2>
          {weekEntries.length > 0 ? (
            <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                      border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    itemStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    labelStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    wrapperStyle={{
                      outline: 'none',
                      zIndex: 1000
                    }}
                    cursor={false}
                  />
                  <Legend />
                  {activeProjects.map(project => (
                    <Bar key={project.id} dataKey={project.name} stackId="a" fill={project.color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              本週尚無工時紀錄
            </div>
          )}
        </div>

        {/* Pie Chart - Hours by Project */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">專案時數比例</h2>
          {projectStats.length > 0 ? (
            <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={projectStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="hours"
                    label={({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
                      if (!cx || !cy || midAngle === undefined || !outerRadius) return null;

                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const percentage = ((percent ?? 0) * 100).toFixed(0);

                      return (
                        <text
                          x={x}
                          y={y}
                          fill={effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'}
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                          fontSize="13"
                        >
                          {`${name} ${percentage}%`}
                        </text>
                      );
                    }}
                    labelLine={false}
                  >
                    {projectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined, name: string | undefined, props: any) => {
                      const hours = value ?? 0;
                      const percent = props.payload?.percent ?? 0;
                      return [`${(percent * 100).toFixed(1)}% (${hours} 小時)`, name ?? ''];
                    }}
                    contentStyle={{
                      backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                      border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    itemStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    labelStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    wrapperStyle={{
                      outline: 'none',
                      zIndex: 1000
                    }}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[340px] flex items-center justify-center text-gray-400">
              本週尚無工時紀錄
            </div>
          )}
        </div>
      </div>

      {/* Project Summary Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">專案工時明細</h2>
        </div>
        {projectStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    專案
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    工時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    佔比
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {projectStats.map(stat => (
                  <tr key={stat.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="font-medium text-gray-900 dark:text-gray-100">{stat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {stat.hours} 小時
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {totalHours > 0 ? ((stat.hours / totalHours) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center text-gray-400">
            本週尚無工時紀錄，請先填寫工時
          </div>
        )}
      </div>

    </div>
  );
}
