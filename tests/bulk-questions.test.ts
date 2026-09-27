import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionTemplate } from '../lib/bulk-questions';

const DEFAULTS = { category: 'tarih', difficulty: 'Orta' as const };

/** Kullanıcının hazırladığı tipik kalıp: öncüllü çoktan seçmeli + klasik soru. */
const SAMPLE = `
1. **Osmanlı-Lehistan saraşlarının çıkmasında çeşitli bölgelerdeki güç mücadelesi belirleyici olmuştur.

   I. Lehistan'ın Ukrayna Kazaklarına baskı yapması

   II. Lehistan'ın Erdel ve Macaristan topraklarına baskı yapması

   III. Lehistan'ın Osmanlı'nın iç işlerine doğrudan müdahale etmesi

 Yukarıdaki öncüllerden hangileri Osmanlı-Lehistan savaşlarının nedenleri arasında gösterilebilir?**

A) Yalnız I

B) Yalnız III

C) I ve II

D) II ve III

E) I, II ve III

Cevap: C

Açıklama: Osmanlı-Lehistan savaşlarının temel nedeni Lehistan'ın Ukrayna Kazakları,
Erdel, Macaristan ve Eflak topraklarına baskı yapmasıdır.

---

2. **Bucaş Antlaşması hangi padişah döneminde imzalanmıştır?

A) Genç Osman

B) III. Murat

C) IV. Mehmet

D) II. Mahmut

E) I. Ahmet

Cevap: C

Açıklama: Bucaş Antlaşması 1672 yılında IV. Mehmet döneminde yapılmıştır.
`;

test('öncüllü kalıp kök cümle, öncüller ve soru satırını tek metinde birleştirir', () => {
  const [first, second] = parseQuestionTemplate(SAMPLE, DEFAULTS);

  assert.equal(
    first.question,
    [
      "Osmanlı-Lehistan saraşlarının çıkmasında çeşitli bölgelerdeki güç mücadelesi belirleyici olmuştur.",
      "I. Lehistan'ın Ukrayna Kazaklarına baskı yapması",
      "II. Lehistan'ın Erdel ve Macaristan topraklarına baskı yapması",
      "III. Lehistan'ın Osmanlı'nın iç işlerine doğrudan müdahale etmesi",
      'Yukarıdaki öncüllerden hangileri Osmanlı-Lehistan savaşlarının nedenleri arasında gösterilebilir?',
    ].join('\n'),
  );
  assert.deepEqual(first.options, ['Yalnız I', 'Yalnız III', 'I ve II', 'II ve III', 'I, II ve III']);
  assert.equal(first.answer, 2);
  assert.match(first.explanation, /^Osmanlı-Lehistan savaşlarının temel nedeni/);
  assert.equal(first.explanation.includes('\n'), false);
  assert.equal(first.category, 'tarih');
  assert.equal(first.difficulty, 'Orta');

  assert.equal(second.question, 'Bucaş Antlaşması hangi padişah döneminde imzalanmıştır?');
  assert.deepEqual(second.options, ['Genç Osman', 'III. Murat', 'IV. Mehmet', 'II. Mahmut', 'I. Ahmet']);
  assert.equal(second.answer, 2);
});

test('kalıp numarasız başlıkları, ayraçları ve satır kaydırmayı tolere eder', () => {
  const raw = `
 1. **Soru metni?

A) Birinci
B) İkinci
C) Üçüncü
D) Dördüncü
E) Beşinci

Cevap: e

Açıklama: Açıklama ilk satır.
İkinci satır da açıklamaya
devam eder.
`;
  const [question] = parseQuestionTemplate(raw, DEFAULTS);
  assert.equal(question.question, 'Soru metni?');
  assert.equal(question.answer, 4);
  assert.equal(question.explanation, 'Açıklama ilk satır. İkinci satır da açıklamaya devam eder.');
});

test('Ders ve Zorluk satırları varsayılanın yerine geçer', () => {
  const raw = `
 1. Ders: matematik
 Zorluk: Zor

 **2 + 2 kaçtır?**

A) 2
B) 3
C) 4
D) 5
E) 7

Cevap: C

Açıklama: Temel toplama.
`;
  const [question] = parseQuestionTemplate(raw, DEFAULTS);
  assert.equal(question.category, 'matematik');
  assert.equal(question.difficulty, 'Zor');
  assert.equal(question.question, '2 + 2 kaçtır?');
});

test('eksik seçenek, geçersiz cevap ve eksik cevap/açıklama satırları anlaşılır hata verir', () => {
  const missingOption = `
 1. **Soru?

A) Bir
B) İki
C) Üç
D) Dört

Cevap: A

Açıklama: Açıklama.
`;
  assert.throws(() => parseQuestionTemplate(missingOption, DEFAULTS), /tam 5 seçenek \(A–E\) olmalı; 4/);

  const badAnswer = `
 1. **Soru?

A) Bir
B) İki
C) Üç
D) Dört
E) Beş

Cevap: F

Açıklama: Açıklama.
`;
  assert.throws(() => parseQuestionTemplate(badAnswer, DEFAULTS), /geçersiz cevap harfi/);

  const noAnswer = `
 1. **Soru?

A) Bir
B) İki
C) Üç
D) Dört
E) Beş

Açıklama: Açıklama.
`;
  assert.throws(() => parseQuestionTemplate(noAnswer, DEFAULTS), /"Cevap:" satırı yok/);
});

test('çoktan seçmeli şıkları aynı satırda yazılan biçim de okunur', () => {
  const raw = `
 1. **Soru?

A) Yalnız I B) Yalnız II C) I ve II D) II ve III E) I, II ve III

Cevap: C

Açıklama: Açıklama.
`;
  const [question] = parseQuestionTemplate(raw, DEFAULTS);
  assert.deepEqual(question.options, ['Yalnız I', 'Yalnız II', 'I ve II', 'II ve III', 'I, II ve III']);
  assert.equal(question.answer, 2);
});
