import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/store';
import { ContentEntry, ContentPayload, kindLabels, schemas } from '../../lib/content-schema';
import { readableError } from '../../lib/content-api';
import { useCategoryList } from '../../lib/lesson-catalog';
import { AdminButton, Choice, ConfirmDialog, Field, Notice } from './AdminUI';

const choices = (values: string[]) => values.map((value) => ({ value, label: value }));

// Soruda seçilebilir dersler: yayındaki ders kayıtları + soruların mevcut kategorileri.
function buildQuestionCategories(entries: ContentEntry[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const out: { value: string; label: string }[] = [];
  for (const e of entries) {
    if (e.kind === 'lessons' && !seen.has(e.id)) {
      seen.add(e.id);
      out.push({ value: e.id, label: (e.payload as any).name as string });
    }
  }
  for (const e of entries) {
    if (e.kind === 'questions') {
      const cat = (e.payload as any).category as string;
      if (cat && !seen.has(cat)) {
        seen.add(cat);
        out.push({ value: cat, label: cat });
      }
    }
  }
  return out;
}
const labels: Record<string, string> = {
  name: 'Ad',
  short: 'Kısa ad',
  scoreType: 'Puan türü',
  title: 'Başlık',
  detail: 'Detay',
  date: 'Tarih / dönem',
  endDate: 'Bitiş tarihi (isteğe bağlı)',
  desc: 'Açıklama',
  color: 'Renk (ör. #2563EB)',
  icon: 'Ionicons simge adı',
  questions: 'Soru dağılımı (ör. GY: ~30 soru)',
  kadro: 'Kadro',
  kurum: 'Kurum',
  min: 'Taban puan',
  max: 'Tavan puan',
  text: 'Motivasyon sözü',
  author: 'Yazar',
  question: 'Soru metni',
  explanation: 'Çözüm açıklaması',
  options: 'Seçenekler',
  answer: 'Doğru cevap',
  topics: 'Konular',
  eventId: 'Bağlı sınav',
};
export default function ContentEditor({
  entry,
  isNew,
  previewOnly,
  entries,
  onClose,
  onSave,
}: {
  entry: ContentEntry;
  isNew: boolean;
  previewOnly: boolean;
  entries: ContentEntry[];
  onClose: () => void;
  onSave: (entry: ContentEntry, isNew: boolean) => Promise<void>;
}) {
  const { theme } = useApp();
  // Form draft intentionally allows incomplete/invalid field values until validation.
  const [draft, setDraft] = useState<Record<string, any>>(() => JSON.parse(JSON.stringify(entry.payload)));
  const [status, setStatus] = useState(entry.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [saved, setSaved] = useState(false);
  const set = (key: string, value: unknown) => setDraft((p) => ({ ...p, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(entry.payload) || status !== entry.status;
  const close = () => {
    if (busy) return;
    if (dirty && !saved) setConfirmClose(true);
    else onClose();
  };

  async function save() {
    setError('');
    const normalized = { ...draft };
    if (entry.kind === 'scores') {
      for (const key of ['min', 'max'])
        normalized[key] =
          String(normalized[key]).trim() === '' ? NaN : Number(String(normalized[key]).replace(',', '.'));
    }
    if (entry.kind === 'events' && !normalized.endDate) delete normalized.endDate;
    const parsed = schemas[entry.kind].safeParse(normalized);
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${labels[String(i.path[0])] ?? String(i.path[0] ?? 'İçerik')}: ${i.message}`)
          .join('\n'),
      );
      return;
    }
    if (
      entry.kind === 'targets' &&
      !entries.some(
        (e) =>
          e.kind === 'events' &&
          e.id === draft.eventId &&
          (status !== 'published' || e.status === 'published'),
      )
    ) {
      setError(
        'Yayınlamak için yayındaki bir sınav etkinliğini seçin. Önce Sınav Takvimi bölümünden etkinlik ekleyebilirsiniz.',
      );
      return;
    }
    if (entry.kind === 'lessons') {
      const otherTopicIds = new Set(
        entries
          .filter((e) => e.kind === 'lessons' && e.id !== entry.id)
          .flatMap((e) => ('topics' in e.payload ? e.payload.topics.map((t) => t.id) : [])),
      );
      if (draft.topics.some((t: { id: string }) => otherTopicIds.has(t.id))) {
        setError('Konu kimliği başka bir derste kullanılıyor.');
        return;
      }
    }
    setBusy(true);
    try {
      await onSave({ ...entry, id: parsed.data.id, payload: parsed.data as ContentPayload, status }, isNew);
      setSaved(true);
      onClose();
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }
  function field(key: string, multiline = false, numeric = false) {
    return (
      <Field
        key={key}
        label={
          entry.kind === 'events' && key === 'date' ? 'Başlangıç tarihi (YYYY-AA-GG)' : (labels[key] ?? key)
        }
        value={String(draft[key] ?? '')}
        multiline={multiline}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        onChangeText={(v) => set(key, v)}
      />
    );
  }
  function select(key: string, label: string, values: { value: string; label: string }[]) {
    return <Choice label={label} value={draft[key]} options={values} onChange={(v) => set(key, v)} />;
  }
  const questionForm = (
    <>
      <Choice
        label="Ders"
        value={draft.category}
        options={buildQuestionCategories(entries)}
        onChange={(v) => set('category', v)}
      />
      <View style={{ marginBottom: 14 }}>
        <Notice text="Ders listede yoksa kimliği elle yazabilirsin (küçük harf, ör. 'hukuk'). Soru, bu kimliğe sahip bir ders kaydına bağlanır." />
        <Field
          label="Ders kimliği (yeni ders için yaz)"
          value={String(draft.category ?? '')}
          onChangeText={(v) => set('category', v.trim().toLocaleLowerCase('tr'))}
        />
      </View>
      {select('difficulty', 'Zorluk seviyesi', choices(['Kolay', 'Orta', 'Zor']))}
      {field('question', true)}
      <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 6 }}>Seçenekler ve doğru cevap</Text>
      <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 14 }}>
        Doğru seçeneğin harfine dokunun. 4 veya 5 seçenek ekleyebilirsiniz.
      </Text>
      {(draft.options ?? []).map((option: string, i: number) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityLabel={`${'ABCDE'[i]} doğru cevap`}
            accessibilityState={{ checked: draft.answer === i }}
            onPress={() => set('answer', i)}
            style={{
              width: 42,
              height: 44,
              borderRadius: 11,
              borderWidth: 1,
              borderColor: draft.answer === i ? theme.success : theme.border,
              backgroundColor: draft.answer === i ? theme.success : theme.card2,
            }}
          >
            <Text
              style={{
                color: draft.answer === i ? '#fff' : theme.muted,
                textAlign: 'center',
                lineHeight: 42,
                fontWeight: '900',
              }}
            >
              {'ABCDE'[i]}
            </Text>
          </TouchableOpacity>
          <Field
            label={`${'ABCDE'[i]} seçeneği`}
            value={option}
            onChangeText={(v) =>
              set(
                'options',
                draft.options.map((o: string, index: number) => (index === i ? v : o)),
              )
            }
          />
        </View>
      ))}
      <View style={{ marginBottom: 18, alignSelf: 'flex-start' }}>
        <AdminButton
          secondary
          label={draft.options?.length === 5 ? 'E seçeneğini kaldır' : 'E seçeneği ekle'}
          onPress={() => {
            if (draft.options.length === 5) {
              set('options', draft.options.slice(0, 4));
              if (draft.answer === 4) set('answer', -1);
            } else set('options', [...draft.options, '']);
          }}
        />
      </View>
      {field('explanation', true)}
    </>
  );
  function otherForm() {
    switch (entry.kind) {
      case 'lessons':
        return (
          <>
            {isNew ? (
              <View style={{ marginBottom: 14 }}>
                <Notice text="Yeni ders için benzersiz, küçük harfli bir kimlik yazın (ör. 'hukuk', 'din-kulturu'). Sorular bu kimlikle bu derse bağlanır; kimlik sonradan değiştirilemez." />
                <Field
                  label="Ders kimliği"
                  value={String(draft.id ?? '')}
                  onChangeText={(v) => set('id', v.trim().toLocaleLowerCase('tr').replace(/[^a-z0-9-]/g, ''))}
                />
              </View>
            ) : (
              <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 14 }}>
                Ders kimliği: {entry.id} (kimlik değiştirilemez; sorular bu kimlikle bağlıdır)
              </Text>
            )}
            {field('name')}
            {field('questions')}
            {field('icon')}
            {field('color')}
            <Text style={{ color: theme.text, fontWeight: '800', marginBottom: 12 }}>Konular</Text>
            <Notice text="Konu adını düzenlemek öğrencinin ilerlemesini korur. Konuyu silip yeniden eklemek yeni bir kimlik oluşturur." />
            {draft.topics.map((topic: { id: string; name: string }, i: number) => (
              <View key={topic.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Field
                  label={`Konu ${i + 1}`}
                  value={topic.name}
                  onChangeText={(v) =>
                    set(
                      'topics',
                      draft.topics.map((t: typeof topic, index: number) =>
                        index === i ? { ...t, name: v } : t,
                      ),
                    )
                  }
                />
                <AdminButton
                  secondary
                  danger
                  label="Kaldır"
                  onPress={() =>
                    set(
                      'topics',
                      draft.topics.filter((_: unknown, index: number) => index !== i),
                    )
                  }
                />
              </View>
            ))}
            <AdminButton
              secondary
              label="Konu ekle"
              icon="add"
              onPress={() =>
                set('topics', [
                  ...draft.topics,
                  { id: `topic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '' },
                ])
              }
            />
          </>
        );
      case 'news':
        return (
          <>
            {select(
              'category',
              'Kategori',
              choices(['Spor', 'Kültür-Sanat', 'Bilim', 'Kurumlar', 'Klasikler']),
            )}
            {field('title')}
            {field('date')}
            {field('detail', true)}
          </>
        );
      case 'events':
        return (
          <>
            {select('type', 'Etkinlik türü', [
              { value: 'sinav', label: 'Sınav' },
              { value: 'basvuru', label: 'Başvuru' },
              { value: 'sonuc', label: 'Sonuç' },
              { value: 'tercih', label: 'Tercih' },
            ])}
            {field('title')}
            {field('date')}
            {field('endDate')}
            {field('desc', true)}
          </>
        );
      case 'targets':
        return (
          <>
            {field('name')}
            {field('short')}
            {field('scoreType')}
            {select(
              'eventId',
              'Bağlı sınav etkinliği',
              entries
                .filter((e) => e.kind === 'events')
                .map((e) => ({
                  value: e.id,
                  label:
                    ('title' in e.payload ? e.payload.title : e.id) +
                    (e.status === 'draft' ? ' (taslak)' : ''),
                })),
            )}
          </>
        );
      case 'scores':
        return (
          <>
            {select('level', 'Öğrenim düzeyi', [
              { value: 'lisans', label: 'Lisans' },
              { value: 'onlisans', label: 'Ön Lisans' },
              { value: 'ortaogretim', label: 'Ortaöğretim' },
            ])}
            {field('kadro')}
            {field('kurum')}
            {field('min', false, true)}
            {field('max', false, true)}
          </>
        );
      case 'quotes':
        return (
          <>
            {field('text', true)}
            {field('author')}
          </>
        );
      default:
        return null;
    }
  }
  return (
    <Modal animationType="slide" onRequestClose={close} transparent>
      <View style={{ flex: 1, backgroundColor: '#02061788', alignItems: 'center', justifyContent: 'center' }}>
        <SafeAreaView
          role="dialog"
          accessibilityLabel="İçerik düzenleyici"
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 760,
            height: '96%',
            backgroundColor: theme.bg,
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderColor: theme.border,
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                  {kindLabels[entry.kind].toLocaleUpperCase('tr')}
                </Text>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: '900', marginTop: 4 }}>
                  {isNew ? 'Yeni içerik ekle' : 'İçeriği düzenle'}
                </Text>
              </View>
              <AdminButton label="Kapat" secondary icon="close" onPress={close} disabled={busy} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22 }}>
              {previewOnly && (
                <Notice text="Salt okunur önizleme. Formu inceleyebilirsiniz; değişiklikler kaydedilmez ve uygulamaya yansımaz." />
              )}
              {entry.kind === 'questions' && (
                <View style={{ marginBottom: 18, alignSelf: 'flex-start' }}>
                  <AdminButton
                    label={preview ? 'Forma dön' : 'Soru önizlemesi'}
                    secondary
                    icon="eye-outline"
                    onPress={() => setPreview(!preview)}
                  />
                </View>
              )}
              {preview && entry.kind === 'questions' ? (
                <View style={{ gap: 12 }}>
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18, lineHeight: 26 }}>
                    {draft.question || 'Soru metni henüz girilmedi.'}
                  </Text>
                  {draft.options.map((o: string, i: number) => (
                    <View
                      key={i}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: draft.answer === i ? theme.success : theme.border,
                        backgroundColor: theme.card,
                      }}
                    >
                      <Text style={{ color: draft.answer === i ? theme.success : theme.text }}>
                        {'ABCDE'[i]}. {o || 'Boş seçenek'} {draft.answer === i ? '✓' : ''}
                      </Text>
                    </View>
                  ))}
                  <Text style={{ color: theme.muted, lineHeight: 22 }}>
                    Çözüm: {draft.explanation || 'Henüz girilmedi.'}
                  </Text>
                </View>
              ) : entry.kind === 'questions' ? (
                questionForm
              ) : (
                otherForm()
              )}
              <View style={{ marginTop: 22 }}>
                <Choice
                  label="Yayın durumu"
                  value={status}
                  options={[
                    { value: 'draft', label: 'Taslak' },
                    { value: 'published', label: 'Yayında' },
                  ]}
                  onChange={(v) => setStatus(v as typeof status)}
                />
              </View>
              <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
                {status === 'draft'
                  ? 'Taslaklar yalnızca yöneticilere görünür. Yayındaki içeriği taslağa almak öğrencilerden gizler.'
                  : 'Kaydettiğinizde içerik kullanıcıların bir sonraki içerik yenilemesinde görünür.'}
              </Text>
            </ScrollView>
            <View
              style={{
                padding: 16,
                borderTopWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
              }}
            >
              {!!error && <Notice text={error} error />}
              <AdminButton
                label={
                  previewOnly
                    ? 'Önizlemede kayıt yapılamaz'
                    : status === 'published'
                      ? 'Kaydet ve yayınla'
                      : 'Taslak olarak kaydet'
                }
                icon="checkmark"
                onPress={save}
                busy={busy}
                disabled={previewOnly}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
      {confirmClose && (
        <ConfirmDialog
          title="Değişiklikler kaydedilmedi"
          description="Formu kapatırsanız yaptığınız değişiklikler kaybolacak."
          label="Kaydetmeden çık"
          danger
          onCancel={() => setConfirmClose(false)}
          onConfirm={onClose}
        />
      )}
    </Modal>
  );
}
