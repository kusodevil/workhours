import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from '../lib/edge-functions';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean; // Deprecated: Use role instead
  role: UserRole;
  departmentId: string | null;
  isSuperAdmin: boolean;
  isDepartmentAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from profiles table
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    // FIRST: Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setIsLoading(false);

      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          if (isMounted) {
            setProfile(profileData);
          }
        });
      } else {
        setProfile(null);
      }
    });

    // THEN: Listen for future auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          if (isMounted) {
            setProfile(profileData);
          }
        });
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<{ error: string | null }> => {
    let email = emailOrUsername;

    // 如果輸入的不是 email 格式（不包含 @），假設是 username
    if (!emailOrUsername.includes('@')) {
      console.log('[AuthContext] Looking up email for username:', emailOrUsername);

      // 使用 Edge Function 查詢 email（繞過 RLS）
      const { data, error: lookupError } = await invokeEdgeFunction<{ email: string }>('lookup-email-by-username', {
        username: emailOrUsername
      });

      console.log('[AuthContext] Lookup result:', { data, lookupError });

      if (lookupError) {
        console.error('[AuthContext] Lookup error:', lookupError);
        return { error: lookupError };
      }

      if (!data?.email) {
        console.log('[AuthContext] No email found for username:', emailOrUsername);
        return { error: '找不到此使用者' };
      }

      console.log('[AuthContext] Found email for username:', data.email);
      email = data.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const register = async (username: string, email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      return { error: error.message };
    }

    // 註冊成功後會自動登入（session 自動儲存在 localStorage）
    // onAuthStateChange 會自動處理 user 和 profile 狀態更新
    return { error: null };
  };

  const role = profile?.role ?? 'member';
  const departmentId = profile?.department_id ?? null;
  const isSuperAdmin = role === 'super_admin';
  const isDepartmentAdmin = role === 'department_admin';
  const isAdmin = profile?.is_admin ?? false; // Backward compatibility

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated: !!user,
        isAdmin,
        role,
        departmentId,
        isSuperAdmin,
        isDepartmentAdmin,
        isLoading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
