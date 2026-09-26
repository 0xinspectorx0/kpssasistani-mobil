import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../lib/store';
import { ContentEntry, entryTitle } from '../../lib/content-schema';
import { deleteEntry, readableError } from '../../lib/content-api';
import {
  deleteQuestionSelection, filterQuestions, moveTopic, questionLessons,
  QuestionEntry, questionTopicId, topicGroups, UNASSIGNED_TOPIC,
} from '../../lib/admin-questions';
import { Card, EmptyState } from '../ui';
import { AdminButton, Choice, ConfirmDialog, Field, Notice } from './AdminUI';
import ContentEditor from './ContentEditor';

export default function QuestionManager({ entries, readOnly, loading, onSave, onChanged, onReload }: {
  entries: ContentEntry[];
  readOnly: boolean;
  loading: boolean;
  onSave: (entry: ContentEntry, isNew: boolean) => Promise<void>;
  onChanged: (message: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const { theme } = useApp();
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editor, setEditor] = useState<QuestionEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<QuestionEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lessons = questionLessons(entries);
  const lesson = lessons.find((item) => item.id === lessonId);
  const groups = lessonId ? topicGroups(entries, lessonId) : [];
  const topic = groups.find((item) => item.id === topicId);
  const filtered = filterQuestions(topic?.questions ?? [], query, status);
  const selectedRows = filtered.filter((entry) => selected.has(entry.id));
  const allSelected = filtered.length > 0 && selectedRows.length === filtered.length;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 20) - 1));
  const disabled = busy || loading;

  useEffect(() => {
    setSelected(new Set());
    setPage(0);
  }, [lessonId, topicId, query, status, entries]);

  function navigateTopic(id: string | null) {
    setTopicId(id);
    setQuery('');
    setStatus('all');
    setSelected(new Set());
    setError('');
    setMessage('');
  }
  function close() {
    if (running.current || editor || pendingDelete) return;
    setLessonId(null);
    navigateTopic(null);
  }
  async function reorder(index: number, direction: -1 | 1) {
    if (readOnly || disabled || running.current || !lesson?.entry) return;
    running.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await onSave({ ...lesson.entry, payload: { ...lesson.entry.payload, topics: moveTopic(lesson.entry.payload.topics, index, direction) } }, false);
      setMessage('Konu sırası kaydedildi.');
    } catch (e) {
      setError(readableError(e));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function remove() {
    if (readOnly || running.current || !pendingDelete?.length) return;
    running.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await deleteQuestionSelection(pendingDelete, deleteEntry);
      const text = `${result.deleted} soru silindi.`;
      setPendingDelete(null);
      setSelected(new Set());
      await onChanged(text);
      setMessage(text);
      if (result.error) setError(`Silme işlemi durduruldu. ${readableError(result.error)} Kalan soruları kontrol edip yeniden seçin.`);
    } catch (e) {
      setError(readableError(e));
    } finally {
      setPendingDelete(null);
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Notice text="Derse dokunun, açılan balondan konuyu seçin. Konunun sorularını düzenleyebilir, tek tek veya toplu silebilirsiniz." />
      <View style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
        <AdminButton label="Soruları yenile" icon="refresh" secondary disabled={disabled} onPress={() => void onReload()} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {lessons.map((item) => (
          <TouchableOpacity
            key={item.id} accessibilityRole="button" accessibilityLabel={`${item.name} konuları`}
            disabled={disabled}
            onPress={() => { setLessonId(item.id); navigateTopic(null); }}
            style={{ flexGrow: 1, flexBasis: 260 }}
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ionicons name="book-outline" size={24} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{item.name}</Text>
                <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>
                  {topicGroups(entries, item.id).reduce((count, group) => count + group.questions.length, 0)} soru
                  {item.entry?.status === 'draft' ? ' • Taslak ders' : ''} • Konuları aç
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.muted} />
            </Card>
          </TouchableOpacity>
        ))}
      </View>
      {!lessons.length && !loading && <EmptyState title="Henüz ders veya soru eklenmedi" icon="book-outline" />}
      {lessonId !== null && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <View style={{ flex: 1, backgroundColor: '#02061799', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
            <SafeAreaView
              role="dialog" accessibilityLabel="Konu ve soru yönetimi" accessibilityViewIsModal
              style={{ width: '100%', maxWidth: 900, height: '92%', backgroundColor: theme.bg, borderRadius: 24, overflow: 'hidden' }}
            >
              <View style={{ padding: 16, borderBottomWidth: 1, borderColor: theme.border, gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{lesson?.name ?? lessonId}</Text>
                    <Text style={{ color: theme.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>
                      {topicId === null ? 'Konular' : topic?.name ?? 'Konu soruları'}
                    </Text>
                  </View>
                  <AdminButton label="Kapat" secondary icon="close" disabled={busy} onPress={close} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {topicId !== null && <AdminButton label="Konulara dön" secondary icon="arrow-back" disabled={disabled} onPress={() => navigateTopic(null)} />}
                  <AdminButton label="Listeyi yenile" secondary icon="refresh" disabled={disabled} onPress={() => void onReload()} />
                </View>
              </View>
              <ScrollView key={`${lessonId}:${topicId}`} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
                {readOnly && <Notice text="Salt okunur görünüm. Değişiklik yapma yetkiniz yok." />}
                {!!error && <Notice text={error} error />}
                {!!message && <Notice text={message} />}
                {topicId === null ? (
                  <>
                    <Notice text="Konuya dokunarak sorularını açın. Yukarı/aşağı okları konu sırasını hemen kaydeder; kimlikler ve ilerleme korunur." />
                    {groups.map((group, index) => (
                      <Card key={group.id} style={{ marginBottom: 10, padding: 14 }}>
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${group.name} soruları`} disabled={disabled}
                          onPress={() => navigateTopic(group.id)} style={{ paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>
                              {group.id === UNASSIGNED_TOPIC ? '' : `${index + 1}. `}{group.name}
                            </Text>
                            <Text style={{ color: theme.muted, marginTop: 5 }}>{group.questions.length} soru</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={theme.accent} />
                        </TouchableOpacity>
                        {group.id !== UNASSIGNED_TOPIC && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            <AdminButton label="Yukarı" accessibilityLabel={`${group.name} yukarı`} secondary icon="arrow-up"
                              disabled={readOnly || disabled || index === 0} onPress={() => void reorder(index, -1)} />
                            <AdminButton label="Aşağı" accessibilityLabel={`${group.name} aşağı`} secondary icon="arrow-down"
                              disabled={readOnly || disabled || index === (lesson?.entry?.payload.topics.length ?? 0) - 1} onPress={() => void reorder(index, 1)} />
                          </View>
                        )}
                      </Card>
                    ))}
                    {!groups.length && <EmptyState title="Bu derste henüz konu yok" desc="Dersler ve Konular bölümünden konu ekleyebilirsiniz." icon="list-outline" />}
                  </>
                ) : (
                  <>
                    <Field label="Konuda soru ara" value={query} onChangeText={setQuery} editable={!disabled} placeholder="Soru metni veya kimlik…" />
                    {!busy && <Choice label="Yayın durumu" value={status} onChange={setStatus} options={[
                      { value: 'all', label: 'Tümü' }, { value: 'published', label: 'Yayında' }, { value: 'draft', label: 'Taslak' },
                    ]} />}
                    <Text style={{ color: theme.muted, marginBottom: 12 }}>{filtered.length} soru • {selectedRows.length} seçili</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                      <AdminButton label={allSelected ? 'Seçimi kaldır' : `Tümünü seç (${filtered.length})`} secondary icon="checkbox-outline"
                        disabled={readOnly || disabled || !filtered.length}
                        onPress={() => setSelected(allSelected ? new Set() : new Set(filtered.map((entry) => entry.id)))} />
                      <AdminButton label={`Seçilenleri sil (${selectedRows.length})`} danger icon="trash-outline"
                        disabled={readOnly || disabled || !selectedRows.length} onPress={() => setPendingDelete([...selectedRows])} />
                    </View>
                    <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 14 }}>Tümünü seç, bu konudaki arama ve yayın filtresine uyan tüm sayfaları kapsar.</Text>
                    {filtered.slice(currentPage * 20, currentPage * 20 + 20).map((entry) => (
                      <Card key={entry.id} style={{ marginBottom: 12, padding: 14 }}>
                        <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={`Soruyu seç: ${entryTitle(entry)}`}
                          accessibilityState={{ checked: selected.has(entry.id), disabled: readOnly || disabled }} disabled={readOnly || disabled}
                          onPress={() => setSelected((previous) => {
                            const next = new Set(previous);
                            if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                            return next;
                          })} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8 }}>
                          <Ionicons name={selected.has(entry.id) ? 'checkbox' : 'square-outline'} size={24} color={theme.accent} />
                          <Text style={{ flex: 1, color: theme.text, fontSize: 15, lineHeight: 23 }}>{entryTitle(entry)}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.muted, fontSize: 12, marginVertical: 8 }}>{entry.status === 'published' ? 'Yayında' : 'Taslak'} • {entry.id}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <AdminButton label={readOnly ? 'İncele' : 'Düzenle'} secondary icon="create-outline" disabled={disabled}
                            onPress={() => setEditor({ ...entry, payload: { ...entry.payload, topicId: questionTopicId(entry) } })} />
                          <AdminButton label="Sil" secondary danger icon="trash-outline" disabled={readOnly || disabled} onPress={() => setPendingDelete([entry])} />
                        </View>
                      </Card>
                    ))}
                    {!filtered.length && <EmptyState title="Bu görünümde soru yok" desc="Konu boş olabilir veya arama/yayın filtresine uyan soru bulunamadı." icon="help-circle-outline" />}
                    {filtered.length > 20 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <AdminButton label="Önceki" secondary disabled={disabled || currentPage === 0} onPress={() => setPage(currentPage - 1)} />
                        <Text style={{ color: theme.muted }}>{currentPage + 1} / {Math.ceil(filtered.length / 20)}</Text>
                        <AdminButton label="Sonraki" secondary disabled={disabled || (currentPage + 1) * 20 >= filtered.length} onPress={() => setPage(currentPage + 1)} />
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
          {editor && <ContentEditor entry={editor} isNew={false} previewOnly={readOnly} entries={entries}
            onClose={() => setEditor(null)} onSave={async (entry, isNew) => {
              await onSave(entry, isNew);
              setError('');
              setMessage('Soru kaydedildi.');
            }} />}
          {pendingDelete && <ConfirmDialog title={`${pendingDelete.length} soru silinsin mi?`}
            description={`${lesson?.name ?? lessonId} / ${topic?.name ?? 'Konu'}: ${pendingDelete.length} soru kalıcı olarak silinecek ve öğrenci ekranlarından kaldırılacak. Bu işlem geri alınamaz.`}
            label="Kalıcı olarak sil" danger busy={busy} onCancel={() => setPendingDelete(null)} onConfirm={() => void remove()} />}
        </Modal>
      )}
    </>
  );
}
