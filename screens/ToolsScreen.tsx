import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { Linking, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';
import { Card, Chip, ProgressBar, SectionTitle, useResponsiveLayout } from '../components/ui';
import { daysUntil, formatDateTR } from '../lib/data';
import { radius } from '../lib/theme';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  sinav: { label: 'Sınav', icon: 'pencil', color: '#D7263D' },
  basvuru: { label: 'Başvuru', icon: 'create', color: '#2563EB' },
  sonuc: { label: 'Sonuç', icon: 'trophy', color: '#B45309' },
  tercih: { label: 'Tercih', icon: 'list', color: '#059669' },
};

const SCORE_TYPES = [
  { id: 'P3', label: 'P3 (Lisans GY-GK)', gy: 0.5, gk: 0.5 },
  { id: 'P93', label: 'P93 (Ön Lisans)', gy: 0.5, gk: 0.5 },
  { id: 'P94', label: 'P94 (Ortaöğretim)', gy: 0.5, gk: 0.5 },
  { id: 'P10', label: 'P10 (Öğretmenlik)', gy: 0.3, gk: 0.3 },
  { id: 'P121', label: 'P121 (ÖABT)', gy: 0.15, gk: 0.15 },
];

function ScoreCalculator() {
  const { theme } = useApp();
  const [type, setType] = useState('P3');
  const [gyD, setGyD] = useState('45');
  const [gyY, setGyY] = useState('15');
  const [gkD, setGkD] = useState('40');
  const [gkY, setGkY] = useState('20');
  const [result, setResult] = useState<null | { gyNet: number; gkNet: number; score: number }>(null);

  const Field = ({ label, value, set }: { label: string; value: string; set: (v: string) => void }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: theme.muted, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => set(t.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.muted}
        style={{
          backgroundColor: theme.card2,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          paddingVertical: 11,
          paddingHorizontal: 12,
          fontSize: 16,
          fontWeight: '800',
          color: theme.text,
          textAlign: 'center',
        }}
      />
    </View>
  );

  const calc = () => {
    const gyNet = Math.max(0, (parseInt(gyD || '0', 10) || 0) - (parseInt(gyY || '0', 10) || 0) / 4);
    const gkNet = Math.max(0, (parseInt(gkD || '0', 10) || 0) - (parseInt(gkY || '0', 10) || 0) / 4);
    const totalNet = gyNet + gkNet;
    // Yaklaşık puan: ÖSYM standardizasyonuna basit yaklaşım (55 taban + net başına ~0.5 civarı ölçek)
    const score = Math.min(100, 35 + totalNet * 0.62 + (totalNet > 60 ? (totalNet - 60) * 0.25 : 0));
    setResult({ gyNet, gkNet, score: Math.round(score * 100) / 100 });
  };

  return (
    <Card>
      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text, marginBottom: 10 }}>Puan türü seç</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          {SCORE_TYPES.map((s) => (
            <Chip key={s.id} label={s.id} active={type === s.id} onPress={() => setType(s.id)} />
          ))}
        </View>
      </ScrollView>
      <Text style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>
        {SCORE_TYPES.find((s) => s.id === type)?.label}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text, marginBottom: 6 }}>Genel Yetenek (60 soru)</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Field label="Doğru" value={gyD} set={setGyD} />
        <View style={{ width: 10 }} />
        <Field label="Yanlış" value={gyY} set={setGyY} />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text, marginBottom: 6, marginTop: 12 }}>
        Genel Kültür (60 soru)
      </Text>
      <View style={{ flexDirection: 'row' }}>
        <Field label="Doğru" value={gkD} set={setGkD} />
        <View style={{ width: 10 }} />
        <Field label="Yanlış" value={gkY} set={setGkY} />
      </View>
      <TouchableOpacity
        onPress={calc}
        activeOpacity={0.85}
        style={{ backgroundColor: theme.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', marginTop: 14, flexDirection: 'row', justifyContent: 'center' }}
      >
        <Ionicons name="calculator" size={18} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginLeft: 8 }}>Puanı Hesapla</Text>
      </TouchableOpacity>
      {result ? (
        <View style={{ marginTop: 14, backgroundColor: theme.card2, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>GY Neti</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{result.gyNet.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '600' }}>GK Neti</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{result.gkNet.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={{ alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 12.5, color: theme.muted, fontWeight: '700' }}>Tahmini {type} Puanı</Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: theme.accent, marginTop: 2 }}>
              {result.score.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 10, lineHeight: 16 }}>
        * Bu hesaplama yaklaşıktır. Gerçek puan, ÖSYM'nin standart sapma ve ağırlıklı standart puan hesaplamasına göre değişir.
      </Text>
    </Card>
  );
}

function TabanPuanlar() {
  const { scores: TABAN_PUANLAR } = useContent();
  const { theme } = useApp();
  const [level, setLevel] = useState<'lisans' | 'onlisans' | 'ortaogretim'>('lisans');
  const [q, setQ] = useState('');
  const list = TABAN_PUANLAR.filter(
    (t) => t.level === level && (q === '' || t.kadro.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {(
          [
            { id: 'lisans', label: 'Lisans' },
            { id: 'onlisans', label: 'Ön Lisans' },
            { id: 'ortaogretim', label: 'Ortaöğretim' },
          ] as const
        ).map((l) => (
          <Chip key={l.id} label={l.label} active={level === l.id} onPress={() => setLevel(l.id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, marginBottom: 10 }}>
        <Ionicons name="search" size={17} color={theme.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Kadro ara... (örn. hemşire, memur)"
          placeholderTextColor={theme.muted}
          style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 8, color: theme.text, fontSize: 13.5 }}
        />
      </View>
      {list.map((t) => (
        <Card key={t.id} style={{ marginBottom: 8, padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>{t.kadro}</Text>
              <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{t.kurum}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: theme.muted, fontWeight: '600' }}>Taban – Tavan</Text>
              <Text style={{ fontSize: 14.5, fontWeight: '900', color: theme.accent, marginTop: 2 }}>
                {t.min.toFixed(1)} – {t.max.toFixed(1)}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <ProgressBar progress={(t.min - 60) / 35} color={theme.success} height={6} />
          </View>
        </Card>
      ))}
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 4, lineHeight: 16 }}>
        * Örnek aralıklardır; her yerleştirmede ÖSYM'nin yayımladığı resmi taban puanları geçerlidir.
      </Text>
    </View>
  );
}

export default function ToolsScreen() {
  const { events: EXAM_EVENTS } = useContent();
  const { theme } = useApp();
  const { isDesktopWeb, pageMaxWidth, pagePadding } = useResponsiveLayout();
  const [tab, setTab] = useState<'takvim' | 'puan' | 'taban'>('takvim');

  const sorted = [...EXAM_EVENTS].sort((a, b) => a.date.localeCompare(b.date));

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
        <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Araçlar</Text>
        <Text style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>
          Sınav takvimi, puan hesaplama ve taban puanlar
        </Text>

        <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 12 }}>
          {(
            [
              { id: 'takvim', label: 'Takvim', icon: 'calendar' },
              { id: 'puan', label: 'Puan Hesapla', icon: 'calculator' },
              { id: 'taban', label: 'Taban Puan', icon: 'podium' },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTab(t.id)}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  backgroundColor: active ? theme.text : theme.card,
                  borderRadius: radius.md,
                  paddingVertical: 11,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  marginRight: t.id === 'taban' ? 0 : 8,
                  borderWidth: 1,
                  borderColor: active ? theme.text : theme.border,
                }}
              >
                <Ionicons name={t.icon as any} size={15} color={active ? theme.card : theme.muted} />
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? theme.card : theme.text, marginLeft: 5 }}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {tab === 'takvim' ? (
          <View>
            <SectionTitle title="2026 ÖSYM Takvimi" subtitle="ÖSYM resmi duyurularına dayanır" />
            {sorted.map((e) => {
              const meta = TYPE_META[e.type];
              const left = daysUntil(e.endDate ?? e.date);
              const past = left < 0;
              return (
                <Card key={e.id} style={{ marginBottom: 10, opacity: past ? 0.65 : 1 }}>
                  <View style={{ flexDirection: 'row' }}>
                    <View
                      style={{
                        width: 52,
                        borderRadius: 12,
                        backgroundColor: meta.color + '14',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                        paddingVertical: 8,
                      }}
                    >
                      <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      <Text style={{ fontSize: 10, fontWeight: '800', color: meta.color, marginTop: 4 }}>{meta.label}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '800', color: theme.text }}>{e.title}</Text>
                      <Text style={{ fontSize: 12.5, color: theme.accent, fontWeight: '700', marginTop: 3 }}>
                        {formatDateTR(e.date)}{e.endDate ? ` – ${formatDateTR(e.endDate)}` : ''}
                        {past ? ' • Tamamlandı' : left === 0 ? ' • Bugün!' : ` • ${left} gün kaldı`}
                      </Text>
                      <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 4, lineHeight: 18 }}>{e.desc}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.osym.gov.tr')}
              style={{ backgroundColor: theme.primarySoft, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
            >
              <Ionicons name="globe-outline" size={20} color={theme.primary} />
              <Text style={{ flex: 1, marginLeft: 10, fontSize: 13.5, fontWeight: '700', color: theme.primary }}>
                osym.gov.tr'yi ziyaret et
              </Text>
              <Ionicons name="open-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === 'puan' ? (
          <View>
            <SectionTitle title="KPSS Puan Hesaplama" subtitle="GY-GK netlerine göre tahmini puan" />
            <ScoreCalculator />
          </View>
        ) : null}

        {tab === 'taban' ? (
          <View>
            <SectionTitle title="Taban Puanlar" subtitle="Merkezi yerleştirme örnek aralıkları" />
            <TabanPuanlar />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
