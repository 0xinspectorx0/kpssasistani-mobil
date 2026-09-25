import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/store';
import { ContentEntry, schemas } from '../../lib/content-schema';
import { AdminButton, Notice } from './AdminUI';

type Format = 'json' | 'text';

const JSON_EXAMPLE = `[
  {
    "category": "tarih",
    "difficulty": "Orta",
    "question": "Malazgirt Savaşı hangi yılda yapılmıştır?",
    "options": ["1040", "1071", "1176", "1243", "1177"],
    "answer": 1,
    "explanation": "Malazgirt Savaşı 1071 yılında yapılmıştır."
  }
]`;

const TEXT_EXAMPLE = `# Her satır: Ders|Zorluk|Soru|A|B|C|D|E|Cevap|Açıklama
tarih|Orta|Osmanlı Devleti'nin kurucusu kimdir?|Ertuğrul Gazi|Osman Bey|Orhan Bey|I. Murat|Süleyman Şah|B|Osmanlı Devleti 1299'da Osman Bey tarafından kurulmuştur.
matematik|Kolay|2+2 kaçtır?|2|3|4|5|7|C|Temel toplama.`;

const DIFFICULTIES = ['Kolay', 'Orta', 'Zor'];
const LETTERS = ['A', 'B', 'C', 'D', 'E'];

function parseTextInput(raw: string): Omit<ContentEntry, 'status'>[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'));
  const out: { kind: 'questions'; id: string; payload: any }[] = [];
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 9) {
      throw new Error(
        `Satır eksik alan içeriyor (Ders|Zorluk|Soru|A|B|C|D|E|Cevap|Açıklama). Sorunlu satır: ${line.slice(0, 60)}…`,
      );
    }
    // İlk 3 alan sabit; son 2 alan cevap harfi ve açıklama; aradakiler seçenekler.
    const [category, difficulty, question] = parts;
    const explanation = parts[parts.length - 1];
    const answerRaw = parts[parts.length - 2];
    const options = parts.slice(3, parts.length - 2);
    if (options.length !== 5) {
      throw new Error(
        `Tam 5 seçenek (A–E) girilmeli; ${options.length} seçenek girilmiş. Sorunlu satır: ${line.slice(0, 60)}…`,
      );
    }
    if (options.some((o) => !o)) {
      throw new Error(`Seçenekler boş bırakılamaz. Sorunlu satır: ${line.slice(0, 60)}…`);
    }
    const answerLetter = (answerRaw[0] ?? '').toLocaleUpperCase('tr');
    const answer = LETTERS.indexOf(answerLetter);
    if (answer < 0 || answer >= options.length) {
      throw new Error(
        `Doğru cevap A–E arası bir harf olmalı. Sorunlu satır: ${line.slice(0, 60)}…`,
      );
    }
    if (!DIFFICULTIES.includes(difficulty)) {
      throw new Error(`Zorluk "Kolay", "Orta" veya "Zor" olmalı. Sorunlu satır: ${line.slice(0, 60)}…`);
    }
    const id = `bulk-${Date.now()}-${out.length}-${Math.random().toString(36).slice(2, 7)}`;
    out.push({
      kind: 'questions',
      id,
      payload: { id, category, difficulty, question, options, answer, explanation },
    });
  }
  return out;
}

export default function BulkAdd({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (entries: ContentEntry[]) => Promise<void>;
}) {
  const { theme } = useApp();
  const [format, setFormat] = useState<Format>('json');
  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const parsed = useMemo(() => {
    setError('');
    setMessage('');
    if (!raw.trim()) return [];
    try {
      const base =
        format === 'json'
          ? (JSON.parse(raw) as any[])
              .map((item, i) => {
                if (Array.isArray(item))
                  throw new Error('JSON bir dizi olmalı; köşeli parantezleri kontrol edin.');
                const id = `bulk-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
                const payload = { ...item, id };
                delete payload.status;
                const verified = schemas.questions.parse(payload);
                return { kind: 'questions' as const, id, payload: verified };
              })
          : parseTextInput(raw);
      return base;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Biçim ayrıştırılamadı.');
      return [];
    }
  }, [raw, format]);

  async function submit() {
    if (!parsed.length) return;
    setBusy(true);
    setError('');
    try {
      await onInsert(parsed.map((p) => ({ ...p, status })));
      setMessage(`${parsed.length} soru başarıyla ${status === 'published' ? 'yayınlandı' : 'taslak olarak kaydedildi'}.`);
      setRaw('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt sırasında hata oluştu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={{ flex: 1, backgroundColor: '#02061799', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <SafeAreaView style={{ width: '100%', maxWidth: 720, maxHeight: '92%', borderRadius: 20, backgroundColor: theme.card, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.text, fontWeight: '900', fontSize: 17 }}>Toplu Soru Ekle</Text>
            <TouchableOpacity onPress={() => !busy && onClose()} accessibilityRole="button" accessibilityLabel="Kapat">
              <Ionicons name="close" size={24} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(
                  [
                    { id: 'json', label: 'JSON' },
                    { id: 'text', label: 'Metin (satır bazlı)' },
                  ] as const
                ).map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => {
                      setFormat(f.id);
                      setRaw('');
                      setError('');
                      setMessage('');
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: format === f.id ? theme.accent : theme.border,
                      backgroundColor: format === f.id ? theme.accentSoft : theme.card2,
                    }}
                  >
                    <Text style={{ fontWeight: '800', color: format === f.id ? theme.accent : theme.muted, fontSize: 13 }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>
                Her soru ayrı bir kayıt olarak eklenir; sorular 5 seçeneklidir (A–E). Doğrulama hataları kaydedilmeyi engeller.
              </Text>
              <TextInput
                value={raw}
                onChangeText={setRaw}
                placeholder={format === 'json' ? JSON_EXAMPLE : TEXT_EXAMPLE}
                placeholderTextColor={theme.muted}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                textAlignVertical="top"
                style={{
                  minHeight: 220,
                  backgroundColor: theme.card2,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  padding: 12,
                  color: theme.text,
                  fontSize: 12.5,
                  fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
                }}
              />

              <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Kayıt durumu:</Text>
                {(
                  [
                    { value: 'published', label: 'Yayında' },
                    { value: 'draft', label: 'Taslak' },
                  ] as const
                ).map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setStatus(s.value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 9,
                      borderWidth: 1,
                      borderColor: status === s.value ? theme.accent : theme.border,
                      backgroundColor: status === s.value ? theme.accentSoft : theme.card2,
                    }}
                  >
                    <Text style={{ fontWeight: '800', fontSize: 12, color: status === s.value ? theme.accent : theme.muted }}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!!error && <View style={{ marginTop: 12 }}><Notice text={error} error /></View>}
              {!!message && <View style={{ marginTop: 12 }}><Notice text={message} /></View>}
              {!error && raw.trim() !== '' && (
                <Text style={{ color: theme.success, fontWeight: '700', fontSize: 12, marginTop: 10 }}>
                  ✓ {parsed.length} soru ayrıştırıldı
                </Text>
              )}
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderColor: theme.border, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <AdminButton label="Vazgeç" secondary onPress={onClose} disabled={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <AdminButton
                  label={busy ? 'Ekleniyor…' : `${parsed.length} soruyu kaydet`}
                  icon="checkmark"
                  onPress={submit}
                  disabled={!parsed.length || busy}
                  busy={busy}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
