import { z } from 'zod';
import { QUESTIONS, LESSONS, NEWS, EXAM_EVENTS, TARGET_EXAMS, TABAN_PUANLAR, QUOTES } from './data';

const text = z
  .string()
  .trim()
  .min(1, 'Bu alan zorunludur.')
  .max(20000, 'En fazla 20.000 karakter girilebilir.');
const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[\w-]+$/, 'Kimlik yalnızca harf, rakam, - ve _ içerebilir.');
const date = z.iso.date('Geçerli bir tarih girin (YYYY-AA-GG).');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Renk #2563EB biçiminde olmalıdır.');
export const categoryIds = ['turkce', 'matematik', 'tarih', 'cografya', 'vatandaslik', 'guncel'] as const;
export const schemas = {
  questions: z
    .object({
      id,
      category: z.enum(categoryIds),
      question: text,
      options: z.array(text).min(4, 'En az 4 seçenek olmalıdır.').max(5),
      answer: z.number().int().min(0),
      explanation: text,
      difficulty: z.enum(['Kolay', 'Orta', 'Zor']),
    })
    .superRefine((q, ctx) => {
      if (q.answer >= q.options.length)
        ctx.addIssue({ code: 'custom', path: ['answer'], message: 'Doğru cevabı seçin.' });
      if (new Set(q.options.map((o) => o.toLocaleLowerCase('tr'))).size !== q.options.length)
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Seçenekler birbirinden farklı olmalıdır.',
        });
    }),
  lessons: z
    .object({
      id: z.enum(categoryIds),
      name: text,
      icon: text.max(80),
      color,
      questions: text,
      topics: z
        .array(z.object({ id, name: text }))
        .min(1, 'En az bir konu ekleyin.')
        .max(500),
    })
    .refine(
      (l) => new Set(l.topics.map((t) => t.id)).size === l.topics.length,
      'Konu kimlikleri benzersiz olmalıdır.',
    ),
  news: z.object({
    id,
    category: z.enum(['Spor', 'Kültür-Sanat', 'Bilim', 'Kurumlar', 'Klasikler']),
    title: text,
    detail: text,
    date: text.max(80),
  }),
  events: z
    .object({
      id,
      title: text,
      date,
      endDate: date.optional(),
      type: z.enum(['sinav', 'basvuru', 'sonuc', 'tercih']),
      desc: text,
    })
    .refine((e) => !e.endDate || e.endDate >= e.date, {
      path: ['endDate'],
      message: 'Bitiş tarihi başlangıçtan önce olamaz.',
    }),
  targets: z.object({ id, name: text, short: text, scoreType: text, eventId: id }),
  scores: z
    .object({
      id,
      level: z.enum(['lisans', 'onlisans', 'ortaogretim']),
      kadro: text,
      kurum: text,
      min: z.number().min(0).max(100),
      max: z.number().min(0).max(100),
    })
    .refine((s) => s.max >= s.min, { path: ['max'], message: 'Tavan puan taban puandan küçük olamaz.' }),
  quotes: z.object({ id, text, author: text }),
};
export type ContentKind = keyof typeof schemas;
export type ContentData = { [K in ContentKind]: z.infer<(typeof schemas)[K]>[] };
export type ContentPayload = ContentData[ContentKind][number];
export type ContentStatus = 'draft' | 'published';
export interface ContentEntry {
  kind: ContentKind;
  id: string;
  payload: ContentPayload;
  status: ContentStatus;
  updated_at?: string;
}
export const kindLabels: Record<ContentKind, string> = {
  questions: 'Soru Bankası',
  lessons: 'Dersler ve Konular',
  news: 'Güncel Bilgiler',
  events: 'Sınav Takvimi',
  targets: 'Hedef Sınavlar',
  scores: 'Taban Puanlar',
  quotes: 'Motivasyon Sözleri',
};
export const kindIcons: Record<ContentKind, string> = {
  questions: 'help-circle-outline',
  lessons: 'book-outline',
  news: 'newspaper-outline',
  events: 'calendar-outline',
  targets: 'flag-outline',
  scores: 'stats-chart-outline',
  quotes: 'chatbox-ellipses-outline',
};
export function emptyContent(): ContentData {
  return { questions: [], lessons: [], news: [], events: [], targets: [], scores: [], quotes: [] };
}
export const bundledContent: ContentData = {
  questions: QUESTIONS,
  lessons: LESSONS,
  news: NEWS,
  events: EXAM_EVENTS,
  targets: TARGET_EXAMS,
  scores: TABAN_PUANLAR,
  quotes: QUOTES.map((q, i) => ({ ...q, id: `quote-${i + 1}` })),
};
export function parseEntry(raw: unknown): ContentEntry {
  const row = z
    .object({
      kind: z.enum(Object.keys(schemas) as [ContentKind, ...ContentKind[]]),
      id,
      payload: z.unknown(),
      status: z.enum(['draft', 'published']),
      updated_at: z.string().optional(),
    })
    .parse(raw);
  const payload = schemas[row.kind].parse(row.payload);
  if (payload.id !== row.id) throw new Error('İçerik kimliği eşleşmiyor.');
  return { ...row, payload };
}
export function publishedContent(rows: ContentEntry[]): ContentData {
  const result = emptyContent();
  for (const row of rows)
    if (row.status === 'published') (result[row.kind] as ContentPayload[]).push(row.payload);
  return result;
}
export function seedEntries(): ContentEntry[] {
  return (Object.keys(bundledContent) as ContentKind[]).flatMap((kind) =>
    bundledContent[kind].map((payload) => ({ kind, id: payload.id, payload, status: 'published' as const })),
  );
}
export function entryTitle(entry: ContentEntry): string {
  const p = entry.payload;
  if ('question' in p) return p.question;
  if ('title' in p) return p.title;
  if ('name' in p) return p.name;
  if ('kadro' in p) return p.kadro;
  return p.text;
}
export function newPayload(kind: ContentKind): ContentPayload {
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  switch (kind) {
    case 'questions':
      return {
        id,
        category: 'turkce',
        difficulty: 'Orta',
        question: '',
        options: ['', '', '', '', ''],
        answer: -1,
        explanation: '',
      };
    case 'lessons':
      return { id: 'turkce', name: '', icon: 'book-outline', color: '#2563EB', questions: '', topics: [] };
    case 'news':
      return { id, category: 'Bilim', title: '', detail: '', date: '' };
    case 'events':
      return { id, title: '', date: '', type: 'sinav', desc: '' };
    case 'targets':
      return { id, name: '', short: '', scoreType: '', eventId: '' };
    case 'scores':
      return { id, level: 'lisans', kadro: '', kurum: '', min: 0, max: 100 };
    case 'quotes':
      return { id, text: '', author: '' };
  }
}
