import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { db, getOrCreateProfile } from '../lib/db';
import type { Profile } from '../types/database';

/**
 * 單一使用者的個人檔案。沒有登入、沒有帳號——這是本機個人版。
 */
interface UserContextType {
  profile: Profile | null;
  isLoading: boolean;
  updateProfile: (updates: Partial<Pick<Profile, 'username' | 'avatar_url'>>) => Promise<{ error: string | null }>;
  /** 匯入備份後重新載入 */
  reloadProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadProfile = useCallback(async () => {
    setProfile(await getOrCreateProfile());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  const updateProfile = async (
    updates: Partial<Pick<Profile, 'username' | 'avatar_url'>>
  ): Promise<{ error: string | null }> => {
    if (!profile) return { error: '個人檔案尚未載入' };
    try {
      await db.profile.update(profile.id, updates);
      setProfile({ ...profile, ...updates });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : '更新失敗' };
    }
  };

  return (
    <UserContext.Provider value={{ profile, isLoading, updateProfile, reloadProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
