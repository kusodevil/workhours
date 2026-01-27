import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types/database';
import { useAuth } from './AuthContext';

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
];

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects((data as Project[]) || []);
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
    if (!user) {
      return { error: '請先登入' };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        color,
        description: description || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setProjects(prev => [data as Project, ...prev]);
    return { error: null };
  };

  const updateProject = async (
    id: string,
    updates: Partial<Pick<Project, 'name' | 'color' | 'description' | 'is_active'>>
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setProjects(prev => prev.map(p => (p.id === id ? (data as Project) : p)));
    return { error: null };
  };

  const deleteProject = async (id: string): Promise<{ error: string | null }> => {
    // First, delete all time entries associated with this project
    const { error: entriesError } = await supabase
      .from('time_entries')
      .delete()
      .eq('project_id', id);

    if (entriesError) {
      return { error: '刪除專案時數失敗：' + entriesError.message };
    }

    // Then delete the project
    const { error: projectError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (projectError) {
      return { error: '刪除專案失敗：' + projectError.message };
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
