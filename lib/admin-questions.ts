import { ContentData, ContentEntry, entryTitle } from './content-schema';
import { QUESTION_TOPIC_IDS } from './data';

type Lesson = ContentData['lessons'][number];
export const UNASSIGNED_TOPIC = '$unassigned';
export type QuestionEntry = ContentEntry & { kind: 'questions'; payload: ContentData['questions'][number] };
export type LessonEntry = ContentEntry & { kind: 'lessons'; payload: Lesson };

export function isQuestion(entry: ContentEntry): entry is QuestionEntry {
  return entry.kind === 'questions';
}
export function questionTopicId(entry: QuestionEntry): string | undefined {
  return entry.payload.topicId ?? QUESTION_TOPIC_IDS[entry.id];
}
export function questionLessons(entries: ContentEntry[]) {
  const lessons = entries.filter((entry): entry is LessonEntry => entry.kind === 'lessons');
  const ids = new Set([...lessons.map((entry) => entry.id), ...entries.filter(isQuestion).map((entry) => entry.payload.category)]);
  return [...ids].map((id) => {
    const entry = lessons.find((lesson) => lesson.id === id);
    return { id, name: entry?.payload.name ?? id, entry };
  });
}
export function topicGroups(entries: ContentEntry[], lessonId: string) {
  const lesson = entries.find((entry) => entry.kind === 'lessons' && entry.id === lessonId) as LessonEntry | undefined;
  const questions = entries.filter(isQuestion).filter((entry) => entry.payload.category === lessonId);
  const topics = lesson?.payload.topics ?? [];
  const knownIds = new Set(topics.map((topic) => topic.id));
  const groups = topics.map((topic) => ({
    ...topic,
    questions: questions.filter((entry) => questionTopicId(entry) === topic.id),
  }));
  const unassigned = questions.filter((entry) => !knownIds.has(questionTopicId(entry) ?? ''));
  if (unassigned.length) groups.push({ id: UNASSIGNED_TOPIC, name: 'Konusu atanmamış / silinmiş', questions: unassigned });
  return groups;
}
export function filterQuestions(questions: QuestionEntry[], query: string, status: string) {
  const search = query.trim().toLocaleLowerCase('tr');
  return questions.filter((entry) =>
    (status === 'all' || entry.status === status) &&
    `${entryTitle(entry)} ${entry.id}`.toLocaleLowerCase('tr').includes(search),
  );
}

/** Array order is the persisted display order. Never regenerate topic IDs. */
export function moveTopic<T>(topics: readonly T[], index: number, direction: -1 | 1): T[] {
  const next = [...topics];
  const target = index + direction;
  if (!Number.isInteger(index) || index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Retain each row's version check and stop on the first failure (no false all-or-nothing claim). */
export async function deleteQuestionSelection(
  entries: QuestionEntry[],
  remove: (entry: ContentEntry) => Promise<void>,
): Promise<{ deleted: number; error?: unknown }> {
  let deleted = 0;
  for (const entry of [...new Map(entries.map((entry) => [entry.id, entry])).values()]) {
    if (entry.kind !== 'questions') return { deleted, error: new Error('Yalnızca sorular silinebilir.') };
    try {
      await remove(entry);
      deleted += 1;
    } catch (error) {
      return { deleted, error };
    }
  }
  return { deleted };
}
