'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { SessionUser } from '@/lib/auth';
import { refresh as refreshSession, logout as apiLogout } from '@/lib/auth';

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'anonymous'; user: null };

const AuthContext = React.createContext<{
  state: AuthState;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ status: 'loading', user: null });

  const refresh = React.useCallback(async () => {
    try {
      const res = await refreshSession();
      setState({ status: 'authenticated', user: res.user });
    } catch {
      setState({ status: 'anonymous', user: null });
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    setState({ status: 'anonymous', user: null });
    toast.success('Signed out');
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  return <AuthContext.Provider value={{ state, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

