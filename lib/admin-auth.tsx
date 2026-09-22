import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { requireBackend, supabase } from './supabase';
import { readableError } from './content-api';

interface AuthValue {
  session: Session | null;
  isAdmin: boolean;
  checking: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const Context = createContext<AuthValue | null>(null);
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setIsAdmin(false);
        setChecking(false);
      }
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
    if (!session || !supabase) return;
    let cancelled = false;
    const check = async () => {
      setChecking(true);
      const { data, error } = await supabase!.rpc('is_admin');
      if (cancelled) return;
      if (error || data !== true) {
        setIsAdmin(false);
        setAuthError(
          error
            ? readableError(error)
            : 'Bu hesabın yönetici yetkisi yok. Uygulama sahibi tarafından yetkilendirilmelidir.',
        );
        await supabase!.auth.signOut({ scope: 'local' });
        if (!cancelled) setChecking(false);
      } else {
        setIsAdmin(true);
        setChecking(false);
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
    try {
      const { error } = await requireBackend().auth.signInWithPassword({ email: email.trim(), password });
      if (error)
        throw new Error(
          error.status === 400
            ? 'E-posta veya şifre hatalı. Hesabınızın doğrulanmış olduğundan emin olun.'
            : readableError(error),
        );
    } catch (error) {
      setChecking(false);
      throw error;
    }
  }
  async function signOut() {
    setIsAdmin(false);
    setSession(null);
    setAuthError(null);
    await requireBackend().auth.signOut({ scope: 'local' });
  }
  return (
    <Context.Provider value={{ session, isAdmin, checking, authError, signIn, signOut }}>
      {children}
    </Context.Provider>
  );
}
export function useAdminAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AdminAuthProvider gerekli.');
  return value;
}
