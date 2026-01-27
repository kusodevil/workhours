export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  hours: number;
  date: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  entries: TimeEntry[];
  totalHours: number;
}

export interface ProjectStats {
  projectId: string;
  projectName: string;
  totalHours: number;
  color: string;
}

export interface UserStats {
  userId: string;
  username: string;
  totalHours: number;
  projectBreakdown: ProjectStats[];
}

export interface TrendData {
  week: string;
  [projectName: string]: number | string;
}
