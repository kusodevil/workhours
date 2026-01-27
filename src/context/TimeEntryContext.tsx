import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../types/database';
import { useAuth } from './AuthContext';

interface TimeEntryContextType {
  timeEntries: TimeEntry[];
  isLoading: boolean;
  addEntry: (entry: { project_id: string; hours: number; date: string; note?: string }) => Promise<{ error: string | null }>;
  updateEntry: (id: string, updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>) => Promise<{ error: string | null }>;
  deleteEntry: (id: string) => Promise<{ error: string | null }>;
  refreshEntries: () => Promise<void>;
}

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

export function TimeEntryProvider({ children }: { children: ReactNode }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching time entries:', error);
    } else {
      setTimeEntries((data as TimeEntry[]) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry: {
    project_id: string;
    hours: number;
    date: string;
    note?: string;
  }): Promise<{ error: string | null }> => {
    if (!user) {
      return { error: '請先登入' };
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        project_id: entry.project_id,
        hours: entry.hours,
        date: entry.date,
        note: entry.note || null,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setTimeEntries(prev => [data as TimeEntry, ...prev]);
    return { error: null };
  };

  const updateEntry = async (
    id: string,
    updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>
  ): Promise<{ error: string | null }> => {
    const { data, error } = await supabase
      .from('time_entries')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    setTimeEntries(prev => prev.map(e => (e.id === id ? (data as TimeEntry) : e)));
    return { error: null };
  };

  const deleteEntry = async (id: string): Promise<{ error: string | null }> => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    setTimeEntries(prev => prev.filter(e => e.id !== id));
    return { error: null };
  };

  const refreshEntries = async () => {
    await fetchEntries();
  };

  return (
    <TimeEntryContext.Provider
      value={{
        timeEntries,
        isLoading,
        addEntry,
        updateEntry,
        deleteEntry,
        refreshEntries,
      }}
    >
      {children}
    </TimeEntryContext.Provider>
  );
}

export function useTimeEntries() {
  const context = useContext(TimeEntryContext);
  if (!context) {
    throw new Error('useTimeEntries must be used within TimeEntryProvider');
  }
  return context;
}
