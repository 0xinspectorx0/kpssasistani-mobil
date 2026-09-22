import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, PrimaryButton, SectionTitle } from '../components/ui';
import { CATEGORY_LIST } from '../lib/data';
import { radius } from '../lib/theme';

const COUNTS = [5, 10, 20];

export default function QuizSetupScreen({ navigation, route }: any) {
  const { theme } = useApp();
  const { questions: QUESTIONS } = useContent();
  const [selectedCat, setSelectedCat] = useState<string>(route?.params?.categoryId ?? 'mixed');
  const [count, setCount] = useState(10);

  const cats = [{ id: 'mixed', name: 'Karışık Test', icon: 'shuffle', color: theme.accent, desc: 'Tüm derslerden karma sorular' } as any, ...CATEGORY_LIST];

  const questionCount = selectedCat === 'mixed'
    ? QUESTIONS.length
    : QUESTIONS.filter((q) => q.category === selectedCat).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Test Çöz</Text>
            <Text style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
              Dersini ve soru sayısını seç, hemen başla
            </Text>

            <View style={{ marginTop: 16 }}>
              <SectionTitle title="Ders Seç" subtitle={`${cats.length} seçenek`} />
              {cats.map((c: any) => {
                const active = selectedCat === c.id;
                const n = c.id === 'mixed' ? QUESTIONS.length : QUESTIONS.filter((q) => q.category === c.id).length;
                return (
                  <TouchableOpacity key={c.id} onPress={() => setSelectedCat(c.id)} activeOpacity={0.8}>
                    <Card
                      style={{
                        marginBottom: 10,
                        borderColor: active ? c.color : theme.border,
                        borderWidth: active ? 2 : 1,
                        padding: 14,
                        flexDirection: 'row',
                        alignItems: 'center',
                      } as any}
                    >
                      <View
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: c.color + '1A',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name={c.icon as any} size={22} color={c.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{c.name}</Text>
                        <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                          {c.desc} • {n} soru
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: active ? c.color : 'transparent',
                          borderWidth: 2,
                          borderColor: active ? c.color : theme.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {active ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ marginTop: 8 }}>
              <SectionTitle title="Soru Sayısı" subtitle={`Bu derste ${questionCount} soru var`} />
              <View style={{ flexDirection: 'row' }}>
                {COUNTS.map((c) => {
                  const active = count === c;
                  const disabled = c > questionCount;
                  return (
                    <TouchableOpacity
                      key={c}
                      disabled={disabled}
                      onPress={() => setCount(c)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        backgroundColor: active ? theme.text : theme.card,
                        borderRadius: radius.md,
                        paddingVertical: 14,
                        alignItems: 'center',
                        marginRight: c === 20 ? 0 : 10,
                        borderWidth: 1,
                        borderColor: active ? theme.text : theme.border,
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: '900', color: active ? theme.card : theme.text }}>
                        {c}
                      </Text>
                      <Text style={{ fontSize: 11, color: active ? theme.card : theme.muted, marginTop: 2 }}>soru</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ marginTop: 18, marginBottom: 12 }}>
              <PrimaryButton
                label={questionCount ? `Teste Başla (${Math.min(count, questionCount)} soru)` : "Henüz yayında soru yok"}
                disabled={questionCount === 0}
                icon="play"
                onPress={() =>
                  navigation.navigate('Quiz', {
                    mode: selectedCat === 'mixed' ? 'mixed' : 'category',
                    categoryId: selectedCat === 'mixed' ? undefined : selectedCat,
                    count: Math.min(count, questionCount),
                  })
                }
              />
              <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center', marginTop: 10 }}>
                4 yanlış 1 doğruyu götürür • Süre tutulur • Sonuçlar istatistiklere işlenir
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}
