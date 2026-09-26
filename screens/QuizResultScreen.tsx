import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, PrimaryButton, ProgressBar, StatTile } from '../components/ui';
import { radius } from '../lib/theme';

export default function QuizResultScreen({ navigation, route }: any) {
  const { theme } = useApp();
  const { total, correct, seconds, category, mode, categoryId, topicIds, wrongIds = [] } = route.params;
  const wrong = total - correct;
  const net = correct - wrong / 4;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const verdict = pct >= 80 ? { icon: 'trophy', color: theme.gold, text: 'Muhteşemsin! Sınava hazırsın.' }
    : pct >= 60 ? { icon: 'medal', color: theme.success, text: 'Güzel gidiyorsun, devam et!' }
    : pct >= 40 ? { icon: 'trending-up', color: theme.warning, text: 'İyi bir başlangıç. Tekrar yapmayı unutma.' }
    : { icon: 'book', color: theme.accent, text: 'Pes etme! Konu çalışıp tekrar dene.' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 46,
              backgroundColor: verdict.color + '1A',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Ionicons name={verdict.icon as any} size={44} color={verdict.color} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>{category} Tamamlandı</Text>
          <Text style={{ fontSize: 13.5, color: theme.muted, marginTop: 6, textAlign: 'center' }}>
            {verdict.text}
          </Text>
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>Başarı Oranı</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.accent }}>%{pct}</Text>
          </View>
          <ProgressBar progress={correct / Math.max(1, total)} height={12} />
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.successSoft, borderRadius: radius.md, paddingVertical: 12, marginRight: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.success }}>{correct}</Text>
              <Text style={{ fontSize: 11.5, color: theme.success, fontWeight: '700', marginTop: 2 }}>Doğru</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.dangerSoft, borderRadius: radius.md, paddingVertical: 12, marginRight: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.danger }}>{wrong}</Text>
              <Text style={{ fontSize: 11.5, color: theme.danger, fontWeight: '700', marginTop: 2 }}>Yanlış</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.primarySoft, borderRadius: radius.md, paddingVertical: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.primary }}>{net.toFixed(2).replace('.', ',')}</Text>
              <Text style={{ fontSize: 11.5, color: theme.primary, fontWeight: '700', marginTop: 2 }}>Net</Text>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <StatTile icon="time" iconColor={theme.accent} value={`${mm}:${ss}`} label="Toplam süre" />
          <View style={{ width: 10 }} />
          <StatTile icon="speedometer" iconColor="#7C3AED" value={total > 0 ? `${Math.round(seconds / total)} sn` : '-'} label="Soru başına" />
          <View style={{ width: 10 }} />
          <StatTile icon="list" iconColor="#2563EB" value={String(total)} label="Soru sayısı" />
        </View>

        <View style={{ marginTop: 16 }}>
          {wrongIds.length > 0 ? (
            <View style={{ marginBottom: 10 }}>
              <PrimaryButton
                label={`Yanlışları Tekrar Çöz (${wrongIds.length})`}
                icon="refresh"
                color={theme.warning}
                onPress={() => navigation.replace('Quiz', { mode: 'review', reviewIds: wrongIds })}
              />
            </View>
          ) : null}
          <View style={{ marginBottom: 10 }}>
            <PrimaryButton
              label="Yeni Test Başlat"
              icon="play"
              onPress={() =>
                mode === 'qod'
                  ? navigation.replace('Quiz', { mode: 'mixed', count: 10 })
                  : navigation.replace('Quiz', { mode, categoryId, topicIds, count: total })
              }
            />
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'Ana Sayfa' })}
            style={{
              backgroundColor: theme.card,
              borderRadius: radius.md,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontWeight: '800', color: theme.text, fontSize: 15 }}>Ana Sayfaya Dön</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
