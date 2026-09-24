import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newPayload, parseEntry, publishedContent, schemas, seedEntries } from '../lib/content-schema';
import { questionOfDay } from '../lib/data';

const q = {
  id: 'q1',
  category: 'turkce',
  question: 'Hangisi doğru?',
  options: ['Bir', 'İki', 'Üç', 'Dört', 'Beş'],
  answer: 4,
  explanation: 'Beş doğrudur.',
  difficulty: 'Orta',
};
test('all bundled content can be imported without schema errors', () => {
  const entries = seedEntries();
  assert.ok(entries.length > 100);
  for (const entry of entries) assert.deepEqual(parseEntry(entry).payload, entry.payload);
  assert.equal(new Set(entries.map((e) => `${e.kind}:${e.id}`)).size, entries.length);
});
test('questions accept four/five options and fifth correct answer', () => {
  assert.equal(schemas.questions.parse(q).answer, 4);
  assert.equal(schemas.questions.parse({ ...q, options: q.options.slice(0, 4), answer: 3 }).answer, 3);
});
test('questions reject missing answer, blank, duplicate, too few options', () => {
  for (const bad of [
    { ...q, answer: -1 },
    { ...q, answer: 5 },
    { ...q, answer: 1.5 },
    { ...q, explanation: '  ' },
    { ...q, question: '' },
    { ...q, category: 'OTHER_UPPER' },
    { ...q, options: ['A', 'B', 'C'] },
    { ...q, options: ['A', 'a', 'C', 'D'] },
    { ...q, options: ['A', 'B', 'C', '  '] },
  ])
    assert.equal(schemas.questions.safeParse(bad).success, false);
});

test('questions accept arbitrary lowercase lesson ids (new subjects)', () => {
  assert.ok(schemas.questions.safeParse({ ...q, category: 'hukuk' }).success);
  assert.ok(schemas.questions.safeParse({ ...q, category: 'din-kulturu' }).success);
  assert.equal(schemas.questions.safeParse({ ...q, category: 'HUKUK' }).success, false);
  assert.equal(schemas.questions.safeParse({ ...q, category: '' }).success, false);
});
test('draft entries are never exposed in student content, even in admin session', () => {
  const rows = seedEntries().map((e) => ({ ...e, status: 'draft' as const }));
  assert.equal(publishedContent(rows).questions.length, 0);
  assert.equal(publishedContent([{ ...rows[0], status: 'published' }]).questions.length, 1);
});
test('published empty collection stays empty rather than reviving bundled questions', () => {
  assert.deepEqual(publishedContent([]).questions, []);
  assert.equal(questionOfDay([]), undefined);
  assert.ok(questionOfDay([schemas.questions.parse(q)])?.id === q.id);
});
test('entry id and payload id must match', () => {
  assert.throws(() => parseEntry({ kind: 'questions', id: 'other', payload: q, status: 'published' }));
});
test('new questions are invalid until author completes all fields', () => {
  assert.equal(schemas.questions.safeParse(newPayload('questions')).success, false);
});
test('date ranges and score bounds are validated', () => {
  const event = { id: 'e', title: 'Sınav', date: '2026-10-04', type: 'sinav', desc: 'Açıklama' };
  assert.ok(schemas.events.safeParse(event).success);
  assert.equal(schemas.events.safeParse({ ...event, date: '2026-02-30' }).success, false);
  assert.equal(schemas.events.safeParse({ ...event, endDate: '2026-09-01' }).success, false);
  assert.equal(
    schemas.scores.safeParse({ id: 's', level: 'lisans', kadro: 'Memur', kurum: 'Kurum', min: 90, max: 80 })
      .success,
    false,
  );
});
test('topic names can change while stable identifiers preserve progress', () => {
  const lesson = seedEntries().find((e) => e.kind === 'lessons')!;
  const parsed = schemas.lessons.parse(lesson.payload);
  const changed = schemas.lessons.parse({
    ...parsed,
    topics: parsed.topics.map((t) => ({ ...t, name: 'Güncellenen konu' })),
  });
  assert.deepEqual(
    changed.topics.map((t) => t.id),
    parsed.topics.map((t) => t.id),
  );
  assert.equal(
    schemas.lessons.safeParse({ ...parsed, topics: [parsed.topics[0], parsed.topics[0]] }).success,
    false,
  );
});
