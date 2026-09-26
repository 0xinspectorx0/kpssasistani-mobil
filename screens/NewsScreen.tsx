import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, Chip, EmptyState, useResponsiveLayout } from '../components/ui';
import { NewsCategory } from '../lib/data';

const FILTERS: ('Tümü' | NewsCategory)[] = ['Tümü', 'Spor', 'Kültür-Sanat', 'Bilim', 'Kurumlar', 'Klasikler'];

const CAT_COLORS: Record<string, string> = {
  'Spor': '#059669',
  'Kültür-Sanat': '#7C3AED',
  'Bilim': '#2563EB',
  'Kurumlar': '#D7263D',
  'Klasikler': '#B45309',
};

export default function NewsScreen({ navigation }: any) {
  const { theme } = useApp();
  const { isDesktopWeb, pageMaxWidth, pagePadding } = useResponsiveLayout();
  const { news: NEWS } = useContent();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Tümü');
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const list = NEWS.filter(
    (n) =>
      (filter === 'Tümü' || n.category === filter) &&
      (query === '' ||
        n.title.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')) ||
        n.detail.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <View
        style={{
          width: '100%',
          maxWidth: pageMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: pagePadding,
          paddingTop: isDesktopWeb ? 24 : 8,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Güncel Bilgiler</Text>
        <Text style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
          2024–2026 gündemi ve sınav klasikleri • {NEWS.length} kart
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            paddingHorizontal: 12,
            marginTop: 12,
          }}
        >
          <Ionicons name="search" size={18} color={theme.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ara... (örn. Nobel, 2026, UNESCO)"
            placeholderTextColor={theme.muted}
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, color: theme.text, fontSize: 14 }}
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={{ marginTop: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', paddingVertical: 2 }}>
              {FILTERS.map((f) => (
                <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
      <FlatList
        key={isDesktopWeb ? 'web-grid' : 'mobile-list'}
        data={list}
        numColumns={isDesktopWeb ? 2 : 1}
        columnWrapperStyle={isDesktopWeb ? { gap: 16 } : undefined}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          width: '100%',
          maxWidth: pageMaxWidth,
          alignSelf: 'center',
          padding: pagePadding,
          paddingTop: 12,
          paddingBottom: 36,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Quiz', { mode: 'category', categoryId: 'guncel' })}
            activeOpacity={0.85}
            style={{
              backgroundColor: theme.text,
              borderRadius: 14,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="help-circle" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.bg, fontWeight: '800', fontSize: 14.5 }}>Güncel Bilgiler Testi Çöz</Text>
              <Text style={{ color: theme.bg, opacity: 0.7, fontSize: 12, marginTop: 2 }}>Öğrendiklerini test et</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.bg} />
          </TouchableOpacity>
        }
        renderItem={({ item }) => {
          const color = CAT_COLORS[item.category] ?? theme.accent;
          const open = expandedId === item.id;
          return (
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setExpandedId(open ? null : item.id)}
              activeOpacity={0.8}
            >
              <Card style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ backgroundColor: color + '1A', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '800', color: color }}>{item.category}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={13} color={theme.muted} />
                    <Text style={{ fontSize: 11.5, color: theme.muted, fontWeight: '700', marginLeft: 4 }}>{item.date}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text, lineHeight: 21 }}>
                  {item.title}
                </Text>
                {open ? (
                  <Text style={{ fontSize: 13.5, color: theme.muted, lineHeight: 20, marginTop: 8 }}>
                    {item.detail}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12.5, color: theme.accent, fontWeight: '700', marginTop: 8 }}>
                    Detay için dokun ›
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="newspaper-outline" title="Sonuç bulunamadı" desc="Farklı bir anahtar kelime veya filtre dene." />
        }
      />
    </SafeAreaView>
  );
}
