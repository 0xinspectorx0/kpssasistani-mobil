function shuffled<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Selects questions round-robin so selected topics contribute evenly, repeating only after a topic's pool is exhausted. */
export function selectBalancedQuestions<T extends { topicId?: string }>(
  questions: readonly T[],
  topicIds: readonly string[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const topics = shuffled(
    Array.from(new Set(topicIds)).map((topicId) => {
      const topicQuestions = questions.filter((question) => question.topicId === topicId);
      return {
        questions: topicQuestions,
        cycle: shuffled(topicQuestions, random),
        cursor: 0,
        lastQuestion: undefined as T | undefined,
      };
    }),
    random,
  );
  const limit = Math.max(0, Math.floor(count));
  const selected: T[] = [];

  while (selected.length < limit) {
    let addedThisRound = false;
    for (const topic of topics) {
      if (selected.length >= limit) break;
      if (topic.questions.length === 0) continue;
      if (topic.cursor >= topic.cycle.length) {
        topic.cycle = shuffled(topic.questions, random);
        // Avoid repeating the same question back-to-back at a cycle boundary when alternatives exist.
        if (topic.cycle.length > 1 && topic.cycle[0] === topic.lastQuestion) {
          [topic.cycle[0], topic.cycle[1]] = [topic.cycle[1], topic.cycle[0]];
        }
        topic.cursor = 0;
      }
      const question = topic.cycle[topic.cursor];
      topic.cursor += 1;
      topic.lastQuestion = question;
      selected.push(question);
      addedThisRound = true;
    }
    if (!addedThisRound) break;
  }

  return shuffled(selected, random);
}

/** Selects an exact count from a pool, reshuffling before reusing questions. */
export function selectQuestionsWithReplacement<T>(
  questions: readonly T[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const limit = Math.max(0, Math.floor(count));
  if (questions.length === 0 || limit === 0) return [];
  const selected: T[] = [];
  let cycle = shuffled(questions, random);
  let cursor = 0;
  let lastQuestion: T | undefined;

  while (selected.length < limit) {
    if (cursor >= cycle.length) {
      cycle = shuffled(questions, random);
      if (cycle.length > 1 && cycle[0] === lastQuestion) {
        [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
      }
      cursor = 0;
    }
    const question = cycle[cursor++];
    selected.push(question);
    lastQuestion = question;
  }
  return shuffled(selected, random);
}
