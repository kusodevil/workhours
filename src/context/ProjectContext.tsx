import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db, newId, now } from '../lib/db';
import type { Project } from '../types/database';
import { useUser } from './UserContext';

interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  addProject: (name: string, color: string, description?: string) => Promise<{ error: string | null }>;
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'color' | 'description' | 'is_active'>>) => Promise<{ error: string | null }>;
  deleteProject: (id: string) => Promise<{ error: string | null }>;
  getProjectById: (id: string) => Project | undefined;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : '操作失敗');

// 預設顏色選項 - 柔和色系
export const PROJECT_COLORS = [
  '#7C9CBF', // 柔和藍
  '#6EAF8D', // 柔和綠
  '#E6A76B', // 柔和橘
  '#9B87C7', // 柔和紫
  '#D98FA9', // 柔和粉
  '#D97C7C', // 柔和紅
  '#5FB3C5', // 柔和青
  '#A8C66C', // 柔和黃綠
  '#B8A4D5', // 柔和薰衣草
  '#8DB8B0', // 柔和薄荷
  '#E8B88A', // 柔和杏
  '#A6A6C8', // 柔和藍紫
  '#D5A4A4', // 柔和玫瑰
  '#7EB3A8', // 柔和海綠
  '#C9B47C', // 柔和卡其
  '#9DBDC6', // 柔和天藍
];

/**
 * 取得目前已使用的顏色集合
 * @param projects 專案列表
 * @param excludeProjectId 排除的專案 ID（編輯專案時使用）
 * @returns 已使用的顏色集合
 */
export function getUsedColors(projects: Project[], excludeProjectId?: string): Set<string> {
  return new Set(
    projects
      .filter(p => p.is_active && p.id !== excludeProjectId)
      .map(p => p.color)
  );
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.projects.orderBy('created_at').reverse().toArray();
      setProjects(data);
    } catch (e) {
      console.error('Error fetching projects:', e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = async (
    name: string,
    color: string,
    description?: string
  ): Promise<{ error: string | null }> => {
    if (!profile) {
      return { error: '個人檔案尚未載入' };
    }

    const data: Project = {
      id: newId(),
      name,
      color,
      description: description || null,
      is_active: true,
      created_by: profile.id,
      created_at: now(),
    };

    try {
      await db.projects.add(data);
    } catch (e) {
      return { error: errorMessage(e) };
    }

    setProjects(prev => [data, ...prev]);
    return { error: null };
  };

  const updateProject = async (
    id: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'description' | 'is_active'>>
  ): Promise<{ error: string | null }> => {
    try {
      await db.projects.update(id, updates);
    } catch (e) {
      return { error: errorMessage(e) };
    }

    setProjects(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
    return { error: null };
  };

  const deleteProject = async (id: string): Promise<{ error: string | null }> => {
    // 專案與其所有工時紀錄一起刪除
    try {
      await db.transaction('rw', db.projects, db.time_entries, async () => {
        await db.time_entries.where('project_id').equals(id).delete();
        await db.projects.delete(id);
      });
    } catch (e) {
      return { error: '刪除專案失敗：' + errorMessage(e) };
    }

    setProjects(prev => prev.filter(p => p.id !== id));
    return { error: null };
  };

  const getProjectById = (id: string) => {
    return projects.find(p => p.id === id);
  };

  const refreshProjects = async () => {
    await fetchProjects();
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        isLoading,
        addProject,
        updateProject,
        deleteProject,
        getProjectById,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
}
