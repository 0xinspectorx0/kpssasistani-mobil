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
  deleteEntry,
  fetchEntries,
  importBundledContent,
  listAdmins,
  listAudit,
  readableError,
  saveEntry,
} from '../lib/content-api';
import { CATEGORY_LIST } from '../lib/data';
import { Card, EmptyState } from '../components/ui';
import { AdminButton, Choice, ConfirmDialog, Field, Notice } from '../components/admin/AdminUI';
import ContentEditor from '../components/admin/ContentEditor';

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
              KPSS Asistanım içeriklerini tek yerden yönet.{'\n'}Yalnızca yetkilendirilmiş hesaplar
              erişebilir.
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
              İlk hesap ve şifre yenileme işlemleri uygulama sahibi tarafından Supabase Authentication
              üzerinden yapılır. Bu ekrandan hesap oluşturulamaz.
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
            Oturum bu uygulama oturumuyla sınırlıdır; kalıcı olarak saklanmaz.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Dashboard({ previewOnly, onExit }: { previewOnly: boolean; onExit: () => void }) {
  const { theme } = useApp();
  const { session, signOut } = useAdminAuth();
  const { refreshContent } = useContent();
  const wide = useWindowDimensions().width >= 960;
  const [section, setSection] = useState<Section>('overview');
  const [entries, setEntries] = useState<ContentEntry[]>(() => (previewOnly ? seedEntries() : []));
  const [admins, setAdmins] = useState<AdminMember[]>([]);
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
      const [rows, members, logs] = await Promise.all([fetchEntries(), listAdmins(), listAudit()]);
      setEntries(rows);
      setAdmins(members);
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
  const navigation = (
    <View style={{ gap: wide ? 5 : 8, flexDirection: wide ? 'column' : 'row' }}>
      {sections.map((s) => (
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
              <View style={{ marginTop: 20, alignSelf: 'flex-start' }}>
                <AdminButton
                  label="Yeni soru ekle"
                  icon="add"
                  onPress={() => {
                    go('questions');
                    setEditor({
                      entry: { kind: 'questions', id: '', payload: newPayload('questions'), status: 'draft' },
                      isNew: true,
                    });
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
                disabled={loading}
                onPress={() => {
                  const payload = newPayload(section as ContentKind);
                  setEditor({
                    entry: { kind: section as ContentKind, id: payload.id, payload, status: 'draft' },
                    isNew: true,
                  });
                }}
              />
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
                    label={previewOnly ? 'İncele' : 'Düzenle'}
                    icon="create-outline"
                    onPress={() => setEditor({ entry, isNew: false })}
                  />
                  <AdminButton
                    secondary
                    danger
                    label="Sil"
                    icon="trash-outline"
                    disabled={previewOnly || loading}
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
            <Notice text="Burada yönetici yetkilerini yönetebilirsiniz. Öğrenci profilleri ve test geçmişleri halen cihazda tutulur; merkezi öğrenci listesi bulunmaz. Yeni yöneticinin hesabı önce Supabase Authentication üzerinden oluşturulup doğrulanmalıdır." />
            <Card style={{ marginBottom: 18 }}>
              <Field
                label="Yetkilendirilecek hesabın e-postası"
                placeholder="yonetici@ornek.com"
                value={adminEmail}
                onChangeText={setAdminEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <AdminButton
                label="Yönetici yetkisi ver"
                icon="person-add-outline"
                disabled={previewOnly || !adminEmail.trim() || loading}
                onPress={() =>
                  setConfirm({
                    title: 'Tam yönetici yetkisi verilsin mi?',
                    description: `${adminEmail} hesabı tüm içerikleri ve diğer yönetici yetkilerini değiştirebilecek.`,
                    label: 'Yetki ver',
                    action: async () => {
                      await changeAdmin(adminEmail, true);
                      setAdminEmail('');
                      await afterChange('Yönetici yetkisi verildi.');
                    },
                  })
                }
              />
            </Card>
            {admins.map((admin) => (
              <Card key={admin.user_id} style={{ marginBottom: 10, gap: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>
                  {admin.email}
                  {session?.user.id === admin.user_id ? ' (siz)' : ''}
                </Text>
                <AdminButton
                  label="Yetkiyi kaldır"
                  secondary
                  danger
                  disabled={session?.user.id === admin.user_id || previewOnly || loading}
                  onPress={() =>
                    setConfirm({
                      title: 'Yönetici yetkisi kaldırılsın mı?',
                      description: `${admin.email} hesabı artık yönetim işlemi yapamayacak. Hesabın kendisi silinmez.`,
                      label: 'Yetkiyi kaldır',
                      danger: true,
                      action: async () => {
                        await changeAdmin(admin.email, false);
                        await afterChange('Yönetici yetkisi kaldırıldı.');
                      },
                    })
                  }
                />
              </Card>
            ))}
            {!admins.length && (
              <EmptyState
                icon="people-outline"
                title={previewOnly ? 'Önizlemede hesap verisi bulunmaz' : 'Yönetici listesi boş'}
              />
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
                  {(
                    {
                      INSERT: 'İçerik eklendi',
                      UPDATE: 'İçerik güncellendi',
                      DELETE: 'İçerik silindi',
                      GRANT_ADMIN: 'Yönetici yetkisi verildi',
                      REVOKE_ADMIN: 'Yetki kaldırıldı',
                    } as Record<string, string>
                  )[item.action] ?? item.action}
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
          previewOnly={previewOnly}
          entries={entries}
          onClose={() => setEditor(null)}
          onSave={save}
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
  const { isAdmin, checking, session } = useAdminAuth();
  const [preview, setPreview] = useState(false);
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
      {isAdmin ? (
        <Dashboard previewOnly={false} onExit={() => {}} />
      ) : preview && !supabase ? (
        <Dashboard previewOnly onExit={() => setPreview(false)} />
      ) : checking && session ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <ActivityIndicator color={theme.accent} />
          <Text style={{ color: theme.muted }}>Yönetici yetkisi doğrulanıyor…</Text>
        </View>
      ) : (
        <AdminLogin onPreview={() => setPreview(true)} />
      )}
    </SafeAreaView>
  );
}
