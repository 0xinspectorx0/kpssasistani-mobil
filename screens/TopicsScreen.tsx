import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, Chip, EmptyState, SectionTitle } from '../components/ui';


export default function TopicsScreen({ navigation }: any) {
  const { theme, completedTopics, toggleTopic } = useApp();
  const { lessons: LESSONS } = useContent();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>('turkce');

  const filtered = LESSONS.map((l) => ({
    ...l,
    topics: l.topics.filter((t) => t.name.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))),
  })).filter((l) => l.topics.length > 0 || query === '');

  const total = LESSONS.reduce((s, l) => s + l.topics.length, 0);
  const topicIds = new Set(LESSONS.flatMap(l => l.topics.map(t => t.id)));
  const done = completedTopics.filter(id => topicIds.has(id)).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Konu Takibi</Text>
            <Text style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
              Bitirdiğin konuları işaretle, ilerlemeni gör
            </Text>
            <Card style={{ marginTop: 12, marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>Genel ilerleme</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginTop: 2 }}>
                    {done} / {total} konu
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: theme.accent }}>
                    %{total ? Math.round((done / total) * 100) : 0}
                  </Text>
                </View>
              </View>
              <View style={{ height: 10, borderRadius: 5, backgroundColor: theme.border, marginTop: 10, overflow: 'hidden' }}>
                <View style={{ width: `${(done / Math.max(1, total)) * 100}%`, height: '100%', backgroundColor: theme.accent, borderRadius: 5 }} />
              </View>
            </Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 12,
                marginTop: 10,
                marginBottom: 6,
              }}
            >
              <Ionicons name="search" size={18} color={theme.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Konu ara... (örn. paragraf, EBOB)"
                placeholderTextColor={theme.muted}
                style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: theme.text, fontSize: 14 }}
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={theme.muted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const lessonDone = item.topics.filter((t) => completedTopics.includes(t.id)).length;
          const isOpen = expanded === item.id;
          return (
            <Card style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
              <TouchableOpacity
                onPress={() => setExpanded(isOpen ? null : item.id)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: item.color + '1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={item.icon as any} size={21} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{item.name}</Text>
                  <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                    {item.questions} • {lessonDone}/{item.topics.length} tamamlandı
                  </Text>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.border, marginTop: 6, overflow: 'hidden' }}>
                    <View
                      style={{
                        width: `${item.topics.length ? (lessonDone / item.topics.length) * 100 : 0}%`,
                        height: '100%',
                        backgroundColor: item.color,
                      }}
                    />
                  </View>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} />
              </TouchableOpacity>
              {isOpen ? (
                <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                  {item.topics.map((t) => {
                    const checked = completedTopics.includes(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => toggleTopic(t.id)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: checked ? theme.success : 'transparent',
                            borderWidth: 2,
                            borderColor: checked ? theme.success : theme.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 10,
                          }}
                        >
                          {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                        </View>
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 14,
                            fontWeight: '600',
                            color: checked ? theme.muted : theme.text,
                            textDecorationLine: checked ? 'line-through' : 'none',
                          }}
                        >
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => (navigation as any).navigate('Quiz', { mode: 'category', categoryId: item.id })}
                    style={{
                      marginTop: 6,
                      backgroundColor: item.color + '14',
                      borderRadius: 10,
                      paddingVertical: 11,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="play" size={15} color={item.color} />
                    <Text style={{ color: item.color, fontWeight: '800', fontSize: 13.5, marginLeft: 6 }}>
                      {item.name} Testi Çöz
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </Card>
          );
        }}
        ListEmptyComponent={<EmptyState icon="search" title="Sonuç bulunamadı" desc="Farklı bir anahtar kelime dene." />}
      />
    </SafeAreaView>
  );
}
