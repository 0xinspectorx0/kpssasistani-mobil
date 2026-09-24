// Üyelik planları ve günlük test kotası.
//  - Misafir (giriş yapmamış): günde 1 test
//  - Üye (ücretsiz hesap):     günde 3 test
//  - VIP / yönetici personeli: sınırsız
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAdminAuth, MemberRole } from './admin-auth';
import { supabase } from './supabase';
import { dayKey } from './data';

export type PlanId = 'guest' | 'uye' | 'vip' | 'staff';

export const PLAN_META: Record<
  PlanId,
  { label: string; daily: number; icon: string; color: string; desc: string }
> = {
  guest: {
    label: 'Misafir',
    daily: 1,
    icon: 'person-outline',
    color: '#64748B',
    desc: 'Günde 1 ücretsiz test çözebilirsin.',
  },
  uye: {
    label: 'Üye',
    daily: 3,
    icon: 'person',
    color: '#2563EB',
    desc: 'Günde 3 test çözebilirsin.',
  },
  vip: {
    label: 'VIP',
    daily: Infinity,
    icon: 'diamond',
    color: '#E8A020',
    desc: 'Sınırsız test ve tüm özellikler.',
  },
  staff: {
    label: 'Yönetici',
    daily: Infinity,
    icon: 'shield-checkmark',
    color: '#D7263D',
    desc: 'Sınırsız erişim (yönetim personeli).',
  },
};

export function planFor(role: MemberRole, hasSession: boolean): PlanId {
  if (role === 'vip') return 'vip';
  if (role === 'admin' || role === 'editor' || role === 'viewer') return 'staff';
  if (hasSession) return 'uye';
  return 'guest';
}

export function dailyLimit(plan: PlanId): number {
  return PLAN_META[plan].daily;
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
export async function consumeQuiz(userKey: string, plan: PlanId): Promise<QuotaResult> {
  const limit = dailyLimit(plan);
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
  return { plan, role, session, meta: PLAN_META[plan], limit: dailyLimit(plan) };
}

export const roleLabels: Record<string, string> = {
  admin: 'Yönetici',
  editor: 'Editör',
  viewer: 'Görüntüleyici',
  uye: 'Üye',
  vip: 'VIP',
};

export const roleOrder = ['admin', 'editor', 'viewer', 'vip', 'uye'] as const;
