import { requireBackend } from './supabase';
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
export async function changeAdmin(email: string, enabled: boolean) {
  const { error } = await requireBackend().rpc('set_admin', { target_email: email.trim(), enabled });
  if (error) throw error;
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
