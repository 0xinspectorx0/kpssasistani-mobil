import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContentEntry, parseEntry, publishedContent, seedEntries } from '../lib/content-schema';
import {
  deleteQuestionSelection, filterQuestions, isQuestion, moveTopic,
  questionLessons, topicGroups, UNASSIGNED_TOPIC,
} from '../lib/admin-questions';

const seed = seedEntries();
const question = seed.filter(isQuestion)[0];
const lesson = seed.find((entry) => entry.kind === 'lessons' && entry.id === 'turkce')!;

test('topic order changes without mutating inputs or changing IDs, and survives serialization', () => {
  assert.ok('topics' in lesson.payload);
  const topics = lesson.payload.topics;
  const before = JSON.stringify(topics);
  const moved = moveTopic(topics, 1, -1);
  assert.equal(JSON.stringify(topics), before);
  assert.deepEqual(moved.slice(0, 2), [topics[1], topics[0]]);
  assert.deepEqual(moveTopic(moved, 0, 1), topics);
  const saved = parseEntry(JSON.parse(JSON.stringify({ ...lesson, payload: { ...lesson.payload, topics: moved } })));
  assert.deepEqual(publishedContent([saved]).lessons[0].topics, moved);
  assert.deepEqual(new Set(moved.map((t) => t.id)), new Set(topics.map((t) => t.id)));
});

test('topic movement at boundaries or an invalid index leaves order intact', () => {
  const topics = ['a', 'b', 'c'];
  assert.deepEqual(moveTopic(topics, 0, -1), topics);
  assert.deepEqual(moveTopic(topics, 2, 1), topics);
  assert.deepEqual(moveTopic(topics, -1, 1), topics);
  assert.deepEqual(moveTopic(topics, 3, -1), topics);
  assert.deepEqual(moveTopic(topics, 0.5, 1), topics);
  assert.deepEqual(moveTopic([], 0, 1), []);
});

test('admin lesson catalog includes draft lessons and orphan question categories', () => {
  const rows: ContentEntry[] = [
    { ...lesson, status: 'draft' },
    { ...question, payload: { ...question.payload, category: 'yeni-ders' } },
  ];
  const catalog = questionLessons(rows);
  assert.deepEqual(catalog.map((item) => item.id), ['turkce', 'yeni-ders']);
  assert.equal(catalog[0].entry?.status, 'draft');
  assert.equal(catalog[1].entry, undefined);
});

test('topic groups isolate lessons, include drafts, preserve empty topics and legacy topic mappings', () => {
  const legacy = { ...question, payload: { ...question.payload, topicId: undefined }, status: 'draft' as const };
  const groups = topicGroups([lesson, legacy, ...seed.filter(isQuestion).filter((q) => q.payload.category === 'matematik')], 'turkce');
  assert.ok('topics' in lesson.payload);
  assert.deepEqual(groups.map((g) => g.id), lesson.payload.topics.map((t) => t.id));
  assert.equal(groups.flatMap((group) => group.questions).length, 1);
  assert.equal(groups.find((group) => group.id === question.payload.topicId)?.questions[0].id, question.id);
  assert.ok(groups.some((group) => group.questions.length === 0));
});

test('unassigned and deleted topics remain accessible without leaking into other lessons', () => {
  const orphan = { ...question, id: 'orphan', payload: { ...question.payload, id: 'orphan', topicId: 'removed' } };
  const unassigned = { ...question, id: 'unassigned', payload: { ...question.payload, id: 'unassigned', topicId: undefined } };
  const groups = topicGroups([lesson, orphan, unassigned], 'turkce');
  assert.deepEqual(groups.at(-1)?.questions.map((q) => q.id), ['orphan', 'unassigned']);
  assert.equal(groups.at(-1)?.id, UNASSIGNED_TOPIC);
  assert.equal(topicGroups([lesson, orphan, unassigned], 'matematik').length, 0);
  assert.equal(topicGroups([orphan], 'turkce')[0].id, UNASSIGNED_TOPIC);
});

test('search/status filters cover all pages and support Turkish case folding', () => {
  const questions = Array.from({ length: 25 }, (_, index) => ({
    ...question, id: `q${index}`, status: index === 24 ? 'draft' as const : 'published' as const,
    payload: { ...question.payload, id: `q${index}`, question: 'İÇERİK SORUSU' },
  }));
  assert.equal(filterQuestions(questions, ' içerik ', 'all').length, 25);
  assert.equal(filterQuestions(questions, 'içerik', 'published').length, 24);
  assert.equal(filterQuestions(questions, 'q24', 'draft')[0].id, 'q24');
  assert.equal(filterQuestions(questions, 'bulunmaz', 'all').length, 0);
});

test('bulk deletion deletes only selected unique questions and preserves each version token', async () => {
  const selected = seed.filter(isQuestion).slice(0, 3).map((q) => ({ ...q, updated_at: `version-${q.id}` }));
  const removed: ContentEntry[] = [];
  const result = await deleteQuestionSelection([...selected, selected[0]], async (entry) => { removed.push(entry); });
  assert.deepEqual(result, { deleted: 3 });
  assert.deepEqual(removed, selected);
  assert.equal((await deleteQuestionSelection([], async () => { assert.fail('No delete expected'); })).deleted, 0);
});

test('bulk deletion reports partial progress and stops at stale data, permission or network failure', async () => {
  const selected = seed.filter(isQuestion).slice(0, 3);
  const called: string[] = [];
  const error = new Error('İçerik değişmiş veya silme yetkiniz yok.');
  const result = await deleteQuestionSelection(selected, async (entry) => {
    called.push(entry.id);
    if (entry.id === selected[1].id) throw error;
  });
  assert.equal(result.deleted, 1);
  assert.equal(result.error, error);
  assert.deepEqual(called, selected.slice(0, 2).map((q) => q.id));
});
