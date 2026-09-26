import { useContent } from '../lib/content';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../lib/store';
import { Card, ProgressBar } from '../components/ui';
import { QuizQuestion, questionOfDay } from '../lib/data';
import { useCategoryList } from '../lib/lesson-catalog';
import { useAdminAuth } from '../lib/admin-auth';
import { planFor, dailyLimit, todayCount, consumeQuiz, quotaUserKey, useQuizQuotaSettings } from '../lib/membership';
import { radius } from '../lib/theme';
import { ContentEntry } from '../lib/content-schema';
import { fetchEntries, readableError, saveEntry, submitReport } from '../lib/content-api';
import { selectBalancedQuestions, selectQuestionsWithReplacement } from '../lib/quiz-selection';
import ContentEditor from '../components/admin/ContentEditor';
import { AdminButton } from '../components/admin/AdminUI';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function quotaLabel(limit: number): string {
  return Number.isFinite(limit) ? `günde ${limit} test` : 'sınırsız test';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizScreen({ navigation, route }: any) {
  const { theme, addQuizResult, toggleFavorite, favorites } = useApp();
  const { questions: QUESTIONS, refreshContent } = useContent();
  const CATEGORY_LIST = useCategoryList();
  const { session, role, canManageContent } = useAdminAuth();
  const plan = planFor(role, !!session);
  const { settings: quotaSettings, loading: quotaSettingsLoading } = useQuizQuotaSettings();
  const quotaLimit = dailyLimit(plan, quotaSettings);
  const { mode = 'mixed', categoryId, count = 10, reviewIds, topicIds } = route?.params ?? {};

  // Freeze the published question set at test start; background refresh must not alter answers.
  const [questions] = useState<QuizQuestion[]>(() => {
    if (mode === 'qod') { const daily = questionOfDay(QUESTIONS); return daily ? [daily] : []; }
    if (mode === 'favorites') {
      const favs = QUESTIONS.filter((q) => favorites.includes(q.id));
      return shuffle(favs).slice(0, Math.max(1, Math.min(count, favs.length)));
    }
    if (mode === 'review' && Array.isArray(reviewIds)) {
      return QUESTIONS.filter((q) => reviewIds.includes(q.id));
    }
    if (mode === 'topics' && Array.isArray(topicIds)) {
      return selectBalancedQuestions(QUESTIONS, topicIds, count);
    }
    const pool = mode === 'category' && categoryId ? QUESTIONS.filter((q) => q.category === categoryId) : QUESTIONS;
    const poolTopicIds = Array.from(new Set(pool.flatMap((question) => question.topicId ? [question.topicId] : [])));
    return poolTopicIds.length > 0
      ? selectBalancedQuestions(pool, poolTopicIds, count)
      : selectQuestionsWithReplacement(pool, count);
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [quotaCheckLoading, setQuotaCheckLoading] = useState(mode !== 'qod');
  const timer = useRef<any>(null);

  // Admin: soru üzerinde düzenleme (inline editor)
  const [editing, setEditing] = useState<ContentEntry | null>(null);
  const [adminEntries, setAdminEntries] = useState<ContentEntry[]>([]);
  // Herkes: hatalı soru bildirimi
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState('');

  const quotaExempt = mode === 'qod';

  useEffect(() => {
    if (quotaExempt) {
      setQuotaCheckLoading(false);
      return;
    }
    if (quotaSettingsLoading) {
      setQuotaCheckLoading(true);
      return;
    }
    let active = true;
    setQuotaCheckLoading(true);
    (async () => {
      const userKey = quotaUserKey(session?.user.id, role);
      const used = await todayCount(userKey);
      if (!active) return;
      setQuotaBlocked(Number.isFinite(quotaLimit) && used >= quotaLimit);
      setQuotaCheckLoading(false);
    })();
    return () => { active = false; };
  }, [session?.user.id, role, plan, quotaExempt, quotaSettingsLoading, quotaLimit]);

  useEffect(() => {
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, []);

  if (!quotaExempt && (quotaSettingsLoading || quotaCheckLoading)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={{ color: theme.muted, marginTop: 12 }}>Günlük test hakkın kontrol ediliyor…</Text>
      </SafeAreaView>
    );
  }

  if (quotaBlocked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: theme.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Ionicons name="lock-closed" size={38} color={theme.accent} />
        </View>
        <Text style={{ color: theme.text, fontWeight: '900', fontSize: 20, textAlign: 'center' }}>
          Günlük test hakkın doldu
        </Text>
        <Text style={{ color: theme.muted, textAlign: 'center', lineHeight: 21, marginTop: 10 }}>
          {plan === 'guest'
            ? `Misafir planındaki ${quotaLabel(quotaLimit)} hakkın doldu. Üye planında ${quotaLabel(dailyLimit('uye', quotaSettings))}, VIP planında ${quotaLabel(dailyLimit('vip', quotaSettings))} hakkın var.`
            : plan === 'uye'
              ? `Üye planındaki ${quotaLabel(quotaLimit)} hakkın doldu. VIP planında ${quotaLabel(dailyLimit('vip', quotaSettings))} hakkın var.`
              : `VIP planındaki ${quotaLabel(quotaLimit)} hakkın doldu.`}
        </Text>
        <View style={{ marginTop: 22, width: '100%', maxWidth: 320, gap: 10 }}>
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
              navigation.navigate('Main', { screen: 'Profil' });
            }}
            style={{
              backgroundColor: theme.accent,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Üye Ol / Hesabıma Git</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: theme.card,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="star-outline" size={48} color={theme.muted} />
        <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
          Bu test için soru bulunamadı
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16, backgroundColor: theme.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const q = questions[index];
  const cat = CATEGORY_LIST.find((c) => c.id === q.category);
  const selected = answers[index];
  const fav = favorites.includes(q.id);

  const correctCount = answers.filter((a, i) => a !== null && a === questions[i].answer).length;
  const wrongCount = answers.filter((a, i) => a !== null && a !== questions[i].answer).length;

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const pick = (i: number) => {
    if (locked) return;
    const next = [...answers];
    next[index] = i;
    setAnswers(next);
    setLocked(true);
    if (i === q.answer) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const finish = () => {
    clearInterval(timer.current);
    if (!quotaExempt) {
      void consumeQuiz(quotaUserKey(session?.user.id, role), plan, quotaSettings).catch(() => {});
    }
    const total = questions.length;
    const correct = answers.filter((a, i) => a !== null && a === questions[i].answer).length;
    const label = mode === 'qod'
      ? 'Günün Sorusu'
      : mode === 'favorites'
        ? 'Favoriler'
        : mode === 'topics'
          ? 'Seçilen Konular'
          : mode === 'category'
            ? cat?.name ?? 'Test'
            : 'Karışık Test';
    addQuizResult({
      category: label,
      categoryId: (mode === 'category' ? (categoryId as string) : 'mixed') ?? 'mixed',
      total,
      correct,
      seconds,
    });
    const wrongIds = questions.filter((qq, i) => answers[i] !== null && answers[i] !== qq.answer).map((qq) => qq.id);
    navigation.replace('QuizResult', {
      total,
      correct,
      seconds,
      category: label,
      mode,
      categoryId,
      topicIds,
      wrongIds,
    });
  };

  const tryExit = () => setShowExit(true);
  const confirmExit = () => {
    clearInterval(timer.current);
    setShowExit(false);
    navigation.goBack();
  };

  // Admin: soruyu yerinde düzenle (yayındaki kaydı bul veya yeni olarak aç).
  const openEditor = async () => {
    if (!canManageContent) return;
    try {
      const rows = await fetchEntries();
      setAdminEntries(rows);
      const found = rows.find((r) => r.kind === 'questions' && r.id === q.id);
      if (found) setEditing(found);
      else
        setEditing({
          kind: 'questions',
          id: q.id,
          payload: { ...(q as any) },
          status: 'published',
        } as ContentEntry);
    } catch (e) {
      Alert.alert('Düzenlenemedi', readableError(e));
    }
  };
  const saveEdit = async (entry: ContentEntry, isNew: boolean) => {
    await saveEntry(entry, isNew);
    setEditing(null);
    await refreshContent();
  };
  const submitReportNow = async () => {
    if (reportBusy) return;
    setReportBusy(true);
    setReportError('');
    try {
      await submitReport(q.id, reportReason);
      setReportDone(true);
      setTimeout(() => setReportOpen(false), 1200);
    } catch (e) {
      setReportError(readableError(e));
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Testten çık"
            onPress={tryExit}
            style={{ minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: theme.border }}>
            <Ionicons name="time-outline" size={14} color={theme.accent} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text, marginLeft: 5 }}>
              {mm}:{ss}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleFavorite(q.id)}>
            <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color={fav ? theme.gold : theme.muted} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.muted }}>
            Soru {index + 1} / {questions.length}
          </Text>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: theme.muted }}>
            ✓ {correctCount}  •  ✗ {wrongCount}
          </Text>
        </View>
        <ProgressBar progress={(index + 1) / questions.length} height={8} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Question dots */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            {questions.map((qq, i) => {
              const a = answers[i];
              const bg = i === index ? theme.accent : a === null ? theme.card : a === qq.answer ? theme.success : theme.danger;
              return (
                <TouchableOpacity
                  key={qq.id}
                  onPress={() => {
                    setIndex(i);
                    setLocked(answers[i] !== null);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: i === index ? theme.accent : a === null ? theme.border : bg,
                  }}
                >
                  <Text style={{ color: i === index || a !== null ? '#fff' : theme.text, fontWeight: '800', fontSize: 13 }}>
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ backgroundColor: (cat?.color ?? theme.accent) + '1A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: cat?.color ?? theme.accent }}>
                {cat?.name} • {q.difficulty}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {canManageContent && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Soruyu düzenle"
                  onPress={openEditor}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: theme.accentSoft,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Ionicons name="create-outline" size={14} color={theme.accent} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.accent }}>Düzenle</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Hatalı soruyu bildir"
                onPress={() => {
                  setReportDone(false);
                  setReportReason('');
                  setReportError('');
                  setReportOpen(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: theme.card2,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons name="flag-outline" size={14} color={theme.muted} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.muted }}>Bildir</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: 16.5, fontWeight: '700', color: theme.text, lineHeight: 24 }}>
            {q.question}
          </Text>
        </Card>

        <View style={{ marginTop: 12 }}>
          {q.options.map((opt, i) => {
            const isAnswer = i === q.answer;
            const isSelected = selected === i;
            let bg = theme.card;
            let border = theme.border;
            let textColor = theme.text;
            if (locked) {
              if (isAnswer) {
                bg = theme.successSoft;
                border = theme.success;
                textColor = theme.text;
              } else if (isSelected) {
                bg = theme.dangerSoft;
                border = theme.danger;
              }
            } else if (isSelected) {
              border = theme.accent;
            }
            return (
              <TouchableOpacity key={i} onPress={() => pick(i)} disabled={locked} activeOpacity={0.7}>
                <View
                  style={{
                    backgroundColor: bg,
                    borderRadius: radius.md,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: locked && (isAnswer || isSelected) ? 2 : 1.5,
                    borderColor: border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: locked && isAnswer ? theme.success : locked && isSelected ? theme.danger : theme.card2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      borderWidth: 1,
                      borderColor: locked && (isAnswer || isSelected) ? 'transparent' : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '900',
                        fontSize: 13,
                        color: locked && (isAnswer || isSelected) ? '#fff' : theme.muted,
                      }}
                    >
                      {LETTERS[i]}
                    </Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 14.5, fontWeight: '600', color: textColor, lineHeight: 21 }}>
                    {opt}
                  </Text>
                  {locked && isAnswer ? <Ionicons name="checkmark-circle" size={22} color={theme.success} /> : null}
                  {locked && isSelected && !isAnswer ? <Ionicons name="close-circle" size={22} color={theme.danger} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {locked ? (
          <Card style={{ marginTop: 4, backgroundColor: theme.card2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="bulb" size={18} color={theme.gold} />
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text, marginLeft: 6 }}>Açıklama</Text>
            </View>
            <Text style={{ fontSize: 13.5, color: theme.text, lineHeight: 20 }}>{q.explanation}</Text>
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', marginTop: 16 }}>
          <TouchableOpacity
            disabled={index === 0}
            onPress={() => {
              setIndex(index - 1);
              setLocked(answers[index - 1] !== null);
            }}
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              opacity: index === 0 ? 0.4 : 1,
              marginRight: 10,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
            <Text style={{ fontWeight: '800', color: theme.text, marginLeft: 2 }}>Önceki</Text>
          </TouchableOpacity>
          {index < questions.length - 1 ? (
            <TouchableOpacity
              onPress={() => {
                setIndex(index + 1);
                setLocked(answers[index + 1] !== null);
              }}
              style={{
                flex: 2,
                backgroundColor: theme.text,
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontWeight: '800', color: theme.bg }}>Sonraki Soru</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.bg} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={finish}
              style={{
                flex: 2,
                backgroundColor: theme.success,
                borderRadius: radius.md,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="flag" size={18} color="#fff" />
              <Text style={{ fontWeight: '800', color: '#fff', marginLeft: 6 }}>Testi Bitir</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={showExit} onRequestClose={() => setShowExit(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#02061799',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 22,
          }}
        >
          <View
            role="dialog"
            accessibilityLabel="Testten çıkış onayı"
            accessibilityViewIsModal
            style={{ width: '100%', maxWidth: 420, borderRadius: 20, backgroundColor: theme.card, padding: 24 }}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: theme.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="exit-outline" size={26} color={theme.danger} />
              </View>
            </View>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
              Testten çıkılsın mı?
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 }}>
              Bu testteki ilerlemen kaydedilmeyecek.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setShowExit(false)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, backgroundColor: theme.card2, borderWidth: 1, borderColor: theme.border }}
              >
                <Text style={{ color: theme.text, fontWeight: '800' }}>Teste devam et</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={confirmExit}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 13, backgroundColor: theme.danger }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Testten çık</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin: soruyu yerinde düzenle */}
      {editing && (
        <ContentEditor
          entry={editing}
          isNew={!adminEntries.some((r) => r.kind === 'questions' && r.id === editing.id)}
          previewOnly={false}
          entries={adminEntries}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
        />
      )}

      {/* Herkes: hatalı soru bildirimi */}
      <Modal transparent animationType="fade" visible={reportOpen} onRequestClose={() => setReportOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: '#02061799',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 22,
          }}
        >
          <View
            role="dialog"
            accessibilityLabel="Hatalı soruyu bildir"
            accessibilityViewIsModal
            style={{ width: '100%', maxWidth: 440, borderRadius: 20, backgroundColor: theme.card, padding: 24 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Ionicons name="flag" size={22} color={theme.gold} />
              <Text style={{ color: theme.text, fontWeight: '900', fontSize: 19 }}>Hatalı soruyu bildir</Text>
            </View>
            {reportDone ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <Ionicons name="checkmark-circle" size={46} color={theme.success} />
                <Text style={{ color: theme.text, fontWeight: '800', textAlign: 'center' }}>
                  Bildiriminiz alındı. Teşekkürler!
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>
                  Yönetici bildiriminizi inceleyip soruyu düzeltecek.
                </Text>
              </View>
            ) : (
              <>
                <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 }}>
                  Soruda bir hata olduğunu düşünüyorsanız kısa bir açıklama ekleyin. Bildiriminiz yöneticiye iletilir.
                </Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Neyin hatalı olduğunu kısaca yazın (isteğe bağlı)"
                  placeholderTextColor={theme.muted}
                  multiline
                  style={{
                    color: theme.text,
                    backgroundColor: theme.card2,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 84,
                    textAlignVertical: 'top',
                    marginBottom: 8,
                  }}
                />
                {!!reportError && (
                  <Text style={{ color: theme.danger, fontSize: 12.5, marginBottom: 8 }}>{reportError}</Text>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <AdminButton label="Vazgeç" secondary onPress={() => setReportOpen(false)} disabled={reportBusy} />
                  <AdminButton
                    label="Gönder"
                    icon="send"
                    busy={reportBusy}
                    onPress={submitReportNow}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
