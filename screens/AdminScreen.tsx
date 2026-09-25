import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../lib/store';
import { useAdminAuth } from '../lib/admin-auth';
import { useContent } from '../lib/content';
import { supabase } from '../lib/supabase';
import {
  ContentEntry,
  ContentKind,
  entryTitle,
  kindIcons,
  kindLabels,
  newPayload,
  seedEntries,
} from '../lib/content-schema';
import {
  AdminMember,
  AuditItem,
  changeAdmin,
  changeRole,
  deleteEntry,
  deleteUserAccount,
  fetchEntries,
  importBundledContent,
  insertManyEntries,
  listAdmins,
  listAudit,
  listMembers,
  Member,
  readableError,
  saveEntry,
  setBanned,
} from '../lib/content-api';
import { useCategoryList } from '../lib/lesson-catalog';
import { roleLabels } from '../lib/membership';
import { Card, EmptyState } from '../components/ui';
import { AdminButton, Choice, ConfirmDialog, Field, Notice } from '../components/admin/AdminUI';
import ContentEditor from '../components/admin/ContentEditor';
import BulkAdd from '../components/admin/BulkAdd';

type Section = ContentKind | 'overview' | 'admins' | 'audit';
const sectionLabels: Record<Section, string> = {
  overview: 'Genel Bakış',
  ...kindLabels,
  admins: 'Yöneticiler',
  audit: 'İşlem Geçmişi',
};
const sectionIcons: Record<Section, string> = {
  overview: 'grid-outline',
  ...kindIcons,
  admins: 'people-outline',
  audit: 'time-outline',
};
const sections = Object.keys(sectionLabels) as Section[];

function auditActionLabel(action: string): string {
  const fixed: Record<string, string> = {
    INSERT: 'İçerik eklendi',
    UPDATE: 'İçerik güncellendi',
    DELETE: 'İçerik silindi',
    GRANT_ADMIN: 'Yönetici yetkisi verildi',
    REVOKE_ADMIN: 'Yetki kaldırıldı',
    REMOVE_MEMBER: 'Üyelik kaldırıldı',
  };
  if (fixed[action]) return fixed[action];
  if (action.startsWith('SET_ROLE:')) {
    const role = action.slice('SET_ROLE:'.length);
    return `Rol atandı: ${roleLabels[role] ?? role}`;
  }
  return action;
}

function AdminLogin({ onPreview }: { onPreview: () => void }) {
  const { theme } = useApp();
  const { signIn, checking, authError } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login() {
    if (!email.trim() || !password) {
      setError('E-posta ve şifrenizi girin.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 22, alignItems: 'center', flexGrow: 1, justifyContent: 'center' }}
      >
        <View style={{ width: '100%', maxWidth: 460 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 23,
                backgroundColor: theme.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={34} color={theme.accent} />
            </View>
            <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900' }}>Yönetici girişi</Text>
            <Text style={{ color: theme.muted, lineHeight: 22, textAlign: 'center', marginTop: 8 }}>
              KPSS Asistanım hesabınla giriş yap.{'\n'}Hesabın yoksa Profil → Hesabım bölümünden
              üye olabilir; yönetici yetkisi olmayan hesaplar bu panele erişemez.
            </Text>
          </View>
          {!supabase && (
            <Notice text="Yönetim altyapısı henüz bağlanmadı. Giriş için Supabase kurulumu gerekiyor. Kurulum rehberi: docs/ADMIN.md. Panel tasarımını aşağıdan inceleyebilirsiniz." />
          )}
          <Card>
            <Field
              label="E-posta adresi"
              placeholder="yonetici@ornek.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Şifre"
              placeholder="Hesap şifreniz"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              onSubmitEditing={login}
            />
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setVisible(!visible)}
              style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 14 }}
            >
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12 }}>
                {visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              </Text>
            </TouchableOpacity>
            {!!(error || authError) && <Notice text={error || authError!} error />}
            <AdminButton
              label="Güvenli giriş yap"
              icon="lock-closed-outline"
              onPress={login}
              busy={busy || checking}
              disabled={!supabase}
            />
            <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19, marginTop: 16 }}>
              İlk yönetici hesabı ve şifre yenileme işlemleri uygulama sahibi tarafından Supabase
              Authentication üzerinden yapılır. Normal kullanıcılar üye olabilir; yönetici yetkisi
              ise panelden veya Supabase'den atanır.
            </Text>
          </Card>
          {!supabase && (
            <View style={{ marginTop: 18 }}>
              <AdminButton
                label="Paneli salt okunur incele"
                secondary
                icon="eye-outline"
                onPress={onPreview}
              />
            </View>
          )}
          <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center', marginTop: 22 }}>
            Oturumun cihazda saklanır; çıkış işlemi oturumu tamamen sonlandırır.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Dashboard({ previewOnly, onExit }: { previewOnly: boolean; onExit: () => void }) {
  const { theme } = useApp();
  const { session, signOut, role: myRole } = useAdminAuth();
  const { refreshContent } = useContent();
  const CATEGORY_LIST = useCategoryList();
  const canManage = myRole === 'admin' || myRole === 'editor';
  const canGrantRoles = myRole === 'admin';
  const wide = useWindowDimensions().width >= 960;
  const [section, setSection] = useState<Section>('overview');
  const [entries, setEntries] = useState<ContentEntry[]>(() => (previewOnly ? seedEntries() : []));
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(!previewOnly);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<{ entry: ContentEntry; isNew: boolean } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    description: string;
    label: string;
    danger?: boolean;
    action: () => Promise<void>;
  } | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const load = useCallback(async () => {
    if (previewOnly) return;
    setLoading(true);
    setError('');
    try {
      const [rows, membersList, adminsList, logs] = await Promise.all([
        fetchEntries(),
        listMembers(),
        listAdmins(),
        listAudit(),
      ]);
      setEntries(rows);
      setMembers(membersList);
      setAdmins(adminsList);
      setAudit(logs);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setLoading(false);
    }
  }, [previewOnly]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(0);
  }, [section, query, filter, category]);

  function go(next: Section) {
    setSection(next);
    setQuery('');
    setFilter('all');
    setCategory('all');
    setMessage('');
  }
  async function afterChange(text: string) {
    setMessage(text);
    await Promise.all([load(), refreshContent()]);
  }
  async function runConfirm() {
    if (!confirm || busy || previewOnly) return;
    setBusy(true);
    setError('');
    try {
      await confirm.action();
      setConfirm(null);
    } catch (e) {
      setConfirm(null);
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(entry: ContentEntry, isNew: boolean) {
    if (previewOnly) throw new Error('Önizlemede kayıt yapılamaz.');
    if (
      entry.kind === 'events' &&
      entry.status === 'draft' &&
      entries.some(
        (e) =>
          e.kind === 'targets' &&
          e.status === 'published' &&
          'eventId' in e.payload &&
          e.payload.eventId === entry.id,
      )
    )
      throw new Error(
        'Bu etkinlik yayındaki bir hedef sınava bağlı. Önce Hedef Sınavlar bölümünden bağlantıyı değiştirin veya hedefi taslağa alın.',
      );
    await saveEntry(entry, isNew);
    await afterChange(
      entry.status === 'published'
        ? 'İçerik kaydedildi ve yayınlandı.'
        : 'Taslak kaydedildi. Öğrencilere gösterilmez.',
    );
  }
  function askDelete(entry: ContentEntry) {
    if (
      entry.kind === 'events' &&
      entries.some((e) => e.kind === 'targets' && 'eventId' in e.payload && e.payload.eventId === entry.id)
    ) {
      setError('Bu etkinlik bir hedef sınava bağlı. Önce Hedef Sınavlar bölümünden bağlantıyı kaldırın.');
      return;
    }
    setConfirm({
      title: 'İçerik silinsin mi?',
      description: `“${entryTitle(entry).slice(0, 180)}” kalıcı olarak silinecek. Öğrenci ekranlarından da kaldırılır. Bu işlem geri alınamaz.`,
      label: 'Kalıcı olarak sil',
      danger: true,
      action: async () => {
        await deleteEntry(entry);
        await afterChange('İçerik silindi.');
      },
    });
  }
  const filtered = entries.filter(
    (e) =>
      e.kind === section &&
      (filter === 'all' || e.status === filter) &&
      (category === 'all' || ('category' in e.payload && e.payload.category === category)) &&
      (entryTitle(e) + ' ' + e.id).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')),
  );
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1));
  const published = entries.filter((e) => e.status === 'published').length;
  const isContent = section in kindLabels;
  const visibleSections = sections.filter((s) => s !== 'admins' || canGrantRoles);
  const navigation = (
    <View style={{ gap: wide ? 5 : 8, flexDirection: wide ? 'column' : 'row' }}>
      {visibleSections.map((s) => (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={sectionLabels[s]}
          accessibilityState={{ selected: section === s }}
          key={s}
          onPress={() => go(s)}
          style={{
            minHeight: 45,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 11,
            backgroundColor: section === s ? theme.accentSoft : 'transparent',
          }}
        >
          <Ionicons
            name={sectionIcons[s] as any}
            size={19}
            color={section === s ? theme.accent : theme.muted}
          />
          <Text
            style={{
              color: section === s ? theme.accent : theme.muted,
              fontSize: 13,
              fontWeight: section === s ? '800' : '600',
            }}
          >
            {sectionLabels[s]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  return (
    <View
      style={{
        flex: 1,
        flexDirection: wide ? 'row' : 'column',
        width: '100%',
        maxWidth: 1400,
        alignSelf: 'center',
      }}
    >
      {wide ? (
        <View
          style={{
            width: 234,
            padding: 16,
            borderRightWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <Text
            style={{ color: theme.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.6, margin: 14 }}
          >
            ÇALIŞMA ALANI
          </Text>
          {navigation}
          <View style={{ marginTop: 26, borderTopWidth: 1, borderColor: theme.border, paddingTop: 16 }}>
            <Text style={{ color: theme.muted, fontSize: 11, lineHeight: 18 }}>
              İçerik değişiklikleri, kullanıcıların uygulamasına yenilemeyle ulaşır.
            </Text>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: theme.card, borderBottomWidth: 1, borderColor: theme.border }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ padding: 10 }}
          >
            {navigation}
          </ScrollView>
        </View>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: wide ? 30 : 16, paddingBottom: 44 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}
        >
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text
              style={{
                color: theme.muted,
                fontSize: 11,
                letterSpacing: 1,
                fontWeight: '700',
                marginBottom: 7,
              }}
            >
              YÖNETİM / {section === 'overview' ? 'ÖZET' : 'İÇERİK'}
            </Text>
            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 26 }}>
              {sectionLabels[section]}
            </Text>
          </View>
          <AdminButton
            secondary
            label={previewOnly ? 'Önizlemeyi kapat' : 'Çıkış yap'}
            icon="log-out-outline"
            onPress={() => {
              if (previewOnly) onExit();
              else
                setConfirm({
                  title: 'Yönetici oturumu kapatılsın mı?',
                  description: 'Panele tekrar erişmek için giriş yapmanız gerekecek.',
                  label: 'Çıkış yap',
                  action: async () => {
                    await signOut();
                  },
                });
            }}
          />
        </View>
        {previewOnly && (
          <Notice text="SALT OKUNUR ÖNİZLEME • Buradaki veriler uygulamanın örnek içerikleridir. Kayıt, silme ve yetkilendirme devre dışıdır. Gerçek yönetim için Supabase kurulumu ve admin girişi gerekir." />
        )}
        {!!error && <Notice text={error} error />}
        {!!message && <Notice text={message} />}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
            <ActivityIndicator color={theme.accent} />
            <Text style={{ color: theme.muted }}>Yönetim verileri yükleniyor…</Text>
          </View>
        )}
        {section === 'overview' && (
          <>
            <LinearGradient
              colors={['#122442', '#244C70']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 25, borderRadius: 20, marginBottom: 20 }}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <Ionicons name="shield-checkmark" color="#93C5FD" size={24} />
                <Text style={{ color: '#BFDBFE', fontSize: 12, fontWeight: '700' }}>
                  {previewOnly ? 'PANEL ÖNİZLEMESİ' : 'YÖNETİCİ ÇALIŞMA ALANI'}
                </Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 9 }}>
                İyi bir hazırlık, iyi içerikle başlar.
              </Text>
              <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 22, maxWidth: 570 }}>
                Soruları hazırla, içerikleri güncel tut ve öğrencilerin çalışma yolculuğunu destekle.
              </Text>
              <View style={{ marginTop: 20, flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                <AdminButton
                  label="Yeni soru ekle"
                  icon="add"
                  disabled={!canManage}
                  onPress={() => {
                    go('questions');
                    setEditor({
                      entry: { kind: 'questions', id: '', payload: newPayload('questions'), status: 'draft' },
                      isNew: true,
                    });
                  }}
                />
                <AdminButton
                  label="Toplu soru ekle"
                  icon="layers-outline"
                  secondary
                  onPress={() => {
                    go('questions');
                    setBulkOpen(true);
                  }}
                />
              </View>
            </LinearGradient>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
              {[
                {
                  label: 'Toplam soru',
                  value: entries.filter((e) => e.kind === 'questions').length,
                  icon: 'help-circle-outline',
                  color: '#2563EB',
                },
                {
                  label: 'Yayındaki içerik',
                  value: published,
                  icon: 'checkmark-circle-outline',
                  color: '#059669',
                },
                {
                  label: 'Taslak içerik',
                  value: entries.length - published,
                  icon: 'create-outline',
                  color: '#D97706',
                },
              ].map((stat) => (
                <Card key={stat.label} style={{ flex: 1, minWidth: 130, padding: 18 }}>
                  <Ionicons name={stat.icon as any} color={stat.color} size={23} />
                  <Text style={{ color: theme.text, fontSize: 28, fontWeight: '900', marginTop: 14 }}>
                    {stat.value}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{stat.label}</Text>
                </Card>
              ))}
            </View>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, marginBottom: 14 }}>
              İçerik yönetimi
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {(Object.keys(kindLabels) as ContentKind[]).map((kind) => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={kind}
                  onPress={() => go(kind)}
                  style={{ width: wide ? '48%' : '100%' }}
                >
                  <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 82 }}>
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                        backgroundColor: theme.accentSoft,
                      }}
                    >
                      <Ionicons name={kindIcons[kind] as any} size={22} color={theme.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>
                        {kindLabels[kind]}
                      </Text>
                      <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>
                        {entries.filter((e) => e.kind === kind).length} içerik • Yönet
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" color={theme.muted} size={17} />
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
            <Card style={{ marginTop: 24 }}>
              <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 8 }}>
                İlk kurulum / hazır içerikleri aktar
              </Text>
              <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 21, marginBottom: 16 }}>
                Uygulamayla gelen soru ve içerikleri veritabanına aktarır. Mevcut kayıtlarınızın üzerine
                yazılmaz. Silinmiş hazır içerikler yeniden eklenir.
              </Text>
              <AdminButton
                secondary
                label="Hazır içerikleri aktar"
                icon="cloud-upload-outline"
                disabled={previewOnly || loading}
                onPress={() =>
                  setConfirm({
                    title: 'Hazır içerikler aktarılsın mı?',
                    description:
                      'Eksik hazır içerikler yayında olarak eklenecek. Öğrenciler içerik yenilemesinden sonra bu kayıtları görebilir.',
                    label: 'Aktar ve yayınla',
                    action: async () => {
                      await importBundledContent();
                      await afterChange('Hazır içerikler aktarıldı.');
                    },
                  })
                }
              />
            </Card>
          </>
        )}
        {isContent && (
          <>
            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginBottom: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, minWidth: 180 }}>
                <Field
                  label="İçerik ara"
                  placeholder="Başlık, soru metni veya kimlik…"
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              <AdminButton
                label={section === 'questions' ? 'Yeni soru' : 'Yeni içerik'}
                icon="add"
                disabled={loading || !canManage}
                onPress={() => {
                  const payload = newPayload(section as ContentKind);
                  setEditor({
                    entry: { kind: section as ContentKind, id: payload.id, payload, status: 'draft' },
                    isNew: true,
                  });
                }}
              />
              {section === 'questions' && (
                <AdminButton
                  label="Toplu soru ekle"
                  icon="layers-outline"
                  secondary
                  disabled={loading || !canManage}
                  onPress={() => setBulkOpen(true)}
                />
              )}
            </View>
            <Choice
              label="Yayın durumu"
              value={filter}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'published', label: 'Yayında' },
                { value: 'draft', label: 'Taslak' },
              ]}
              onChange={setFilter}
            />
            {section === 'questions' && (
              <Choice
                label="Ders filtresi"
                value={category}
                options={[
                  { value: 'all', label: 'Tüm dersler' },
                  ...CATEGORY_LIST.map((c) => ({ value: c.id, label: c.name })),
                ]}
                onChange={setCategory}
              />
            )}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginVertical: 10,
              }}
            >
              <Text style={{ color: theme.muted, fontSize: 12 }}>{filtered.length} içerik bulundu</Text>
              <AdminButton
                label="Yenile"
                secondary
                icon="refresh"
                onPress={() => void load()}
                disabled={previewOnly || loading}
              />
            </View>
            {filtered.slice(currentPage * 20, currentPage * 20 + 20).map((entry) => (
              <Card key={`${entry.kind}:${entry.id}`} style={{ marginBottom: 10, padding: 17 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    marginBottom: 9,
                  }}
                >
                  <View
                    style={{
                      backgroundColor:
                        entry.status === 'published' ? theme.success + '16' : theme.gold + '18',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: entry.status === 'published' ? theme.success : theme.gold,
                        fontWeight: '800',
                        fontSize: 10,
                      }}
                    >
                      {entry.status === 'published' ? '● YAYINDA' : '● TASLAK'}
                    </Text>
                  </View>
                  {'category' in entry.payload && (
                    <Text style={{ color: theme.muted, fontSize: 11 }}>
                      {CATEGORY_LIST.find((c) => c.id === (entry.payload as any).category)?.name ??
                        entry.payload.category}
                    </Text>
                  )}
                  {'difficulty' in entry.payload && (
                    <Text style={{ color: theme.muted, fontSize: 11 }}>• {entry.payload.difficulty}</Text>
                  )}
                </View>
                <Text
                  style={{ color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 22 }}
                  numberOfLines={3}
                >
                  {entryTitle(entry)}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text style={{ flex: 1, minWidth: 90, color: theme.muted, fontSize: 10 }}>{entry.id}</Text>
                  <AdminButton
                    secondary
                    label={canManage ? 'Düzenle' : 'İncele'}
                    icon="create-outline"
                    onPress={() => setEditor({ entry, isNew: false })}
                  />
                  <AdminButton
                    secondary
                    danger
                    label="Sil"
                    icon="trash-outline"
                    disabled={!canManage || previewOnly || loading}
                    onPress={() => askDelete(entry)}
                  />
                </View>
              </Card>
            ))}
            {!filtered.length && !loading && (
              <EmptyState
                icon="documents-outline"
                title={
                  query || filter !== 'all' || category !== 'all'
                    ? 'Eşleşen içerik yok'
                    : 'Henüz içerik eklenmedi'
                }
                desc="Yeni içerik ekleyebilir veya filtreleri değiştirebilirsiniz."
              />
            )}
            {filtered.length > 20 && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 16,
                }}
              >
                <AdminButton
                  label="Önceki"
                  secondary
                  disabled={currentPage === 0}
                  onPress={() => setPage(currentPage - 1)}
                />
                <Text style={{ color: theme.muted }}>
                  {currentPage + 1} / {Math.ceil(filtered.length / 20)}
                </Text>
                <AdminButton
                  label="Sonraki"
                  secondary
                  disabled={(currentPage + 1) * 20 >= filtered.length}
                  onPress={() => setPage(currentPage + 1)}
                />
              </View>
            )}
          </>
        )}
        {section === 'admins' && (
          <>
            <Notice
              text={
                canGrantRoles
                  ? 'Roller: Yönetici (her şey + rol atama), Editör (içerik yönetir), Görüntüleyici (salt okunur), VIP (sınırsız test), Üye (günde 3 test). Yeni hesabın önce uygulamadan üye olması veya Supabase Authentication üzerinden oluşturulması gerekir.'
                  : 'Bu bölümü yalnızca yöneticiler düzenleyebilir. Editör ve görüntüleyici rollerinin içerik üzerindeki yetkileri otomatik sınırlandırılır.'
              }
            />
            {canGrantRoles && (
              <Card style={{ marginBottom: 18 }}>
                <Field
                  label="Rol atanacak hesabın e-postası"
                  placeholder="kullanici@ornek.com"
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <AdminButton
                    label="Admin yap"
                    icon="shield"
                    disabled={previewOnly || !adminEmail.trim() || loading}
                    onPress={() =>
                      setConfirm({
                        title: 'Yönetici yetkisi verilsin mi?',
                        description: `${adminEmail} hesabı tüm içerikleri ve diğer rolleri yönetebilecek.`,
                        label: 'Admin yap',
                        action: async () => {
                          await changeRole(adminEmail, 'admin');
                          setAdminEmail('');
                          await afterChange('Yönetici yetkisi verildi.');
                        },
                      })
                    }
                  />
                  <AdminButton
                    label="Editör yap"
                    secondary
                    icon="create"
                    disabled={previewOnly || !adminEmail.trim() || loading}
                    onPress={() =>
                      setConfirm({
                        title: 'Editör yetkisi verilsin mi?',
                        description: `${adminEmail} hesabı içerik ekleyip düzenleyebilir ve silebilir; ancak rol atayamaz.`,
                        label: 'Editör yap',
                        action: async () => {
                          await changeRole(adminEmail, 'editor');
                          setAdminEmail('');
                          await afterChange('Editör yetkisi verildi.');
                        },
                      })
                    }
                  />
                  <AdminButton
                    label="Görüntüleyici yap"
                    secondary
                    icon="eye"
                    disabled={previewOnly || !adminEmail.trim() || loading}
                    onPress={() =>
                      setConfirm({
                        title: 'Görüntüleyici yetkisi verilsin mi?',
                        description: `${adminEmail} hesabı taslaklar dahil içeriği görebilir; değiştiremez.`,
                        label: 'Görüntüleyici yap',
                        action: async () => {
                          await changeRole(adminEmail, 'viewer');
                          setAdminEmail('');
                          await afterChange('Görüntüleyici yetkisi verildi.');
                        },
                      })
                    }
                  />
                  <AdminButton
                    label="VIP yap"
                    secondary
                    icon="diamond"
                    disabled={previewOnly || !adminEmail.trim() || loading}
                    onPress={() =>
                      setConfirm({
                        title: 'VIP üyelik verilsin mi?',
                        description: `${adminEmail} hesabı sınırsız test çözebilecek.`,
                        label: 'VIP yap',
                        action: async () => {
                          await changeRole(adminEmail, 'vip');
                          setAdminEmail('');
                          await afterChange('VIP üyelik verildi.');
                        },
                      })
                    }
                  />
                </View>
              </Card>
            )}
            {members.map((m) => (
              <Card key={m.user_id} style={{ marginBottom: 10, gap: 12, opacity: m.banned ? 0.75 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: theme.accentSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={
                        m.banned
                          ? 'ban'
                          : (m.role === 'admin'
                            ? 'shield'
                            : m.role === 'editor'
                              ? 'create'
                              : m.role === 'viewer'
                                ? 'eye'
                                : m.role === 'vip'
                                  ? 'diamond'
                                  : 'person') as any
                      }
                      size={20}
                      color={m.banned ? theme.danger : theme.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ color: theme.text, fontWeight: '700' }}>
                        {m.email}
                        {session?.user.id === m.user_id ? ' (siz)' : ''}
                      </Text>
                      {m.banned && (
                        <View
                          style={{
                            backgroundColor: theme.danger + '18',
                            borderRadius: 6,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                          }}
                        >
                          <Text style={{ color: theme.danger, fontSize: 10, fontWeight: '800' }}>ENGELLİ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
                      Rol: {roleLabels[m.role] ?? m.role}
                    </Text>
                  </View>
                </View>

                {canGrantRoles && session?.user.id !== m.user_id && (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {!m.banned && m.role !== 'uye' && (
                      <AdminButton
                        label="Yetkiyi kaldır"
                        secondary
                        danger
                        disabled={previewOnly || loading}
                        onPress={() =>
                          setConfirm({
                            title: 'Yetki kaldırılsın mı?',
                            description: `${m.email} hesabı yönetim panelinden çıkarılacak; normal üye olarak kalmaya devam edecek.`,
                            label: 'Yetkiyi kaldır',
                            danger: true,
                            action: async () => {
                              await changeRole(m.email, 'uye');
                              await afterChange('Yetki geri alındı; hesap üye olarak kaldı.');
                            },
                          })
                        }
                      />
                    )}
                    {!m.banned ? (
                      <AdminButton
                        label="Engelle"
                        secondary
                        danger
                        disabled={previewOnly || loading}
                        onPress={() =>
                          setConfirm({
                            title: 'Kullanıcı engellensin mi?',
                            description: `${m.email} hesabı anında giriş yapamaz hâle gelir; açık oturumları sonlanır ve tüm yetkileri düşer. İşlem İşlem Geçmişi bölümüne kaydedilir.`,
                            label: 'Engelle',
                            danger: true,
                            action: async () => {
                              await setBanned(m.email, true);
                              await afterChange('Kullanıcı engellendi.');
                            },
                          })
                        }
                      />
                    ) : (
                      <AdminButton
                        label="Engeli kaldır"
                        secondary
                        disabled={previewOnly || loading}
                        onPress={() =>
                          setConfirm({
                            title: 'Engel kaldırılsın mı?',
                            description: `${m.email} hesabı yeniden uygulamaya giriş yapabilecek.`,
                            label: 'Engeli kaldır',
                            action: async () => {
                              await setBanned(m.email, false);
                              await afterChange('Engel kaldırıldı.');
                            },
                          })
                        }
                      />
                    )}
                    <AdminButton
                      label="Hesabı sil"
                      danger
                      disabled={previewOnly || loading || m.role === 'admin'}
                      onPress={() =>
                        setConfirm({
                          title: 'Hesap kalıcı olarak silinsin mi?',
                          description: `${m.email} hesabı ve tüm verileri kalıcı olarak silinecek (Supabase kaydı dahil). Bu işlem geri alınamaz. Yalnızca admin olmayan hesaplar silinebilir.`,
                          label: 'Kalıcı sil',
                          danger: true,
                          action: async () => {
                            await deleteUserAccount(m.email).catch((e) => {
                              setError(
                                readableError(e) +
                                  ' (Hesap silme için supabase/functions/delete-user Edge Function kurulumu gerekir — docs/ADMIN.md)',
                              );
                              throw e;
                            });
                            await afterChange('Hesap silindi.');
                          },
                        })
                      }
                    />
                  </View>
                )}
                {canGrantRoles && session?.user.id === m.user_id && (
                  <Text style={{ color: theme.muted, fontSize: 11 }}>
                    Kendi hesabınızda engelleme/silme işlemi yapamazsınız.
                  </Text>
                )}
              </Card>
            ))}
            {!members.length && !previewOnly && (
              <EmptyState
                icon="people-outline"
                title="Henüz hesap yok"
                desc="Kullanıcılar uygulamadan üye oldukça burada listelenecek."
              />
            )}
            {previewOnly && (
              <EmptyState icon="people-outline" title="Önizlemede hesap verisi bulunmaz" />
            )}
          </>
        )}
        {section === 'audit' && (
          <>
            <Notice text="Son 50 içerik ve yetki işlemi sunucu tarafından kaydedilir. Bu günlük panelden değiştirilemez veya silinemez." />
            <AdminButton
              secondary
              label="Günlüğü yenile"
              icon="refresh"
              disabled={loading || previewOnly}
              onPress={() => void load()}
            />
            {audit.map((item) => (
              <Card key={item.id} style={{ marginTop: 10 }}>
                <Text style={{ color: theme.text, fontWeight: '800' }}>
                  {auditActionLabel(item.action)}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 7 }}>
                  {sectionLabels[item.kind as Section] ?? item.kind} • {item.entry_id}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 7 }}>
                  {new Date(item.created_at).toLocaleString('tr-TR')} •{' '}
                  {admins.find((a) => a.user_id === item.actor_id)?.email ?? item.actor_id ?? 'Sistem'}
                </Text>
              </Card>
            ))}
            {!audit.length && <EmptyState icon="time-outline" title="Henüz işlem kaydı yok" />}
          </>
        )}
        {!isContent && section !== 'audit' && (
          <View style={{ marginTop: 24 }}>
            <AdminButton
              label="Verileri yenile"
              secondary
              icon="refresh"
              disabled={previewOnly || loading}
              onPress={() => void load()}
            />
          </View>
        )}
      </ScrollView>
      {editor && (
        <ContentEditor
          {...editor}
          previewOnly={previewOnly || !canManage}
          entries={entries}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      {bulkOpen && (
        <BulkAdd
          onClose={() => setBulkOpen(false)}
          onInsert={async (entriesToInsert) => {
            await insertManyEntries(entriesToInsert);
            await afterChange(`${entriesToInsert.length} soru eklendi.`);
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          {...confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void runConfirm()}
          busy={busy}
        />
      )}
    </View>
  );
}
export default function AdminScreen({ navigation }: any) {
  const { theme } = useApp();
  const { isAdmin, canViewDrafts, checking, session, role, roleChecked } = useAdminAuth();
  const [preview, setPreview] = useState(false);
  const hasPanelAccess = isAdmin || canViewDrafts;
  const pendingRoleCheck = !!session && !roleChecked;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          borderBottomWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Uygulamaya dön"
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '900' }}>KPSS Asistanım</Text>
          <Text
            style={{ color: theme.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 3 }}
          >
            YÖNETİM MERKEZİ
          </Text>
        </View>
        <Ionicons name="shield-checkmark-outline" color={theme.accent} size={22} />
      </View>
      {hasPanelAccess ? (
        <Dashboard previewOnly={false} onExit={() => {}} />
      ) : preview && !supabase ? (
        <Dashboard previewOnly onExit={() => setPreview(false)} />
      ) : checking && session ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.muted }}>Yetki doğrulanıyor…</Text>
        </View>
      ) : pendingRoleCheck ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.muted }}>Yetki doğrulanıyor…</Text>
        </View>
      ) : session && !hasPanelAccess ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: theme.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Ionicons name="lock-closed" size={34} color={theme.accent} />
          </View>
          <Text style={{ color: theme.text, fontWeight: '900', fontSize: 19, textAlign: 'center' }}>
            Yönetim yetkiniz yok
          </Text>
          <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21, marginTop: 10, maxWidth: 340 }}>
            Hesabınız uygulamaya giriş yaptı ancak yönetim paneli için yetkilendirilmemiş. Yetki,
            uygulama sahibi tarafından panelden veya Supabase üzerinden atanır.
          </Text>
          <View style={{ marginTop: 22, alignItems: 'center', gap: 12 }}>
            <AdminButton label="Uygulamaya dön" icon="arrow-back" onPress={() => navigation.goBack()} />
          </View>
        </View>
      ) : (
        <AdminLogin onPreview={() => setPreview(true)} />
      )}
    </SafeAreaView>
  );
}
