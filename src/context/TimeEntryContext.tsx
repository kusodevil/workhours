import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db, newId, now } from '../lib/db';
import type { TimeEntry } from '../types/database';
import { useUser } from './UserContext';

interface TimeEntryContextType {
  timeEntries: TimeEntry[];
  isLoading: boolean;
  addEntry: (entry: { project_id: string; hours: number; date: string; note?: string }) => Promise<{ error: string | null }>;
  updateEntry: (id: string, updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>) => Promise<{ error: string | null }>;
  deleteEntry: (id: string) => Promise<{ error: string | null }>;
  refreshEntries: () => Promise<void>;
}

const TimeEntryContext = createContext<TimeEntryContextType | undefined>(undefined);

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : '操作失敗');

export function TimeEntryProvider({ children }: { children: ReactNode }) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.time_entries.orderBy('date').reverse().toArray();
      setTimeEntries(data);
    } catch (e) {
      console.error('Error fetching time entries:', e);
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
    if (!profile) {
      return { error: '個人檔案尚未載入' };
    }

    const ts = now();
    const data: TimeEntry = {
      id: newId(),
      user_id: profile.id,
      project_id: entry.project_id,
      hours: entry.hours,
      date: entry.date,
      note: entry.note || null,
      created_at: ts,
      updated_at: ts,
    };

    try {
      await db.time_entries.add(data);
    } catch (e) {
      return { error: errorMessage(e) };
    }

    setTimeEntries(prev => [data, ...prev]);
    return { error: null };
  };

  const updateEntry = async (
    id: string,
    updates: Partial<Pick<TimeEntry, 'project_id' | 'hours' | 'date' | 'note'>>
  ): Promise<{ error: string | null }> => {
    const patch = { ...updates, updated_at: now() };
    try {
      await db.time_entries.update(id, patch);
    } catch (e) {
      return { error: errorMessage(e) };
    }

    setTimeEntries(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
    return { error: null };
  };

  const deleteEntry = async (id: string): Promise<{ error: string | null }> => {
    try {
      await db.time_entries.delete(id);
    } catch (e) {
      return { error: errorMessage(e) };
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
