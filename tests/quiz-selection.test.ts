import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectBalancedQuestions, selectQuestionsWithReplacement } from '../lib/quiz-selection';

type Question = { id: string; topicId: string };

function countsByTopic(questions: Question[]): number[] {
  return Object.values(
    questions.reduce<Record<string, number>>((counts, question) => {
      counts[question.topicId] = (counts[question.topicId] ?? 0) + 1;
      return counts;
    }, {}),
  ).sort((a, b) => a - b);
}

test('selected-topic tests split questions evenly, with only the remainder distributed extra', () => {
  const questions: Question[] = ['a', 'b', 'c'].flatMap((topicId) =>
    Array.from({ length: 8 }, (_, index) => ({ id: `${topicId}-${index}`, topicId })),
  );
  const selected = selectBalancedQuestions(questions, ['a', 'b', 'c'], 10, () => 0.5);
  assert.equal(selected.length, 10);
  assert.deepEqual(countsByTopic(selected), [3, 3, 4]);
  assert.equal(new Set(selected.map((question) => question.id)).size, selected.length);
});

test('a small topic pool is repeated so selected topics remain balanced', () => {
  const questions: Question[] = [
    { id: 'a-1', topicId: 'a' },
    ...Array.from({ length: 8 }, (_, index) => ({ id: `b-${index}`, topicId: 'b' })),
    ...Array.from({ length: 8 }, (_, index) => ({ id: `c-${index}`, topicId: 'c' })),
  ];
  const selected = selectBalancedQuestions(questions, ['a', 'b', 'c'], 9, () => 0.5);
  assert.equal(selected.length, 9);
  assert.deepEqual(countsByTopic(selected), [3, 3, 3]);
});

test('when a topic pool is too small, return the exact requested count and balance replacements', () => {
  const questions: Question[] = [
    { id: 'a-1', topicId: 'a' },
    { id: 'b-1', topicId: 'b' },
    { id: 'b-2', topicId: 'b' },
  ];
  const selected = selectBalancedQuestions(questions, ['a', 'a', 'b'], 20, () => 0.5);
  assert.equal(selected.length, 20);
  assert.deepEqual(countsByTopic(selected), [10, 10]);
  assert.deepEqual(
    selected.filter((question) => question.topicId === 'b').reduce<Record<string, number>>((counts, question) => {
      counts[question.id] = (counts[question.id] ?? 0) + 1;
      return counts;
    }, {}),
    { 'b-1': 5, 'b-2': 5 },
  );
});

test('an untagged pool still returns the exact requested count with replacements', () => {
  const questions = [{ id: 'one' }, { id: 'two' }];
  const selected = selectQuestionsWithReplacement(questions, 7, () => 0.5);
  assert.equal(selected.length, 7);
  assert.deepEqual(
    selected.reduce<Record<string, number>>((counts, question) => {
      counts[question.id] = (counts[question.id] ?? 0) + 1;
      return counts;
    }, {}),
    { one: 4, two: 3 },
  );
});
