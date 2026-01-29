import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import type { Profile, Department } from '../types/database';

export function Dashboard() {
  const { timeEntries } = useTimeEntries();
  const { projects } = useProjects();
  const { isSuperAdmin, departmentId } = useAuth();
  const { effectiveTheme } = useTheme();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all'); // 'all' or department_id
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

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

  // Filter entries by selected week and department
  const weekEntries = useMemo(() => {
    const week = weekOptions[selectedWeek];
    if (!week) return [];

    return timeEntries.filter(e => {
      const d = e.date;
      const isInWeek = d >= week.start && d <= week.end;

      if (!isInWeek) return false;

      // Super Admin: filter by selected department
      if (isSuperAdmin && selectedDepartment !== 'all') {
        const profile = profiles.find(p => p.id === e.user_id);
        return profile?.department_id === selectedDepartment;
      }

      // Department Admin/Member: already filtered by fetchProfiles
      // Just need to check if the user is in our profiles list
      return profiles.some(p => p.id === e.user_id);
    });
  }, [selectedWeek, weekOptions, timeEntries, isSuperAdmin, selectedDepartment, profiles]);

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

    return Object.values(stats).sort((a, b) => b.hours - a.hours);
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

  // Fetch departments and profiles
  useEffect(() => {
    const fetchData = async () => {
      // Fetch departments
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (deptError) {
        console.error('Error fetching departments:', deptError);
      } else if (deptData) {
        setDepartments(deptData as Department[]);
      }

      // Fetch profiles based on role
      let query = supabase.from('profiles').select('*');

      // If not super admin, filter by department
      if (!isSuperAdmin && departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data: profileData, error: profileError } = await query.order('username');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      } else if (profileData) {
        console.log('Loaded profiles:', profileData.length, 'profiles');
        setProfiles(profileData as Profile[]);
      }
    };

    fetchData();
  }, [isSuperAdmin, departmentId]);

  // Member stats - hours by member and project
  const memberStats = useMemo(() => {
    const stats: Record<string, { username: string; total: number; [key: string]: number | string }> = {};

    weekEntries.forEach(entry => {
      const profile = profiles.find(p => p.id === entry.user_id);
      const project = projects.find(p => p.id === entry.project_id);

      if (project) {
        // Use profile username if available, otherwise show user ID
        const username = profile?.username || `使用者 (${entry.user_id.slice(0, 8)})`;
        const userId = entry.user_id;

        if (!stats[userId]) {
          stats[userId] = { username, total: 0 };
        }
        stats[userId][project.name] = (stats[userId][project.name] as number || 0) + entry.hours;
        stats[userId].total = (stats[userId].total as number) + entry.hours;
      }
    });

    return Object.values(stats).sort((a, b) => (b.total as number) - (a.total as number));
  }, [weekEntries, profiles, projects]);

  const activeProjects = projects.filter(p => p.is_active);
  const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);
  const avgHoursPerDay = totalHours / 7;

  // Get current department name
  const currentDepartmentName = useMemo(() => {
    if (isSuperAdmin && selectedDepartment === 'all') {
      return '全公司';
    }

    const deptId = isSuperAdmin ? selectedDepartment : departmentId;
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'QA Team';
  }, [isSuperAdmin, selectedDepartment, departmentId, departments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentDepartmentName} 的工時總覽</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">查看團隊工時分配狀況</p>
        </div>
        <div className="flex gap-3">
          {/* Department Selector (Super Admin only) */}
          {isSuperAdmin && (
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">全公司</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
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
      </div>

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
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="hours"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {projectStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                      border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    itemStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
                    labelStyle={{
                      color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                    }}
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

      {/* Member Hours Summary - Horizontal Stacked Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">成員工時總覽</h2>
        {memberStats.length > 0 ? (
          <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
            <ResponsiveContainer width="100%" height={Math.max(280, memberStats.length * 55 + 100)}>
              <BarChart
                data={memberStats}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
                barCategoryGap="18%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  label={{ value: '工時', position: 'insideBottom', offset: -5 }}
                  tickMargin={10}
                  height={40}
                />
                <YAxis
                  type="category"
                  dataKey="username"
                  width={70}
                  tickMargin={10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                  }}
                  itemStyle={{
                    color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                  }}
                  labelStyle={{
                    color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '15px' }} />
                {activeProjects.map(project => (
                  <Bar
                    key={project.id}
                    dataKey={project.name}
                    stackId="a"
                    fill={project.color}
                    maxBarSize={40}
                  />
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

    </div>
  );
}
