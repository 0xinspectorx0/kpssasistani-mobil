import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { requireBackend, supabase } from './supabase';
import { readableError } from './content-api';

export type MemberRole = 'admin' | 'editor' | 'viewer' | 'uye' | 'vip' | '';

export interface AuthValue {
  session: Session | null;
  role: MemberRole;
  isAdmin: boolean;
  canManageContent: boolean;
  canViewDrafts: boolean;
  checking: boolean;
  roleChecked: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Context = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<MemberRole>('');
  const [checking, setChecking] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const resetAuth = () => {
    setRole('');
    setChecking(false);
    setRoleChecked(false);
    setAuthError(null);
  };

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) resetAuth();
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase?.auth.startAutoRefresh();
      else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!session || !supabase) {
      if (!session) resetAuth();
      return;
    }
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      const { data, error } = await supabase!.rpc('user_role');
      if (cancelled) return;
      if (error) {
        setRole('');
        setAuthError(readableError(error));
      } else {
        setAuthError(null);
        setRole((data as MemberRole) ?? '');
      }
      if (!cancelled) {
        setChecking(false);
        setRoleChecked(true);
      }
    };
    void check();
    const interval = setInterval(() => {
      void check();
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session?.user.id, session?.access_token]);

  async function signIn(email: string, password: string) {
    setAuthError(null);
    setChecking(true);
    setRoleChecked(false);
    try {
      const { data, error } = await requireBackend().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const err = error as { status?: number; code?: string | number; message?: string };
        const badCred =
          err.status === 400 ||
          err.code === 400 ||
          err.code === 'invalid_credentials' ||
          /invalid login credentials|invalid_credentials/i.test(err.message ?? '');
        setChecking(false);
        throw new Error(
          badCred
            ? 'E-posta veya şifre hatalı. Hesabınızın doğrulanmış olduğundan emin olun.'
            : readableError(error),
        );
      }
      if (!data?.session) {
        setChecking(false);
        throw new Error('Giriş tamamlanamadı. Lütfen tekrar deneyin.');
      }
    } catch (error) {
      setChecking(false);
      throw error;
    }
  }

  async function signUp(email: string, password: string) {
    setAuthError(null);
    setChecking(true);
    try {
      const { error } = await requireBackend().auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(readableError(error));
    } catch (error) {
      setChecking(false);
      throw error;
    }
  }

  async function signOut() {
    resetAuth();
    setSession(null);
    await requireBackend().auth.signOut();
  }

  const value: AuthValue = {
    session,
    role,
    isAdmin: role === 'admin',
    canManageContent: role === 'admin' || role === 'editor',
    canViewDrafts: role === 'admin' || role === 'editor' || role === 'viewer',
    checking,
    roleChecked,
    authError,
    signIn,
    signUp,
    signOut,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminAuthProvider gerekli.');
  return value;
}
