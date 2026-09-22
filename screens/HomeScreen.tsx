import { useContent } from '../lib/content';
import React, { useMemo } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../lib/store';
import { Card, PrimaryButton, SectionTitle, StatTile } from '../components/ui';
import { CATEGORY_LIST, daysUntil, formatDateTR, questionOfDay } from '../lib/data';
import { Notice } from '../components/admin/AdminUI';
import { radius } from '../lib/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export default function HomeScreen({ navigation }: any) {
  const { theme, name, targetExamId, streak, totalQuestions, accuracy, completedTopics, history } = useApp();
  const { lessons: LESSONS, events: EXAM_EVENTS, targets: TARGET_EXAMS, quotes: QUOTES, questions: QUESTIONS, refreshContent, syncError, source } = useContent();
  const [refreshing, setRefreshing] = React.useState(false);

  const target = useMemo(() => {
    if (targetExamId) return TARGET_EXAMS.find((t) => t.id === targetExamId) ?? TARGET_EXAMS[0];
    // default: nearest upcoming event
    const upcoming = EXAM_EVENTS.filter((e) => daysUntil(e.endDate ?? e.date) >= 0).sort(
      (a, b) => daysUntil(a.date) - daysUntil(b.date)
    );
    const ev = upcoming.find((e) => e.type === 'sinav') ?? upcoming[0];
    const match = TARGET_EXAMS.find((t) => t.eventId === ev?.id);
    return match ?? TARGET_EXAMS[0];
  }, [targetExamId, TARGET_EXAMS, EXAM_EVENTS]);

  const targetEvent = EXAM_EVENTS.find((e) => e.id === target?.eventId);
  const remain = targetEvent ? daysUntil(targetEvent.date) : 0;

  const qod = questionOfDay(QUESTIONS);
  const qodCat = CATEGORY_LIST.find((c) => c.id === qod?.category);
  const quote = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return QUOTES[day % QUOTES.length];
  }, [QUOTES]);

  const totalTopics = LESSONS.reduce((s, l) => s + l.topics.length, 0);
  const topicIds = new Set(LESSONS.flatMap(l => l.topics.map(t => t.id)));
  const topicPct = totalTopics > 0 ? Math.round((completedTopics.filter(id => topicIds.has(id)).length / totalTopics) * 100) : 0;

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refreshContent(); } finally { setRefreshing(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {syncError && <Notice error text={`İçerik güncellenemedi. ${source === 'cache' ? 'Varsa son indirilen içerikler gösteriliyor. ' : ''}${syncError} Yenilemek için aşağı çekin veya aşağıdaki düğmeyi kullanın.`} />}
        {syncError && <TouchableOpacity accessibilityRole="button" accessibilityLabel="İçerikleri yeniden yükle" disabled={refreshing} onPress={onRefresh} style={{ padding: 12, marginBottom: 12, alignSelf: 'flex-start' }}>
          <Text style={{ color: theme.accent, fontWeight: '800' }}>{refreshing ? 'Yükleniyor…' : 'İçerikleri yeniden yükle'}</Text>
        </TouchableOpacity>}
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>
              {greeting()}{name ? `, ${name.split(' ')[0]}` : ''} 👋
            </Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text, marginTop: 2 }}>
              KPSS Asistanım
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profil')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={20} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Countdown hero */}
        <LinearGradient
          colors={[theme.hero1, theme.hero2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: radius.xl, padding: 18, marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="timer-outline" size={15} color="#fff" style={{ opacity: 0.9 }} />
                <Text style={{ color: '#fff', opacity: 0.9, fontSize: 12.5, fontWeight: '700', marginLeft: 6 }}>
                  {target?.name ?? 'Hedef sınav eklenmedi'} • {targetEvent ? formatDateTR(targetEvent.date) : ''}
                </Text>
              </View>
              <Text style={{ color: '#fff', fontSize: 44, fontWeight: '900', marginTop: 4 }}>
                {targetEvent ? (remain >= 0 ? remain : 0) : '—'}
                <Text style={{ fontSize: 18, fontWeight: '700' }}> gün kaldı</Text>
              </Text>
              <Text style={{ color: '#fff', opacity: 0.85, fontSize: 12.5, marginTop: 2 }}>
                Puan türü: {target?.scoreType ?? '—'} • Her gün düzenli tekrar yap
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Testler')}
              style={{
                flex: 1,
                backgroundColor: '#fff',
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                marginRight: 8,
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="play" size={16} color={theme.hero1} />
              <Text style={{ color: theme.hero1, fontWeight: '800', fontSize: 14, marginLeft: 6 }}>
                Hemen Test Çöz
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Araçlar')}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: radius.md,
                paddingVertical: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.4)',
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, marginLeft: 6 }}>Sınav Takvimi</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          <StatTile icon="flame" iconColor="#EA580C" value={String(streak)} label="Günlük seri" />
          <View style={{ width: 10 }} />
          <StatTile icon="checkmark-done" iconColor={theme.success} value={String(totalQuestions)} label="Çözülen soru" />
          <View style={{ width: 10 }} />
          <StatTile icon="trophy" iconColor={theme.gold} value={`%${accuracy}`} label="Başarı oranı" />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <StatTile
            icon="book"
            iconColor="#2563EB"
            value={`%${topicPct}`}
            label="Konu tamamlama"
          />
          <View style={{ width: 10 }} />
          <StatTile
            icon="document-text"
            iconColor="#7C3AED"
            value={String(history.length)}
            label="Tamamlanan test"
          />
          <View style={{ width: 10 }} />
          <StatTile icon="star" iconColor={theme.accent} value={target?.scoreType ?? '—'} label="Hedef puan türü" />
        </View>

        {/* Question of the day */}
        {qod && <View style={{ marginTop: 16 }}>
          <SectionTitle title="Günün Sorusu" subtitle="Her gün yeni bir KPSS sorusu" />
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: (qodCat?.color ?? theme.accent) + '1A',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons name={(qodCat?.icon ?? 'help') as any} size={13} color={qodCat?.color ?? theme.accent} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: qodCat?.color ?? theme.accent, marginLeft: 5 }}>
                  {qodCat?.name} • {qod.difficulty}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text, lineHeight: 22 }}>
              {qod.question}
            </Text>
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label="Soruyu Çöz"
                icon="arrow-forward"
                onPress={() => navigation.navigate('Quiz', { mode: 'qod' })}
              />
            </View>
          </Card>
        </View>}

        {/* Quick categories */}
        <View style={{ marginTop: 16 }}>
          <SectionTitle
            title="Dersler"
            subtitle="Test çözmek için bir ders seç"
            right={
              <TouchableOpacity onPress={() => navigation.navigate('Testler')}>
                <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 13 }}>Tümü ›</Text>
              </TouchableOpacity>
            }
          />
          <FlatList
            data={CATEGORY_LIST}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingVertical: 2 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Quiz', { mode: 'category', categoryId: item.id })}
                activeOpacity={0.8}
                style={{
                  width: 128,
                  backgroundColor: theme.card,
                  borderRadius: radius.lg,
                  padding: 14,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: item.color + '1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{item.name}</Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3 }} numberOfLines={2}>
                  {item.desc}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Quote */}
        <View style={{ marginTop: 16 }}>
          <Card style={{ backgroundColor: theme.card }}>
            <View style={{ flexDirection: 'row' }}>
              <Ionicons name="chatbubble-ellipses" size={22} color={theme.gold} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14.5, color: theme.text, lineHeight: 22, fontStyle: 'italic' }}>
                  "{quote?.text ?? 'Her gün bir adım daha ileri.'}"
                </Text>
                <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 6, fontWeight: '600' }}>
                  — {quote?.author ?? 'KPSS Asistanım'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={{ marginTop: 16 }}>
          <SectionTitle title="Hızlı Erişim" />
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={{ flex: 1, marginRight: 8 }}
              onPress={() => navigation.navigate('Quiz', { mode: 'mixed' })}
              activeOpacity={0.8}
            >
              <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
                <Ionicons name="shuffle" size={24} color={theme.accent} />
                <Text style={{ fontWeight: '800', color: theme.text, marginTop: 8, fontSize: 13 }}>Karışık Test</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, marginRight: 8 }}
              onPress={() => navigation.navigate('Güncel')}
              activeOpacity={0.8}
            >
              <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
                <Ionicons name="newspaper" size={24} color="#EA580C" />
                <Text style={{ fontWeight: '800', color: theme.text, marginTop: 8, fontSize: 13 }}>Güncel Bilgiler</Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => navigation.navigate('Konular')}
              activeOpacity={0.8}
            >
              <Card style={{ alignItems: 'center', paddingVertical: 18 }}>
                <Ionicons name="list" size={24} color={theme.success} />
                <Text style={{ fontWeight: '800', color: theme.text, marginTop: 8, fontSize: 13 }}>Konu Takibi</Text>
              </Card>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
