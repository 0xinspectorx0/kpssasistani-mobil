// Üyelik planları ve günlük test kotası; plan adetleri yönetim panelinden ayarlanır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAdminAuth, MemberRole } from './admin-auth';
import { supabase } from './supabase';
import { dayKey } from './data';

export type PlanId = 'guest' | 'uye' | 'vip' | 'staff';
export interface QuizQuotaSettings {
  guest: number;
  uye: number;
  /** null means unlimited. */
  vip: number | null;
}

export const DEFAULT_QUIZ_QUOTAS: QuizQuotaSettings = { guest: 1, uye: 3, vip: null };
const QUIZ_QUOTA_STORAGE_KEY = 'kpss-quiz-quota-settings-v1';
let cachedQuizQuotas: QuizQuotaSettings = { ...DEFAULT_QUIZ_QUOTAS };

export const PLAN_META: Record<
  PlanId,
  { label: string; daily: number; icon: string; color: string; desc: string }
> = {
  guest: {
    label: 'Misafir',
    daily: 1,
    icon: 'person-outline',
    color: '#64748B',
    desc: 'Günlük test hakkı yönetici tarafından belirlenir.',
  },
  uye: {
    label: 'Üye',
    daily: 3,
    icon: 'person',
    color: '#2563EB',
    desc: 'Günlük test hakkı yönetici tarafından belirlenir.',
  },
  vip: {
    label: 'VIP',
    daily: Infinity,
    icon: 'diamond',
    color: '#E8A020',
    desc: 'Yönetici ayarına göre günlük test hakkı veya sınırsız erişim.',
  },
  staff: {
    label: 'Yönetici',
    daily: Infinity,
    icon: 'shield-checkmark',
    color: '#D7263D',
    desc: 'Sınırsız erişim (yönetim personeli).',
  },
};

function parseQuizQuotaSettings(value: unknown): QuizQuotaSettings | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const guest = record.guest;
  const uye = record.uye;
  const vip = record.vip;
  const validLimit = (limit: unknown): limit is number =>
    typeof limit === 'number' && Number.isInteger(limit) && limit >= 0 && limit <= 9999;
  if (!validLimit(guest) || !validLimit(uye) || (vip !== null && !validLimit(vip))) return null;
  return { guest, uye, vip: vip as number | null };
}

export function getCachedQuizQuotaSettings(): QuizQuotaSettings {
  return { ...cachedQuizQuotas };
}

export async function loadQuizQuotaSettings(): Promise<QuizQuotaSettings> {
  try {
    const stored = await AsyncStorage.getItem(QUIZ_QUOTA_STORAGE_KEY);
    const parsed = stored ? parseQuizQuotaSettings(JSON.parse(stored)) : null;
    if (parsed) cachedQuizQuotas = parsed;
  } catch {
    // Keep the in-memory/default values when local cache cannot be read.
  }

  if (!supabase) return getCachedQuizQuotaSettings();
  const { data, error } = await supabase.rpc('get_quiz_quota_settings');
  if (error) throw error;
  const settings = parseQuizQuotaSettings(data);
  if (!settings) throw new Error('Test kotası ayarları okunamadı. Supabase migration kurulumunu kontrol edin.');
  cachedQuizQuotas = settings;
  await AsyncStorage.setItem(QUIZ_QUOTA_STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  return getCachedQuizQuotaSettings();
}

export async function saveQuizQuotaSettings(settings: QuizQuotaSettings): Promise<void> {
  const parsed = parseQuizQuotaSettings(settings);
  if (!parsed) throw new Error('Her plan için 0 ile 9999 arasında geçerli test sayısı girin.');
  if (!supabase) throw new Error('Test kotası ayarlarını kaydetmek için Supabase bağlantısı gerekiyor.');
  const { error } = await supabase.rpc('set_quiz_quota_settings', {
    p_guest_limit: parsed.guest,
    p_member_limit: parsed.uye,
    p_vip_limit: parsed.vip,
  });
  if (error) throw error;
  cachedQuizQuotas = parsed;
  await AsyncStorage.setItem(QUIZ_QUOTA_STORAGE_KEY, JSON.stringify(parsed)).catch(() => {});
}

export function useQuizQuotaSettings() {
  const [settings, setSettings] = useState<QuizQuotaSettings>(() => getCachedQuizQuotaSettings());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadQuizQuotaSettings();
      setSettings(next);
      setError('');
      return next;
    } catch (e) {
      setSettings(getCachedQuizQuotaSettings());
      setError(e instanceof Error ? e.message : 'Test kotası ayarları yüklenemedi.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));
  return { settings, setSettings, loading, error, reload };
}

export function planFor(role: MemberRole, hasSession: boolean): PlanId {
  if (role === 'banned') return 'guest'; // engelli hesap misafir gibi bile işlem yapamaz; oturum düşürülür
  if (role === 'vip') return 'vip';
  if (role === 'admin' || role === 'editor' || role === 'viewer') return 'staff';
  if (hasSession) return 'uye';
  return 'guest';
}

export function dailyLimit(plan: PlanId, quotas: QuizQuotaSettings = cachedQuizQuotas): number {
  if (plan === 'staff') return Infinity;
  if (plan === 'guest') return quotas.guest;
  if (plan === 'uye') return quotas.uye;
  return quotas.vip === null ? Infinity : quotas.vip;
}

function quotaKey(userKey: string): string {
  return `kpss-quota-v1:${userKey}:${dayKey()}`;
}

// Girişli kullanıcılar için sayacı Supabase'de tutar (cihaz bağımsız);
// misafirler için yerel depoda kalır.
async function remoteCount(userId: string): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_activities')
      .select('quiz_count')
      .eq('user_id', userId)
      .eq('date', dayKey())
      .maybeSingle();
    if (error) return null;
    return data?.quiz_count ?? 0;
  } catch {
    return null;
  }
}

async function remoteIncrement(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('increment_quiz_count', { p_user_id: userId, p_date: dayKey() });
    return !error;
  } catch {
    return false;
  }
}

export async function todayCount(userKey: string): Promise<number> {
  // userKey gerçek bir kullanıcı UUID ise Supabase'den oku.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(userKey)) {
    const remote = await remoteCount(userKey);
    if (remote !== null) return remote;
  }
  try {
    const raw = await AsyncStorage.getItem(quotaKey(userKey));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
}

// Bir test hakkını tüketmeye çalışır; kota doluysa reddeder.
export async function consumeQuiz(
  userKey: string,
  plan: PlanId,
  quotas: QuizQuotaSettings = cachedQuizQuotas,
): Promise<QuotaResult> {
  const limit = dailyLimit(plan, quotas);
  if (!Number.isFinite(limit)) return { allowed: true, used: 0, limit };
  const used = await todayCount(userKey);
  if (used >= limit) return { allowed: false, used, limit };
  const next = used + 1;
  // Gerçek kullanıcı ise Supabase'e yazmaya çalış; başarısızsa yerel kalsın.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(userKey) && supabase) {
    const ok = await remoteIncrement(userKey);
    if (!ok) await AsyncStorage.setItem(quotaKey(userKey), String(next)).catch(() => {});
  } else {
    await AsyncStorage.setItem(quotaKey(userKey), String(next)).catch(() => {});
  }
  return { allowed: true, used: next, limit };
}

export function quotaUserKey(sessionUserId: string | null | undefined, role: MemberRole): string {
  if (sessionUserId && (role === 'uye' || role === 'vip')) return sessionUserId;
  if (sessionUserId && (role === 'admin' || role === 'editor' || role === 'viewer')) return sessionUserId;
  return 'guest';
}

// Hook: bileşenlerden güncel plan + kota bilgisini okur.
export function usePlan() {
  const { session, role } = useAdminAuth();
  const plan = planFor(role, !!session);
  const { settings } = useQuizQuotaSettings();
  const limit = dailyLimit(plan, settings);
  const meta = {
    ...PLAN_META[plan],
    desc: plan === 'staff'
      ? PLAN_META.staff.desc
      : Number.isFinite(limit)
        ? `Günde ${limit} test çözebilirsin.`
        : 'Sınırsız test çözebilirsin.',
  };
  return { plan, role, session, meta, limit };
}

export const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  editor: 'Editör',
  viewer: 'Görüntüleyici',
  uye: 'Üye',
  vip: 'VIP',
};

export const roleOrder = ['admin', 'editor', 'viewer', 'vip', 'uye'] as const;
