import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, subWeeks } from 'date-fns';
import type { Department } from '../types/database';

export function Trends() {
  const { timeEntries: allTimeEntries } = useTimeEntries();
  const { projects } = useProjects();
  const { effectiveTheme } = useTheme();
  const { profile, isSuperAdmin, isDepartmentAdmin } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1month' | '3months'>('1month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentUserIds, setDepartmentUserIds] = useState<string[]>([]);

  // Fetch departments for super admin
  useEffect(() => {
    const fetchDepartments = async () => {
      if (isSuperAdmin) {
        const { data } = await supabase
          .from('departments')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (data) {
          setDepartments(data);
        }
      }
    };

    fetchDepartments();
  }, [isSuperAdmin]);

  // Fetch user IDs for the selected department (super admin) or current department (dept admin)
  useEffect(() => {
    const fetchDepartmentUsers = async () => {
      let targetDepartmentId: string | null = null;

      if (isSuperAdmin && selectedDepartment !== 'all') {
        targetDepartmentId = selectedDepartment;
      } else if (isDepartmentAdmin && profile?.department_id) {
        targetDepartmentId = profile.department_id;
      }

      if (targetDepartmentId) {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_id', targetDepartmentId);

        if (data) {
          setDepartmentUserIds(data.map(p => p.id));
        }
      } else {
        setDepartmentUserIds([]);
      }
    };

    fetchDepartmentUsers();
  }, [isSuperAdmin, isDepartmentAdmin, selectedDepartment, profile?.department_id]);

  // Filter time entries based on user role and department selection
  const timeEntries = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin: filter by selected department
      if (selectedDepartment === 'all') {
        return allTimeEntries;
      }
      // Filter by users in the selected department
      return allTimeEntries.filter(entry => departmentUserIds.includes(entry.user_id));
    } else if (isDepartmentAdmin && profile?.department_id) {
      // Department admin: only their department's entries
      return allTimeEntries.filter(entry => departmentUserIds.includes(entry.user_id));
    } else if (profile?.id) {
      // Regular user: only their own entries
      return allTimeEntries.filter(entry => entry.user_id === profile.id);
    }
    return allTimeEntries;
  }, [allTimeEntries, isSuperAdmin, isDepartmentAdmin, selectedDepartment, profile, departmentUserIds]);

  const activeProjects = projects.filter(p => p.is_active);

  // Determine number of weeks based on time range
  const weeksToShow = timeRange === '1month' ? 4 : 12;

  // Generate ALL trend data (not affected by project filter, only by time range)
  const allTrendData = useMemo(() => {
    const weeks: { weekLabel: string; weekStart: Date; [key: string]: number | string | Date }[] = [];
    const today = new Date();

    // Get the most recent Monday (start of this week)
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Generate weeks ending with current week
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = subWeeks(currentWeekStart, i);
      weeks.push({
        weekLabel: format(weekStart, 'M/d'),
        weekStart,
      });
    }

    // Calculate hours per project per week (ALL projects, no filter)
    weeks.forEach(week => {
      const weekEnd = new Date(week.weekStart);
      weekEnd.setDate(week.weekStart.getDate() + 6);

      const weekEntries = timeEntries.filter(e => {
        const d = new Date(e.date);
        return d >= week.weekStart && d <= weekEnd;
      });

      activeProjects.forEach(project => {
        const projectHours = weekEntries
          .filter(e => e.project_id === project.id)
          .reduce((sum, e) => sum + e.hours, 0);
        week[project.name] = projectHours;
      });

      week.total = weekEntries.reduce((sum, e) => sum + e.hours, 0);
    });

    return weeks;
  }, [timeEntries, activeProjects, weeksToShow]);

  // Generate filtered trend data (affected by project filter, for chart display)
  const trendData = useMemo(() => {
    if (selectedProject === 'all') {
      return allTrendData;
    }

    const weeks: { weekLabel: string; weekStart: Date; [key: string]: number | string | Date }[] = [];
    const today = new Date();

    // Get the most recent Monday (start of this week)
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });

    // Generate weeks ending with current week
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekStart = subWeeks(currentWeekStart, i);
      weeks.push({
        weekLabel: format(weekStart, 'M/d'),
        weekStart,
      });
    }

    // Calculate hours per project per week (filtered by selected project)
    weeks.forEach(week => {
      const weekEnd = new Date(week.weekStart);
      weekEnd.setDate(week.weekStart.getDate() + 6);

      const weekEntries = timeEntries.filter(e => {
        if (selectedProject !== 'all' && e.project_id !== selectedProject) return false;
        const d = new Date(e.date);
        return d >= week.weekStart && d <= weekEnd;
      });

      activeProjects.forEach(project => {
        const projectHours = weekEntries
          .filter(e => e.project_id === project.id)
          .reduce((sum, e) => sum + e.hours, 0);
        week[project.name] = projectHours;
      });

      week.total = weekEntries.reduce((sum, e) => sum + e.hours, 0);
    });

    return weeks;
  }, [selectedProject, timeEntries, activeProjects, weeksToShow, allTrendData]);

  // Detect new projects (appeared in recent weeks but not before) - use allTrendData
  const newProjects = useMemo(() => {
    const recentWeeksCount = timeRange === '1month' ? 2 : 3;
    const recentWeeks = allTrendData.slice(-recentWeeksCount);
    const olderWeeks = allTrendData.slice(0, -recentWeeksCount);

    return activeProjects.filter(p => {
      const hasRecentActivity = recentWeeks.some(w => (w[p.name] as number) > 0);
      const hadOldActivity = olderWeeks.some(w => (w[p.name] as number) > 0);
      return hasRecentActivity && !hadOldActivity;
    });
  }, [allTrendData, activeProjects, timeRange]);

  // Calculate project growth/decline - use allTrendData
  const projectTrends = useMemo(() => {
    const trends: { name: string; color: string; trend: 'up' | 'down' | 'stable'; change: number }[] = [];

    // Adjust comparison window based on time range
    const recentWeeksCount = timeRange === '1month' ? 2 : 3;
    const compareWeeksCount = timeRange === '1month' ? 2 : 6;

    activeProjects.forEach(project => {
      const recentWeeks = allTrendData.slice(-recentWeeksCount);
      const olderWeeks = allTrendData.slice(-compareWeeksCount, -recentWeeksCount);

      const recentAvg = recentWeeks.reduce((sum, w) => sum + ((w[project.name] as number) || 0), 0) / recentWeeksCount;
      const olderAvg = olderWeeks.reduce((sum, w) => sum + ((w[project.name] as number) || 0), 0) / Math.max(olderWeeks.length, 1);

      const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : (recentAvg > 0 ? 100 : 0);

      trends.push({
        name: project.name,
        color: project.color,
        trend: change > 10 ? 'up' : change < -10 ? 'down' : 'stable',
        change: Math.round(change),
      });
    });

    return trends.sort((a, b) => b.change - a.change);
  }, [allTrendData, activeProjects, timeRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">趨勢分析</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isSuperAdmin
              ? '追蹤全公司或特定部門的工時分配變化趨勢'
              : isDepartmentAdmin
              ? '追蹤部門工時分配的變化趨勢'
              : '追蹤您的工時分配變化趨勢'}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isSuperAdmin && (
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="all">全公司</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as '1month' | '3months')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="1month">近一個月</option>
            <option value="3months">近三個月</option>
          </select>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none"
          >
            <option value="all">全部專案</option>
            {activeProjects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* New Projects Alert */}
      {newProjects.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">新增專案</h3>
          <div className="flex flex-wrap gap-2">
            {newProjects.map(p => (
              <span
                key={p.id}
                className="px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Line Chart - Weekly Trends */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">週工時趨勢</h2>
        {timeEntries.length > 0 ? (
          <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
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
                  <Line
                    key={project.id}
                    type="monotone"
                    dataKey={project.name}
                    stroke={project.color}
                    strokeWidth={2}
                    dot={{ fill: project.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-gray-400 dark:text-gray-500">
            尚無工時紀錄
          </div>
        )}
      </div>

      {/* Project Trends Cards */}
      {projectTrends.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projectTrends.map(item => (
            <div key={item.name} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.trend === 'up' && (
                  <span className="text-green-600 dark:text-green-400 text-2xl">↑</span>
                )}
                {item.trend === 'down' && (
                  <span className="text-red-600 dark:text-red-400 text-2xl">↓</span>
                )}
                {item.trend === 'stable' && (
                  <span className="text-gray-400 dark:text-gray-500 text-2xl">→</span>
                )}
                <span className={`text-lg font-semibold ${
                  item.trend === 'up' ? 'text-green-600 dark:text-green-400' :
                  item.trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                相較前{timeRange === '1month' ? '2' : '3'}週平均
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Total Hours Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">週總工時</h2>
        {timeEntries.length > 0 ? (
          <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekLabel" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: effectiveTheme === 'dark' ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                    border: effectiveTheme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827'
                  }}
                  wrapperStyle={{
                    outline: 'none',
                    zIndex: 1000
                  }}
                  cursor={false}
                />
                <Bar dataKey="total" fill="#7C9CBF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400 dark:text-gray-500">
            尚無工時紀錄
          </div>
        )}
      </div>

      {/* Insights */}
      {(projectTrends.filter(p => p.trend === 'up').length > 0 ||
        projectTrends.filter(p => p.trend === 'down').length > 0 ||
        newProjects.length > 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">趨勢洞察</h2>
          <ul className="space-y-2 text-blue-800 dark:text-blue-200">
            {projectTrends.filter(p => p.trend === 'up').length > 0 && (
              <li>
                • 工時增加的專案：{projectTrends.filter(p => p.trend === 'up').map(p => p.name).join('、')}
              </li>
            )}
            {projectTrends.filter(p => p.trend === 'down').length > 0 && (
              <li>
                • 工時減少的專案：{projectTrends.filter(p => p.trend === 'down').map(p => p.name).join('、')}
              </li>
            )}
            {newProjects.length > 0 && (
              <li>
                • 近期新加入：{newProjects.map(p => p.name).join('、')}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {timeEntries.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400">開始填寫工時後，這裡會顯示您的趨勢分析</p>
        </div>
      )}
    </div>
  );
}
