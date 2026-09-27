/**
 * "Hazır soru kalıbı" ayrıştırıcısı.
 *
 * Kullanıcının elle hazırladığı tipik toplu soru biçimi:
 *
 *   1. **Soru kök cümlesi.
 *
 *      I. Birinci öncül
 *      II. İkinci öncül
 *
 *   Yukarıdaki öncüllerden hangileri doğrudur?**
 *
 *   A) Yalnız I
 *   B) Yalnız II
 *   ...
 *   E) I, II ve III
 *
 *   Cevap: C
 *
 *   Açıklama: Açıklama metni burada.
 *
 * Numarasız, tek cevaplı klasik biçim de desteklenir. Her soru kendi satırında
 * başlar; numaradan sonra "Ders: tarih" / "Konu: ta-s3" / "Zorluk: Orta" satırları
 * verilirse varsayılan değerlerin yerine geçer.
 */

export const BULK_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export const BULK_DIFFICULTIES = ['Kolay', 'Orta', 'Zor'] as const;
export type BulkDifficulty = (typeof BULK_DIFFICULTIES)[number];

export interface BulkQuestionDefaults {
  category: string;
  /** Soruların yükleneceği konu kimliği; kalıpta "Konu: <id>" satırıyla tek soruda ezilebilir. */
  topicId?: string;
  difficulty: BulkDifficulty;
}

export interface BulkQuestion {
  category: string;
  topicId?: string;
  difficulty: BulkDifficulty;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

const MAX_QUESTIONS = 500;
const LESSON_ID = /^[a-z0-9][a-z0-9-]*$/;
const NUMBER_START = /^\s*\d{1,3}\s*[.)]\s+\S/;
const NUMBER_PREFIX = /^\s*\d{1,3}\s*[.)]\s+/;
const OPTION = /(?:^|\s)\(?([A-Ea-e])\)\s*/g;
const OPTION_START = /^\s*\(?([A-Ea-e])\)\s*/;
const ANSWER = /^\s*Cevap\s*:\s*(\S.*)$/i;
const EXPLANATION = /^\s*Açıklama\s*:\s*(.*)$/i;
const META = /^\s*(Ders|Kategori|Konu|Zorluk)\s*:\s*(.+)$/i;
const SEPARATOR = /^\s*([-*_=]{3,}|#|\/\/)\s*$/;

const cleanLine = (line: string) => line.replace(/\*\*/g, '').replace(/\s+$/, '').trim();

/** Soru bloklarını numaralı başlıklara göre böler; numara yoksa kalın başlıklara göre. */
function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  const numbered = lines.some((line) => NUMBER_START.test(line));
  for (const line of lines) {
    if (!line.trim()) continue; // boş satırlar soru bloklarını bölmez
    const starts = numbered ? NUMBER_START.test(line) : line.trim().startsWith('**');
    // Numaralı biçimde yeni soru, ancak önceki sorunun cevabı görülmüşse başlar.
    const confident = !numbered || blocks.length === 0 || currentHasAnswer(current);
    if (starts && confident) {
      if (current.length) blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

const currentHasAnswer = (lines: string[]) => lines.some((line) => ANSWER.test(cleanLine(line)));

function splitOptions(line: string): { letter: string; text: string }[] {
  const found: { letter: string; text: string }[] = [];
  const source = cleanLine(line);
  OPTION.lastIndex = 0;
  let match: RegExpExecArray | null;
  let cursor = 0;
  while ((match = OPTION.exec(source))) {
    if (match.index > cursor) found.push({ letter: '', text: source.slice(cursor, match.index).trim() });
    found.push({ letter: match[1].toUpperCase(), text: '' });
    cursor = match.index + match[0].length;
  }
  const tail = source.slice(cursor).trim();
  if (tail || found.length === 0) found.push({ letter: '', text: tail });
  // Boş harfli kayıtlar bir öncekinin devamıdır (satır sonu sarması).
  return found.reduce<{ letter: string; text: string }[]>((acc, item) => {
    if (item.letter) acc.push(item);
    else if (acc.length) acc[acc.length - 1].text = `${acc[acc.length - 1].text} ${item.text}`.trim();
    else acc.push(item);
    return acc;
  }, []);
}

function fail(label: string, message: string): never {
  throw new Error(`${label}: ${message}`);
}

/** Kalıptan soru listesi çıkarır; hatalar soru numarasıyla birlikte fırlatılır. */
export function parseQuestionTemplate(raw: string, defaults: BulkQuestionDefaults): BulkQuestion[] {
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !SEPARATOR.test(line));

  const blocks = splitBlocks(lines);
  if (!blocks.length) throw new Error('Kalıbı okunamadı; en az bir soru bulunamadı.');

  const out: BulkQuestion[] = [];
  const missingAnswer: string[] = [];
  const missingExplanation: string[] = [];

  blocks.forEach((block, index) => {
    const label = `Soru ${index + 1}`;
    const stem: string[] = [];
    const options: { letter: string; text: string }[] = [];
    const meta: { category?: string; topicId?: string; difficulty?: BulkDifficulty } = {};
    let answerLetter: string | null = null;
    const explanation: string[] = [];
    let section: 'stem' | 'options' | 'explanation' = 'stem';
    let started = false;

    block.forEach((rawLine) => {
      const line = cleanLine(rawLine);
      if (!line) return;
      const text = started ? line : line.replace(NUMBER_PREFIX, '').trim();
      started = true;

      const metaMatch = text.match(META);
      if (metaMatch) {
        const key = metaMatch[1].toLocaleLowerCase('tr');
        const value = metaMatch[2].trim();
        if (key === 'zorluk') {
          const difficulty = BULK_DIFFICULTIES.find(
            (d) => d.toLocaleLowerCase('tr') === value.toLocaleLowerCase('tr'),
          );
          if (!difficulty) fail(label, `geçersiz zorluk "${value}". Kolay, Orta veya Zor olmalı.`);
          meta.difficulty = difficulty;
        } else if (key === 'konu') {
          if (!LESSON_ID.test(value)) fail(label, `geçersiz konu kimliği "${value}". Örnek: ta-s3`);
          meta.topicId = value;
        } else {
          if (!LESSON_ID.test(value)) fail(label, `geçersiz ders kimliği "${value}". Örnek: tarih`);
          meta.category = value;
        }
        return;
      }

      const answerMatch = text.match(ANSWER);
      if (answerMatch) {
        const raw = answerMatch[1].trim();
        if (!/^[A-Ea-e]$/.test(raw)) fail(label, `geçersiz cevap harfi "${raw}". A–E olmalı.`);
        answerLetter = raw.toUpperCase();
        // Cevaptan sonra gelen satırlar şıkkın devamı değil, açıklama metnidir.
        section = 'explanation';
        return;
      }

      const explanationMatch = text.match(EXPLANATION);
      if (explanationMatch) {
        section = 'explanation';
        if (explanationMatch[1].trim()) explanation.push(explanationMatch[1].trim());
        return;
      }

      if (section === 'explanation') {
        explanation.push(text);
        return;
      }

      if (OPTION_START.test(text)) {
        section = 'options';
        options.push(...splitOptions(text));
        return;
      }

      if (section === 'options' && options.length) {
        // Seçenek listesi taşmışsa son seçeneğe eklenir.
        options[options.length - 1].text = `${options[options.length - 1].text} ${text}`.trim();
        return;
      }

      stem.push(text);
    });

    const question = stem.join('\n').trim();
    if (!question) fail(label, 'soru metni boş.');
    if (options.length !== BULK_LETTERS.length) {
      fail(label, `tam 5 seçenek (A–E) olmalı; ${options.length} seçenek bulundu.`);
    }
    const letters = options.map((option) => option.letter);
    const ordered = BULK_LETTERS.every((letter, i) => letters[i] === letter);
    if (!ordered) fail(label, `seçenekler A, B, C, D, E sırasında olmalı; sıra: ${letters.join(' ')}`);
    const cleanedOptions = options.map((option) => option.text.trim());
    if (cleanedOptions.some((option) => !option)) fail(label, 'seçenekler boş bırakılamaz.');

    if (!answerLetter) {
      missingAnswer.push(label);
      return;
    }
    const answer = BULK_LETTERS.indexOf(answerLetter as (typeof BULK_LETTERS)[number]);
    if (answer < 0) fail(label, `geçersiz cevap harfi "${answerLetter}". A–E olmalı.`);

    const explanationText = explanation.join(' ').replace(/\s+/g, ' ').trim();
    if (!explanationText) {
      missingExplanation.push(label);
      return;
    }

    out.push({
      category: meta.category ?? defaults.category,
      topicId: meta.topicId ?? defaults.topicId,
      difficulty: meta.difficulty ?? defaults.difficulty,
      question,
      options: cleanedOptions,
      answer,
      explanation: explanationText,
    });
  });

  if (missingAnswer.length || missingExplanation.length) {
    const parts: string[] = [];
    if (missingAnswer.length) parts.push(`${missingAnswer.join(', ')} — "Cevap:" satırı yok.`);
    if (missingExplanation.length) parts.push(`${missingExplanation.join(', ')} — "Açıklama:" satırı yok.`);
    throw new Error(`Eksik bilgi: ${parts.join(' ')}`);
  }
  if (!out.length) throw new Error('Kalıbı okunamadı; en az bir soru bulunamadı.');
  if (out.length > MAX_QUESTIONS) throw new Error(`Tek seferde en fazla ${MAX_QUESTIONS} soru yüklenebilir.`);
  return out;
}
