import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../lib/store';
import { Card, ProgressBar } from '../components/ui';
import { CATEGORY_LIST, QUESTIONS, QuizQuestion, questionOfDay } from '../lib/data';
import { radius } from '../lib/theme';

const LETTERS = ['A', 'B', 'C', 'D'];

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
  const { mode = 'mixed', categoryId, count = 10, reviewIds } = route?.params ?? {};

  const questions: QuizQuestion[] = useMemo(() => {
    if (mode === 'qod') return [questionOfDay()];
    if (mode === 'favorites') {
      const favs = QUESTIONS.filter((q) => favorites.includes(q.id));
      return shuffle(favs).slice(0, Math.max(1, Math.min(count, favs.length)));
    }
    if (mode === 'review' && Array.isArray(reviewIds)) {
      return QUESTIONS.filter((q) => reviewIds.includes(q.id));
    }
    const pool = mode === 'category' && categoryId ? QUESTIONS.filter((q) => q.category === categoryId) : QUESTIONS;
    return shuffle(pool).slice(0, Math.min(count, pool.length));
  }, []);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer.current);
  }, []);

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
    const total = questions.length;
    const correct = answers.filter((a, i) => a !== null && a === questions[i].answer).length;
    const label = mode === 'qod' ? 'Günün Sorusu' : mode === 'favorites' ? 'Favoriler' : mode === 'category' ? cat?.name ?? 'Test' : 'Karışık Test';
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
      wrongIds,
    });
  };

  const tryExit = () => {
    Alert.alert('Testten çıkılsın mı?', 'İlerlemen kaydedilmeyecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity onPress={tryExit} style={{ flexDirection: 'row', alignItems: 'center' }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ backgroundColor: (cat?.color ?? theme.accent) + '1A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: cat?.color ?? theme.accent }}>
                {cat?.name} • {q.difficulty}
              </Text>
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
    </SafeAreaView>
  );
}
