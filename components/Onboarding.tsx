import { useContent } from '../lib/content';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../lib/store';

import { radius } from '../lib/theme';

export default function OnboardingModal({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const { theme, setName, setTargetExamId } = useApp();
  const { targets: TARGET_EXAMS } = useContent();
  const [step, setStep] = useState(0);
  const [name, setNameLocal] = useState('');
  const [exam, setExam] = useState<string | null>(null);

  const finish = () => {
    setName(name.trim());
    setTargetExamId(exam);
    onDone();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {step === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
          <View>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 28,
                  backgroundColor: theme.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Ionicons name="school" size={46} color="#fff" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: '900', color: theme.text, textAlign: 'center' }}>
                KPSS Asistanım'a{'\n'}Hoş Geldin 🎓
              </Text>
              <Text style={{ fontSize: 14, color: theme.muted, textAlign: 'center', marginTop: 10, lineHeight: 21 }}>
                Testler, konu takibi, güncel bilgiler,{'\n'}puan hesaplama ve sınav takvimi tek uygulamada.
              </Text>
            </View>
            <View style={{ marginBottom: 20 }}>
              {[
                { icon: 'help-circle', text: '6 dersten yüzlerce KPSS sorusu' },
                { icon: 'newspaper', text: '2024–2026 güncel bilgiler kartları' },
                { icon: 'calendar', text: 'ÖSYM 2026 sınav takvimi ve geri sayım' },
                { icon: 'trophy', text: 'İstatistikler ve günlük çalışma serisi' },
              ].map((f, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name={f.icon as any} size={18} color={theme.accent} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{f.text}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={{ backgroundColor: theme.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Başlayalım</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Seni tanıyalım</Text>
            <Text style={{ fontSize: 13.5, color: theme.muted, marginTop: 6 }}>
              Adın ve hedefin, ana sayfayı sana özel hale getirir.
            </Text>

            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text, marginTop: 20, marginBottom: 8 }}>
              Adın nedir?
            </Text>
            <TextInput
              value={name}
              onChangeText={setNameLocal}
              placeholder="örn. Ayşe Yılmaz"
              placeholderTextColor={theme.muted}
              style={{
                backgroundColor: theme.card,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 14,
                paddingHorizontal: 14,
                fontSize: 15,
                color: theme.text,
                fontWeight: '600',
              }}
            />

            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.text, marginTop: 20, marginBottom: 8 }}>
              Hangi sınava hazırlanıyorsun?
            </Text>
            {TARGET_EXAMS.map((t) => {
              const active = exam === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setExam(t.id)}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: radius.md,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? theme.accent : theme.border,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>{t.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>Puan türü: {t.scoreType}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={24} color={theme.accent} /> : null}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={finish}
              style={{ backgroundColor: theme.accent, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center' }}
            >
              <Ionicons name="rocket" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 }}>Çalışmaya Başla</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={finish} style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: theme.muted, fontWeight: '700', fontSize: 13.5 }}>Şimdilik geç</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
