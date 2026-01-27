import { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTimeEntries } from '../context/TimeEntryContext';
import { useProjects } from '../context/ProjectContext';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

export function Dashboard() {
  const { timeEntries } = useTimeEntries();
  const { projects } = useProjects();
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);

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
    return timeEntries.filter(e => {
      const d = e.date;
      return d >= week.start && d <= week.end;
    });
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

  // Fetch all profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (!error && data) {
        setProfiles(data as Profile[]);
      }
    };

    fetchProfiles();
  }, []);

  // Member stats - hours by member and project
  const memberStats = useMemo(() => {
    const stats: Record<string, { username: string; total: number; [key: string]: number | string }> = {};

    weekEntries.forEach(entry => {
      const profile = profiles.find(p => p.id === entry.user_id);
      const project = projects.find(p => p.id === entry.project_id);

      if (profile && project) {
        if (!stats[profile.id]) {
          stats[profile.id] = { username: profile.username, total: 0 };
        }
        stats[profile.id][project.name] = (stats[profile.id][project.name] as number || 0) + entry.hours;
        stats[profile.id].total = (stats[profile.id].total as number) + entry.hours;
      }
    });

    return Object.values(stats).sort((a, b) => (b.total as number) - (a.total as number));
  }, [weekEntries, profiles, projects]);

  const activeProjects = projects.filter(p => p.is_active);
  const totalHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);
  const avgHoursPerDay = totalHours / 7;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QA Team 的工時總覽</h1>
          <p className="text-gray-500 mt-1">查看團隊工時分配狀況</p>
        </div>
        <select
          value={selectedWeek}
          onChange={e => setSelectedWeek(Number(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none"
        >
          {weekOptions.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.value === 0 ? '本週 ' : ''}{opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">本週總工時</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalHours} 小時</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">平均每日</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{avgHoursPerDay.toFixed(1)} 小時</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">參與專案</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{projectStats.length} 個</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Daily Hours */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">每日工時分佈</h2>
          {weekEntries.length > 0 ? (
            <div className="outline-none focus:outline-none [&_*]:outline-none [&_*]:focus:outline-none">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
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
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">專案時數比例</h2>
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
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      opacity: 1
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">專案工時明細</h2>
        </div>
        {projectStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    專案
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工時
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    佔比
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projectStats.map(stat => (
                  <tr key={stat.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="font-medium text-gray-900">{stat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {stat.hours} 小時
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
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
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">成員工時總覽</h2>
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
                <Tooltip />
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
