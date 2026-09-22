import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bundledContent, ContentData, ContentEntry, parseEntry, publishedContent } from './content-schema';
import { fetchEntries, readableError } from './content-api';
import { supabase } from './supabase';

interface ContentContextValue extends ContentData {
  loaded: boolean;
  syncing: boolean;
  syncError: string | null;
  source: 'bundled' | 'cache' | 'server';
  refreshContent: () => Promise<void>;
}
const Context = createContext<ContentContextValue | null>(null);
const CACHE_KEY = `kpss-content-v1:${process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'bundled'}`;
export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ContentData>(supabase ? publishedContent([]) : bundledContent);
  const [loaded, setLoaded] = useState(!supabase);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [source, setSource] = useState<ContentContextValue['source']>(supabase ? 'cache' : 'bundled');
  const running = useRef<Promise<void> | null>(null);
  const refreshContent = useCallback((): Promise<void> => {
    if (!supabase) return Promise.resolve();
    if (running.current) return running.current;
    const task = (async () => {
      setSyncing(true);
      try {
        const rows = await fetchEntries(true);
        setContent(publishedContent(rows));
        setSource('server');
        setSyncError(null);
        // Only published records are cached, never drafts or admin sessions.
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(rows)).catch(() => {});
      } catch (error) {
        setSyncError(readableError(error));
      } finally {
        setLoaded(true);
        setSyncing(false);
      }
    })();
    running.current = task;
    void task.finally(() => {
      running.current = null;
    });
    return task;
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && !cancelled) {
          const rows: ContentEntry[] = JSON.parse(cached).map(parseEntry);
          setContent(publishedContent(rows));
          setLoaded(true);
        }
      } catch {
        /* Ignore corrupt cache and use the server. */
      }
      if (!cancelled) await refreshContent();
    })();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshContent();
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void refreshContent();
    }, 60000);
    return () => {
      cancelled = true;
      sub.remove();
      clearInterval(interval);
    };
  }, [refreshContent]);
  return (
    <Context.Provider value={{ ...content, loaded, syncing, syncError, source, refreshContent }}>
      {children}
    </Context.Provider>
  );
}
export function useContent() {
  const value = useContext(Context);
  if (!value) throw new Error('ContentProvider gerekli.');
  return value;
}
