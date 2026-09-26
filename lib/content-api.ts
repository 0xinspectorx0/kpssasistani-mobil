import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { APP_SITE_URL, requireBackend } from './supabase';
import { ContentEntry, ContentKind, parseEntry, seedEntries } from './content-schema';

export async function fetchEntries(publishedOnly = false): Promise<ContentEntry[]> {
  const client = requireBackend();
  const rows: ContentEntry[] = [];
  // PostgREST defaults to 1,000 records; paginate rather than silently lose questions.
  for (let offset = 0; ; offset += 500) {
    let query = client
      .from('content_entries')
      .select('kind,id,payload,status,updated_at')
      .order('kind')
      .order('id')
      .range(offset, offset + 499);
    if (publishedOnly) query = query.eq('status', 'published');
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data ?? []).map(parseEntry));
    if (!data || data.length < 500) break;
  }
  return rows;
}
export async function saveEntry(entry: ContentEntry, isNew: boolean): Promise<void> {
  const client = requireBackend();
  const parsed = parseEntry(entry);
  const values = { kind: parsed.kind, id: parsed.id, payload: parsed.payload, status: parsed.status };
  if (isNew) {
    const { error } = await client.from('content_entries').insert(values);
    if (error) throw error;
  } else {
    if (!entry.updated_at) throw new Error('İçeriği yeniden yükleyip tekrar deneyin.');
    const { data, error } = await client
      .from('content_entries')
      .update(values)
      .eq('kind', entry.kind)
      .eq('id', entry.id)
      .eq('updated_at', entry.updated_at)
      .select('id');
    if (error) throw error;
    if (!data?.length)
      throw new Error(
        'Bu içerik başka bir yönetici tarafından değiştirilmiş veya yetkiniz kaldırılmış. Listeyi yenileyin.',
      );
  }
}
export async function deleteEntry(entry: ContentEntry): Promise<void> {
  const client = requireBackend();
  const { data, error } = await client
    .from('content_entries')
    .delete()
    .eq('kind', entry.kind)
    .eq('id', entry.id)
    .eq('updated_at', entry.updated_at ?? '')
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('İçerik değişmiş veya silme yetkiniz yok. Listeyi yenileyin.');
}
export async function importBundledContent() {
  // Atomic and idempotent. Existing edits are never overwritten.
  const { error } = await requireBackend()
    .from('content_entries')
    .upsert(seedEntries(), { onConflict: 'kind,id', ignoreDuplicates: true });
  if (error) throw error;
}
export interface AdminMember {
  user_id: string;
  email: string;
  created_at: string;
}
export interface Member {
  user_id: string;
  email: string;
  role: string;
  banned?: boolean;
  created_at: string;
}
export interface AuditItem {
  id: number;
  actor_id: string | null;
  action: string;
  kind: ContentKind | 'admins';
  entry_id: string;
  created_at: string;
}
export async function listAdmins(): Promise<AdminMember[]> {
  const { data, error } = await requireBackend().rpc('list_admins');
  if (error) throw error;
  return data ?? [];
}
export async function listMembers(): Promise<Member[]> {
  const { data, error } = await requireBackend().rpc('list_members');
  if (error) throw error;
  return data ?? [];
}
export async function changeAdmin(email: string, enabled: boolean) {
  const { error } = await requireBackend().rpc('set_admin', { target_email: email.trim(), enabled });
  if (error) throw error;
}
export async function changeRole(email: string, role: string) {
  const { error } = await requireBackend().rpc('set_role', { target_email: email.trim(), new_role: role });
  if (error) throw error;
}

// PostgREST: fonksiyon veritabanında yoksa (migration çalıştırılmamış) bu kodlar döner.
function isMissingFunction(error: unknown): boolean {
  const e = error as { code?: string; message?: string };
  return e?.code === 'PGRST202' || e?.code === '42883' || /Could not find the function/i.test(e?.message ?? '');
}
export const ACCOUNT_ADMIN_MIGRATION = 'supabase/migrations/202609260002_account_admin.sql';
const ACCOUNT_ADMIN_SETUP_HINT =
  `Veritabanı kurulumu eksik: ${ACCOUNT_ADMIN_MIGRATION} dosyasını Supabase Dashboard → SQL Editor'de bir kez çalıştırın (docs/ADMIN.md §5).`;

export type AssignRoleStatus = 'applied' | 'pending';
export interface AssignRoleResult {
  status: AssignRoleStatus;
  email: string;
  role: string;
}
/**
 * Rol atar. Hesap kayıtlıysa hemen uygulanır ('applied'); henüz üye olmamış bir e-postaysa
 * bekleyenlere yazılır ('pending') ve kişi üye olur olmaz tetikleyici rolü otomatik uygular.
 * Yeni RPC yoksa (migration çalıştırılmamış) eski set_role ile yalnızca kayıtlı hesaplar desteklenir.
 */
export async function assignRole(email: string, role: string): Promise<AssignRoleResult> {
  const clean = email.trim().toLowerCase();
  const result = await assignRoleRpc(clean, role);
  if (result) return result;
  await changeRole(clean, role);
  return { status: 'applied', email: clean, role };
}
// null → assign_role fonksiyonu veritabanında yok (202609260002 migration'ı çalıştırılmamış).
async function assignRoleRpc(cleanEmail: string, role: string): Promise<AssignRoleResult | null> {
  const { data, error } = await requireBackend().rpc('assign_role', { target_email: cleanEmail, new_role: role });
  if (error) {
    if (isMissingFunction(error)) return null;
    throw error;
  }
  const row = (data ?? {}) as Partial<AssignRoleResult>;
  return {
    status: row.status === 'pending' ? 'pending' : 'applied',
    email: row.email ?? cleanEmail,
    role: row.role ?? role,
  };
}
export interface PendingRole {
  email: string;
  role: string;
  created_at: string;
}
export async function listPendingRoles(): Promise<PendingRole[]> {
  const { data, error } = await requireBackend().rpc('list_pending_roles');
  if (error) {
    if (isMissingFunction(error)) return [];
    throw error;
  }
  return data ?? [];
}
export async function cancelPendingRole(email: string): Promise<void> {
  const { error } = await requireBackend().rpc('cancel_pending_role', { target_email: email.trim().toLowerCase() });
  if (error) throw error;
}

export interface CreateUserResult {
  status: 'created' | 'exists';
  email: string;
  role: string;
  roleStatus: AssignRoleStatus;
  confirmationRequired: boolean;
}
/**
 * Yönetici panelinden yeni hesap açar (service_role / Edge Function gerekmez):
 * 1) Rol önce bekleyenlere yazılır → 2) ayrı, oturum saklamayan bir istemciyle signUp yapılır →
 * 3) auth.users'a eklenen kayıt için tetikleyici bekleyen rolü uygular.
 * Yöneticinin kendi oturumu etkilenmez. E-posta doğrulaması açıksa kişiye doğrulama e-postası gider.
 */
export async function createUserAccount(email: string, password: string, role: string): Promise<CreateUserResult> {
  const clean = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) throw new Error('Geçerli bir e-posta adresi girin.');
  if (password.length < 6) throw new Error('Geçici şifre en az 6 karakter olmalıdır.');

  const assigned = await assignRoleRpc(clean, role);
  if (!assigned) throw new Error(ACCOUNT_ADMIN_SETUP_HINT);
  if (assigned.status === 'applied') {
    // Hesap zaten var: rol uygulandı, yeni kayıt açılmaz.
    return { status: 'exists', email: clean, role, roleStatus: 'applied', confirmationRequired: false };
  }

  const { data, error } = await createDetachedAuthClient().auth.signUp({
    email: clean,
    password,
    options: { emailRedirectTo: Platform.OS === 'web' ? APP_SITE_URL : undefined },
  });
  if (error) {
    const msg = error.message ?? '';
    if (/already registered|already exists|user_already_exists/i.test(msg))
      return { status: 'exists', email: clean, role, roleStatus: 'pending', confirmationRequired: false };
    // Kayıt açılamadı: az önce yazılan bekleyen rol kaydını geri al (liste kirlenmesin).
    await cancelPendingRole(clean).catch(() => undefined);
    if (/signups? not allowed|signup_disabled/i.test(msg))
      throw new Error(
        'Supabase\'de yeni üye kaydı kapalı. Authentication → Sign In / Sign Up → "Allow new users to sign up" seçeneğini açın.',
      );
    if (/rate limit|too many/i.test(msg))
      throw new Error('E-posta gönderim limiti aşıldı. Birkaç dakika sonra tekrar deneyin.');
    throw new Error(readableError(error));
  }
  // E-posta doğrulaması açıkken var olan hesap için Supabase sahte (kimliksiz) kullanıcı döndürür.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
    return { status: 'exists', email: clean, role, roleStatus: 'pending', confirmationRequired: false };
  return { status: 'created', email: clean, role, roleStatus: 'applied', confirmationRequired: !data.session };
}
// Yöneticinin oturumunu bozmadan signUp çağırmak için bellek-içi, oturum saklamayan istemci.
function createDetachedAuthClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!/^https:\/\//.test(url) || !key) throw new Error('Supabase URL yapılandırılmamış.');
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'kpss-admin-create-user',
    },
  });
}
export async function setBanned(email: string, banned: boolean) {
  const { error } = await requireBackend().rpc('set_banned', {
    target_email: email.trim(),
    banned_state: banned,
  });
  if (error) throw error;
}

// Hesabı kalıcı silme: varsayılan yol, SECURITY DEFINER SQL fonksiyonu delete_user_account
// (202609260002_account_admin.sql). Ek kurulum, service_role veya Edge Function gerekmez.
// Fonksiyon henüz yoksa eski delete-user Edge Function denenir; o da yoksa kurulum ipucu verilir.
export interface DeleteUserResponse {
  ok?: boolean;
  message?: string;
  error?: string;
}
export type DeleteUserStatus = 'deleted' | 'pending_removed';
export async function deleteUserAccount(email: string): Promise<DeleteUserStatus> {
  const clean = email.trim().toLowerCase();
  const { data, error } = await requireBackend().rpc('delete_user_account', { target_email: clean });
  if (!error) {
    const row = (data ?? {}) as { status?: string };
    return row.status === 'pending_removed' ? 'pending_removed' : 'deleted';
  }
  if (!isMissingFunction(error)) throw error;
  try {
    await deleteUserViaEdgeFunction(clean);
    return 'deleted';
  } catch {
    throw new Error(ACCOUNT_ADMIN_SETUP_HINT);
  }
}
// Eski yol (isteğe bağlı): supabase/functions/delete-user Edge Function.
async function deleteUserViaEdgeFunction(email: string): Promise<void> {
  const client = requireBackend();
  const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`;
  if (!/^https:\/\//.test(functionUrl ?? '')) {
    throw new Error('Supabase URL yapılandırılmamış.');
  }

  // Anon key'i header olarak gönder (Edge Function admin yetkisini RPC üzerinden doğrular).
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token ?? '';

  const resp = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ target_email: email }),
  });
  const payload = (await resp.json().catch(() => ({}))) as DeleteUserResponse;
  if (!resp.ok || payload.error) {
    throw new Error(payload.error ?? 'Hesap silinemedi.');
  }
}
export interface ReportItem {
  id: number;
  question_id: string;
  reporter_email: string | null;
  reason: string | null;
  status: 'new' | 'resolved' | 'dismissed';
  created_at: string;
}
export async function listReports(): Promise<ReportItem[]> {
  const { data, error } = await requireBackend().rpc('list_reports');
  if (error) throw error;
  return data ?? [];
}
export async function setReportStatus(reportId: number, status: 'resolved' | 'dismissed') {
  const { error } = await requireBackend().rpc('set_report_status', {
    report_id: reportId,
    new_status: status,
  });
  if (error) throw error;
}
// Hatalı soru bildirimi: misafir (anon) veya üye herkes gönderebilir.
export async function submitReport(questionId: string, reason: string): Promise<void> {
  if (!supabaseConfigured()) return; // Supabase yoksa bildirim yerelde sessizce yok sayılır.
  const { error } = await requireBackend().from('question_reports').insert({
    question_id: questionId,
    reason: reason.trim() || null,
  });
  if (error) throw error;
}
function supabaseConfigured(): boolean {
  try {
    requireBackend();
    return true;
  } catch {
    return false;
  }
}
export interface UserStats {
  total_members: number;
  active_today: number;
  active_7d: number;
  total_quizzes: number;
}
export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await requireBackend().rpc('get_user_stats');
  if (error) throw error;
  const row = (data?.[0] ?? {}) as Partial<UserStats>;
  return {
    total_members: Number(row.total_members ?? 0),
    active_today: Number(row.active_today ?? 0),
    active_7d: Number(row.active_7d ?? 0),
    total_quizzes: Number(row.total_quizzes ?? 0),
  };
}

export async function insertManyEntries(entries: ContentEntry[]): Promise<{ inserted: number }> {
  if (!entries.length) return { inserted: 0 };
  const client = requireBackend();
  const values = entries.map((entry) => {
    const parsed = parseEntry(entry);
    return { kind: parsed.kind, id: parsed.id, payload: parsed.payload, status: parsed.status };
  });
  // Küçük parçalar hâlinde gönderilir; tek istek başarısızlığı toplu yüklemeyi bozmaz.
  let inserted = 0;
  const chunkSize = 100;
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const { error } = await client.from('content_entries').insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  return { inserted };
}
export async function listAudit(): Promise<AuditItem[]> {
  const { data, error } = await requireBackend()
    .from('admin_audit_log')
    .select('*')
    .order('id', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
export function readableError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e.code === '42501') return 'Bu işlem için yönetici yetkisi gerekiyor. Yeniden giriş yapın.';
  if (e.code === '23505') return 'Bu kimlik zaten kullanılıyor. Listeyi yenileyin.';
  if (e.code === '42P01' || e.code === 'PGRST202' || e.code === 'PGRST205')
    return 'Veritabanı kurulumu eksik. docs/ADMIN.md adımlarını kontrol edin.';
  if (e.message?.includes('abort') || e.message?.includes('Abort'))
    return 'İstek zaman aşımına uğradı. Bağlantınızı kontrol edip yeniden deneyin.';
  if (e.message?.includes('fetch') || e.message?.includes('Network'))
    return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';
  return e.message ?? 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}
