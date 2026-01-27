import type { User, Project, TimeEntry } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    username: '王小明',
    email: 'xiaoming@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    username: '李小華',
    email: 'xiaohua@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohua',
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    username: '張小芳',
    email: 'xiaofang@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaofang',
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    username: '陳大偉',
    email: 'dawei@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dawei',
    createdAt: '2024-01-15',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: '電商網站重構',
    description: '重構現有電商平台，提升效能與使用者體驗',
    color: '#3B82F6',
    isActive: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'p2',
    name: 'App 2.0 開發',
    description: '開發新版本行動應用程式',
    color: '#10B981',
    isActive: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'p3',
    name: '內部管理系統',
    description: '建立公司內部管理系統',
    color: '#F59E0B',
    isActive: true,
    createdAt: '2024-02-01',
  },
  {
    id: 'p4',
    name: 'API 整合專案',
    description: '與第三方系統進行 API 整合',
    color: '#8B5CF6',
    isActive: true,
    createdAt: '2024-03-01',
  },
  {
    id: 'p5',
    name: '客服系統維護',
    description: '維護現有客服系統',
    color: '#EC4899',
    isActive: false,
    createdAt: '2023-06-01',
  },
];

// Generate mock time entries for the past 8 weeks
function generateMockTimeEntries(): TimeEntry[] {
  const entries: TimeEntry[] = [];
  const today = new Date();

  mockUsers.forEach(user => {
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (weekOffset * 7) - today.getDay() + 1);

      // Each user works on 2-4 projects per week
      const projectCount = 2 + Math.floor(Math.random() * 3);
      const selectedProjects = [...mockProjects]
        .filter(p => p.isActive)
        .sort(() => Math.random() - 0.5)
        .slice(0, projectCount);

      selectedProjects.forEach(project => {
        // 5-20 hours per project per week
        const hours = 5 + Math.floor(Math.random() * 16);
        const dayOffset = Math.floor(Math.random() * 5);
        const entryDate = new Date(weekStart);
        entryDate.setDate(weekStart.getDate() + dayOffset);

        entries.push({
          id: `entry-${user.id}-${project.id}-${weekOffset}`,
          userId: user.id,
          projectId: project.id,
          hours,
          date: entryDate.toISOString().split('T')[0],
          note: '',
          createdAt: entryDate.toISOString(),
          updatedAt: entryDate.toISOString(),
        });
      });
    }
  });

  return entries;
}

export const mockTimeEntries: TimeEntry[] = generateMockTimeEntries();

// Helper functions
export function getProjectById(id: string): Project | undefined {
  return mockProjects.find(p => p.id === id);
}

export function getUserById(id: string): User | undefined {
  return mockUsers.find(u => u.id === id);
}

export function getEntriesByUser(userId: string): TimeEntry[] {
  return mockTimeEntries.filter(e => e.userId === userId);
}

export function getEntriesByWeek(weekStart: string): TimeEntry[] {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return mockTimeEntries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate >= start && entryDate <= end;
  });
}
