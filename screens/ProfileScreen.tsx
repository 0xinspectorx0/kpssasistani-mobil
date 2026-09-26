import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { useAdminAuth } from '../lib/admin-auth';
import { supabase } from '../lib/supabase';
import { usePlan, roleLabels } from '../lib/membership';
import { Card, EmptyState, PrimaryButton, ProgressBar, SectionTitle, StatTile, useResponsiveLayout } from '../components/ui';
import AuthScreen from '../components/AuthScreen';
import { useCategoryList } from '../lib/lesson-catalog';
import { radius } from '../lib/theme';

export default function ProfileScreen({ navigation }: any) {
  const {
    theme, mode, name, setName, targetExamId, setTargetExamId, history, favorites, toggleFavorite,
    streak, totalQuestions, totalCorrect, accuracy, totalSeconds, themeChoice, setThemeChoice,
    completedTopics, resetAll, activityDates,
  } = useApp();
  const { isDesktopWeb, pageMaxWidth, pagePadding } = useResponsiveLayout();
  const { questions: QUESTIONS, lessons: LESSONS, targets: TARGET_EXAMS } = useContent();
  const CATEGORY_LIST = useCategoryList();
  const { session, role, signOut } = useAdminAuth();
  const { plan, meta: planMeta } = usePlan();
  const [authVisible, setAuthVisible] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const availableTopicIds = new Set(LESSONS.flatMap(l => l.topics.map(t => t.id)));
  const completedCount = completedTopics.filter(id => availableTopicIds.has(id)).length;
  const totalTopics = LESSONS.reduce((s, l) => s + l.topics.length, 0);
  const favQuestions = QUESTIONS.filter((q) => favorites.includes(q.id));

  const mins = Math.floor(totalSeconds / 60);
  const hrs = Math.floor(mins / 60);

  const catStats = CATEGORY_LIST.map((c) => {
    const h = history.filter((x) => x.categoryId === c.id);
    const t = h.reduce((s, x) => s + x.total, 0);
    const ok = h.reduce((s, x) => s + x.correct, 0);
    return { ...c, total: t, acc: t > 0 ? Math.round((ok / t) * 100) : 0 };
  }).filter((c) => c.total > 0);

  // last 7 days activity
  const last7: { label: string; active: boolean; count: number }[] = [];
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const count = history.filter((h) => h.date.slice(0, 10) === key).reduce((s, h) => s + h.total, 0);
    last7.push({ label: days[d.getDay()], active: activityDates.includes(key), count });
  }
  const maxCount = Math.max(1, ...last7.map((d) => d.count));

  const confirmReset = () => {
    Alert.alert('Tüm veriler silinsin mi?', 'Test geçmişi, konu takibi ve favoriler silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: pageMaxWidth,
          alignSelf: 'center',
          padding: pagePadding,
          paddingBottom: isDesktopWeb ? 36 : 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: theme.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '900', color: theme.accent }}>
                {(name || 'K').charAt(0).toLocaleUpperCase('tr')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    value={nameDraft}
                    onChangeText={setNameDraft}
                    placeholder="Adın"
                    placeholderTextColor={theme.muted}
                    autoFocus
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: '800',
                      color: theme.text,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.accent,
                      paddingVertical: 2,
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setName(nameDraft.trim());
                      setEditingName(false);
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="checkmark-circle" size={26} color={theme.success} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setNameDraft(name); setEditingName(true); }} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 19, fontWeight: '900', color: theme.text }}>
                    {name || 'KPSS Adayı'}
                  </Text>
                  <Ionicons name="pencil" size={15} color={theme.muted} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              )}
              <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
                {streak > 0 ? `🔥 ${streak} günlük seri` : 'Bugün çalışmaya başla, serini başlat!'}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text, marginTop: 16, marginBottom: 8 }}>
            Hedef sınavın
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {TARGET_EXAMS.map((t) => {
              const active = targetExamId === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setTargetExamId(active ? null : t.id)}
                  style={{
                    backgroundColor: active ? theme.accent : theme.card2,
                    borderRadius: 999,
                    paddingHorizontal: 13,
                    paddingVertical: 8,
                    marginRight: 8,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: active ? theme.accent : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? '#fff' : theme.text }}>
                    {t.short} • {t.scoreType}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Account / membership */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Hesabım" subtitle={session ? `${roleLabels[role] ?? 'Üye'} planı` : 'Misafir olarak devam ediyorsun'} />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 14,
                  backgroundColor: planMeta.color + '1A',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name={planMeta.icon as any} size={23} color={planMeta.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
                  {session ? roleLabels[role] || 'Üye' : 'Misafir'}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
                  {planMeta.desc}
                </Text>
              </View>
            </View>
            {session ? (
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <TouchableOpacity
                  onPress={() => signOut().catch(() => {})}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 13 }}>Çıkış yap</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <PrimaryButton
                label={supabase ? 'Giriş Yap / Üye Ol' : 'Hesap altyapısı bağlı değil'}
                icon="log-in"
                onPress={() => supabase && setAuthVisible(true)}
                disabled={!supabase}
              />
            )}
          </Card>
        </View>

        {/* Stats */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Performansın" />
          <View style={{ flexDirection: 'row' }}>
            <StatTile icon="checkmark-done" iconColor={theme.success} value={String(totalQuestions)} label="Toplam soru" />
            <View style={{ width: 10 }} />
            <StatTile icon="trophy" iconColor={theme.gold} value={`%${accuracy}`} label="Başarı" />
            <View style={{ width: 10 }} />
            <StatTile icon="time" iconColor={theme.accent} value={hrs > 0 ? `${hrs}s ${mins % 60}dk` : `${mins} dk`} label="Çalışma süresi" />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <StatTile icon="flame" iconColor="#EA580C" value={String(streak)} label="Günlük seri" />
            <View style={{ width: 10 }} />
            <StatTile icon="book" iconColor="#2563EB" value={`${completedCount}/${totalTopics}`} label="Tamamlanan konu" />
            <View style={{ width: 10 }} />
            <StatTile icon="star" iconColor={theme.warning} value={String(favQuestions.length)} label="Favori soru" />
          </View>
        </View>

        {/* Weekly activity */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Haftalık Aktivite" subtitle="Son 7 günde çözülen soru sayısı" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 }}>
              {last7.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: theme.muted, marginBottom: 4 }}>
                    {d.count > 0 ? d.count : ''}
                  </Text>
                  <View
                    style={{
                      width: '70%',
                      height: Math.max(8, (d.count / maxCount) * 84),
                      borderRadius: 6,
                      backgroundColor: d.count > 0 ? theme.accent : theme.border,
                      opacity: i === 6 ? 1 : d.count > 0 ? 0.75 : 1,
                    }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: i === 6 ? '900' : '600', color: i === 6 ? theme.accent : theme.muted, marginTop: 6 }}>
                    {i === 6 ? 'Bugün' : d.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        {/* Per-category */}
        {catStats.length > 0 ? (
          <View style={{ marginTop: 14 }}>
            <SectionTitle title="Ders Bazında Başarı" />
            <Card>
              {catStats.map((c) => (
                <View key={c.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name={c.icon as any} size={15} color={c.color} />
                      <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.text, marginLeft: 7 }}>
                        {c.name}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.muted }}>
                      {c.total} soru • %{c.acc}
                    </Text>
                  </View>
                  <ProgressBar progress={c.acc / 100} color={c.color} height={7} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* History */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Test Geçmişi" subtitle={history.length ? `Son ${Math.min(history.length, 8)} test` : undefined} />
          {history.length === 0 ? (
            <Card>
              <EmptyState icon="document-text-outline" title="Henüz test çözmedin" desc="İlk testini çöz, istatistiklerin burada görünsün." />
              <PrimaryButton label="Hemen Başla" icon="play" onPress={() => (navigation as any).navigate('Testler')} />
            </Card>
          ) : (
            <Card style={{ padding: 8 }}>
              {history.slice(0, 8).map((h) => {
                const pct = h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0;
                const d = new Date(h.date);
                return (
                  <View
                    key={h.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.card2, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: pct >= 60 ? theme.success : theme.danger }}>%{pct}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>{h.category}</Text>
                      <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                        {h.correct}/{h.total} doğru • {d.toLocaleDateString('tr-TR')} {d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        {/* Favorites */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle
            title="Favori Sorular"
            subtitle={favQuestions.length ? `${favQuestions.length} soru kaydettin` : undefined}
            right={
              favQuestions.length > 0 ? (
                <TouchableOpacity onPress={() => (navigation as any).navigate('Quiz', { mode: 'favorites', count: favQuestions.length })}>
                  <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13 }}>Test Et ›</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
          {favQuestions.length === 0 ? (
            <Card>
              <EmptyState icon="star-outline" title="Favori soru yok" desc="Test çözerken yıldız ikonuna dokunarak soruları buraya kaydedebilirsin." />
            </Card>
          ) : (
            favQuestions.slice(0, 5).map((q) => {
              const c = CATEGORY_LIST.find((x) => x.id === q.category);
              return (
                <Card key={q.id} style={{ marginBottom: 8, padding: 13 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: '800', color: c?.color }}>{c?.name}</Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '600', color: theme.text, marginTop: 3, lineHeight: 19 }} numberOfLines={2}>
                        {q.question}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.success, fontWeight: '700', marginTop: 4 }}>
                        Doğru: {q.options[q.answer]}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleFavorite(q.id)} style={{ marginLeft: 8 }}>
                      <Ionicons name="star" size={20} color={theme.gold} />
                    </TouchableOpacity>
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Settings */}
        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Ayarlar" />
          <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('Admin')} activeOpacity={0.8} style={{ marginBottom: 12 }}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={23} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>Yönetici Paneli</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
                  {session ? `${roleLabels[role] ?? 'Üye'} • Soru ve içerik yönetimi` : 'Hesabınla giriş yap • Soru ve içerik yönetimi'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.muted} />
            </Card>
          </TouchableOpacity>
          <Card>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text, marginBottom: 10 }}>Tema</Text>
            <View style={{ flexDirection: 'row' }}>
              {(
                [
                  { id: 'system', label: 'Otomatik' },
                  { id: 'light', label: 'Açık' },
                  { id: 'dark', label: 'Koyu' },
                ] as const
              ).map((t) => {
                const active = themeChoice === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setThemeChoice(t.id)}
                    style={{
                      flex: 1,
                      backgroundColor: active ? theme.text : theme.card2,
                      borderRadius: 10,
                      paddingVertical: 10,
                      alignItems: 'center',
                      marginRight: t.id === 'dark' ? 0 : 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? theme.bg : theme.text }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>
              Şu an: {mode === 'dark' ? 'Koyu' : 'Açık'} tema kullanılıyor
            </Text>

            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 14 }} />
            <TouchableOpacity
              onPress={confirmReset}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}
            >
              <Ionicons name="trash-outline" size={17} color={theme.danger} />
              <Text style={{ color: theme.danger, fontWeight: '800', fontSize: 14, marginLeft: 8 }}>
                Tüm Verileri Sıfırla
              </Text>
            </TouchableOpacity>
          </Card>
          <Text style={{ fontSize: 11.5, color: theme.muted, textAlign: 'center', marginTop: 14 }}>
            KPSS Asistanım • kpssasistani.com • v1.0
          </Text>
        </View>
      </ScrollView>
      <AuthScreen visible={authVisible} onClose={() => setAuthVisible(false)} />
    </SafeAreaView>
  );
}
