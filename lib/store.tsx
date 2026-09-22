import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, Palette, ThemeMode } from './theme';
import { dayKey } from './data';

export interface QuizResult {
  id: string;
  date: string;
  category: string;
  categoryId: string;
  total: number;
  correct: number;
  seconds: number;
}

interface AppState {
  name: string;
  targetExamId: string | null;
  completedTopics: string[];
  favorites: string[];
  history: QuizResult[];
  activityDates: string[];
  themeChoice: 'system' | ThemeMode;
}

interface AppContextValue extends AppState {
  theme: Palette;
  mode: ThemeMode;
  setName: (n: string) => void;
  setTargetExamId: (id: string | null) => void;
  toggleTopic: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addQuizResult: (r: Omit<QuizResult, 'id' | 'date'>) => void;
  setThemeChoice: (t: 'system' | ThemeMode) => void;
  recordActivity: () => void;
  resetAll: () => void;
  streak: number;
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  totalSeconds: number;
  loaded: boolean;
}

const DEFAULT_STATE: AppState = {
  name: '',
  targetExamId: null,
  completedTopics: [],
  favorites: [],
  history: [],
  activityDates: [],
  themeChoice: 'system',
};

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = 'kpss-asistani-v1';

function calcStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const cursor = new Date();
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ ...DEFAULT_STATE, ...parsed });
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const mode: ThemeMode =
    state.themeChoice === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : state.themeChoice;
  const theme = mode === 'dark' ? darkPalette : lightPalette;

  const value = useMemo<AppContextValue>(() => {
    const totalQuestions = state.history.reduce((s, h) => s + h.total, 0);
    const totalCorrect = state.history.reduce((s, h) => s + h.correct, 0);
    const totalSeconds = state.history.reduce((s, h) => s + h.seconds, 0);
    return {
      ...state,
      theme,
      mode,
      loaded,
      streak: calcStreak(state.activityDates),
      totalQuestions,
      totalCorrect,
      totalSeconds,
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
      setName: (name) => setState((p) => ({ ...p, name })),
      setTargetExamId: (targetExamId) => setState((p) => ({ ...p, targetExamId })),
      toggleTopic: (id) =>
        setState((p) => {
          const has = p.completedTopics.includes(id);
          const completedTopics = has ? p.completedTopics.filter((t) => t !== id) : [...p.completedTopics, id];
          const today = dayKey();
          const activityDates =
            !has && !p.activityDates.includes(today) ? [...p.activityDates, today] : p.activityDates;
          return { ...p, completedTopics, activityDates };
        }),
      toggleFavorite: (id) =>
        setState((p) => ({
          ...p,
          favorites: p.favorites.includes(id) ? p.favorites.filter((f) => f !== id) : [...p.favorites, id],
        })),
      addQuizResult: (r) =>
        setState((p) => {
          const today = dayKey();
          return {
            ...p,
            history: [{ ...r, id: String(Date.now()), date: new Date().toISOString() }, ...p.history].slice(0, 200),
            activityDates: p.activityDates.includes(today) ? p.activityDates : [...p.activityDates, today],
          };
        }),
      setThemeChoice: (themeChoice) => setState((p) => ({ ...p, themeChoice })),
      recordActivity: () =>
        setState((p) => {
          const today = dayKey();
          return p.activityDates.includes(today) ? p : { ...p, activityDates: [...p.activityDates, today] };
        }),
      resetAll: () => setState(DEFAULT_STATE),
    };
  }, [state, theme, mode, loaded]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
