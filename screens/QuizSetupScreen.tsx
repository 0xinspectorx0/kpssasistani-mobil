import { useContent } from '../lib/content';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, PrimaryButton, SectionTitle, useResponsiveLayout } from '../components/ui';
import { useAdminAuth } from '../lib/admin-auth';
import { planFor, dailyLimit, todayCount, quotaUserKey, PLAN_META, useQuizQuotaSettings } from '../lib/membership';
import { radius } from '../lib/theme';

const COUNTS = [5, 10, 20];

export default function QuizSetupScreen({ navigation }: any) {
  const { theme } = useApp();
  const { isDesktopWeb, pageMaxWidth, pagePadding } = useResponsiveLayout();
  const { questions: QUESTIONS, lessons: LESSONS } = useContent();
  const { session, role } = useAdminAuth();
  const plan = planFor(role, !!session);
  const { settings: quotaSettings } = useQuizQuotaSettings();
  const [selectionMode, setSelectionMode] = useState<'all' | 'selected'>('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [expandedLessons, setExpandedLessons] = useState<string[]>(() => LESSONS.map((lesson) => lesson.id));
  const [count, setCount] = useState(10);
  const [manualCount, setManualCount] = useState('');
  const [useManualCount, setUseManualCount] = useState(false);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    void todayCount(quotaUserKey(session?.user.id, role)).then(setUsedToday);
  }, [session?.user.id, role]);

  const limit = dailyLimit(plan, quotaSettings);
  const remaining = Number.isFinite(limit) ? Math.max(0, limit - usedToday) : null;
  const questionCount = selectionMode === 'all'
    ? QUESTIONS.length
    : QUESTIONS.filter((question) => question.topicId && selectedTopics.includes(question.topicId)).length;
  const requestedCount = useManualCount ? Number(manualCount) : count;
  const validRequestedCount = Number.isInteger(requestedCount) && requestedCount > 0;
  const effectiveCount = validRequestedCount ? requestedCount : 0;

  const toggleLesson = (lessonId: string) => {
    setExpandedLessons((current) => current.includes(lessonId)
      ? current.filter((id) => id !== lessonId)
      : [...current, lessonId]);
  };

  const toggleTopic = (topicId: string) => {
    if (selectionMode === 'all') {
      setSelectionMode('selected');
      setSelectedTopics([topicId]);
      return;
    }
    setSelectedTopics((current) => current.includes(topicId)
      ? current.filter((id) => id !== topicId)
      : [...current, topicId]);
  };

  const toggleLessonTopics = (topicIds: string[]) => {
    const allSelected = selectionMode === 'selected' && topicIds.every((id) => selectedTopics.includes(id));
    if (selectionMode === 'all') {
      setSelectionMode('selected');
      setSelectedTopics(topicIds);
    } else if (allSelected) {
      setSelectedTopics((current) => current.filter((id) => !topicIds.includes(id)));
    } else {
      setSelectedTopics((current) => Array.from(new Set([...current, ...topicIds])));
    }
  };

  const selectAllTopics = () => {
    setSelectionMode('all');
    setSelectedTopics([]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: pageMaxWidth,
          alignSelf: 'center',
          padding: pagePadding,
          paddingBottom: 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Test Çöz</Text>
        <Text style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
          Konularını seç veya tüm konulardan karışık test çöz
        </Text>

        <Card
          style={{
            marginTop: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 13,
          } as any}
        >
          <Ionicons name={PLAN_META[plan].icon as any} size={22} color={PLAN_META[plan].color} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.text }}>
              {PLAN_META[plan].label} planı
            </Text>
            <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
              {remaining === null ? 'Sınırsız test hakkı' : `Bugün kalan test hakkı: ${remaining} / ${limit}`}
            </Text>
          </View>
          {remaining === 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profil')}
              style={{ backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Üye Ol</Text>
            </TouchableOpacity>
          )}
        </Card>

        <View style={{ marginTop: 18 }}>
          <SectionTitle
            title="Konu Seçimi"
            subtitle={selectionMode === 'all'
              ? `${QUESTIONS.length} sorunun tamamı dahil`
              : `${selectedTopics.length} konu · ${questionCount} soru`}
          />
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ checked: selectionMode === 'all' }}
            onPress={selectAllTopics}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectionMode === 'all' ? theme.accentSoft : theme.card,
              borderColor: selectionMode === 'all' ? theme.accent : theme.border,
              borderWidth: selectionMode === 'all' ? 2 : 1,
              borderRadius: radius.md,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectionMode === 'all' ? theme.accent : theme.card2,
                marginRight: 12,
              }}
            >
              <Ionicons name="layers" size={20} color={selectionMode === 'all' ? '#fff' : theme.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 14 }}>Tüm konular</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>Bütün derslerden karışık test</Text>
            </View>
            {selectionMode === 'all' && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />}
          </TouchableOpacity>

          <View style={isDesktopWeb ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14 } : undefined}>
            {LESSONS.map((lesson) => {
              const expanded = expandedLessons.includes(lesson.id);
              const topicIds = lesson.topics.map((topic) => topic.id);
              const allSelected = selectionMode === 'selected' && topicIds.length > 0 && topicIds.every((id) => selectedTopics.includes(id));
              return (
                <Card
                  key={lesson.id}
                  style={{
                    padding: 0,
                    marginBottom: isDesktopWeb ? 0 : 10,
                    width: isDesktopWeb ? '48.5%' : undefined,
                    overflow: 'hidden',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 13 }}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => toggleLesson(lesson.id)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: `${lesson.color}1A`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Ionicons name={lesson.icon as any} size={20} color={lesson.color} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                          {lesson.name}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 11.5, marginTop: 2 }}>
                          {lesson.topics.length} konu · {QUESTIONS.filter((question) => question.category === lesson.id).length} soru
                        </Text>
                      </View>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`${lesson.name} dersinin tüm konularını ${allSelected ? 'kaldır' : 'seç'}`}
                      onPress={() => toggleLessonTopics(topicIds)}
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 9,
                        paddingVertical: 8,
                        borderRadius: 10,
                        backgroundColor: allSelected ? lesson.color : theme.card2,
                      }}
                    >
                      <Text style={{ color: allSelected ? '#fff' : theme.muted, fontSize: 10.5, fontWeight: '800' }}>
                        {allSelected ? 'Seçili' : 'Tümünü seç'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {expanded && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                      {lesson.topics.map((topic) => {
                        const selected = selectionMode === 'selected' && selectedTopics.includes(topic.id);
                        const topicQuestionCount = QUESTIONS.filter((question) => question.topicId === topic.id).length;
                        return (
                          <TouchableOpacity
                            key={topic.id}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: selected, disabled: topicQuestionCount === 0 }}
                            disabled={topicQuestionCount === 0}
                            onPress={() => toggleTopic(topic.id)}
                            activeOpacity={0.75}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: selected ? `${lesson.color}12` : 'transparent',
                              borderTopWidth: 1,
                              borderTopColor: theme.border,
                              paddingVertical: 10,
                              paddingHorizontal: 2,
                              opacity: topicQuestionCount === 0 ? 0.45 : 1,
                            }}
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 6,
                                borderWidth: 1.5,
                                borderColor: selected ? lesson.color : theme.border,
                                backgroundColor: selected ? lesson.color : 'transparent',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 10,
                              }}
                            >
                              {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={{ flex: 1, color: selected ? theme.text : theme.muted, fontSize: 12.5, fontWeight: selected ? '700' : '500' }}>
                              {topic.name}
                            </Text>
                            <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>
                              {topicQuestionCount} soru
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Soru Sayısı" subtitle={`${questionCount} farklı soru mevcut; gerekirse sorular tekrar eder`} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {COUNTS.map((value) => {
              const active = !useManualCount && count === value;
              return (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => {
                    setCount(value);
                    setUseManualCount(false);
                  }}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: active ? theme.text : theme.card,
                    borderRadius: radius.md,
                    paddingVertical: 13,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: active ? theme.text : theme.border,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '900', color: active ? theme.card : theme.text }}>{value}</Text>
                  <Text style={{ fontSize: 10.5, color: active ? theme.card : theme.muted, marginTop: 2 }}>soru</Text>
                </TouchableOpacity>
              );
            })}
            <View
              style={{
                flex: 1,
                minWidth: 0,
                backgroundColor: useManualCount ? theme.text : theme.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: useManualCount ? theme.text : theme.border,
                paddingHorizontal: 6,
                paddingVertical: 5,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextInput
                accessibilityLabel="Manuel soru sayısı"
                keyboardType="number-pad"
                maxLength={3}
                value={manualCount}
                placeholder="Sayı"
                placeholderTextColor={useManualCount ? theme.card : theme.muted}
                onFocus={() => setUseManualCount(true)}
                onChangeText={(value) => {
                  setManualCount(value.replace(/\D/g, '').slice(0, 3));
                  setUseManualCount(true);
                }}
                style={{ width: '100%', padding: 0, textAlign: 'center', color: useManualCount ? theme.card : theme.text, fontSize: 15, lineHeight: 20, fontWeight: '900' }}
              />
              <Text style={{ fontSize: 10.5, color: useManualCount ? theme.card : theme.muted, marginTop: 2 }}>manuel</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 18, marginBottom: 12 }}>
          <PrimaryButton
            label={questionCount === 0
              ? 'Önce soru bulunan bir konu seç'
              : !validRequestedCount
                ? 'Manuel soru sayısı gir'
                : `Teste Başla (${effectiveCount} soru)`}
            disabled={questionCount === 0 || !validRequestedCount}
            icon="play"
            onPress={() => navigation.navigate('Quiz', {
              mode: selectionMode === 'all' ? 'mixed' : 'topics',
              topicIds: selectionMode === 'selected' ? selectedTopics : undefined,
              count: effectiveCount,
            })}
          />
          <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center', marginTop: 10 }}>
            4 yanlış 1 doğruyu götürür • Süre tutulur • Sonuçlar istatistiklere işlenir
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
